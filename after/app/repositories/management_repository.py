"""提供家庭及关系维护，并在纠错时同步清理家庭派生的直接亲缘事实。"""
from __future__ import annotations

from itertools import combinations
from urllib.parse import unquote

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import aliased

from ..graph_models import FamilyChild, FamilyPartner, FamilyUnit, ParentChild, Spouse
from .graph_repository import _relationship_dict
from .person_repository import PersonRepository, _clean_properties


class ManagementRepository(PersonRepository):
    """复用人物仓储，在同一请求事务中完成资料维护和派生关系修复。"""

    # --- 家庭资料与成员 --- #

    def list_family_units(self, skip: int, limit: int) -> list[dict]:
        """按稳定 ID 分页读取家庭及完整成员。"""
        units = self.session.scalars(select(FamilyUnit).order_by(FamilyUnit.family_unit_id).offset(skip).limit(limit))
        return [self.get_family_detail(unit.family_unit_id) for unit in units]

    def get_family_detail(self, family_id: str) -> dict | None:
        """返回原始家庭 ID、日期、成员及可删除的稳定关系 ID。"""
        unit = self.session.get(FamilyUnit, family_id)
        if unit is None:
            return None
        partners = self.session.scalars(select(FamilyPartner).where(FamilyPartner.family_unit_id == family_id))
        children = self.session.scalars(select(FamilyChild).where(FamilyChild.family_unit_id == family_id))
        return {
            "id": family_id,
            "family_type": unit.family_type,
            "start_date": unit.properties.get("startDate"),
            "end_date": unit.properties.get("endDate"),
            "display_order": unit.properties.get("displayOrder", 0),
            "partners": sorted([{
                "person_id": row.person_id,
                "relationship_id": _relationship_dict("PARTNER_IN", row.person_id, family_id, {})["id"],
                "display_order": row.properties.get("displayOrder", 0),
            } for row in partners], key=lambda row: (row["display_order"], row["person_id"])),
            "children": sorted([{
                "person_id": row.child_id,
                "relationship_id": _relationship_dict("HAS_CHILD", family_id, row.child_id, {})["id"],
                "birth_order": row.properties.get("birthOrder", 0),
                "relation_kind": row.properties.get("relationKind", "biological"),
                "certainty": row.properties.get("certainty", 1.0),
            } for row in children], key=lambda row: (row["birth_order"], row["person_id"])),
        }

    def update_family(self, family_id: str, payload: dict) -> dict | None:
        """更新家庭属性，并移除类型变化后已不成立的家庭派生配偶关系。"""
        unit = self.session.get(FamilyUnit, family_id)
        if unit is None:
            return None
        previous_facts = self.capture_family_facts(family_id)
        properties = _clean_properties(payload, keep_nulls=True)
        if "type" in properties:
            unit.family_type = properties.pop("type")
        unit.properties = {**unit.properties, **properties}
        self.session.flush()
        self._sync_family_relationships(family_id)
        self.clean_unsupported_facts(previous_facts)
        return self.get_family_detail(family_id)

    def delete_family(self, family_id: str) -> bool:
        """删除家庭和成员关系，保留所有人物及仍有来源的直接亲缘。"""
        unit = self.session.get(FamilyUnit, family_id)
        if unit is None:
            return False
        previous_facts = self.capture_family_facts(family_id)
        for model in (FamilyPartner, FamilyChild):
            for row in self.session.scalars(select(model).where(model.family_unit_id == family_id)):
                self.session.delete(row)
        self.session.delete(unit)
        self.session.flush()
        self.clean_unsupported_facts(previous_facts)
        return True

    # --- 关系列表与纠错 --- #

    def list_relationships(self, skip: int, limit: int) -> list[dict]:
        """返回家庭成员和直接亲缘，区分只能通过家庭成员纠错的派生事实。"""
        result = []
        for row in self.session.scalars(select(FamilyPartner)):
            result.append({
                "id": _relationship_dict("PARTNER_IN", row.person_id, row.family_unit_id, {})["id"],
                "relationship_type": "partner", "person_id": row.person_id,
                "family_unit_id": row.family_unit_id, "display_order": row.properties.get("displayOrder", 0),
            })
        for row in self.session.scalars(select(FamilyChild)):
            result.append({
                "id": _relationship_dict("HAS_CHILD", row.family_unit_id, row.child_id, {})["id"],
                "relationship_type": "child", "target_person_id": row.child_id,
                "family_unit_id": row.family_unit_id, "birth_order": row.properties.get("birthOrder", 0),
                "relation_kind": row.properties.get("relationKind", "biological"),
                "certainty": row.properties.get("certainty", 1.0),
            })
        for row in self.session.scalars(select(ParentChild)):
            sources = self.parent_family_sources(row.parent_id, row.child_id, row.relation_kind)
            result.append({
                "id": _relationship_dict("PARENT_OF", row.parent_id, row.child_id, row.to_dict())["id"],
                "relationship_type": "parent_child", "person_id": row.parent_id,
                "target_person_id": row.child_id, "side": row.properties.get("side", "parent"),
                "relation_kind": row.relation_kind, "certainty": row.properties.get("certainty", 1.0),
                "derived_from_family": bool(sources), "source_family_ids": sources,
            })
        for row in self.session.scalars(select(Spouse)):
            sources = self.spouse_family_sources(row.person_a_id, row.person_b_id)
            result.append({
                "id": _relationship_dict("SPOUSE_OF", row.person_a_id, row.person_b_id, {})["id"],
                "relationship_type": "spouse", "person_id": row.person_a_id,
                "target_person_id": row.person_b_id, "derived_from_family": bool(sources),
                "source_family_ids": sources, "display_order": row.properties.get("displayOrder", 0),
            })
        return sorted(result, key=lambda item: item["id"])[skip:skip + limit]

    def delete_relationship(self, relation_id: str) -> bool:
        """移除指定成员或独立关系；家庭仍支持的派生关系须从成员页纠错。"""
        parts = relation_id.split(":")
        expected_lengths = {"PARTNER_IN": 3, "HAS_CHILD": 3, "PARENT_OF": 4, "SPOUSE_OF": 3}
        if not parts or len(parts) != expected_lengths.get(parts[0]):
            raise HTTPException(status_code=400, detail="关系 ID 格式无效")
        kind, source, target = parts[0], unquote(parts[1]), unquote(parts[2])
        family_id = source if kind == "HAS_CHILD" else target
        previous_facts = self.capture_family_facts(family_id) if kind in {"PARTNER_IN", "HAS_CHILD"} else []
        if kind == "PARTNER_IN":
            row = self.session.get(FamilyPartner, (family_id, source))
        elif kind == "HAS_CHILD":
            row = self.session.get(FamilyChild, (family_id, target))
        elif kind == "PARENT_OF":
            relation_kind = unquote(parts[3])
            if self.parent_family_sources(source, target, relation_kind):
                raise HTTPException(status_code=409, detail="此亲子关系由家庭成员派生，请在家庭资料中移除对应父母或子女成员")
            row = self.session.get(ParentChild, (source, target, relation_kind))
        else:
            if self.spouse_family_sources(source, target):
                raise HTTPException(status_code=409, detail="此配偶关系由家庭成员派生，请在家庭资料中移除对应成员或修改家庭类型")
            row = self.session.get(Spouse, tuple(sorted((source, target))))
        if row is None:
            return False
        self.session.delete(row)
        self.session.flush()
        self.clean_unsupported_facts(previous_facts)
        return True

    # --- 家庭派生事实一致性 --- #

    def capture_family_facts(self, family_id: str) -> list[tuple]:
        """在成员变更前记录其支持的事实，供变更后按实际来源清理。"""
        unit = self.session.get(FamilyUnit, family_id)
        if unit is None:
            return []
        partners = list(self.session.scalars(select(FamilyPartner).where(FamilyPartner.family_unit_id == family_id)))
        children = list(self.session.scalars(select(FamilyChild).where(FamilyChild.family_unit_id == family_id)))
        facts = [("parent", parent.person_id, child.child_id, child.properties.get("relationKind", "biological")) for parent in partners for child in children]
        if unit.family_type in {"marriage", "partner"}:
            facts.extend(("spouse", *sorted((left.person_id, right.person_id))) for left, right in combinations(partners, 2))
        return facts

    def parent_family_sources(self, parent_id: str, child_id: str, relation_kind: str) -> list[str]:
        """根据真实家庭成员查询某一类型亲子事实的所有当前来源。"""
        rows = self.session.execute(select(FamilyPartner.family_unit_id, FamilyChild.properties).join(
            FamilyChild, FamilyPartner.family_unit_id == FamilyChild.family_unit_id,
        ).where(FamilyPartner.person_id == parent_id, FamilyChild.child_id == child_id))
        return sorted(family_id for family_id, properties in rows if properties.get("relationKind", "biological") == relation_kind)

    def spouse_family_sources(self, person_a_id: str, person_b_id: str) -> list[str]:
        """只有婚姻或伴侣家庭共同成员可派生配偶关系。"""
        other = aliased(FamilyPartner)
        return sorted(self.session.scalars(select(FamilyPartner.family_unit_id).join(
            other, FamilyPartner.family_unit_id == other.family_unit_id,
        ).join(FamilyUnit, FamilyUnit.family_unit_id == FamilyPartner.family_unit_id).where(
            FamilyPartner.person_id == person_a_id, other.person_id == person_b_id,
            FamilyUnit.family_type.in_(("marriage", "partner")),
        )))

    def clean_unsupported_facts(self, previous_facts: list[tuple]) -> None:
        """清理失去家庭来源的派生事实，显式独立录入和其他家庭来源始终保留。"""
        for fact in set(previous_facts):
            if fact[0] == "parent":
                _, parent_id, child_id, relation_kind = fact
                row = self.session.get(ParentChild, (parent_id, child_id, relation_kind))
                supported = self.parent_family_sources(parent_id, child_id, relation_kind)
            else:
                _, left, right = fact
                row = self.session.get(Spouse, (left, right))
                supported = self.spouse_family_sources(left, right)
            if row is None or "_family_sources" not in row.properties:
                continue
            remaining_sources = sorted(set(row.properties["_family_sources"]) & set(supported))
            # 只清除有明确来源的派生事实，未标记的历史数据必须由用户在关系页另行移除。
            if not remaining_sources and not row.properties.get("_explicit", True):
                self.session.delete(row)
            else:
                row.properties = {**row.properties, "_family_sources": remaining_sources}
        self.session.flush()
