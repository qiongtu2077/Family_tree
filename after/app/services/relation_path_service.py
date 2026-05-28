"""
关系路径服务
负责查询两人关系路径并生成中文关系说明。
"""
from __future__ import annotations

from ..graph_schemas import GraphEdge, GraphPerson, GraphViewResponse, RelationPathResponse
from ..repositories.graph_repository import GraphRepository


class RelationPathService:
    """计算两个人物之间的亲缘路径。"""

    def __init__(self, repository: GraphRepository):
        """保存图谱 repository。"""
        self.repository = repository

    def get_relation_path(self, from_person_id: str, to_person_id: str) -> RelationPathResponse | None:
        """返回两人最短关系路径和中文解释。"""
        raw_path = self.repository.get_relation_path(from_person_id, to_person_id)
        if not raw_path:
            return None

        persons = [_to_path_person(node) for node in raw_path.get("persons", []) if node is not None]
        edges = [_to_path_edge(rel) for rel in raw_path.get("relations", []) if rel is not None]
        relation_text = _explain_relation(persons, edges)

        return RelationPathResponse(
            from_person_id=str(from_person_id),
            to_person_id=str(to_person_id),
            relation_text=relation_text,
            path=GraphViewResponse(
                view_mode="path",
                center_person_id=str(from_person_id),
                nodes=persons,
                edges=edges,
                hidden_relation_count=0,
                warnings=[],
            ),
            alternative_count=0,
        )


def _to_path_person(node) -> GraphPerson:
    """把路径人物节点转换为前端节点。"""
    data = dict(node)
    return GraphPerson(
        id=str(data.get("personId") or data.get("id")),
        name=str(data.get("name", "未命名")),
        gender=data.get("gender", "U") or "U",
        birth_date=str(data.get("birthDate") or data.get("birth_date") or "") or None,
        death_date=str(data.get("deathDate") or data.get("death_date") or "") or None,
        is_alive=bool(data.get("isAlive", data.get("is_alive", True))),
        avatar=data.get("avatar"),
        occupation=data.get("occupation"),
        address=data.get("address"),
        biography=data.get("biography"),
        motto=data.get("motto"),
        achievements=data.get("achievements"),
    )


def _to_path_edge(relationship) -> GraphEdge:
    """把路径关系转换为高亮连线。"""
    source = _person_endpoint_id(relationship.start_node)
    target = _person_endpoint_id(relationship.end_node)
    return GraphEdge(
        id=f"path:{relationship.element_id}",
        source=source,
        target=target,
        relation=_normalize_relation_type(relationship.type),
        label=_path_label(relationship.type),
        style="highlight",
        metadata=dict(relationship),
    )


def _normalize_relation_type(relation_type: str) -> str:
    """把 Neo4j 关系类型转换为前端稳定关系名。"""
    mappings = {
        "PARENT_OF": "parent_of",
        "SPOUSE_OF": "spouse_of",
    }
    return mappings.get(relation_type, relation_type.lower())


def _person_endpoint_id(node) -> str:
    """获取路径人物端点 ID。"""
    data = dict(node)
    return str(data.get("personId") or data.get("id"))


def _path_label(relation_type: str) -> str:
    """返回路径关系中文标签。"""
    labels = {
        "PARENT_OF": "亲子",
        "SPOUSE_OF": "配偶",
    }
    return labels.get(relation_type, relation_type)


def _explain_relation(persons: list[GraphPerson], edges: list[GraphEdge]) -> str:
    """根据路径方向生成简明中文关系说明。"""
    if len(persons) < 2:
        return "本人"
    if not edges:
        return "暂无法确定具体关系"

    parent_steps = [edge for edge in edges if edge.relation == "parent_of"]
    spouse_steps = [edge for edge in edges if edge.relation == "spouse_of"]

    if len(edges) == 1 and edges[0].relation == "spouse_of":
        return "配偶"
    if spouse_steps:
        return "姻亲关系路径"
    if len(parent_steps) == len(edges):
        return _explain_direct_blood_relation(persons, edges)
    return "亲缘关系路径"


def _explain_direct_blood_relation(persons: list[GraphPerson], edges: list[GraphEdge]) -> str:
    """解释只包含亲子边的直系血缘路径。"""
    start = persons[0]
    end = persons[-1]
    steps = len(edges)
    first_edge = edges[0]

    if first_edge.source == start.id:
        labels = {
            1: "父亲" if start.gender == "M" else "母亲",
            2: "祖父" if start.gender == "M" else "祖母",
            3: "曾祖父" if start.gender == "M" else "曾祖母",
            4: "高祖父" if start.gender == "M" else "高祖母",
        }
        return labels.get(steps, "远祖")

    labels = {
        1: "儿子" if start.gender == "M" else "女儿",
        2: "孙子" if start.gender == "M" else "孙女",
        3: "曾孙" if start.gender == "M" else "曾孙女",
        4: "玄孙" if start.gender == "M" else "玄孙女",
    }
    return labels.get(steps, f"{end.name} 的后代")
