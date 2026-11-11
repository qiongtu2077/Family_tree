"""使用真实 SQLAlchemy Session 验证五图范围、路径和管理员诊断。"""
from __future__ import annotations

from itertools import combinations

import pytest

from app.graph_models import (
    FamilyChild, FamilyPartner, FamilyUnit, GenealogyPerson, ParentChild, Spouse,
)
from app.repositories.graph_repository import GraphRepository


# --- 多代与姻亲测试数据 --- #


@pytest.fixture
def family_graph(repository_session):
    """保存含四代、两侧原生家庭和同胞旁支的数据，另留一个孤立人物。"""
    people = {
        "grandfather": ("祖父", "M"), "grandmother": ("祖母", "F"),
        "father": ("父亲", "M"), "mother": ("母亲", "F"),
        "uncle": ("叔父", "M"), "center": ("中心人物", "M"),
        "sibling": ("中心同胞", "F"), "sibling-partner": ("同胞配偶", "M"),
        "niece": ("同胞子女", "F"), "spouse": ("中心配偶", "F"),
        "spouse-father": ("配偶父亲", "M"), "spouse-mother": ("配偶母亲", "F"),
        "spouse-sibling": ("配偶同胞", "M"),
        "child": ("孩子", "M"), "child-partner": ("孩子配偶", "F"),
        "grandchild": ("孙辈", "F"), "isolated": ("孤立人物", "U"),
    }
    repository_session.add_all([
        GenealogyPerson(person_id=person_id, name=name, gender=gender, properties={})
        for person_id, (name, gender) in people.items()
    ])
    repository_session.flush()
    _add_family(repository_session, "grandparents", ["grandfather", "grandmother"], ["father", "uncle"])
    _add_family(repository_session, "parents", ["father", "mother"], ["center", "sibling"])
    _add_family(repository_session, "center-family", ["center", "spouse"], ["child"])
    _add_family(repository_session, "child-family", ["child", "child-partner"], ["grandchild"])
    _add_family(repository_session, "spouse-parents", ["spouse-father", "spouse-mother"], ["spouse", "spouse-sibling"])
    _add_family(repository_session, "sibling-family", ["sibling", "sibling-partner"], ["niece"])
    repository_session.commit()
    return GraphRepository(repository_session)


def _add_family(session, unit_id, partners, children):
    """直接保存测试家庭与明确的亲子、配偶事实，独立于人物写入仓储。"""
    session.add(FamilyUnit(family_unit_id=unit_id, family_type="marriage", properties={"displayOrder": 1}))
    session.flush()
    session.add_all([
        FamilyPartner(family_unit_id=unit_id, person_id=person_id, properties={})
        for person_id in partners
    ])
    session.add_all([
        FamilyChild(family_unit_id=unit_id, child_id=child_id, properties={"relationKind": "biological"})
        for child_id in children
    ])
    for parent_id in partners:
        parent = session.get(GenealogyPerson, parent_id)
        session.add_all([
            ParentChild(
                parent_id=parent_id, child_id=child_id, relation_kind="biological",
                properties={"side": "father" if parent.gender == "M" else "mother"},
            )
            for child_id in children
        ])
    session.add_all([
        Spouse(person_a_id=left, person_b_id=right, properties={})
        for left, right in combinations(sorted(partners), 2)
    ])
    session.flush()


def _person_ids(graph):
    """提取图中人物集合，便于核对视图的业务范围。"""
    return {person["personId"] for person in graph["persons"]}


def _assert_edges_stay_in_scope(graph):
    """校验所有可见关系端点存在，防止截断图产生悬空连线。"""
    visible_ids = _person_ids(graph) | {unit["familyUnitId"] for unit in graph["family_units"]}
    for edge_name in ("partner_edges", "child_edges", "parent_edges", "spouse_edges"):
        for edge in graph[edge_name]:
            relation = edge["relationship"]
            assert relation["source"] in visible_ids
            assert relation["target"] in visible_ids
            assert relation["id"]


# --- 五图投影与中心上下文 --- #


