"""
RelationPathService 单元测试
验证关系路径中文解释和路径图 DTO。
"""
from collections import UserDict

from app.services.relation_path_service import RelationPathService


class FakeNode(UserDict):
    """模拟 Neo4j Person 节点。"""

    def __init__(self, data):
        """保存人物属性。"""
        super().__init__(data)


def FakeRelationship(start_node, end_node):
    """构造保留真实亲子方向的普通路径关系。"""
    return {"id": "parent-1", "type": "PARENT_OF", "source": start_node["personId"],
            "target": end_node["personId"]}


class FakeRepository:
    """返回固定路径的 repository。"""

    def get_relation_path(self, from_person_id, to_person_id):
        """返回父亲到孩子的路径。"""
        father = FakeNode({"personId": "p1", "name": "父亲", "gender": "M"})
        child = FakeNode({"personId": "p2", "name": "孩子", "gender": "F"})
        return {
            "persons": [father, child],
            "relations": [FakeRelationship(father, child)],
        }


def test_relation_path_explains_parent_relationship():
    """父亲到孩子的一跳亲子边应解释为父亲。"""
    service = RelationPathService(FakeRepository())

    result = service.get_relation_path("p1", "p2")

    assert result.relation_text == "父亲"
    assert result.path.view_mode == "path"
    assert len(result.path.nodes) == 2
    assert len(result.path.edges) == 1
