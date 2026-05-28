"""
族谱视图组装服务
把 Neo4j 原始记录转换为前端稳定的 GraphViewDTO。
"""
from __future__ import annotations

from typing import Any

from ..graph_schemas import (
    GraphEdge,
    GraphFamilyUnit,
    GraphIssue,
    GraphPerson,
    GraphViewResponse,
)
from ..repositories.graph_repository import GraphRepository


class GraphViewService:
    """组织中心图、分支图和管理员诊断图数据。"""

    def __init__(self, repository: GraphRepository):
        """保存图谱 repository。"""
        self.repository = repository

    # --- 视图数据 --- #

    def get_focus_graph(self, person_id: str, generations: int) -> GraphViewResponse | None:
        """生成中心人物本家主线图。"""
        raw_graph = self.repository.get_focus_graph(person_id, generations)
        if not raw_graph:
            return None
        return self._build_graph_response(raw_graph, "mainline", center_person_id=str(person_id))

    def get_branch_graph(self, family_unit_id: str, depth: int) -> GraphViewResponse | None:
        """生成指定家庭单元的后代分支图。"""
        raw_graph = self.repository.get_branch_graph(family_unit_id, depth)
        if not raw_graph:
            return None
        return self._build_graph_response(raw_graph, "branch")

    def get_graph_issues(self) -> list[GraphIssue]:
        """生成管理员异常诊断列表。"""
        issues = []
        for item in self.repository.get_graph_issues():
            person = item.get("person")
            person_data = dict(person) if person else {}
            issues.append(
                GraphIssue(
                    person_id=str(person_data.get("personId", "")),
                    person_name=str(person_data.get("name", "未知人物")),
                    issue_type=str(item.get("issue_type", "")),
                    message=str(item.get("message", "")),
                )
            )
        return issues

    # --- 数据转换 --- #

    def _build_graph_response(
        self,
        raw_graph: dict[str, Any],
        view_mode: str,
        center_person_id: str | None = None,
    ) -> GraphViewResponse:
        """把 Neo4j 原始图记录转换为前端图谱响应。"""
        persons = [_to_person_node(person) for person in raw_graph.get("persons", []) if person]
        family_units = [
            _to_family_unit_node(unit) for unit in raw_graph.get("family_units", []) if unit
        ]

        edges = []
        seen_edges = set()
        for rel_group in (
            raw_graph.get("partner_edges", []),
            raw_graph.get("child_edges", []),
            raw_graph.get("parent_edges", []),
            raw_graph.get("spouse_edges", []),
        ):
            for relationship in rel_group:
                edge = _to_graph_edge(relationship)
                if edge and edge.id not in seen_edges:
                    edges.append(edge)
                    seen_edges.add(edge.id)

        warnings = _build_warnings(persons, family_units, edges)
        return GraphViewResponse(
            view_mode=view_mode,
            center_person_id=center_person_id,
            nodes=[*persons, *family_units],
            edges=edges,
            hidden_relation_count=0,
            warnings=warnings,
        )


def _to_person_node(node) -> GraphPerson:
    """把 Neo4j Person 节点转换为前端人物节点。"""
    data = dict(node)
    person_id = str(data.get("personId") or data.get("id"))
    return GraphPerson(
        id=person_id,
        name=str(data.get("name", "未命名")),
        gender=data.get("gender", "U") or "U",
        birth_date=_pick_date(data, "birthDate", "birth_date"),
        death_date=_pick_date(data, "deathDate", "death_date"),
        is_alive=bool(data.get("isAlive", data.get("is_alive", True))),
        avatar=data.get("avatar"),
        occupation=data.get("occupation"),
        address=data.get("address"),
        biography=data.get("biography"),
        motto=data.get("motto"),
        achievements=data.get("achievements"),
        badges=_person_badges(data),
    )


