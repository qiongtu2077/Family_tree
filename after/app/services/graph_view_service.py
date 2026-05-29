"""
族谱视图组装服务
把 Neo4j 原始记录转换为前端稳定的 GraphViewDTO。
"""
from __future__ import annotations

from typing import Any

from ..graph_schemas import (
    CenterContextResponse,
    CenterFamilyOption,
    CenterSpouseOption,
    GraphBranchCapsule,
    GraphEdge,
    GraphFamilyUnit,
    GraphIssue,
    GraphPerson,
    GraphViewContext,
    GraphViewResponse,
    NineKinshipSummary,
)
from ..repositories.graph_repository import GraphRepository


class GraphViewService:
    """组织中心图、分支图和管理员诊断图数据。"""

    def __init__(self, repository: GraphRepository):
        """保存图谱 repository。"""
        self.repository = repository

    # --- 视图数据 --- #

    def get_mainline_graph(
        self,
        person_id: str,
        ancestor_depth: int,
        descendant_depth: int,
    ) -> GraphViewResponse | None:
        """生成本家主线图。"""
        raw_graph = self.repository.get_mainline_graph(
            person_id,
            ancestor_depth,
            descendant_depth,
        )
        if not raw_graph:
            return None
        return self._build_graph_response(raw_graph, "mainline", center_person_id=str(person_id))

    def get_focus_graph(self, person_id: str, generations: int) -> GraphViewResponse | None:
        """生成中心人物本家主线图。"""
        raw_graph = self.repository.get_focus_graph(person_id, generations)
        if not raw_graph:
            return None
        return self._build_graph_response(raw_graph, "mainline", center_person_id=str(person_id))

    def get_inlaw_graph(
        self,
        person_id: str,
        spouse_id: str,
        depth: int,
    ) -> GraphViewResponse | None:
        """生成配偶原生家族的姻亲谱系图。"""
        raw_graph = self.repository.get_inlaw_graph(person_id, spouse_id, depth)
        if not raw_graph:
            return None
        return self._build_graph_response(raw_graph, "inlaw", center_person_id=str(person_id))

    def get_bridge_graph(
        self,
        person_id: str,
        spouse_id: str,
        depth: int,
        family_unit_id: str | None = None,
    ) -> GraphViewResponse | None:
        """生成两边家族通过婚姻连接的桥接图。"""
        raw_graph = self.repository.get_bridge_graph(
            person_id,
            spouse_id,
            depth,
            family_unit_id=family_unit_id,
        )
        if not raw_graph:
            return None
        return self._build_graph_response(raw_graph, "bridge", center_person_id=str(person_id))

    def get_branch_graph(self, family_unit_id: str, depth: int) -> GraphViewResponse | None:
        """生成指定家庭单元的后代分支图。"""
        raw_graph = self.repository.get_branch_graph(family_unit_id, depth)
        if not raw_graph:
            return None
        return self._build_graph_response(raw_graph, "branch")

    def get_branch_graph_by_root(
        self,
        root_type: str,
        root_id: str,
        depth: int,
    ) -> GraphViewResponse | None:
        """生成指定人物或家庭单元根节点的后代分支图。"""
        raw_graph = self.repository.get_branch_graph_by_root(root_type, root_id, depth)
        if not raw_graph:
            return None
        center_person_id = str(root_id) if root_type == "person" else None
        return self._build_graph_response(raw_graph, "branch", center_person_id=center_person_id)

    def get_overview_graph(self, scope: str, max_nodes: int) -> GraphViewResponse | None:
        """生成家族全景图。"""
        raw_graph = self.repository.get_overview_graph(scope, max_nodes)
        if not raw_graph:
            return None
        return self._build_graph_response(raw_graph, "overview")

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

    def get_center_candidates(self, keyword: str, limit: int) -> list[GraphPerson]:
        """按姓名搜索中心人物候选。"""
        return [
            _to_person_node(person)
            for person in self.repository.get_center_candidates(keyword, limit)
        ]

    def get_center_context(self, person_id: str) -> CenterContextResponse | None:
        """生成中心人物上下文和五图可选参数。"""
        raw_context = self.repository.get_center_context(person_id)
        if not raw_context:
            return None

        person = _to_person_node(raw_context["person"])
        spouses = [
            CenterSpouseOption(
                person=_to_person_node(item["person"]),
                family_unit_id=item.get("family_unit_id"),
                child_count=int(item.get("child_count", 0) or 0),
            )
            for item in raw_context.get("available_spouses", [])
            if item.get("person")
        ]
        family_units = [
            CenterFamilyOption(
                family_unit_id=str(item.get("family_unit_id", "")),
                label=str(item.get("label", "家庭单元")),
                family_type=item.get("family_type") or "marriage",
                spouse_ids=[str(value) for value in item.get("spouse_ids", []) if value],
                spouse_names=[str(value) for value in item.get("spouse_names", []) if value],
                child_count=int(item.get("child_count", 0) or 0),
            )
            for item in raw_context.get("available_family_units", [])
            if item.get("family_unit_id")
        ]
        summary_data = raw_context.get("nine_kinship_summary", {})
        return CenterContextResponse(
            person=person,
            available_spouses=spouses,
            available_family_units=family_units,
            default_mainline_depth=int(raw_context.get("default_mainline_depth", 3) or 3),
            nine_kinship_summary=NineKinshipSummary(**summary_data),
            warnings=[str(warning) for warning in raw_context.get("warnings", [])],
        )

    # --- 数据转换 --- #

    def _build_graph_response(
        self,
        raw_graph: dict[str, Any],
        view_mode: str,
        center_person_id: str | None = None,
    ) -> GraphViewResponse:
        """把 Neo4j 原始图记录转换为前端图谱响应。"""
        persons = _dedupe_nodes([
            _to_person_node(person) for person in raw_graph.get("persons", []) if person
        ])
        family_units = _dedupe_nodes([
            _to_family_unit_node(unit) for unit in raw_graph.get("family_units", []) if unit
        ])

        edges = []
        seen_edges = set()
        for rel_group in (
            raw_graph.get("partner_edges", []),
            raw_graph.get("child_edges", []),
            raw_graph.get("parent_edges", []),
            raw_graph.get("spouse_edges", []),
        ):
            for edge_record in rel_group:
                edge = _to_graph_edge(edge_record)
                if edge and edge.id not in seen_edges:
                    edges.append(edge)
                    seen_edges.add(edge.id)

        warnings = [*raw_graph.get("warnings", []), *_build_warnings(persons, family_units, edges)]
        branch_capsules = [
            _to_branch_capsule(item)
            for item in raw_graph.get("branch_capsules", [])
            if item
        ]
        view_context = _to_view_context(raw_graph.get("view_context"))
        resolved_center_person_id = center_person_id or (view_context.center_person_id if view_context else None)
        return GraphViewResponse(
            view_mode=view_mode,
            center_person_id=resolved_center_person_id,
            view_context=view_context,
            nodes=[*persons, *family_units, *branch_capsules],
            edges=edges,
            hidden_relation_count=int(raw_graph.get("hidden_relation_count", 0) or 0),
            warnings=warnings,
        )


