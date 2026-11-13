"""验证家庭纠错、关系来源、安全删除及资料维护 API 的实际契约。"""
from __future__ import annotations

import asyncio
from urllib.parse import quote

from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient
import httpx
import pytest
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.graph_models import FamilyUnit, GenealogyPerson, ParentChild, Spouse
from app.graph_schemas import RelationshipCreate
from app.management_schemas import FamilyUnitDetail
from app.models import User
from app.repositories.management_repository import ManagementRepository
from app.routers import family_units, relationships
from app.security import require_admin, require_user


# --- 测试家系与实际 API 会话 --- #


@pytest.fixture
def managed_family(repository_session):
    """建立有明确家庭来源的新家系，及没有成员关系的额外人物。"""
    repository = ManagementRepository(repository_session)
    for person_id, gender in (("p:father", "M"), ("p:mother", "F"), ("p:child", "U"), ("p:other", "U")):
        repository.create_person({"personId": person_id, "name": person_id, "gender": gender})
    repository.create_family_unit({"familyUnitId": "f:parents", "family_type": "marriage", "start_date": "1990-01-01"})
    repository.add_partner_to_family_unit("p:father", "f:parents", {"displayOrder": 1})
    repository.add_partner_to_family_unit("p:mother", "f:parents", {"displayOrder": 2})
    repository.add_child_to_family_unit("p:child", "f:parents", {"relationKind": "biological", "birthOrder": 1})
    return repository


@pytest.fixture
def management_client():
    """通过内存隔离库运行真实 FastAPI 路由，并用显式依赖替换提供测试管理员。"""
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    with Session(engine) as session:
        app = FastAPI()
        app.include_router(family_units.router)
        app.include_router(relationships.router)
        app.dependency_overrides[get_db] = lambda: session
        admin = User(id=1, username="test-admin", email="test-admin@example.test", is_admin=True, is_active=True)
        app.dependency_overrides[require_user] = lambda: admin
        app.dependency_overrides[require_admin] = lambda: admin
        with TestClient(app) as client:
            yield client, session, app
    engine.dispose()


# --- 家庭纠错与来源保留 --- #


def test_family_list_has_raw_ids_complete_members_and_pagination(managed_family):
    """管理家庭使用原始 ID，成员返回可寻址关系 ID，不借用图谱截断数据。"""
    managed_family.create_family_unit({"familyUnitId": "z:empty"})
    first = managed_family.list_family_units(0, 1)
    second = managed_family.list_family_units(1, 1)
    detail = FamilyUnitDetail.model_validate(first[0])

    assert detail.id == "f:parents"
    assert detail.start_date == "1990-01-01"
    assert [member.person_id for member in detail.partners] == ["p:father", "p:mother"]
    assert detail.children[0].relationship_id == "HAS_CHILD:f%3Aparents:p%3Achild"
    assert detail.children[0].birth_order == 1
    assert second[0]["id"] == "z:empty"


def test_delete_family_keeps_people_and_independent_facts(managed_family, repository_session):
    """删家庭不删人，只清明确派生事实，显式独立亲子事实保留。"""
    managed_family.add_parent_child_relation("p:father", "p:child", {"relationKind": "biological", "certainty": .7})
    assert managed_family.delete_family("f:parents")

    assert repository_session.get(FamilyUnit, "f:parents") is None
    assert len(list(repository_session.scalars(select(GenealogyPerson)))) == 4
    assert repository_session.get(ParentChild, ("p:father", "p:child", "biological")) is not None
    assert repository_session.get(ParentChild, ("p:mother", "p:child", "biological")) is None
    assert repository_session.get(Spouse, ("p:father", "p:mother")) is None


def test_delete_family_retains_unmarked_historical_facts(managed_family, repository_session):
    """没有来源元数据的历史记录不能推断为派生关系并自动删除。"""
    historical_parent = repository_session.get(ParentChild, ("p:father", "p:child", "biological"))
    historical_spouse = repository_session.get(Spouse, ("p:father", "p:mother"))
    historical_parent.properties = {"side": "father"}
    historical_spouse.properties = {}
    repository_session.flush()

    assert managed_family.delete_family("f:parents")
    assert repository_session.get(ParentChild, ("p:father", "p:child", "biological")) is not None
    assert repository_session.get(Spouse, ("p:father", "p:mother")) is not None
    listing = managed_family.list_relationships(0, 100)
    assert all(not relation.get("derived_from_family", False) for relation in listing)


