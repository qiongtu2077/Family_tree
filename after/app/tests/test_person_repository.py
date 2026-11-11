"""使用真实数据库验证人物资料、家庭派生关系、约束与事务语义。"""
from __future__ import annotations

from datetime import date

import pytest
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError

from app.graph_models import (
    FamilyChild, FamilyPartner, FamilyUnit, GenealogyPerson, ParentChild, Spouse,
)
from app.models import User
from app.repositories.graph_repository import GraphRepository
from app.repositories.person_repository import PersonRepository


# --- 人物资料与搜索 --- #


@pytest.fixture
def person_repository(repository_session):
    """提供共享当前测试事务的人物仓储。"""
    return PersonRepository(repository_session)


@pytest.fixture
def nuclear_family_people(person_repository):
    """建立父母、子女与额外人物，供关系写入测试复用。"""
    for person_id, gender in (("father", "M"), ("mother", "F"), ("child", "U"), ("other", "U")):
        person_repository.create_person({"personId": person_id, "name": person_id, "gender": gender})
    return person_repository


def test_person_crud_keeps_stable_id_and_normalizes_dates(person_repository, repository_session):
    """人物新增、更新和重读保留字符串 ID、生平字段与布尔值。"""
    created = person_repository.create_person({
        "personId": "legacy:12", "name": "旧姓名", "gender": "F",
        "birth_date": date(1950, 2, 3), "is_alive": False,
        "biography": "人物生平", "photos": ["/uploads/photos/old.jpg"],
    })
    updated = person_repository.update_person("legacy:12", {
        "personId": "changed-id", "name": "新姓名", "occupation": "教师",
    })
    repository_session.commit()
    repository_session.expire_all()
    saved = person_repository.get_person("legacy:12")

    assert created["personId"] == updated["personId"] == saved["personId"] == "legacy:12"
    assert saved["name"] == "新姓名"
    assert saved["birthDate"] == "1950-02-03"
    assert saved["isAlive"] is False
    assert saved["biography"] == "人物生平"
    assert saved["photos"] == ["/uploads/photos/old.jpg"]
    assert saved["occupation"] == "教师"
    assert saved["createdAt"] and saved["updatedAt"]
    assert person_repository.get_person("changed-id") is None
    assert person_repository.update_person("missing", {"name": "不存在"}) is None
    assert person_repository.delete_person("missing") is False


def test_optional_person_fields_can_be_explicitly_cleared(person_repository, repository_session):
    """编辑资料允许清空日期、头像和照片数组，未提交字段仍保留。"""
    person_repository.create_person({
        "personId": "editable", "name": "可编辑人物", "gender": "M",
        "birth_date": date(2000, 1, 1), "avatar": "/uploads/avatars/a.jpg",
        "photos": ["/uploads/photos/a.jpg"], "biography": "保留的生平",
    })
    person_repository.update_person("editable", {"birth_date": None, "avatar": None, "photos": []})
    repository_session.commit()
    repository_session.expire_all()
    saved = person_repository.get_person("editable")

    assert saved["birthDate"] is None
    assert saved["avatar"] is None
    assert saved["photos"] == []
    assert saved["biography"] == "保留的生平"
    assert saved["name"] == "可编辑人物"


def test_person_ids_are_generated_and_search_escapes_wildcards(person_repository):
    """未指定 ID 时生成唯一人物，姓名搜索不把 SQL 通配符扩大为全库匹配。"""
    first = person_repository.create_person({"name": "Alpha_%", "gender": "U"})
    second = person_repository.create_person({"name": "alphaXX", "gender": "U"})
    third = person_repository.create_person({"name": "Beta", "gender": "U"})

    assert first["personId"] != second["personId"]
    assert {person["personId"] for person in person_repository.search_persons("ALPHA")} == {first["personId"], second["personId"]}
    assert [person["personId"] for person in person_repository.search_persons("_%")] == [first["personId"]]
    assert len(person_repository.list_persons(1, 1)) == 1
    assert {person["personId"] for person in person_repository.list_persons(0, 10)} == {first["personId"], second["personId"], third["personId"]}


# --- 家庭录入与直接关系同步 --- #


@pytest.mark.parametrize("child_first", [False, True], ids=["partners-before-child", "child-before-partners"])
def test_family_members_derive_queryable_relations_in_either_order(nuclear_family_people, repository_session, child_first):
    """两种家庭录入顺序都自动生成同样的亲子和配偶关系，录入后即可查询。"""
    repository = nuclear_family_people
    repository.create_family_unit({"familyUnitId": "family", "family_type": "marriage", "start_date": date(1990, 1, 1)})
    if child_first:
        assert repository.add_child_to_family_unit("child", "family", {"relationKind": "biological", "certainty": 0.8})
    assert repository.add_partner_to_family_unit("father", "family", {"displayOrder": 1})
    assert repository.add_partner_to_family_unit("mother", "family", {"displayOrder": 2})
    if not child_first:
        assert repository.add_child_to_family_unit("child", "family", {"relationKind": "biological", "certainty": 0.8})
    repository_session.commit()
    repository_session.expire_all()
    parents = list(repository_session.scalars(select(ParentChild)))
    spouses = list(repository_session.scalars(select(Spouse)))

    assert {(row.parent_id, row.child_id, row.relation_kind) for row in parents} == {("father", "child", "biological"), ("mother", "child", "biological")}
    assert {row.parent_id: row.to_dict()["side"] for row in parents} == {"father": "father", "mother": "mother"}
    assert all(row.to_dict()["certainty"] == 0.8 for row in parents)
    assert [(row.person_a_id, row.person_b_id) for row in spouses] == [("father", "mother")]
    assert spouses[0].to_dict()["startDate"] == "1990-01-01"
    path = GraphRepository(repository_session).get_relation_path("father", "child")
    assert [person["personId"] for person in path["persons"]] == ["father", "child"]


