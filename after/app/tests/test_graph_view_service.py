"""
GraphViewService 单元测试
使用轻量 Neo4j 替身对象验证 DTO 组装逻辑。
"""
from collections import UserDict

from app.services.graph_view_service import GraphViewService


class FakeNode(UserDict):
    """模拟 Neo4j Node。"""

    def __init__(self, labels, data):
        """保存标签和属性。"""
        super().__init__(data)
        self.labels = set(labels)


class FakeRelationship(UserDict):
    """模拟 Neo4j Relationship。"""

    def __init__(self, rel_type, start_node, end_node, data=None):
        """保存关系端点、类型和属性。"""
        super().__init__(data or {})
        self.type = rel_type
        self.start_node = start_node
        self.end_node = end_node
        self.element_id = f"{rel_type}-1"


class FakeRepository:
    """返回固定图谱数据的 repository。"""

    def get_mainline_graph(self, person_id, ancestor_depth, descendant_depth):
        """返回本家主线测试图。"""
        return self.get_focus_graph(person_id, max(ancestor_depth, descendant_depth))

    def get_focus_graph(self, person_id, generations):
        """返回包含人物、家庭单元和亲子关系的测试图。"""
        parent = FakeNode(["Person"], {"personId": "p1", "name": "父亲", "gender": "M"})
        child = FakeNode(["Person"], {"personId": "p2", "name": "孩子", "gender": "F"})
        unit = FakeNode(["FamilyUnit"], {"familyUnitId": "f1", "type": "marriage"})
        return {
            "persons": [parent, child],
            "family_units": [unit],
            "partner_edges": [FakeRelationship("PARTNER_IN", parent, unit)],
            "child_edges": [
                FakeRelationship("HAS_CHILD", unit, child, {"relationKind": "biological"})
            ],
            "parent_edges": [
                FakeRelationship("PARENT_OF", parent, child, {"side": "father"})
            ],
            "spouse_edges": [],
        }

    def get_inlaw_graph(self, person_id, spouse_id, depth):
        """返回姻亲谱系测试图。"""
        raw = self.get_focus_graph(spouse_id, depth)
        raw["persons"].append(FakeNode(["Person"], {"personId": spouse_id, "name": "配偶"}))
        return raw

    def get_bridge_graph(self, person_id, spouse_id, depth, family_unit_id=None):
        """返回联姻桥接测试图。"""
        raw = self.get_focus_graph(person_id, depth)
        raw["persons"].append(FakeNode(["Person"], {"personId": spouse_id, "name": "配偶"}))
        raw["warnings"] = ["桥接图只展示近亲范围"]
        return raw

    def get_branch_graph(self, family_unit_id, depth):
        """返回后代分支测试图。"""
        return self.get_focus_graph("p2", depth)

    def get_branch_graph_by_root(self, root_type, root_id, depth):
        """返回按根节点读取的后代分支测试图。"""
        return self.get_focus_graph(root_id, depth)

    def get_overview_graph(self, scope, max_nodes):
        """返回全景测试图。"""
        raw = self.get_focus_graph("p2", 3)
        raw["persons"].extend(
            FakeNode(["Person"], {"personId": f"p{i}", "name": f"人物{i}"})
            for i in range(3, 45)
        )
        raw["hidden_relation_count"] = 0
        raw["warnings"] = []
        return raw

    def get_graph_issues(self):
        """返回固定异常数据。"""
        return [
            {
                "person": FakeNode(["Person"], {"personId": "p3", "name": "孤立者"}),
                "issue_type": "isolated_person",
                "message": "人物没有任何关系",
            }
        ]


def test_focus_graph_builds_person_family_unit_and_edges():
    """中心图应包含人物、家庭单元和语义化连线。"""
    service = GraphViewService(FakeRepository())

    result = service.get_focus_graph("p2", 3)

    assert result.center_person_id == "p2"
    assert result.view_mode == "mainline"
    assert {node.id for node in result.nodes} == {"p1", "p2", "family:f1"}
    assert {edge.relation for edge in result.edges} == {"partner", "biological", "father"}


def test_five_formal_graph_views_have_expected_modes():
    """五个正式视图应分别返回稳定 view_mode。"""
    service = GraphViewService(FakeRepository())

    mainline = service.get_mainline_graph("p2", 3, 3)
    inlaw = service.get_inlaw_graph("p2", "p3", 3)
    bridge = service.get_bridge_graph("p2", "p3", 2)
    branch = service.get_branch_graph_by_root("person", "p2", 5)
    overview = service.get_overview_graph("all", 300)

    assert mainline.view_mode == "mainline"
    assert inlaw.view_mode == "inlaw"
    assert bridge.view_mode == "bridge"
    assert branch.view_mode == "branch"
    assert overview.view_mode == "overview"
    assert len([node for node in overview.nodes if node.type == "person"]) == 44
    assert "桥接图只展示近亲范围" in bridge.warnings


def test_graph_issues_are_normalized():
    """异常诊断应转换为稳定的 GraphIssue 响应。"""
    service = GraphViewService(FakeRepository())

    issues = service.get_graph_issues()

    assert len(issues) == 1
    assert issues[0].person_id == "p3"
    assert issues[0].issue_type == "isolated_person"