def test_sync_never_reclassifies_historical_fact_as_derived(managed_family, repository_session):
    """历史记录在后续成员同步后仍保留独立身份，不因刷新家庭被自动清理。"""
    parent = repository_session.get(ParentChild, ("p:father", "p:child", "biological"))
    parent.properties = {"side": "father", "certainty": .5}
    repository_session.flush()
    managed_family.add_partner_to_family_unit("p:father", "f:parents", {"displayOrder": 3})
    managed_family.delete_family("f:parents")

    retained = repository_session.get(ParentChild, ("p:father", "p:child", "biological"))
    assert retained is not None
    assert retained.properties["certainty"] == .5


def test_family_sync_preserves_explicit_parent_and_spouse_properties(managed_family, repository_session):
    """刷新家庭只增加来源，不覆盖管理员独立维护的可信度、身份和配偶顺序。"""
    managed_family.add_parent_child_relation("p:father", "p:child", {
        "relationKind": "biological", "certainty": .6, "side": "parent",
    })
    managed_family.add_spouse_relation("p:father", "p:mother", {"displayOrder": 9})
    managed_family.add_child_to_family_unit("p:child", "f:parents", {"certainty": .9})
    managed_family.update_family("f:parents", {"display_order": 2})

    parent = repository_session.get(ParentChild, ("p:father", "p:child", "biological"))
    spouse = repository_session.get(Spouse, ("p:father", "p:mother"))
    assert parent.properties["certainty"] == .6
    assert parent.properties["side"] == "parent"
    assert spouse.properties["displayOrder"] == 9
    managed_family.delete_family("f:parents")
    assert parent.properties["_family_sources"] == []
    assert spouse.properties["_family_sources"] == []
    assert parent.properties["_explicit"] and spouse.properties["_explicit"]


def test_multiple_families_preserve_shared_fact_until_last_source_removed(managed_family, repository_session):
    """同一亲缘由两个家庭明确支持时，删一个家庭不会误删仍成立的事实。"""
    managed_family.create_family_unit({"familyUnitId": "f:second"})
    managed_family.add_partner_to_family_unit("p:father", "f:second", {})
    managed_family.add_child_to_family_unit("p:child", "f:second", {"relationKind": "biological"})

    managed_family.delete_family("f:parents")
    relation = repository_session.get(ParentChild, ("p:father", "p:child", "biological"))
    assert relation is not None
    assert relation.properties["_family_sources"] == ["f:second"]
    managed_family.delete_family("f:second")
    assert repository_session.get(ParentChild, ("p:father", "p:child", "biological")) is None


def test_family_type_update_clears_dates_and_only_derived_spouse(managed_family, repository_session):
    """修改为单亲家庭不再派生配偶，日期可显式清空，亲子关系仍然存在。"""
    updated = managed_family.update_family("f:parents", {"family_type": "single_parent", "start_date": None})

    assert updated["family_type"] == "single_parent"
    assert updated["start_date"] is None
    assert repository_session.get(Spouse, ("p:father", "p:mother")) is None
    assert repository_session.get(ParentChild, ("p:father", "p:child", "biological")) is not None


def test_spouse_keeps_other_family_source_after_type_correction(managed_family, repository_session):
    """一处家庭取消婚姻后，共享配偶事实仍由另一处婚姻支持，最后来源取消才清除。"""
    managed_family.create_family_unit({"familyUnitId": "f:second", "family_type": "partner"})
    for person_id in ("p:father", "p:mother"):
        managed_family.add_partner_to_family_unit(person_id, "f:second", {})
    managed_family.update_family("f:parents", {"family_type": "single_parent"})
    spouse = repository_session.get(Spouse, ("p:father", "p:mother"))
    assert spouse.properties["_family_sources"] == ["f:second"]

    managed_family.update_family("f:second", {"family_type": "adoptive"})
    assert repository_session.get(Spouse, ("p:father", "p:mother")) is None


def test_member_remove_updates_derived_edges_but_preserves_other_parent(managed_family, repository_session):
    """移除父亲身份后，母亲与子女成员及对应亲子事实保留。"""
    member = managed_family.get_family_detail("f:parents")["partners"][0]
    assert managed_family.delete_relationship(member["relationship_id"])
    assert repository_session.get(ParentChild, ("p:father", "p:child", "biological")) is None
    assert repository_session.get(ParentChild, ("p:mother", "p:child", "biological")) is not None
    assert repository_session.get(Spouse, ("p:father", "p:mother")) is None
    assert len(managed_family.get_family_detail("f:parents")["children"]) == 1