def test_mainline_keeps_lineal_family_and_collapses_side_branches(family_graph):
    """本家保留祖先、后代和同胞，把配偶原生家庭与同胞子女折叠为入口。"""
    graph = family_graph.get_mainline_graph("center", 3, 3)
    visible = _person_ids(graph)

    assert {"center", "father", "mother", "grandfather", "grandmother", "sibling", "spouse", "child", "grandchild"} <= visible
    assert not {"spouse-father", "spouse-mother", "spouse-sibling", "niece", "isolated"} & visible
    assert {(capsule["target_view"], capsule["owner_person_id"]) for capsule in graph["branch_capsules"]} >= {("inlaw", "spouse"), ("branch", "sibling")}
    assert graph["view_context"]["projection_reason"] == "mainline_projection"
    _assert_edges_stay_in_scope(graph)


def test_inlaw_projects_spouse_origin_without_center_ancestors(family_graph):
    """姻亲谱系展示配偶父母和同胞，同时保留中心人物及共同子女。"""
    graph = family_graph.get_inlaw_graph("center", "spouse", 3)

    assert {"center", "spouse", "spouse-father", "spouse-mother", "spouse-sibling", "child"} <= _person_ids(graph)
    assert not {"father", "mother", "grandfather", "grandchild", "isolated"} & _person_ids(graph)
    assert graph["view_context"]["spouse_id"] == "spouse"
    _assert_edges_stay_in_scope(graph)


def test_bridge_contains_both_parent_families_and_common_child(family_graph):
    """联姻桥接显示双方父母、双方同胞和共同子女，排除更远后代。"""
    graph = family_graph.get_bridge_graph("center", "spouse", 3, "center-family")

    assert _person_ids(graph) == {"center", "spouse", "father", "mother", "sibling", "spouse-father", "spouse-mother", "spouse-sibling", "child"}
    assert graph["view_context"]["root_id"] == "center-family"
    assert family_graph.get_bridge_graph("center", "spouse", 3, "parents") is None
    assert family_graph.get_inlaw_graph("center", "isolated", 3) is None
    _assert_edges_stay_in_scope(graph)


def test_branch_follows_descendant_families_and_keeps_their_partners(family_graph):
    """后代分支沿家庭逐层展开，不包含祖先或同胞旁系。"""
    graph = family_graph.get_branch_graph("center-family", 5)

    assert _person_ids(graph) == {"center", "spouse", "child", "child-partner", "grandchild"}
    assert {unit["familyUnitId"] for unit in graph["family_units"]} == {"center-family", "child-family"}
    assert "grandchild" not in _person_ids(family_graph.get_branch_graph("center-family", 1))
    assert family_graph.get_branch_graph("missing", 5) is None
    _assert_edges_stay_in_scope(graph)


def test_person_branch_resolves_own_family_or_isolated_person(family_graph):
    """人物根优先选本人家庭；无家庭人物保留单人图和可读提示。"""
    graph = family_graph.get_branch_graph_by_root("person", "center", 4)
    isolated = family_graph.get_branch_graph_by_root("person", "isolated", 4)

    assert graph["view_context"]["family_unit_id"] == "center-family"
    assert graph["view_context"]["projection_reason"] == "own_descendant_branch"
    assert _person_ids(isolated) == {"isolated"}
    assert isolated["family_units"] == []
    assert isolated["warnings"]
    assert family_graph.get_branch_graph_by_root("person", "missing", 4) is None


def test_overview_honors_center_scope_and_person_limit(family_graph):
    """全景按中心范围过滤，并在人数上限生效后报告隐藏数和有效连线。"""
    all_people = family_graph.get_overview_graph("all", 100)
    centered = family_graph.get_overview_graph("center:center", 100)
    limited = family_graph.get_overview_graph("all", 3)

    assert len(all_people["persons"]) == 17
    assert "isolated" not in _person_ids(centered)
    assert {"center", "father", "spouse", "child", "grandchild"} <= _person_ids(centered)
    assert len(limited["persons"]) == 3
    assert limited["hidden_relation_count"] == 14
    assert limited["warnings"]
    assert family_graph.get_overview_graph("center:missing", 100) is None
    for graph in (all_people, centered, limited):
        _assert_edges_stay_in_scope(graph)


def test_focus_and_center_context_use_persisted_relationships(family_graph):
    """中心上下文给出真实配偶、子女人数和直系摘要，兼容焦点图入口。"""
    context = family_graph.get_center_context("center")
    focus = family_graph.get_focus_graph("center", 3)

    assert context["person"]["personId"] == "center"
    assert context["available_spouses"][0]["person"]["personId"] == "spouse"
    assert context["available_spouses"][0]["family_unit_id"] == "center-family"
    assert context["available_family_units"][0]["child_count"] == 1
    assert context["nine_kinship_summary"] == {"ancestor_count": 4, "descendant_count": 2, "visible_person_count": 7, "hidden_relation_count": 0}
    assert {"center", "spouse", "child", "grandchild", "father", "sibling"} <= _person_ids(focus)
    assert family_graph.get_center_context("missing") is None
    assert family_graph.get_focus_graph("missing", 3) is None
    _assert_edges_stay_in_scope(focus)