def test_repeated_members_and_reverse_spouses_update_without_duplicates(nuclear_family_people, repository_session):
    """重复成员录入和反向配偶写入保持唯一关系并更新其元数据。"""
    repository = nuclear_family_people
    repository.create_family_unit({"familyUnitId": "family"})
    repository.add_partner_to_family_unit("father", "family", {"displayOrder": 1})
    repository.add_partner_to_family_unit("mother", "family", {})
    repository.add_partner_to_family_unit("father", "family", {"displayOrder": 3})
    repository.add_child_to_family_unit("child", "family", {"birthOrder": 1})
    repository.add_child_to_family_unit("child", "family", {"birthOrder": 2})
    repository.add_spouse_relation("mother", "father", {"displayOrder": 5})

    assert repository_session.scalar(select(func.count()).select_from(FamilyPartner)) == 2
    assert repository_session.scalar(select(func.count()).select_from(FamilyChild)) == 1
    assert repository_session.scalar(select(func.count()).select_from(ParentChild)) == 2
    assert repository_session.scalar(select(func.count()).select_from(Spouse)) == 1
    assert repository_session.get(FamilyPartner, ("family", "father")).to_dict()["displayOrder"] == 3
    assert repository_session.get(FamilyChild, ("family", "child")).to_dict()["birthOrder"] == 2
    assert repository_session.get(Spouse, ("father", "mother")).to_dict()["displayOrder"] == 5


@pytest.mark.parametrize("family_type", ["single_parent", "unknown_parent", "adoptive"])
def test_nonmarriage_family_does_not_invent_spouse_relationship(nuclear_family_people, repository_session, family_type):
    """单亲、未知父母和收养家庭的共同成员身份不会被解释为婚姻。"""
    repository = nuclear_family_people
    repository.create_family_unit({"familyUnitId": "family", "family_type": family_type})
    repository.add_partner_to_family_unit("father", "family", {})
    repository.add_partner_to_family_unit("mother", "family", {})
    repository.add_child_to_family_unit("child", "family", {"relationKind": "adoptive"})

    assert repository_session.scalar(select(func.count()).select_from(Spouse)) == 0
    assert {(row.parent_id, row.relation_kind) for row in repository_session.scalars(select(ParentChild))} == {("father", "adoptive"), ("mother", "adoptive")}


def test_biological_and_adoptive_facts_coexist_for_same_people(nuclear_family_people, repository_session):
    """同一父母子女之间的生育和收养关系分别持久化，不互相覆盖。"""
    repository = nuclear_family_people
    repository.create_family_unit({"familyUnitId": "birth-family"})
    repository.add_partner_to_family_unit("father", "birth-family", {})
    repository.add_child_to_family_unit("child", "birth-family", {"relationKind": "biological"})
    repository.create_family_unit({"familyUnitId": "adopt-family", "family_type": "adoptive"})
    repository.add_child_to_family_unit("child", "adopt-family", {"relationKind": "adoptive", "certainty": 0.5})
    repository.add_partner_to_family_unit("father", "adopt-family", {})
    repository.add_parent_child_relation("father", "child", {"relationKind": "adoptive", "certainty": 0.9})
    repository_session.commit()
    repository_session.expire_all()
    relations = list(repository_session.scalars(select(ParentChild)))

    assert {row.relation_kind for row in relations} == {"biological", "adoptive"}
    assert len(relations) == 2
    assert repository_session.get(ParentChild, ("father", "child", "adoptive")).to_dict()["certainty"] == 0.9
    assert GraphRepository(repository_session).get_relation_path("father", "child")["relations"][0]["relationKind"] == "biological"


@pytest.mark.parametrize("method_name,arguments", [
    ("add_partner_to_family_unit", ("missing", "family")),
    ("add_partner_to_family_unit", ("father", "missing")),
    ("add_child_to_family_unit", ("missing", "family")),
    ("add_parent_child_relation", ("father", "missing")),
    ("add_spouse_relation", ("father", "missing")),
])
def test_missing_relationship_endpoints_leave_no_partial_rows(nuclear_family_people, repository_session, method_name, arguments):
    """关系任一端不存在时明确失败，不写入部分成员或直接关系。"""
    repository = nuclear_family_people
    repository.create_family_unit({"familyUnitId": "family"})

    assert getattr(repository, method_name)(*arguments, {}) is False
    for model in (FamilyPartner, FamilyChild, ParentChild, Spouse):
        assert repository_session.scalar(select(func.count()).select_from(model)) == 0