def test_child_remove_keeps_parents_marriage_and_all_people(managed_family, repository_session):
    """移除子女身份只清两位父母的家庭派生亲子关系，配偶事实与人物资料均保留。"""
    child = managed_family.get_family_detail("f:parents")["children"][0]
    assert managed_family.delete_relationship(child["relationship_id"])
    assert list(repository_session.scalars(select(ParentChild))) == []
    assert repository_session.get(Spouse, ("p:father", "p:mother")) is not None
    assert managed_family.get_person("p:child") is not None
    assert len(managed_family.get_family_detail("f:parents")["partners"]) == 2


def test_child_kind_edit_removes_stale_derived_kind(managed_family, repository_session):
    """纠正子女为收养关系时，移除明确派生的旧生育事实并创建收养事实。"""
    relationships.create_relationship(RelationshipCreate(
        relationship_type="child", target_person_id="p:child", family_unit_id="f:parents",
        relation_kind="adoptive", birth_order=2, certainty=.8,
    ), repository_session)

    assert repository_session.get(ParentChild, ("p:father", "p:child", "biological")) is None
    assert repository_session.get(ParentChild, ("p:father", "p:child", "adoptive")) is not None
    child = managed_family.get_family_detail("f:parents")["children"][0]
    assert child["relation_kind"] == "adoptive"
    assert child["certainty"] == .8


def test_deleting_derived_direct_edge_requires_family_correction(managed_family):
    """直接移除家庭仍支持的亲缘会得到明确409，不制造家庭与路径互相矛盾的数据。"""
    relation = next(row for row in managed_family.list_relationships(0, 100) if row["relationship_type"] == "parent_child")
    assert relation["derived_from_family"] is True
    with pytest.raises(HTTPException) as error:
        managed_family.delete_relationship(relation["id"])
    assert error.value.status_code == 409
    assert "家庭" in error.value.detail


def test_independent_relationship_delete_preserves_other_relation_kind(managed_family, repository_session):
    """同对人物的生育与收养事实独立寻址，删除独立收养事实不影响家庭生育事实。"""
    managed_family.add_parent_child_relation("p:father", "p:child", {"relationKind": "adoptive"})
    relation = next(row for row in managed_family.list_relationships(0, 100) if row["relationship_type"] == "parent_child" and row["relation_kind"] == "adoptive")
    managed_family.delete_relationship(relation["id"])
    assert repository_session.get(ParentChild, ("p:father", "p:child", "adoptive")) is None
    assert repository_session.get(ParentChild, ("p:father", "p:child", "biological")) is not None


# --- 路由契约、端点编码与权限 --- #


def test_relationship_create_rejects_missing_family_and_self_membership(managed_family, repository_session):
    """不存在家庭不再静默成功，同一家庭禁止把父母同时录为自己的子女。"""
    with pytest.raises(HTTPException) as missing:
        relationships.create_relationship(RelationshipCreate(relationship_type="partner", person_id="p:father", family_unit_id="missing"), repository_session)
    with pytest.raises(HTTPException) as self_member:
        relationships.create_relationship(RelationshipCreate(relationship_type="child", target_person_id="p:father", family_unit_id="f:parents"), repository_session)
    assert missing.value.status_code == 404
    assert self_member.value.status_code == 400


def test_http_family_crud_uses_raw_id_and_delete_keeps_person(management_client):
    """实际HTTP创建沿用图谱family:响应，管理列表使用原始ID，编辑删除使用原始ID。"""
    client, session, _app = management_client
    repository = ManagementRepository(session)
    repository.create_person({"personId": "p:one", "name": "一位家人"})
    created = client.post("/api/family-units", json={"family_type": "single_parent"})
    assert created.status_code == 201
    family_id = created.json()["id"][len("family:"):]
    added = client.post("/api/relationships", json={"relationship_type": "partner", "person_id": "p:one", "family_unit_id": family_id})
    assert added.status_code == 201
    listing = client.get("/api/family-units").json()
    assert listing[0]["id"] == family_id
    assert listing[0]["partners"][0]["person_id"] == "p:one"
    updated = client.patch(f"/api/family-units/{family_id}", json={"display_order": 8})
    assert updated.status_code == 200
    assert updated.json()["display_order"] == 8
    assert client.delete(f"/api/family-units/{family_id}").status_code == 204
    assert repository.get_person("p:one") is not None