def _to_family_unit_node(node) -> GraphFamilyUnit:
    """把 Neo4j FamilyUnit 节点转换为前端家庭单元节点。"""
    data = dict(node)
    unit_id = str(data.get("familyUnitId") or data.get("id"))
    family_type = data.get("type") or data.get("family_type") or "marriage"
    return GraphFamilyUnit(
        id=f"family:{unit_id}",
        family_type=family_type,
        label=_family_unit_label(family_type),
        display_order=int(data.get("displayOrder", data.get("display_order", 0)) or 0),
    )


def _to_graph_edge(relationship) -> GraphEdge | None:
    """把 Neo4j Relationship 转换为前端连线。"""
    if relationship is None:
        return None

    relation_type = relationship.type
    properties = dict(relationship)
    source_id = _endpoint_id(relationship.start_node)
    target_id = _endpoint_id(relationship.end_node)

    if relation_type == "PARTNER_IN":
        relation = "partner"
        label = "伴侣"
        style = "spouse"
    elif relation_type == "HAS_CHILD":
        relation = properties.get("relationKind", "child")
        label = _child_edge_label(relation)
        style = "dashed" if relation != "biological" else "solid"
    elif relation_type == "PARENT_OF":
        relation = properties.get("side", "parent")
        label = _parent_edge_label(relation)
        style = "dashed" if properties.get("relationKind") in {"adoptive", "step"} else "solid"
    elif relation_type == "SPOUSE_OF":
        relation = "spouse"
        label = "配偶"
        style = "spouse"
    else:
        relation = relation_type.lower()
        label = relation_type
        style = "solid"

    return GraphEdge(
        id=f"{source_id}->{target_id}:{relation_type}:{relationship.element_id}",
        source=source_id,
        target=target_id,
        relation=str(relation),
        label=label,
        style=style,
        metadata=properties,
    )


def _endpoint_id(node) -> str:
    """根据节点标签生成前端节点 ID。"""
    data = dict(node)
    labels = set(node.labels)
    if "FamilyUnit" in labels:
        return f"family:{data.get('familyUnitId') or data.get('id')}"
    return str(data.get("personId") or data.get("id"))


def _pick_date(data: dict[str, Any], camel_key: str, snake_key: str) -> str | None:
    """兼容读取日期字段。"""
    value = data.get(camel_key, data.get(snake_key))
    return str(value) if value else None


def _person_badges(data: dict[str, Any]) -> list[str]:
    """根据人物属性生成节点徽标。"""
    badges = []
    if data.get("relationPending"):
        badges.append("资料待确认")
    if data.get("isAlive") is False or data.get("is_alive") is False:
        badges.append("已故")
    return badges


def _family_unit_label(family_type: str) -> str:
    """返回家庭单元中文标签。"""
    labels = {
        "marriage": "婚姻家庭",
        "partner": "伴侣家庭",
        "single_parent": "单亲家庭",
        "unknown_parent": "未知父母",
        "adoptive": "收养家庭",
    }
    return labels.get(family_type, "家庭单元")


def _child_edge_label(relation_kind: str) -> str:
    """返回家庭单元到子女关系标签。"""
    labels = {
        "biological": "子女",
        "adoptive": "养子女",
        "step": "继子女",
        "unknown": "子女待确认",
    }
    return labels.get(relation_kind, "子女")


def _parent_edge_label(side: str) -> str:
    """返回直接亲子关系标签。"""
    labels = {
        "father": "父亲",
        "mother": "母亲",
        "parent": "父母",
    }
    return labels.get(side, "父母")


def _build_warnings(
    persons: list[GraphPerson],
    family_units: list[GraphFamilyUnit],
    edges: list[GraphEdge],
) -> list[str]:
    """生成轻量视图提示，帮助前端解释投影边界。"""
    warnings = []
    if not persons:
        warnings.append("当前视图没有人物节点")
    if persons and not family_units:
        warnings.append("当前视图未包含家庭单元，布局可能退化为普通关系图")
    if len(edges) == 0 and len(persons) > 1:
        warnings.append("当前人物集合缺少可展示关系")
    return warnings
