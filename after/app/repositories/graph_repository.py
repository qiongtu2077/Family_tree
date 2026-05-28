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
        query = f"""
        MATCH (center:Person {{personId: $person_id}})
        CALL {{
          WITH center
          MATCH path=(ancestor:Person)-[:PARENT_OF*0..{depth}]->(center)
          UNWIND nodes(path) AS person
          RETURN collect(DISTINCT person) AS ancestor_people
        }}
        CALL {{
          WITH center
          MATCH path=(center)-[:PARENT_OF*0..{depth}]->(descendant:Person)
          UNWIND nodes(path) AS person
          RETURN collect(DISTINCT person) AS descendant_people
        }}
        WITH center, ancestor_people + descendant_people AS scoped_people
        UNWIND scoped_people AS scoped_person
        WITH center, collect(DISTINCT scoped_person) AS people
        OPTIONAL MATCH (parent:Person)-[:PARENT_OF]->(center)
        WITH center, people, collect(DISTINCT parent) AS parents
        OPTIONAL MATCH (sibling:Person)<-[:PARENT_OF]-(p:Person)
        WHERE p IN parents AND sibling <> center
        WITH people + collect(DISTINCT sibling) AS raw_people
        UNWIND raw_people AS person
        WITH collect(DISTINCT person) AS people
        OPTIONAL MATCH (person:Person)-[:PARTNER_IN]->(unit:FamilyUnit)
        WHERE person IN people
        OPTIONAL MATCH (partner:Person)-[:PARTNER_IN]->(unit)
        WITH people + collect(DISTINCT partner) AS raw_people, collect(DISTINCT unit) AS units
        UNWIND raw_people AS final_person
        WITH collect(DISTINCT final_person) AS people, units
        OPTIONAL MATCH (p:Person)-[partner_rel:PARTNER_IN]->(unit:FamilyUnit)
        WHERE p IN people AND unit IN units
        OPTIONAL MATCH (unit)-[child_rel:HAS_CHILD]->(child:Person)
        WHERE unit IN units AND child IN people
        OPTIONAL MATCH (parent:Person)-[parent_rel:PARENT_OF]->(child2:Person)
        WHERE parent IN people AND child2 IN people
        OPTIONAL MATCH (left:Person)-[spouse_rel:SPOUSE_OF]-(right:Person)
        WHERE left IN people AND right IN people
        RETURN
          people AS persons,
          units AS family_units,
          collect(DISTINCT partner_rel) AS partner_edges,
          collect(DISTINCT child_rel) AS child_edges,
          collect(DISTINCT parent_rel) AS parent_edges,
          collect(DISTINCT spouse_rel) AS spouse_edges
        """
        record = self.session.run(query, person_id=str(person_id)).single()
        return _record_to_dict(record) if record else None

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


def _safe_depth(depth: int) -> int:
    """把查询深度限制在安全范围内。"""
    return min(max(int(depth), 1), 10)


def _record_to_dict(record) -> dict[str, Any]:
    """把 Neo4j Record 转成普通字典。"""
    return {key: record[key] for key in record.keys()}