@pytest.mark.parametrize("relationship_type", ["spouse", "parent_child", "partner", "child"])
def test_http_relation_id_round_trip_encodes_colon_slash_percent(management_client, relationship_type):
    """按 ASGI 单次路径解码运行 HTTP，避免旧版 TestClient 对路径的重复 unquote。"""
    _client, session, app = management_client
    repository = ManagementRepository(session)
    for person_id in ("legacy:a/b%", "legacy:target"):
        repository.create_person({"personId": person_id, "name": person_id})
    repository.create_family_unit({"familyUnitId": "legacy:family/a%"})
    payload = {"relationship_type": relationship_type}
    if relationship_type in {"spouse", "parent_child"}:
        payload.update(person_id="legacy:a/b%", target_person_id="legacy:target")
    elif relationship_type == "partner":
        payload.update(person_id="legacy:a/b%", family_unit_id="legacy:family/a%")
    else:
        payload.update(target_person_id="legacy:a/b%", family_unit_id="legacy:family/a%")

    async def round_trip():
        """经实际HTTP编码创建、列出并删除含保留字符端点的关系。"""
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
            created = await client.post("/api/relationships", json=payload)
            assert created.status_code == 201
            listing = await client.get("/api/relationships")
            relation_id = listing.json()[0]["id"]
            response = await client.delete(f"/api/relationships/{quote(relation_id, safe='')}")
            assert response.status_code == 204
            assert (await client.get("/api/relationships")).json() == []

    asyncio.run(round_trip())


def test_http_pagination_update_validation_and_missing_targets(management_client):
    """管理HTTP支持稳定分页，拒绝无效分页/空必填属性，并为不存在目标返回404。"""
    client, session, _app = management_client
    repository = ManagementRepository(session)
    for family_id in ("f:first", "f:second"):
        repository.create_family_unit({"familyUnitId": family_id})
    assert client.get("/api/family-units?skip=1&limit=1").json()[0]["id"] == "f:second"
    assert client.get("/api/family-units?skip=-1").status_code == 422
    assert client.get("/api/relationships?limit=1001").status_code == 422
    assert client.patch("/api/family-units/f:first", json={"family_type": None}).status_code == 422
    assert client.patch("/api/family-units/f:first", json={"display_order": None}).status_code == 422
    assert client.patch("/api/family-units/missing", json={"display_order": 2}).status_code == 404
    assert client.delete("/api/family-units/missing").status_code == 404
    assert client.delete("/api/relationships/INVALID:a:b").status_code == 400
    assert client.delete("/api/relationships/SPOUSE_OF:a:b").status_code == 404


def test_http_family_update_and_delete_preserve_reserved_id_characters(management_client):
    """迁移家庭的斜线、冒号和百分号原始ID也可通过前端编码契约编辑及删除。"""
    _client, session, app = management_client
    repository = ManagementRepository(session)
    family_id = "legacy:family/a%3A"
    repository.create_family_unit({"familyUnitId": family_id})

    async def round_trip():
        """遵循单次URL解码，用原始ID往返维护同一个家庭。"""
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
            path = f"/api/family-units/{quote(family_id, safe='')}"
            updated = await client.patch(path, json={"display_order": 6})
            assert updated.status_code == 200
            assert updated.json()["id"] == family_id
            assert updated.json()["display_order"] == 6
            assert (await client.delete(path)).status_code == 204
            assert (await client.get("/api/family-units")).json() == []

    asyncio.run(round_trip())


def test_regular_member_can_read_but_cannot_modify_management(management_client):
    """普通已登录成员可读取维护清单，实际管理员依赖拒绝全部资料写入口。"""
    client, _session, app = management_client
    member = User(id=2, username="test-member", email="test-member@example.test", is_admin=False, is_active=True)
    app.dependency_overrides[require_user] = lambda: member
    app.dependency_overrides.pop(require_admin)

    assert client.get("/api/family-units").status_code == 200
    assert client.get("/api/relationships").status_code == 200
    assert client.post("/api/family-units", json={}).status_code == 403
    assert client.patch("/api/family-units/any", json={"display_order": 1}).status_code == 403
    assert client.delete("/api/family-units/any").status_code == 403
    assert client.post("/api/relationships", json={"relationship_type": "spouse"}).status_code == 403
    assert client.delete("/api/relationships/SPOUSE_OF:a:b").status_code == 403


def test_management_routes_require_real_session_without_overrides(management_client):
    """真实管理路由缺少会话时拒绝读写，测试管理员替换仅存在于fixture。"""
    client, _session, app = management_client
    app.dependency_overrides.pop(require_user)
    app.dependency_overrides.pop(require_admin)
    assert client.get("/api/family-units").status_code == 401
    assert client.post("/api/family-units", json={}).status_code == 401
    assert client.get("/api/relationships").status_code == 401
    assert client.delete("/api/relationships/SPOUSE_OF:a:b").status_code == 401
