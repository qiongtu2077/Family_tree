"""验证旧人物、资料、上传和树接口统一访问当前族谱数据。"""
from __future__ import annotations

from io import BytesIO
from pathlib import Path

from fastapi import HTTPException, UploadFile
import pytest
from sqlalchemy import func, select

from app.graph_models import GenealogyPerson
from app.models import User
from app.repositories.person_repository import PersonRepository
from app.routers import genealogy
from app.schemas import PersonCreate, PersonProfileUpdate, PersonResponse, PersonUpdate
from app.services.family_tree import get_ancestors, get_descendants, get_siblings


@pytest.fixture
def legacy_family(repository_session):
    """通过统一人物仓储保存家庭和绑定孩子的有效账号。"""
    repository = PersonRepository(repository_session)
    for person_id, name, gender in (
        ("family:father", "父亲", "M"), ("family:mother", "母亲", "F"),
        ("family:child", "孩子", "U"), ("family:sibling", "同胞", "F"),
        ("family:adoptive", "养父", "M"), ("family:outsider", "其他人", "U"),
    ):
        repository.create_person({"personId": person_id, "name": name, "gender": gender})
    repository.create_family_unit({"familyUnitId": "family:parents", "type": "marriage"})
    repository.add_partner_to_family_unit("family:father", "family:parents", {})
    repository.add_partner_to_family_unit("family:mother", "family:parents", {})
    repository.add_child_to_family_unit("family:child", "family:parents", {"relationKind": "biological"})
    repository.add_child_to_family_unit("family:sibling", "family:parents", {"relationKind": "biological"})
    repository.add_parent_child_relation("family:adoptive", "family:child", {
        "side": "father", "relationKind": "adoptive", "certainty": 0.8,
    })
    user = User(username="child", password="hash", email="child@example.com", person_id="family:child",
                is_admin=False, is_active=True)
    repository_session.add(user)
    repository_session.flush()
    return repository, user


def test_legacy_create_and_list_share_unified_people(repository_session):
    """旧接口创建人物后，正式仓储和旧列表读取相同稳定 ID 与资料。"""
    result = genealogy.create_person(PersonCreate(name="新成员", gender="U", biography="家庭记忆"), repository_session)
    stored = PersonRepository(repository_session).get_person(result["id"])
    listing = genealogy.get_persons(0, 100, repository_session)

    assert isinstance(result["id"], str)
    assert stored["biography"] == "家庭记忆"
    assert [person["id"] for person in listing] == [result["id"]]
    assert PersonResponse.model_validate(result).id == result["id"]


def test_legacy_detail_keeps_biological_and_adoptive_facts(repository_session, legacy_family):
    """详情从统一亲子表读取父母，并把生父与养父事实分别保留。"""
    _, user = legacy_family
    detail = genealogy.get_person_detail("family:child", user, repository_session)
    person = genealogy.get_person("family:child", repository_session)

    assert person["father_id"] == "family:father"
    assert person["mother_id"] == "family:mother"
    assert detail["father_name"] == "父亲"
    assert detail["can_edit"] is True
    assert {(link["parent_id"], link["relation_kind"]) for link in detail["parent_relations"]} == {
        ("family:father", "biological"), ("family:mother", "biological"), ("family:adoptive", "adoptive"),
    }


def test_legacy_parent_changes_are_explicit_and_atomic(repository_session, legacy_family):
    """拒绝旧父母字段变更时，也不能提交同请求中的人物资料。"""
    repository, _ = legacy_family
    with pytest.raises(HTTPException) as error:
        genealogy.update_person("family:child", PersonUpdate(name="不应保存", father_id=None), repository_session)
    assert error.value.status_code == 409
    assert "/api/relationships" in error.value.detail
    assert repository.get_person("family:child")["name"] == "孩子"

    updated = genealogy.update_person("family:child", PersonUpdate(name="新名字", father_id="family:father"), repository_session)
    assert updated["name"] == "新名字"
    assert updated["father_id"] == "family:father"

    before = repository_session.scalar(select(func.count()).select_from(GenealogyPerson))
    with pytest.raises(HTTPException):
        genealogy.create_person(PersonCreate(name="不应新增", gender="U", mother_id="family:mother"), repository_session)
    assert repository_session.scalar(select(func.count()).select_from(GenealogyPerson)) == before


