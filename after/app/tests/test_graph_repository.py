"""
GraphRepository 单元测试
验证关键 Cypher 投影边界，避免正式视图退回全量关系网。
"""
from collections import UserDict

from app.repositories.graph_repository import GraphRepository


class FakeNode(UserDict):
    """模拟 Neo4j Node。"""

    def __init__(self, labels, data):
        """保存标签和节点属性。"""
        super().__init__(data)
        self.labels = set(labels)


class FakeRelationship(UserDict):
    """模拟 Neo4j Relationship。"""

    def __init__(self, rel_type, start_node, end_node, data=None):
        """保存关系类型、端点和属性。"""
        super().__init__(data or {})
        self.type = rel_type
        self.start_node = start_node
        self.end_node = end_node
        self.element_id = f"{rel_type}:{start_node.get('personId', start_node.get('familyUnitId'))}"


class FakeRecord(dict):
    """模拟 Neo4j Record 的 keys 行为。"""

    def keys(self):
        """返回记录字段名。"""
        return super().keys()


class FakeResult(list):
    """模拟 Neo4j Result。"""

    def single(self):
        """返回首条记录。"""
        return self[0] if self else None


class BranchSession:
    """为后代分支查询提供确定性假数据。"""

    def __init__(self):
        """初始化家庭、人物和查询记录。"""
        self.queries = []
        self.root = FakeNode(["FamilyUnit"], {"familyUnitId": "f1", "displayOrder": 1})
        self.child_unit = FakeNode(["FamilyUnit"], {"familyUnitId": "f2", "displayOrder": 2})
        self.father = FakeNode(["Person"], {"personId": "father", "name": "父亲"})
        self.mother = FakeNode(["Person"], {"personId": "mother", "name": "母亲"})
        self.child = FakeNode(["Person"], {"personId": "child", "name": "孩子"})
        self.spouse = FakeNode(["Person"], {"personId": "spouse", "name": "配偶"})

    def run(self, query, **params):
        """按查询形状返回对应假记录。"""
        self.queries.append(query)
        compact_query = " ".join(query.split())
        if "MATCH (unit:FamilyUnit {familyUnitId: $family_unit_id}) RETURN unit LIMIT 1" in compact_query:
            return FakeResult([{"unit": self.root}])
        if "MATCH (p:Person)-[rel:PARTNER_IN]->(unit:FamilyUnit)" in query:
            return self._partner_edge_records(params["person_ids"], params["family_unit_ids"])
        if "MATCH (unit:FamilyUnit)-[rel:HAS_CHILD]->(child:Person)" in query:
            return self._child_edge_records(params["person_ids"], params["family_unit_ids"])
        if "MATCH (parent:Person)-[rel:PARENT_OF]->(child:Person)" in query:
            return FakeResult([])
        if "MATCH (left:Person)-[rel:SPOUSE_OF]-(right:Person)" in query:
            return FakeResult([])
        if "MATCH (partner:Person)-[:PARTNER_IN]->(unit:FamilyUnit)" in query:
            return self._partner_records(params["family_unit_ids"])
        if "MATCH (unit:FamilyUnit)-[:HAS_CHILD]->(child:Person)" in query:
            return self._child_id_records(params["family_unit_ids"])
        if "MATCH (person:Person)-[:PARTNER_IN]->(unit:FamilyUnit)" in query:
            return self._family_unit_records(params["person_ids"])
        if "MATCH (person:Person)" in query and "RETURN person" in query:
            return self._person_records(params["person_ids"])
        if "MATCH (unit:FamilyUnit)" in query and "RETURN unit" in query:
            return self._unit_records(params["family_unit_ids"])
        return FakeResult([])

    def _partner_records(self, family_unit_ids):
        """返回家庭单元伴侣人物。"""
        people_by_unit = {
            "f1": [self.father, self.mother],
            "f2": [self.child, self.spouse],
        }
        records = []
        for unit_id in family_unit_ids:
            records.extend({"person": person} for person in people_by_unit.get(unit_id, []))
        return FakeResult(records)

    def _child_id_records(self, family_unit_ids):
        """返回家庭单元子女 ID。"""
        child_ids_by_unit = {
            "f1": ["child"],
            "f2": [],
        }
        records = []
        for unit_id in family_unit_ids:
            records.extend({"person_id": person_id} for person_id in child_ids_by_unit.get(unit_id, []))
        return FakeResult(records)

    def _family_unit_records(self, person_ids):
        """返回人物作为伴侣进入的家庭单元。"""
        if "child" not in person_ids:
            return FakeResult([])
        return FakeResult([{"unit": self.child_unit}])

    def _person_records(self, person_ids):
        """按人物 ID 返回人物节点。"""
        people = {
            "father": self.father,
            "mother": self.mother,
            "child": self.child,
            "spouse": self.spouse,
        }
        return FakeResult([{"person": people[person_id]} for person_id in person_ids if person_id in people])

    def _unit_records(self, family_unit_ids):
        """按家庭单元 ID 返回家庭节点。"""
        units = {"f1": self.root, "f2": self.child_unit}
        return FakeResult([{"unit": units[unit_id]} for unit_id in family_unit_ids if unit_id in units])

    def _partner_edge_records(self, person_ids, family_unit_ids):
        """返回范围内伴侣到家庭单元关系。"""
        units = {"f1": self.root, "f2": self.child_unit}
        partners = {
            "f1": [self.father, self.mother],
            "f2": [self.child, self.spouse],
        }
        records = []
        for unit_id in family_unit_ids:
            for person in partners.get(unit_id, []):
                if person["personId"] not in person_ids:
                    continue
                records.append({
                    "source": person,
                    "rel": FakeRelationship("PARTNER_IN", person, units[unit_id]),
                    "target": units[unit_id],
                })
        return FakeResult(records)

    def _child_edge_records(self, person_ids, family_unit_ids):
        """返回范围内家庭单元到子女关系。"""
        if "f1" not in family_unit_ids or "child" not in person_ids:
            return FakeResult([])
        return FakeResult([{
            "source": self.root,
            "rel": FakeRelationship("HAS_CHILD", self.root, self.child, {"relationKind": "biological"}),
            "target": self.child,
        }])


