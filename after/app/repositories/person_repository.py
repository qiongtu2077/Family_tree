"""通过 SQLAlchemy 管理 PostgreSQL 人物、家庭单元和基础亲缘关系。"""
from __future__ import annotations

from datetime import date, datetime, timezone
from itertools import combinations
from typing import Any
from uuid import uuid4

from sqlalchemy import delete, or_, select, update
from sqlalchemy.orm import Session

from ..database import Base
from ..graph_models import (
    GRAPH_TABLES, FamilyChild, FamilyPartner, FamilyUnit, GenealogyPerson, ParentChild, Spouse,
)
from ..models import User
from ..person_search import matches_person_name, normalize_search_text


class PersonRepository:
    """管理族谱实体，写操作由请求级数据库依赖统一提交或回滚。"""

    def __init__(self, session: Session):
        """保存当前事务内的 SQLAlchemy Session。"""
        self.session = session

    # --- 约束与演示数据 --- #

    def ensure_constraints(self) -> None:
        """创建族谱数据表及模型定义的主键、外键和约束。"""
        Base.metadata.create_all(bind=self.session.connection(), tables=GRAPH_TABLES)

    def get_demo_account_bindings(self) -> dict[int, str]:
        """保存演示人物的账号绑定，供同一事务内重建演示数据后恢复。"""
        self.session.flush()
        return dict(self.session.execute(select(User.id, User.person_id).where(
            User.person_id.startswith("demo:"),
        )).all())

    def restore_demo_account_bindings(self, bindings: dict[int, str]) -> None:
        """恢复仍在新版演示数据中的人物绑定，不改动非演示账号。"""
        for user_id, person_id in bindings.items():
            if self.session.get(GenealogyPerson, person_id) is not None:
                # DELETE 的 SET NULL 由数据库执行，显式 UPDATE 避免 ORM 仍持有旧值而跳过写入。
                self.session.execute(update(User).where(User.id == user_id).values(person_id=person_id))
        self.session.flush()

    def clear_demo_family(self) -> None:
        """只删除 demo 命名空间的人物、家庭及其关联关系。"""
        person_ids = list(self.session.scalars(
            select(GenealogyPerson.person_id).where(GenealogyPerson.person_id.startswith("demo:")),
        ))
        family_ids = list(self.session.scalars(
            select(FamilyUnit.family_unit_id).where(FamilyUnit.family_unit_id.startswith("demo:")),
        ))
        self.session.execute(delete(FamilyPartner).where(or_(
            FamilyPartner.person_id.in_(person_ids), FamilyPartner.family_unit_id.in_(family_ids),
        )))
        self.session.execute(delete(FamilyChild).where(or_(
            FamilyChild.child_id.in_(person_ids), FamilyChild.family_unit_id.in_(family_ids),
        )))
        self.session.execute(delete(ParentChild).where(or_(
            ParentChild.parent_id.in_(person_ids), ParentChild.child_id.in_(person_ids),
        )))
        self.session.execute(delete(Spouse).where(or_(
            Spouse.person_a_id.in_(person_ids), Spouse.person_b_id.in_(person_ids),
        )))
        self.session.execute(delete(GenealogyPerson).where(GenealogyPerson.person_id.in_(person_ids)))
        self.session.execute(delete(FamilyUnit).where(FamilyUnit.family_unit_id.in_(family_ids)))
        self.session.flush()

    # --- 人物 CRUD --- #

    def list_persons(self, skip: int, limit: int) -> list[dict[str, Any]]:
        """按姓名和稳定 ID 分页读取人物。"""
        query = select(GenealogyPerson).order_by(
            GenealogyPerson.name, GenealogyPerson.person_id,
        ).offset(skip).limit(limit)
        return [person.to_dict() for person in self.session.scalars(query)]

    def search_persons(self, keyword: str, limit: int = 30) -> list[dict[str, Any]]:
        """统一匹配姓名、全拼和首拼，按姓名排序并在匹配后限制结果数量。"""
        keyword = normalize_search_text(keyword)
        if not keyword:
            return []
        query = select(GenealogyPerson.person_id, GenealogyPerson.name).order_by(
            GenealogyPerson.name, GenealogyPerson.person_id,
        ).execution_options(yield_per=256)
        matched_ids = []
        # 不先截断前30人，否则排序靠后的人物永远无法被首拼找到。
        # 仅分批扫描ID和姓名，匹配后再读取完整资料，避免全库生平/照片占用内存。
        candidates = self.session.execute(query)
        try:
            for person_id, name in candidates:
                if matches_person_name(name, keyword):
                    matched_ids.append(person_id)
                    if len(matched_ids) >= limit:
                        break
        finally:
            candidates.close()
        if not matched_ids:
            return []
        matches = select(GenealogyPerson).where(GenealogyPerson.person_id.in_(matched_ids)).order_by(
            GenealogyPerson.name, GenealogyPerson.person_id,
        )
        return [person.to_dict() for person in self.session.scalars(matches)]

    def get_person(self, person_id: str) -> dict[str, Any] | None:
        """根据稳定 personId 读取人物属性。"""
        person = self.session.get(GenealogyPerson, str(person_id))
        return person.to_dict() if person is not None else None

    def create_person(self, payload: dict[str, Any]) -> dict[str, Any]:
        """创建人物，并保留已指定的迁移或演示人物 ID。"""
        properties = _clean_properties(payload)
        person = GenealogyPerson(
            person_id=str(properties.pop("personId", uuid4())),
            name=properties.pop("name"),
            gender=properties.pop("gender", "U"),
            properties=properties,
        )
        self.session.add(person)
        self.session.flush()
        return person.to_dict()

    def update_person(self, person_id: str, payload: dict[str, Any]) -> dict[str, Any] | None:
        """更新人物资料，同时保持其稳定 ID 不变。"""
        person = self.session.get(GenealogyPerson, str(person_id))
        if person is None:
            return None
        properties = _clean_properties(payload, keep_nulls=True)
        properties.pop("personId", None)
        # 资料字段的显式 null 表示清空；人物姓名、性别和存活状态仍须有值。
        for key in ("name", "gender", "isAlive"):
            if properties.get(key) is None:
                properties.pop(key, None)
        if "name" in properties:
            person.name = properties.pop("name")
        if "gender" in properties:
            person.gender = properties.pop("gender")
        person.properties = {**person.properties, **properties}
        person.updated_at = datetime.now(timezone.utc)
        self.session.flush()
        return person.to_dict()

    def delete_person(self, person_id: str) -> bool:
        """删除人物及家庭成员、亲子、配偶关系，保留其他人物。"""
        person_id = str(person_id)
        person = self.session.get(GenealogyPerson, person_id)
        if person is None:
            return False
        self.session.execute(delete(FamilyPartner).where(FamilyPartner.person_id == person_id))
        self.session.execute(delete(FamilyChild).where(FamilyChild.child_id == person_id))
        self.session.execute(delete(ParentChild).where(or_(
            ParentChild.parent_id == person_id, ParentChild.child_id == person_id,
        )))
        self.session.execute(delete(Spouse).where(or_(
            Spouse.person_a_id == person_id, Spouse.person_b_id == person_id,
        )))
        self.session.delete(person)
        self.session.flush()
        return True

    # --- 家庭单元与成员 --- #

    def create_family_unit(self, payload: dict[str, Any]) -> dict[str, Any]:
        """创建家庭单元并保留原有家庭属性。"""
        properties = _clean_properties(payload)
        unit = FamilyUnit(
            family_unit_id=str(properties.pop("familyUnitId", uuid4())),
            family_type=properties.pop("type", "marriage"),
            properties=properties,
        )
        self.session.add(unit)
        self.session.flush()
        return unit.to_dict()

    def create_or_update_family_unit(self, payload: dict[str, Any]) -> dict[str, Any]:
        """按稳定 familyUnitId 新增或更新家庭单元。"""
        properties = _clean_properties(payload)
        unit = self.session.get(FamilyUnit, str(properties["familyUnitId"]))
        if unit is None:
            return self.create_family_unit(payload)
        properties.pop("familyUnitId")
        if "type" in properties:
            unit.family_type = properties.pop("type")
        unit.properties = {**unit.properties, **properties}
        unit.updated_at = datetime.now(timezone.utc)
        self.session.flush()
        self._sync_family_relationships(unit.family_unit_id)
        return unit.to_dict()

    def add_partner_to_family_unit(
        self,
        person_id: str,
        family_unit_id: str,
        properties: dict[str, Any],
    ) -> bool:
        """登记家庭成员，并为既有子女及婚姻成员补齐直接关系。"""
        person_id, family_unit_id = str(person_id), str(family_unit_id)
        if self.session.get(GenealogyPerson, person_id) is None or self.session.get(FamilyUnit, family_unit_id) is None:
            return False
        relation = self.session.get(FamilyPartner, (family_unit_id, person_id))
        if relation is None:
            relation = FamilyPartner(family_unit_id=family_unit_id, person_id=person_id, properties={})
            self.session.add(relation)
        relation.properties = {**relation.properties, **_clean_properties(properties)}
        self.session.flush()
        self._sync_family_relationships(family_unit_id)
        return True

    def add_child_to_family_unit(
        self,
        child_id: str,
        family_unit_id: str,
        properties: dict[str, Any],
    ) -> bool:
        """登记家庭子女，并为既有父母补齐同类型直接亲子关系。"""
        child_id, family_unit_id = str(child_id), str(family_unit_id)
        if self.session.get(GenealogyPerson, child_id) is None or self.session.get(FamilyUnit, family_unit_id) is None:
            return False
        relation = self.session.get(FamilyChild, (family_unit_id, child_id))
        if relation is None:
            relation = FamilyChild(family_unit_id=family_unit_id, child_id=child_id, properties={})
            self.session.add(relation)
        relation.properties = {**relation.properties, **_clean_properties(properties)}
        self.session.flush()
        self._sync_family_relationships(family_unit_id)
        return True

    # --- 直接亲子与配偶关系 --- #

    def add_parent_child_relation(
        self,
        parent_id: str,
        child_id: str,
        properties: dict[str, Any],
        source_family_id: str | None = None,
    ) -> bool:
        """新增或更新指定类型亲子事实，不覆盖同对人物的其他关系类型。"""
        parent_id, child_id = str(parent_id), str(child_id)
        if self.session.get(GenealogyPerson, parent_id) is None or self.session.get(GenealogyPerson, child_id) is None:
            return False
        cleaned = _clean_properties(properties)
        kind = cleaned.pop("relationKind", "biological")
        relation = self.session.get(ParentChild, (parent_id, child_id, kind))
        previous_properties = relation.properties if relation is not None else None
        if relation is None:
            relation = ParentChild(parent_id=parent_id, child_id=child_id, relation_kind=kind, properties={})
            self.session.add(relation)
        relation.properties = _relation_properties(previous_properties, cleaned, source_family_id)
        self.session.flush()
        return True

    def add_spouse_relation(
        self,
        person_a_id: str,
        person_b_id: str,
        properties: dict[str, Any],
        source_family_id: str | None = None,
    ) -> bool:
        """创建或更新唯一无向配偶关系。"""
        person_a_id, person_b_id = sorted((str(person_a_id), str(person_b_id)))
        if self.session.get(GenealogyPerson, person_a_id) is None or self.session.get(GenealogyPerson, person_b_id) is None:
            return False
        relation = self.session.get(Spouse, (person_a_id, person_b_id))
        previous_properties = relation.properties if relation is not None else None
        if relation is None:
            relation = Spouse(person_a_id=person_a_id, person_b_id=person_b_id, properties={})
            self.session.add(relation)
        relation.properties = _relation_properties(previous_properties, _clean_properties(properties), source_family_id)
        self.session.flush()
        return True

    def _sync_family_relationships(self, family_unit_id: str) -> None:
        """在同一事务中派生家庭亲子和婚姻关系，支持先录子女后录父母。"""
        unit = self.session.get(FamilyUnit, family_unit_id)
        partners = list(self.session.scalars(select(GenealogyPerson).join(
            FamilyPartner, FamilyPartner.person_id == GenealogyPerson.person_id,
        ).where(FamilyPartner.family_unit_id == family_unit_id).order_by(GenealogyPerson.person_id)))
        children = list(self.session.scalars(select(FamilyChild).where(
            FamilyChild.family_unit_id == family_unit_id,
        )))
        # 家庭成员身份不等于婚姻：单亲、未知和收养家庭不能据此推断配偶。
        if unit.family_type in {"marriage", "partner"}:
            spouse_properties = {key: unit.properties[key] for key in (
                "startDate", "endDate", "displayOrder",
            ) if key in unit.properties}
            for left, right in combinations(partners, 2):
                self.add_spouse_relation(left.person_id, right.person_id, spouse_properties, source_family_id=family_unit_id)
        for child in children:
            for parent in partners:
                # 关系类型沿用该子女成员记录，生育与收养以不同主键分别保存。
                self.add_parent_child_relation(parent.person_id, child.child_id, {
                    "side": {"M": "father", "F": "mother"}.get(parent.gender, "parent"),
                    "relationKind": child.properties.get("relationKind", "biological"),
                    "certainty": child.properties.get("certainty", 1.0),
                }, source_family_id=family_unit_id)


