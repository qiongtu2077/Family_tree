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

    def get_mainline_graph(
        self,
        person_id: str,
        ancestor_depth: int,
        descendant_depth: int,
    ) -> dict[str, Any] | None:
        """读取本家主线图所需的人物、家庭单元和关系。"""
        generations = max(_safe_depth(ancestor_depth), _safe_depth(descendant_depth))
        return self.get_focus_graph(person_id, generations)

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

    def get_inlaw_graph(
        self,
        person_id: str,
        spouse_id: str,
        depth: int,
    ) -> dict[str, Any] | None:
        """读取配偶原生家族谱系图。"""
        if not self._are_spouses_or_partners(person_id, spouse_id):
            return None

        raw_graph = self.get_focus_graph(spouse_id, _safe_depth(depth))
        if not raw_graph:
            return None
        return raw_graph

    def get_bridge_graph(
        self,
        person_id: str,
        spouse_id: str,
        depth: int,
        family_unit_id: str | None = None,
    ) -> dict[str, Any] | None:
        """读取两边近亲通过婚姻连接的桥接图。"""
        if not self._are_spouses_or_partners(person_id, spouse_id, family_unit_id):
            return None

        bridge_depth = min(_safe_depth(depth), 4)
        left_graph = self.get_focus_graph(person_id, bridge_depth)
        right_graph = self.get_focus_graph(spouse_id, bridge_depth)
        if not left_graph or not right_graph:
            return None
        return _merge_raw_graphs(left_graph, right_graph)

    def get_branch_graph(self, family_unit_id: str, depth: int) -> dict[str, Any] | None:
        """读取某个家庭单元向下展开的后代分支图。"""
        branch_depth = _safe_depth(depth)
        root = self._get_family_unit_node(family_unit_id)
        if not root:
            return None

        family_unit_ids = [str(family_unit_id)]
        person_ids = _unique_ids([
            dict(person).get("personId")
            for person in self._get_partners_for_family_units(family_unit_ids)
        ])
        frontier_unit_ids = [str(family_unit_id)]

        # 后代分支只沿 FamilyUnit -> HAS_CHILD -> Person -> PARTNER_IN -> FamilyUnit 展开，
        # 不再把 PARENT_OF 混进可变路径，避免把旁系关系网投影成毛线团。
        for _ in range(branch_depth):
            child_ids = self._get_child_person_ids_for_family_units(frontier_unit_ids)
            new_child_ids = [child_id for child_id in child_ids if child_id not in person_ids]
            person_ids = _unique_ids([*person_ids, *new_child_ids])
            if not new_child_ids:
                break

            child_family_units = self._get_family_units_for_people(new_child_ids)
            next_unit_ids = _unique_ids([
                dict(unit).get("familyUnitId")
                for unit in child_family_units
                if dict(unit).get("familyUnitId") not in family_unit_ids
            ])
            family_unit_ids = _unique_ids([*family_unit_ids, *next_unit_ids])
            frontier_unit_ids = next_unit_ids
            if not frontier_unit_ids:
                break

        partner_ids = _unique_ids([
            dict(person).get("personId")
            for person in self._get_partners_for_family_units(family_unit_ids)
        ])
        person_ids = _unique_ids([*person_ids, *partner_ids])
        persons = self._get_people_by_ids(person_ids)
        family_units = self._get_family_units_by_ids(family_unit_ids)
        edges = self._get_edges_for_scope(person_ids, family_unit_ids)
        return {
            "persons": persons,
            "family_units": family_units,
            **edges,
        }

    def get_branch_graph_by_root(
        self,
        root_type: str,
        root_id: str,
        depth: int,
    ) -> dict[str, Any] | None:
        """按人物或家庭单元根节点读取后代分支图。"""
        if root_type == "familyUnit":
            return self.get_branch_graph(root_id, depth)

        root = self._get_person_node(root_id)
        if not root:
            return None

        family_unit_id = self._get_primary_child_family_unit_id(root_id)
        if family_unit_id:
            return self.get_branch_graph(family_unit_id, depth)

        return {
            "persons": [root],
            "family_units": [],
            "partner_edges": [],
            "child_edges": [],
            "parent_edges": [],
            "spouse_edges": [],
            "warnings": ["该人物暂未录入后代分支"],
        }

    def get_overview_graph(self, scope: str, max_nodes: int) -> dict[str, Any] | None:
        """读取家族全景图，默认返回范围内全部人物和家庭单元。"""
        limit = _safe_limit(max_nodes)
        normalized_scope = (scope or "all").strip()

        if normalized_scope.startswith("center:"):
            center_person_id = normalized_scope.replace("center:", "", 1)
            return self.get_focus_graph(center_person_id, 4)

        if normalized_scope not in {"all", "demo"}:
            return self._get_family_scope_overview(normalized_scope, limit)

        persons, total_count = self._get_scoped_people(normalized_scope, limit)
        person_ids = _unique_ids([dict(person).get("personId") for person in persons])
        if total_count <= limit:
            family_units = self._get_scoped_family_units(normalized_scope)
        else:
            family_units = self._get_family_units_touching_people(person_ids)

        family_unit_ids = _unique_ids([dict(unit).get("familyUnitId") for unit in family_units])
        edges = self._get_edges_for_scope(person_ids, family_unit_ids)
        warnings = []
        if total_count > limit:
            warnings.append(f"已按上限显示 {limit} / {total_count} 人")

        return {
            "persons": persons,
            "family_units": family_units,
            "hidden_relation_count": max(total_count - limit, 0),
            "warnings": warnings,
            **edges,
        }

    def get_center_candidates(self, keyword: str, limit: int) -> list[Any]:
        """读取中心人物候选，最终选择必须落到真实 Person。"""
        safe_keyword = (keyword or "").strip()
        if not safe_keyword:
            return []

        query = """
        MATCH (person:Person)
        WHERE toLower(person.name) CONTAINS toLower($keyword)
        RETURN person
        ORDER BY person.name, person.birthDate, person.personId
        LIMIT $limit
        """
        return [
            record["person"]
            for record in self.session.run(
                query,
                keyword=safe_keyword,
                limit=min(max(int(limit), 1), 50),
            )
        ]

    def get_center_context(self, person_id: str) -> dict[str, Any] | None:
        """读取中心人物上下文和五图参数候选。"""
        person = self._get_person_node(person_id)
        if not person:
            return None

        spouse_options = self._get_center_spouse_options(person_id)
        family_options = self._get_center_family_options(person_id)
        summary = self._get_nine_kinship_summary(person_id)
        warnings = []
        if not spouse_options:
            warnings.append("当前中心人物暂无配偶/伴侣家庭，姻亲谱系和联姻桥接需要先补充关系")
        if not family_options:
            warnings.append("当前中心人物暂无可展开家庭单元，后代分支可能只显示本人")

        return {
            "person": person,
            "available_spouses": spouse_options,
            "available_family_units": family_options,
            "default_mainline_depth": 3,
            "nine_kinship_summary": summary,
            "warnings": warnings,
        }

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

    def _get_family_unit_node(self, family_unit_id: str):
        """读取单个家庭单元节点。"""
        record = self.session.run(
            "MATCH (unit:FamilyUnit {familyUnitId: $family_unit_id}) RETURN unit LIMIT 1",
            family_unit_id=str(family_unit_id),
        ).single()
        return record["unit"] if record else None

    def _are_spouses_or_partners(
        self,
        person_id: str,
        spouse_id: str,
        family_unit_id: str | None = None,
    ) -> bool:
        """判断两个人是否通过配偶或同一家庭单元连接。"""
        if family_unit_id:
            query = """
            MATCH (left:Person {personId: $person_id})
            MATCH (right:Person {personId: $spouse_id})
            OPTIONAL MATCH (left)-[:PARTNER_IN]->(unit:FamilyUnit {familyUnitId: $family_unit_id})<-[:PARTNER_IN]-(right)
            RETURN count(DISTINCT unit) AS relation_count
            """
            record = self.session.run(
                query,
                person_id=str(person_id),
                spouse_id=str(spouse_id),
                family_unit_id=str(family_unit_id),
            ).single()
            return bool(record and record["relation_count"] > 0)

        query = """
        MATCH (left:Person {personId: $person_id})
        MATCH (right:Person {personId: $spouse_id})
        OPTIONAL MATCH (left)-[spouse_rel:SPOUSE_OF]-(right)
        OPTIONAL MATCH (left)-[:PARTNER_IN]->(unit:FamilyUnit)<-[:PARTNER_IN]-(right)
        RETURN count(DISTINCT spouse_rel) + count(DISTINCT unit) AS relation_count
        """
        record = self.session.run(
            query,
            person_id=str(person_id),
            spouse_id=str(spouse_id),
        ).single()
        return bool(record and record["relation_count"] > 0)

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

    def _get_family_units_by_ids(self, family_unit_ids: list[str]) -> list[Any]:
        """按 ID 列表读取家庭单元节点。"""
        query = """
        MATCH (unit:FamilyUnit)
        WHERE unit.familyUnitId IN $family_unit_ids
        RETURN unit
        ORDER BY unit.displayOrder, unit.familyUnitId
        """
        return [
            record["unit"]
            for record in self.session.run(query, family_unit_ids=family_unit_ids)
        ]

    def _get_family_units_touching_people(self, person_ids: list[str]) -> list[Any]:
        """读取人物作为伴侣或子女接触到的家庭单元。"""
        query = """
        MATCH (unit:FamilyUnit)
        WHERE EXISTS {
          MATCH (person:Person)-[:PARTNER_IN]->(unit)
          WHERE person.personId IN $person_ids
        } OR EXISTS {
          MATCH (unit)-[:HAS_CHILD]->(child:Person)
          WHERE child.personId IN $person_ids
        }
        RETURN DISTINCT unit
        ORDER BY unit.displayOrder, unit.familyUnitId
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

    def _get_child_person_ids_for_family_units(self, family_unit_ids: list[str]) -> list[str]:
        """读取家庭单元的直接子女 ID。"""
        query = """
        MATCH (unit:FamilyUnit)-[:HAS_CHILD]->(child:Person)
        WHERE unit.familyUnitId IN $family_unit_ids
        RETURN DISTINCT child.personId AS person_id
        ORDER BY child.birthDate, child.name, child.personId
        """
        return _unique_ids([
            record["person_id"]
            for record in self.session.run(query, family_unit_ids=family_unit_ids)
            if record["person_id"]
        ])

    def _get_people_by_ids(self, person_ids: list[str]) -> list[Any]:
        """按 ID 列表重新读取去重后的人物节点。"""
        query = """
        MATCH (person:Person)
        WHERE person.personId IN $person_ids
        RETURN person
        ORDER BY person.birthDate, person.name
        """
        return [record["person"] for record in self.session.run(query, person_ids=person_ids)]

    def _get_primary_child_family_unit_id(self, person_id: str) -> str | None:
        """读取人物作为伴侣且有子女的首个家庭单元。"""
        query = """
        MATCH (:Person {personId: $person_id})-[:PARTNER_IN]->(unit:FamilyUnit)
        WHERE EXISTS { MATCH (unit)-[:HAS_CHILD]->(:Person) }
        RETURN unit.familyUnitId AS family_unit_id
        ORDER BY unit.displayOrder, unit.familyUnitId
        LIMIT 1
        """
        record = self.session.run(query, person_id=str(person_id)).single()
        return str(record["family_unit_id"]) if record and record["family_unit_id"] else None

    def _get_scoped_people(self, scope: str, limit: int) -> tuple[list[Any], int]:
        """按 all/demo 范围读取人物和总数。"""
        where_clause = "person.personId STARTS WITH 'demo:'" if scope == "demo" else "true"
        count_query = f"""
        MATCH (person:Person)
        WHERE {where_clause}
        RETURN count(person) AS total_count
        """
        people_query = f"""
        MATCH (person:Person)
        WHERE {where_clause}
        RETURN person
        ORDER BY person.birthDate, person.name, person.personId
        LIMIT $limit
        """
        total_record = self.session.run(count_query).single()
        persons = [record["person"] for record in self.session.run(people_query, limit=limit)]
        return persons, int(total_record["total_count"] if total_record else len(persons))

    def _get_center_spouse_options(self, person_id: str) -> list[dict[str, Any]]:
        """读取中心人物的配偶/伴侣候选。"""
        query = """
        MATCH (:Person {personId: $person_id})-[:PARTNER_IN]->(unit:FamilyUnit)<-[:PARTNER_IN]-(spouse:Person)
        WHERE spouse.personId <> $person_id
        OPTIONAL MATCH (unit)-[:HAS_CHILD]->(child:Person)
        RETURN spouse AS person,
               unit.familyUnitId AS family_unit_id,
               count(DISTINCT child) AS child_count
        ORDER BY unit.displayOrder, spouse.name, spouse.personId
        """
        return [
            {
                "person": record["person"],
                "family_unit_id": record["family_unit_id"],
                "child_count": record["child_count"],
            }
            for record in self.session.run(query, person_id=str(person_id))
        ]

    def _get_center_family_options(self, person_id: str) -> list[dict[str, Any]]:
        """读取中心人物可作为后代根或桥接根的家庭单元。"""
        query = """
        MATCH (:Person {personId: $person_id})-[:PARTNER_IN]->(unit:FamilyUnit)
        OPTIONAL MATCH (partner:Person)-[:PARTNER_IN]->(unit)
        OPTIONAL MATCH (unit)-[:HAS_CHILD]->(child:Person)
        WITH unit,
             collect(DISTINCT partner.personId) AS spouse_ids,
             collect(DISTINCT partner.name) AS spouse_names,
             count(DISTINCT child) AS child_count
        RETURN unit.familyUnitId AS family_unit_id,
               coalesce(unit.type, 'marriage') AS family_type,
               coalesce(unit.label, '家庭单元') AS label,
               spouse_ids,
               spouse_names,
               child_count
        ORDER BY unit.displayOrder, unit.familyUnitId
        """
        return [
            {
                "family_unit_id": record["family_unit_id"],
                "family_type": record["family_type"],
                "label": record["label"],
                "spouse_ids": record["spouse_ids"],
                "spouse_names": record["spouse_names"],
                "child_count": record["child_count"],
            }
            for record in self.session.run(query, person_id=str(person_id))
        ]

    def _get_nine_kinship_summary(self, person_id: str) -> dict[str, Any]:
        """统计中心人物九代包络的轻量摘要。"""
        query = """
        MATCH (center:Person {personId: $person_id})
        OPTIONAL MATCH ancestorPath=(ancestor:Person)-[:PARENT_OF*1..4]->(center)
        OPTIONAL MATCH descendantPath=(center)-[:PARENT_OF*1..4]->(descendant:Person)
        WITH center,
             collect(DISTINCT ancestor) AS ancestors,
             collect(DISTINCT descendant) AS descendants
        WITH center, ancestors, descendants, [center] + ancestors + descendants AS visible_people
        RETURN size(ancestors) AS ancestor_count,
               size(descendants) AS descendant_count,
               size(visible_people) AS visible_person_count
        """
        record = self.session.run(query, person_id=str(person_id)).single()
        if not record:
            return {
                "ancestor_count": 0,
                "descendant_count": 0,
                "visible_person_count": 1,
                "hidden_relation_count": 0,
            }
        return {
            "ancestor_count": int(record["ancestor_count"] or 0),
            "descendant_count": int(record["descendant_count"] or 0),
            "visible_person_count": int(record["visible_person_count"] or 1),
            "hidden_relation_count": 0,
        }

    def _get_scoped_family_units(self, scope: str) -> list[Any]:
        """按 all/demo 范围读取家庭单元。"""
        where_clause = "unit.familyUnitId STARTS WITH 'demo:'" if scope == "demo" else "true"
        query = f"""
        MATCH (unit:FamilyUnit)
        WHERE {where_clause}
        RETURN unit
        ORDER BY unit.displayOrder, unit.familyUnitId
        """
        return [record["unit"] for record in self.session.run(query)]

    def _get_family_scope_overview(self, family_unit_id: str, limit: int) -> dict[str, Any] | None:
        """读取单个家庭单元周边的全景子图。"""
        query = """
        MATCH (root:FamilyUnit {familyUnitId: $family_unit_id})
        OPTIONAL MATCH (partner:Person)-[:PARTNER_IN]->(root)
        OPTIONAL MATCH (root)-[:HAS_CHILD]->(child:Person)
        WITH root, collect(DISTINCT partner) + collect(DISTINCT child) AS raw_people
        UNWIND raw_people AS person
        WITH root, collect(DISTINCT person) AS people
        RETURN root, people[0..$limit] AS people, size(people) AS total_count
        """
        record = self.session.run(
            query,
            family_unit_id=str(family_unit_id),
            limit=limit,
        ).single()
        if not record:
            return None

        persons = [person for person in record["people"] if person]
        person_ids = _unique_ids([dict(person).get("personId") for person in persons])
        family_units = [record["root"], *self._get_family_units_touching_people(person_ids)]
        family_unit_ids = _unique_ids([dict(unit).get("familyUnitId") for unit in family_units])
        edges = self._get_edges_for_scope(person_ids, family_unit_ids)
        total_count = int(record["total_count"] or len(persons))
        warnings = []
        if total_count > limit:
            warnings.append(f"已按上限显示 {limit} / {total_count} 人")

        return {
            "persons": persons,
            "family_units": family_units,
            "hidden_relation_count": max(total_count - limit, 0),
            "warnings": warnings,
            **edges,
        }

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


def _safe_limit(limit: int) -> int:
    """把全景节点上限限制在安全范围内。"""
    return min(max(int(limit), 1), 1000)


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


def _merge_raw_graphs(*graphs: dict[str, Any]) -> dict[str, Any]:
    """合并多个原始图记录并按节点/边标识去重。"""
    merged: dict[str, Any] = {
        "persons": [],
        "family_units": [],
        "partner_edges": [],
        "child_edges": [],
        "parent_edges": [],
        "spouse_edges": [],
        "warnings": [],
        "hidden_relation_count": 0,
    }
    seen_person_ids = set()
    seen_family_ids = set()
    seen_edge_ids = set()

    for graph in graphs:
        for person in graph.get("persons", []):
            person_id = dict(person).get("personId")
            if person_id and person_id not in seen_person_ids:
                merged["persons"].append(person)
                seen_person_ids.add(person_id)

        for unit in graph.get("family_units", []):
            unit_id = dict(unit).get("familyUnitId")
            if unit_id and unit_id not in seen_family_ids:
                merged["family_units"].append(unit)
                seen_family_ids.add(unit_id)

        for key in ("partner_edges", "child_edges", "parent_edges", "spouse_edges"):
            for edge in graph.get(key, []):
                relationship = edge.get("relationship") if isinstance(edge, dict) else edge
                edge_id = getattr(relationship, "element_id", id(edge))
                edge_key = f"{key}:{edge_id}"
                if edge_key in seen_edge_ids:
                    continue
                merged[key].append(edge)
                seen_edge_ids.add(edge_key)

        merged["warnings"].extend(graph.get("warnings", []))
        merged["hidden_relation_count"] += int(graph.get("hidden_relation_count", 0) or 0)

    return merged