def test_branch_graph_uses_layered_family_unit_expansion():
    """后代分支应分步展开，不再发出混合聚合可变路径查询。"""
    session = BranchSession()
    repository = GraphRepository(session)

    graph = repository.get_branch_graph("f1", 5)

    person_ids = {dict(person).get("personId") for person in graph["persons"]}
    family_unit_ids = {dict(unit).get("familyUnitId") for unit in graph["family_units"]}
    query_text = "\n".join(session.queries)

    assert person_ids == {"father", "mother", "child", "spouse"}
    assert family_unit_ids == {"f1", "f2"}
    assert "HAS_CHILD|PARENT_OF" not in query_text
    assert "collect(DISTINCT unit) + [root]" not in query_text


class CenterContextSession:
    """为中心人物上下文查询提供确定性假数据。"""

    def __init__(self):
        """初始化中心人物、配偶和家庭单元。"""
        self.center = FakeNode(["Person"], {"personId": "center", "name": "中心"})
        self.spouse = FakeNode(["Person"], {"personId": "spouse", "name": "配偶"})

    def run(self, query, **params):
        """按查询形状返回中心上下文记录。"""
        compact_query = " ".join(query.split())
        if "MATCH (person:Person {personId: $person_id}) RETURN person LIMIT 1" in compact_query:
            return FakeResult([{"person": self.center}])
        if "MATCH (person:Person) WHERE person.personId IN $person_ids RETURN person" in compact_query:
            people = {"center": self.center, "spouse": self.spouse}
            return FakeResult([
                {"person": people[person_id]}
                for person_id in params.get("person_ids", [])
                if person_id in people
            ])
        if "WHERE toLower(person.name) CONTAINS toLower($keyword)" in compact_query:
            return FakeResult([{"person": self.center}])
        if "unit.familyUnitId AS family_unit_id" in compact_query and "spouse AS person" in compact_query:
            return FakeResult([{"person": self.spouse, "family_unit_id": "f1", "child_count": 2}])
        if "coalesce(unit.type, 'marriage') AS family_type" in compact_query:
            return FakeResult([{
                "family_unit_id": "f1",
                "family_type": "marriage",
                "label": "婚姻家庭",
                "spouse_ids": ["center", "spouse"],
                "spouse_names": ["中心", "配偶"],
                "child_count": 2,
            }])
        if "ancestorPath=(ancestor:Person)-[:PARENT_OF*1..4]->(center)" in compact_query:
            return FakeResult([{
                "ancestor_count": 2,
                "descendant_count": 3,
                "visible_person_count": 6,
            }])
        return FakeResult([])


def test_center_context_queries_real_person_and_options():
    """中心上下文应基于真实人物返回配偶、家庭和九族摘要。"""
    repository = GraphRepository(CenterContextSession())

    context = repository.get_center_context("center")
    candidates = repository.get_center_candidates("中", 20)

    assert dict(context["person"])["personId"] == "center"
    assert context["available_spouses"][0]["family_unit_id"] == "f1"
    assert context["available_family_units"][0]["child_count"] == 2
    assert context["nine_kinship_summary"]["visible_person_count"] == 6
    assert dict(candidates[0])["personId"] == "center"


def test_overview_center_scope_uses_focus_projection():
    """全景只看中心九族时应使用中心人物投影。"""
    session = CenterContextSession()
    repository = GraphRepository(session)

    graph = repository.get_overview_graph("center:center", 300)

    assert dict(graph["persons"][0])["personId"] == "center"