def test_center_candidate_search_treats_sql_wildcards_literally(family_graph, repository_session):
    """搜索保留中文子串匹配，并将百分号与下划线当作人物姓名字面值。"""
    repository_session.add(GenealogyPerson(person_id="literal", name="家族_%", gender="U", properties={}))
    repository_session.flush()

    assert {person["personId"] for person in family_graph.get_center_candidates("中心", 20)} == {"center", "sibling", "spouse"}
    assert [person["personId"] for person in family_graph.get_center_candidates("_%", 20)] == ["literal"]
    assert family_graph.get_center_candidates("", 20) == []


# --- 最短路径与异常诊断 --- #


def test_relation_paths_keep_order_and_original_parent_direction(family_graph):
    """反向寻亲仍保留父母到子女的关系方向，并返回最少边数的路径。"""
    reverse = family_graph.get_relation_path("child", "center")
    across_siblings = family_graph.get_relation_path("sibling", "child")
    spouses = family_graph.get_relation_path("center", "spouse")

    assert [person["personId"] for person in reverse["persons"]] == ["child", "center"]
    assert reverse["relations"][0]["source"] == "center"
    assert reverse["relations"][0]["target"] == "child"
    assert len(across_siblings["relations"]) == 3
    assert across_siblings["persons"][0]["personId"] == "sibling"
    assert across_siblings["persons"][-1]["personId"] == "child"
    assert spouses["relations"][0]["type"] == "SPOUSE_OF"
    assert family_graph.get_relation_path("center", "isolated") is None
    assert family_graph.get_relation_path("center", "missing") is None
    assert family_graph.get_relation_path("center", "center")["relations"] == []


def test_relation_path_depth_limit_applies_to_real_chain(repository_session):
    """十条边的路径可达，超过上限的链不会意外返回全库路径。"""
    repository_session.add_all([
        GenealogyPerson(person_id=f"p{index}", name=f"第{index}代", gender="U", properties={})
        for index in range(12)
    ])
    repository_session.flush()
    repository_session.add_all([
        ParentChild(parent_id=f"p{index}", child_id=f"p{index + 1}", relation_kind="biological", properties={})
        for index in range(11)
    ])
    repository_session.flush()
    repository = GraphRepository(repository_session)

    assert len(repository.get_relation_path("p0", "p10")["relations"]) == 10
    assert repository.get_relation_path("p0", "p11") is None


def test_diagnostics_find_isolated_people_and_multiple_biological_fathers(family_graph, repository_session):
    """收养父亲不计入生父冲突，真实的第二位生父会产生诊断记录。"""
    repository_session.add_all([
        GenealogyPerson(person_id=person_id, name=person_id, gender="M", properties={})
        for person_id in ("second-father", "adoptive-father")
    ])
    repository_session.flush()
    repository_session.add_all([
        ParentChild(parent_id="second-father", child_id="center", relation_kind="biological", properties={"side": "father"}),
        ParentChild(parent_id="adoptive-father", child_id="center", relation_kind="adoptive", properties={"side": "father"}),
    ])
    repository_session.flush()
    issues = family_graph.get_graph_issues()

    assert {(issue["person"]["personId"], issue["issue_type"]) for issue in issues} == {("isolated", "isolated_person"), ("center", "multiple_fathers")}


def test_ancestor_cycle_diagnosis_and_traversal_terminate(family_graph, repository_session):
    """存在祖先环时仅标出环上人物，普通谱系和最短路径查询仍能终止。"""
    repository_session.add(ParentChild(parent_id="child", child_id="father", relation_kind="biological", properties={"side": "parent"}))
    repository_session.flush()
    issues = family_graph.get_graph_issues()
    cycle_people = {issue["person"]["personId"] for issue in issues if issue["issue_type"] == "ancestor_cycle"}

    assert cycle_people == {"father", "center", "child"}
    assert "center" in _person_ids(family_graph.get_mainline_graph("center", 10, 10))
    assert family_graph.get_relation_path("grandfather", "grandchild") is not None
