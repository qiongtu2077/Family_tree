"""
人物和家庭单元数据访问
集中维护 Neo4j 节点与基础关系的写入逻辑。
"""
from __future__ import annotations

from datetime import date, datetime
from typing import Any


class PersonRepository:
    """管理 Person 与 FamilyUnit 节点。"""

    def __init__(self, session):
        """保存 Neo4j Session。"""
        self.session = session

    # --- 约束初始化 --- #

    def ensure_constraints(self) -> None:
        """创建族谱系统需要的唯一约束。"""
        constraints = [
            "CREATE CONSTRAINT person_id_unique IF NOT EXISTS FOR (p:Person) REQUIRE p.personId IS UNIQUE",
            "CREATE CONSTRAINT family_unit_id_unique IF NOT EXISTS FOR (f:FamilyUnit) REQUIRE f.familyUnitId IS UNIQUE",
            "CREATE CONSTRAINT user_id_unique IF NOT EXISTS FOR (u:User) REQUIRE u.userId IS UNIQUE",
            "CREATE CONSTRAINT username_unique IF NOT EXISTS FOR (u:User) REQUIRE u.username IS UNIQUE",
        ]
        for query in constraints:
            self.session.run(query).consume()

    # --- 人物 CRUD --- #

    def list_persons(self, skip: int, limit: int) -> list[dict[str, Any]]:
        """分页读取人物列表。"""
        query = """
        MATCH (person:Person)
        RETURN person
        ORDER BY person.name, person.personId
        SKIP $skip
        LIMIT $limit
        """
        return [dict(record["person"]) for record in self.session.run(query, skip=skip, limit=limit)]

    def search_persons(self, keyword: str) -> list[dict[str, Any]]:
        """按姓名模糊搜索人物。"""
        query = """
        MATCH (person:Person)
        WHERE toLower(person.name) CONTAINS toLower($keyword)
        RETURN person
        ORDER BY person.name, person.personId
        LIMIT 30
        """
        return [dict(record["person"]) for record in self.session.run(query, keyword=keyword)]

    def get_person(self, person_id: str) -> dict[str, Any] | None:
        """根据 personId 读取单个人物。"""
        query = "MATCH (person:Person {personId: $person_id}) RETURN person"
        record = self.session.run(query, person_id=str(person_id)).single()
        return dict(record["person"]) if record else None

    def create_person(self, payload: dict[str, Any]) -> dict[str, Any]:
        """创建人物节点。"""
        properties = _clean_properties(payload)
        query = """
        CREATE (person:Person)
        SET person = $properties,
            person.personId = coalesce($properties.personId, randomUUID()),
            person.createdAt = datetime(),
            person.updatedAt = datetime()
        RETURN person
        """
        record = self.session.run(query, properties=properties).single()
        return dict(record["person"])

    def update_person(self, person_id: str, payload: dict[str, Any]) -> dict[str, Any] | None:
        """更新人物节点。"""
        properties = _clean_properties(payload)
        query = """
        MATCH (person:Person {personId: $person_id})
        SET person += $properties,
            person.updatedAt = datetime()
        RETURN person
        """
        record = self.session.run(query, person_id=str(person_id), properties=properties).single()
        return dict(record["person"]) if record else None

    def delete_person(self, person_id: str) -> bool:
        """删除人物及其直接关系。"""
        query = """
        MATCH (person:Person {personId: $person_id})
        DETACH DELETE person
        RETURN count(person) AS deleted_count
        """
        record = self.session.run(query, person_id=str(person_id)).single()
        return bool(record and record["deleted_count"] > 0)

    # --- 家庭单元与关系 --- #

    def create_family_unit(self, payload: dict[str, Any]) -> dict[str, Any]:
        """创建家庭单元节点。"""
        properties = _clean_properties(payload)
        query = """
        CREATE (unit:FamilyUnit)
        SET unit = $properties,
            unit.familyUnitId = coalesce($properties.familyUnitId, randomUUID()),
            unit.createdAt = datetime(),
            unit.updatedAt = datetime()
        RETURN unit
        """
        record = self.session.run(query, properties=properties).single()
        return dict(record["unit"])

    def create_or_update_family_unit(self, payload: dict[str, Any]) -> dict[str, Any]:
        """按 familyUnitId 创建或更新家庭单元。"""
        properties = _clean_properties(payload)
        query = """
        MERGE (unit:FamilyUnit {familyUnitId: $family_unit_id})
        ON CREATE SET unit.createdAt = datetime()
        SET unit += $properties,
            unit.updatedAt = datetime()
        RETURN unit
        """
        record = self.session.run(
            query,
            family_unit_id=properties["familyUnitId"],
            properties=properties,
        ).single()
        return dict(record["unit"])

    def add_partner_to_family_unit(
        self,
        person_id: str,
        family_unit_id: str,
        properties: dict[str, Any],
    ) -> bool:
        """把人物加入指定家庭单元。"""
        query = """
        MATCH (person:Person {personId: $person_id})
        MATCH (unit:FamilyUnit {familyUnitId: $family_unit_id})
        MERGE (person)-[rel:PARTNER_IN]->(unit)
        SET rel += $properties
        RETURN count(rel) AS relation_count
        """
        record = self.session.run(
            query,
            person_id=str(person_id),
            family_unit_id=str(family_unit_id),
            properties=_clean_properties(properties),
        ).single()
        return bool(record and record["relation_count"] > 0)

    def add_child_to_family_unit(
        self,
        child_id: str,
        family_unit_id: str,
        properties: dict[str, Any],
    ) -> bool:
        """把子女加入指定家庭单元。"""
        query = """
        MATCH (child:Person {personId: $child_id})
        MATCH (unit:FamilyUnit {familyUnitId: $family_unit_id})
        MERGE (unit)-[rel:HAS_CHILD]->(child)
        SET rel += $properties
        RETURN count(rel) AS relation_count
        """
        record = self.session.run(
            query,
            child_id=str(child_id),
            family_unit_id=str(family_unit_id),
            properties=_clean_properties(properties),
        ).single()
        return bool(record and record["relation_count"] > 0)

    def add_parent_child_relation(
        self,
        parent_id: str,
        child_id: str,
        properties: dict[str, Any],
    ) -> bool:
        """创建直接亲子关系。"""
        query = """
        MATCH (parent:Person {personId: $parent_id})
        MATCH (child:Person {personId: $child_id})
        MERGE (parent)-[rel:PARENT_OF]->(child)
        SET rel += $properties
        RETURN count(rel) AS relation_count
        """
        record = self.session.run(
            query,
            parent_id=str(parent_id),
            child_id=str(child_id),
            properties=_clean_properties(properties),
        ).single()
        return bool(record and record["relation_count"] > 0)

    def add_spouse_relation(
        self,
        person_a_id: str,
        person_b_id: str,
        properties: dict[str, Any],
    ) -> bool:
        """创建配偶关系。"""
        query = """
        MATCH (left:Person {personId: $person_a_id})
        MATCH (right:Person {personId: $person_b_id})
        MERGE (left)-[rel:SPOUSE_OF]-(right)
        SET rel += $properties
        RETURN count(rel) AS relation_count
        """
        record = self.session.run(
            query,
            person_a_id=str(person_a_id),
            person_b_id=str(person_b_id),
            properties=_clean_properties(properties),
        ).single()
        return bool(record and record["relation_count"] > 0)


def _clean_properties(payload: dict[str, Any]) -> dict[str, Any]:
    """过滤空值、规范属性名，并把日期时间转成 ISO 字符串。"""
    cleaned = {}
    for key, value in payload.items():
        if value is None:
            continue
        normalized_key = _normalize_property_name(key)
        if isinstance(value, (date, datetime)):
            cleaned[normalized_key] = value.isoformat()
        else:
            cleaned[normalized_key] = value
    return cleaned


def _normalize_property_name(key: str) -> str:
    """把 Python snake_case 字段名转换为 Neo4j 设计字段名。"""
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
