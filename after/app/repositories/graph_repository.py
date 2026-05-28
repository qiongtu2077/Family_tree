"""
族谱图数据访问
只负责执行 Cypher 查询和返回原始图记录。
"""
from __future__ import annotations

from typing import Any


class GraphRepository:
    """读取族谱图投影数据。"""

    def __init__(self, session):
        """保存 Neo4j Session。"""
        self.session = session

    # --- 图谱视图 --- #

    def get_focus_graph(self, person_id: str, generations: int) -> dict[str, Any] | None:
        """读取中心人物谱系图所需的人物、家庭单元和关系。"""
        depth = _safe_depth(generations)
        center = self._get_person_node(person_id)
        if not center:
            return None

        persons = [center]
        persons.extend(self._get_related_people(person_id, "ancestors", depth))
        persons.extend(self._get_related_people(person_id, "descendants", depth))
        persons.extend(self._get_siblings_for_lineage(person_id, depth))
        person_ids = _unique_ids([dict(person).get("personId") for person in persons])

        family_units = self._get_family_units_for_people(person_ids)
        family_unit_ids = _unique_ids([dict(unit).get("familyUnitId") for unit in family_units])
        partners = self._get_partners_for_family_units(family_unit_ids)
        persons.extend(partners)
        person_ids = [dict(person).get("personId") for person in persons]
        person_ids = _unique_ids(person_ids)
        person_ids = self._expand_people_from_family_units(person_ids, family_unit_ids)
        family_units = self._get_family_units_for_people(person_ids)
        family_unit_ids = _unique_ids([dict(unit).get("familyUnitId") for unit in family_units])
        persons = self._get_people_by_ids(person_ids)
        edges = self._get_edges_for_scope(person_ids, family_unit_ids)
        return {
            "persons": persons,
            "family_units": family_units,
            **edges,
        }

    def get_branch_graph(self, family_unit_id: str, depth: int) -> dict[str, Any] | None:
        """读取某个家庭单元向下展开的后代分支图。"""
        branch_depth = _safe_depth(depth)
        query = f"""
        MATCH (root:FamilyUnit {{familyUnitId: $family_unit_id}})
        OPTIONAL MATCH (root)<-[:PARTNER_IN]-(partner:Person)
        OPTIONAL MATCH path=(root)-[:HAS_CHILD|PARENT_OF*1..{branch_depth}]->(descendant:Person)
        WITH root, collect(DISTINCT partner) AS partners, collect(DISTINCT descendant) AS descendants
        WITH root, partners + descendants AS raw_people
        UNWIND raw_people AS person
        WITH root, collect(DISTINCT person) AS people
        OPTIONAL MATCH (person:Person)-[:PARTNER_IN]->(unit:FamilyUnit)
        WHERE person IN people
        WITH people, collect(DISTINCT unit) + [root] AS units
        OPTIONAL MATCH (p:Person)-[partner_rel:PARTNER_IN]->(unit:FamilyUnit)
        WHERE p IN people AND unit IN units
        OPTIONAL MATCH (unit)-[child_rel:HAS_CHILD]->(child:Person)
        WHERE unit IN units AND child IN people
        OPTIONAL MATCH (parent:Person)-[parent_rel:PARENT_OF]->(child2:Person)
        WHERE parent IN people AND child2 IN people
        RETURN
          people AS persons,
          units AS family_units,
          collect(DISTINCT partner_rel) AS partner_edges,
          collect(DISTINCT child_rel) AS child_edges,
          collect(DISTINCT parent_rel) AS parent_edges,
          [] AS spouse_edges
        """
        record = self.session.run(query, family_unit_id=str(family_unit_id)).single()
        return _record_to_dict(record) if record else None

    def get_relation_path(self, from_person_id: str, to_person_id: str) -> dict[str, Any] | None:
        """读取两个人之间的最短亲缘路径。"""
        query = """
        MATCH (start:Person {personId: $from_person_id})
        MATCH (end:Person {personId: $to_person_id})
        MATCH path = shortestPath((start)-[:PARENT_OF|SPOUSE_OF*..10]-(end))
        RETURN nodes(path) AS persons, relationships(path) AS relations
        """
        record = self.session.run(
            query,
            from_person_id=str(from_person_id),
            to_person_id=str(to_person_id),
        ).single()
        return _record_to_dict(record) if record else None

    # --- 管理诊断 --- #

    def get_graph_issues(self) -> list[dict[str, Any]]:
        """读取常见族谱数据异常。"""
        query = """
        CALL {
          MATCH (person:Person)
          WHERE NOT (person)--()
          RETURN person, 'isolated_person' AS issue_type, '人物没有任何关系' AS message
          UNION ALL
          MATCH (child:Person)<-[rel:PARENT_OF {side: 'father'}]-(father:Person)
          WITH child, collect(father) AS fathers
          WHERE size(fathers) > 1
          RETURN child AS person, 'multiple_fathers' AS issue_type, '一个人物存在多个生父' AS message
          UNION ALL
          MATCH (child:Person)<-[rel:PARENT_OF {side: 'mother'}]-(mother:Person)
          WITH child, collect(mother) AS mothers
          WHERE size(mothers) > 1
          RETURN child AS person, 'multiple_mothers' AS issue_type, '一个人物存在多个生母' AS message
          UNION ALL
          MATCH path=(person:Person)-[:PARENT_OF*1..12]->(person)
          RETURN person, 'ancestor_cycle' AS issue_type, '祖先路径出现循环' AS message
        }
        RETURN person, issue_type, message
        ORDER BY issue_type, person.name
        LIMIT 200
        """
        return [_record_to_dict(record) for record in self.session.run(query)]

    def _get_person_node(self, person_id: str):
        """读取单个人物节点。"""
        record = self.session.run(
            "MATCH (person:Person {personId: $person_id}) RETURN person LIMIT 1",
            person_id=str(person_id),
        ).single()
        return record["person"] if record else None

    def _get_related_people(self, person_id: str, direction: str, depth: int) -> list[Any]:
        """按方向读取祖先或后代人物。"""
        if direction == "ancestors":
            query = f"""
            MATCH path=(person:Person)-[:PARENT_OF*1..{depth}]->(:Person {{personId: $person_id}})
            UNWIND nodes(path) AS related
            RETURN DISTINCT related AS person
            """
        else:
            query = f"""
            MATCH path=(:Person {{personId: $person_id}})-[:PARENT_OF*1..{depth}]->(person:Person)
            UNWIND nodes(path) AS related
            RETURN DISTINCT related AS person
            """
        return [record["person"] for record in self.session.run(query, person_id=str(person_id))]

    def _get_siblings_for_lineage(self, person_id: str, depth: int) -> list[Any]:
        """读取中心人物及祖先链上人物的兄弟姐妹。"""
        lineage_ids = self._get_lineage_person_ids(person_id, depth)
        query = """
        MATCH (lineage:Person)
        WHERE lineage.personId IN $lineage_ids
        MATCH (lineage)<-[:PARENT_OF]-(parent:Person)-[:PARENT_OF]->(sibling:Person)
        WHERE sibling <> lineage
        RETURN DISTINCT sibling AS person
        """
        return [record["person"] for record in self.session.run(query, lineage_ids=lineage_ids)]

    def _get_lineage_person_ids(self, person_id: str, depth: int) -> list[str]:
        """读取中心人物与祖先链人物 ID。"""
        query = f"""
        MATCH path=(ancestor:Person)-[:PARENT_OF*0..{depth}]->(:Person {{personId: $person_id}})
        UNWIND nodes(path) AS person
        RETURN DISTINCT person.personId AS person_id
        """
        return _unique_ids([
            record["person_id"]
            for record in self.session.run(query, person_id=str(person_id))
            if record["person_id"]
        ])

    def _get_family_units_for_people(self, person_ids: list[str]) -> list[Any]:
        """读取人物所属家庭单元。"""
        query = """
        MATCH (person:Person)-[:PARTNER_IN]->(unit:FamilyUnit)
        WHERE person.personId IN $person_ids
        RETURN DISTINCT unit
        """
        return [record["unit"] for record in self.session.run(query, person_ids=person_ids)]

    def _get_partners_for_family_units(self, family_unit_ids: list[str]) -> list[Any]:
        """读取家庭单元中的伴侣人物。"""
        query = """
        MATCH (partner:Person)-[:PARTNER_IN]->(unit:FamilyUnit)
        WHERE unit.familyUnitId IN $family_unit_ids
        RETURN DISTINCT partner AS person
        """
        return [
            record["person"]
            for record in self.session.run(query, family_unit_ids=family_unit_ids)
        ]

    def _get_people_by_ids(self, person_ids: list[str]) -> list[Any]:
        """按 ID 列表重新读取去重后的人物节点。"""
        query = """
        MATCH (person:Person)
        WHERE person.personId IN $person_ids
        RETURN person
        ORDER BY person.birthDate, person.name
        """
        return [record["person"] for record in self.session.run(query, person_ids=person_ids)]

    def _expand_people_from_family_units(
        self,
        person_ids: list[str],
        family_unit_ids: list[str],
    ) -> list[str]:
        """把家庭单元中的配偶和子女纳入视图人物范围。"""
        query = """
        MATCH (person:Person)
        WHERE person.personId IN $person_ids
        WITH collect(DISTINCT person.personId) AS seed_ids
        OPTIONAL MATCH (partner:Person)-[:PARTNER_IN]->(unit:FamilyUnit)
        WHERE unit.familyUnitId IN $family_unit_ids
        OPTIONAL MATCH (unit)-[:HAS_CHILD]->(child:Person)
        WITH seed_ids,
             collect(DISTINCT partner.personId) AS partner_ids,
             collect(DISTINCT child.personId) AS child_ids
        RETURN seed_ids + partner_ids + child_ids AS person_ids
        """
        record = self.session.run(
            query,
            person_ids=person_ids,
            family_unit_ids=family_unit_ids,
        ).single()
        return _unique_ids(record["person_ids"] if record else person_ids)

    def _get_edges_for_scope(
        self,
        person_ids: list[str],
        family_unit_ids: list[str],
    ) -> dict[str, list[Any]]:
        """按人物和家庭单元范围读取边，避免复杂聚合查询卡顿。"""
        params = {"person_ids": person_ids, "family_unit_ids": family_unit_ids}
        partner_edges = self._collect_relationships(
            """
            MATCH (p:Person)-[rel:PARTNER_IN]->(unit:FamilyUnit)
            WHERE p.personId IN $person_ids AND unit.familyUnitId IN $family_unit_ids
            RETURN p AS source, rel, unit AS target
            """,
            params,
        )
        child_edges = self._collect_relationships(
            """
            MATCH (unit:FamilyUnit)-[rel:HAS_CHILD]->(child:Person)
            WHERE unit.familyUnitId IN $family_unit_ids AND child.personId IN $person_ids
            RETURN unit AS source, rel, child AS target
            """,
            params,
        )
        parent_edges = self._collect_relationships(
            """
            MATCH (parent:Person)-[rel:PARENT_OF]->(child:Person)
            WHERE parent.personId IN $person_ids AND child.personId IN $person_ids
            RETURN parent AS source, rel, child AS target
            """,
            params,
        )
        spouse_edges = self._collect_relationships(
            """
            MATCH (left:Person)-[rel:SPOUSE_OF]-(right:Person)
            WHERE left.personId IN $person_ids AND right.personId IN $person_ids
            RETURN left AS source, rel, right AS target
            """,
            params,
        )
        return {
            "partner_edges": partner_edges,
            "child_edges": child_edges,
            "parent_edges": parent_edges,
            "spouse_edges": spouse_edges,
        }

    def _collect_relationships(self, query: str, params: dict[str, Any]) -> list[Any]:
        """执行边查询并返回关系列表。"""
        return [
            {
                "source": record["source"],
                "relationship": record["rel"],
                "target": record["target"],
            }
            for record in self.session.run(query, **params)
        ]


def _safe_depth(depth: int) -> int:
    """把查询深度限制在安全范围内。"""
    return min(max(int(depth), 1), 10)


def _record_to_dict(record) -> dict[str, Any]:
    """把 Neo4j Record 转成普通字典。"""
    return {key: record[key] for key in record.keys()}


def _unique_ids(values: list[str]) -> list[str]:
    """保留顺序去重 ID 列表。"""
    seen = set()
    result = []
    for value in values:
        if value and value not in seen:
            seen.add(value)
            result.append(value)
    return result