# --- 删除、约束与事务隔离 --- #


def test_person_deletion_removes_all_touching_edges_and_clears_user_binding(nuclear_family_people, repository_session):
    """删除人物清理双向亲缘和家庭身份，账号保留但解除人物绑定。"""
    repository = nuclear_family_people
    repository.create_family_unit({"familyUnitId": "family"})
    repository.add_partner_to_family_unit("father", "family", {})
    repository.add_partner_to_family_unit("mother", "family", {})
    repository.add_child_to_family_unit("child", "family", {})
    repository.create_family_unit({"familyUnitId": "ancestor-family", "family_type": "single_parent"})
    repository.add_partner_to_family_unit("other", "ancestor-family", {})
    repository.add_child_to_family_unit("father", "ancestor-family", {})
    user = User(username="bound-user", password="test-hash", email="bound@example.test", person_id="father")
    repository_session.add(user)
    repository_session.commit()
    user_id = user.id

    assert repository.delete_person("father") is True
    repository_session.commit()
    repository_session.expire_all()

    assert repository.get_person("father") is None
    assert repository_session.get(User, user_id).person_id is None
    assert {person["personId"] for person in repository.list_persons(0, 100)} == {"mother", "child", "other"}
    assert {(row.parent_id, row.child_id) for row in repository_session.scalars(select(ParentChild))} == {("mother", "child")}
    assert repository_session.scalar(select(func.count()).select_from(Spouse)) == 0
    assert {(row.family_unit_id, row.person_id) for row in repository_session.scalars(select(FamilyPartner))} == {("family", "mother"), ("ancestor-family", "other")}
    assert {(row.family_unit_id, row.child_id) for row in repository_session.scalars(select(FamilyChild))} == {("family", "child")}


def test_writes_and_derived_edges_roll_back_as_one_transaction(person_repository, repository_session):
    """人物、家庭和派生亲缘只 flush，调用方回滚后不会留下部分录入。"""
    person_repository.create_person({"personId": "parent", "name": "父母", "gender": "U"})
    person_repository.create_person({"personId": "child", "name": "子女", "gender": "U"})
    person_repository.create_family_unit({"familyUnitId": "family"})
    person_repository.add_partner_to_family_unit("parent", "family", {})
    person_repository.add_child_to_family_unit("child", "family", {})
    repository_session.rollback()

    for model in (GenealogyPerson, FamilyUnit, FamilyPartner, FamilyChild, ParentChild, Spouse):
        assert repository_session.scalar(select(func.count()).select_from(model)) == 0


def test_database_rejects_self_parent_and_dangling_relationships(nuclear_family_people, repository_session):
    """数据库约束拒绝自指亲子及不存在的人物引用，覆盖真实外键执行。"""
    repository_session.commit()
    with pytest.raises(IntegrityError):
        nuclear_family_people.add_parent_child_relation("father", "father", {"relationKind": "biological"})
    repository_session.rollback()
    repository_session.add(ParentChild(parent_id="missing", child_id="child", relation_kind="biological", properties={}))
    with pytest.raises(IntegrityError):
        repository_session.flush()
    repository_session.rollback()


def test_clearing_demo_preserves_non_demo_people_families_and_edges(person_repository, repository_session):
    """演示数据清理仅删除 demo: 命名空间及接触关系，真实族谱仍完整。"""
    for person_id in ("real", "real-child", "demo-other", "demo:parent", "demo:child"):
        person_repository.create_person({"personId": person_id, "name": person_id, "gender": "U"})
    person_repository.create_family_unit({"familyUnitId": "real-family"})
    person_repository.add_partner_to_family_unit("real", "real-family", {})
    person_repository.add_child_to_family_unit("real-child", "real-family", {})
    person_repository.create_family_unit({"familyUnitId": "demo:family"})
    person_repository.add_partner_to_family_unit("demo:parent", "demo:family", {})
    person_repository.add_child_to_family_unit("demo:child", "demo:family", {})
    person_repository.add_spouse_relation("real", "demo:parent", {})
    person_repository.clear_demo_family()
    repository_session.commit()
    repository_session.expire_all()

    assert {person["personId"] for person in person_repository.list_persons(0, 100)} == {"real", "real-child", "demo-other"}
    assert [unit.family_unit_id for unit in repository_session.scalars(select(FamilyUnit))] == ["real-family"]
    assert {(row.parent_id, row.child_id) for row in repository_session.scalars(select(ParentChild))} == {("real", "real-child")}
    assert repository_session.scalar(select(func.count()).select_from(Spouse)) == 0
    assert repository_session.scalar(select(func.count()).select_from(FamilyPartner)) == 1
    assert repository_session.scalar(select(func.count()).select_from(FamilyChild)) == 1