# --- 属性规范化 --- #


def _relation_properties(previous: dict | None, changed: dict, source_family_id: str | None) -> dict:
    """记录明确家庭来源及独立事实；已有未标记历史事实始终按独立事实保留。"""
    explicit = previous is not None and previous.get("_explicit", True)
    # 家庭刷新只补来源，不能覆盖用户独立维护或历史保留的亲缘属性。
    merged = dict(previous) if source_family_id is not None and explicit else {**(previous or {}), **changed}
    if source_family_id is None:
        merged["_explicit"] = True
    else:
        # 旧记录无法证明来自家庭：后续同步也不能将它改成可自动清除的派生事实。
        merged["_explicit"] = explicit
        merged["_family_sources"] = sorted(set((previous or {}).get("_family_sources", [])) | {source_family_id})
    return merged


def _clean_properties(payload: dict[str, Any], keep_nulls: bool = False) -> dict[str, Any]:
    """规范属性与日期；更新资料时允许显式空值清除可选字段。"""
    cleaned = {}
    for key, value in payload.items():
        if (value is None and not keep_nulls) or key in {"createdAt", "updatedAt"}:
            continue
        normalized_key = _normalize_property_name(key)
        cleaned[normalized_key] = value.isoformat() if isinstance(value, (date, datetime)) else value
    return cleaned


def _normalize_property_name(key: str) -> str:
    """把 Python 字段转换为现有 API 和图谱服务使用的 camelCase 属性。"""
    mappings = {
        "birth_date": "birthDate",
        "death_date": "deathDate",
        "is_alive": "isAlive",
        "display_order": "displayOrder",
        "start_date": "startDate",
        "end_date": "endDate",
        "family_type": "type",
    }
    return mappings.get(key, key)