def test_legacy_profile_and_dates_can_be_cleared(repository_session, legacy_family):
    """显式 null 清空可选资料和日期，旧接口不得静默丢弃更新。"""
    repository, user = legacy_family
    repository.update_person("family:child", {"motto": "原名言", "birthDate": "2000-01-01"})

    profile = genealogy.update_person_profile("family:child", PersonProfileUpdate(motto=None), user, repository_session)
    updated = genealogy.update_person("family:child", PersonUpdate(birth_date=None), repository_session)

    assert profile["motto"] is None
    assert repository.get_person("family:child")["motto"] is None
    assert updated["birth_date"] is None
    with pytest.raises(HTTPException) as error:
        genealogy.update_person("family:child", PersonUpdate(name=None), repository_session)
    assert error.value.status_code == 422


def test_legacy_tree_and_traversals_read_current_relations(repository_session, legacy_family):
    """旧树查询读取当前家庭数据，并保留配偶及收养关系。"""
    tree = genealogy.get_family_tree("family:child", 3, repository_session)
    nodes = {node["id"]: node for node in tree["nodes"]}
    edges = {(edge["source"], edge["target"], edge["relation"]) for edge in tree["edges"]}

    assert {"family:father", "family:mother", "family:child", "family:sibling", "family:adoptive"} <= set(nodes)
    assert "family:outsider" not in nodes
    assert nodes["family:child"]["father_id"] == "family:father"
    assert ("family:father", "family:child", "father") in edges
    assert ("family:adoptive", "family:child", "adoptive") in edges
    assert ("family:father", "family:mother", "spouse") in edges
    assert get_ancestors(repository_session, "family:child", 1) == {"family:father", "family:mother", "family:adoptive"}
    assert get_descendants(repository_session, "family:father", 1) == {"family:child", "family:sibling"}
    assert get_siblings(repository_session, "family:child") == {"family:sibling"}


def test_uploads_use_uuid_names_preserve_files_and_save_photos(repository_session, legacy_family, tmp_path, monkeypatch):
    """字符串人物 ID 不进入文件名，旧头像保留，照片 URL 持久化到统一资料。"""
    repository, user = legacy_family
    monkeypatch.setattr(genealogy, "UPLOAD_DIR", tmp_path / "uploads")
    old_dir = genealogy.UPLOAD_DIR / "avatars"
    old_dir.mkdir(parents=True)
    old_file = old_dir / "old-avatar.png"
    old_file.write_bytes(b"old image")
    repository.update_person("family:child", {"avatar": "/uploads/avatars/old-avatar.png"})

    avatar = genealogy.upload_avatar("family:child", UploadFile(file=BytesIO(b"image"), filename="avatar.png"), user, repository_session)
    photo = genealogy.upload_photo("family:child", UploadFile(file=BytesIO(b"photo"), filename="photo.jpg"), user, repository_session)
    detail = genealogy.get_person_detail("family:child", user, repository_session)

    assert old_file.read_bytes() == b"old image"
    assert len(Path(avatar["avatar_url"]).stem) == 32
    assert ":" not in Path(avatar["avatar_url"]).name
    assert (genealogy.UPLOAD_DIR / "avatars" / Path(avatar["avatar_url"]).name).read_bytes() == b"image"
    assert repository.get_person("family:child")["avatar"] == avatar["avatar_url"]
    assert detail["photos"] == [photo["photo_url"]]


def test_profile_permission_rejects_unbound_or_inactive_user(repository_session, legacy_family):
    """其他人物和已禁用账号不能通过旧资料接口写入。"""
    _, user = legacy_family
    with pytest.raises(HTTPException) as forbidden:
        genealogy.update_person_profile("family:outsider", PersonProfileUpdate(motto="无权"), user, repository_session)
    assert forbidden.value.status_code == 403
    user.is_active = False
    repository_session.flush()
    with pytest.raises(HTTPException) as inactive:
        genealogy.update_person_profile("family:child", PersonProfileUpdate(motto="无效"), user, repository_session)
    assert inactive.value.status_code == 401