def _to_view_context(data: dict[str, Any] | None) -> GraphViewContext | None:
    """把原始投影上下文转换为稳定 DTO。"""
    if not data:
        return None
    return GraphViewContext(
        center_person_id=_optional_str(data.get("center_person_id")),
        spouse_id=_optional_str(data.get("spouse_id")),
        family_unit_id=_optional_str(data.get("family_unit_id")),
        root_type=data.get("root_type"),
        root_id=_optional_str(data.get("root_id")),
        projection_reason=_optional_str(data.get("projection_reason")),
    )


def _optional_str(value) -> str | None:
    """把可选值转换成字符串。"""
    return str(value) if value is not None and value != "" else None


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


def _dedupe_nodes(nodes: list[GraphPerson | GraphFamilyUnit]) -> list[GraphPerson | GraphFamilyUnit]:
    """按节点 ID 保序去重。"""
    seen = set()
    result = []
    for node in nodes:
        if node.id in seen:
            continue
        result.append(node)
        seen.add(node.id)
    return result


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


def _to_branch_capsule(data: dict[str, Any]) -> GraphBranchCapsule:
    """把折叠分支摘要转换为前端胶囊节点。"""
    return GraphBranchCapsule(
        id=str(data.get("id")),
        title=str(data.get("title", "折叠分支")),
        owner_person_id=data.get("owner_person_id"),
        root_family_unit_id=data.get("root_family_unit_id"),
        relation_to_center=str(data.get("relation_to_center", "旁支")),
        person_count=int(data.get("person_count", 0) or 0),
        generation_count=int(data.get("generation_count", 0) or 0),
        preview_names=[str(name) for name in data.get("preview_names", []) if name],
        target_view=data.get("target_view", "branch"),
    )


def _to_graph_edge(edge_record) -> GraphEdge | None:
    """把 Neo4j Relationship 转换为前端连线。"""
    relationship = edge_record.get("relationship") if isinstance(edge_record, dict) else edge_record
    if relationship is None:
        return None

    relation_type = relationship.type
    properties = dict(relationship)
    source_node = edge_record.get("source") if isinstance(edge_record, dict) else relationship.start_node
    target_node = edge_record.get("target") if isinstance(edge_record, dict) else relationship.end_node
    source_id = _endpoint_id(source_node)
    target_id = _endpoint_id(target_node)

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
    if node is None:
        return ""
    data = dict(node)
    labels = set(getattr(node, "labels", []))
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
