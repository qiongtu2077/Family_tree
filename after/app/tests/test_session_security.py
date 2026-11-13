"""通过真实 Cookie 请求验证认证、权限、注册审批与本人资料维护。"""
from __future__ import annotations

from datetime import timedelta
import hashlib
from pathlib import Path
from unittest.mock import Mock

from fastapi import FastAPI
from fastapi.testclient import TestClient
import pytest
from sqlalchemy import create_engine, event, select
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.models import RegistrationRequest, User
from app.repositories.person_repository import PersonRepository
from app.routers import admin, auth, family_units, genealogy, graph, persons, relationships
from app.security import SESSION_COOKIE, UserSession, hash_password, session_hash, utc_now, verify_password

PASSWORD = "session-test-password"


# --- 独立数据库与真实路由 --- #


@pytest.fixture(scope="module")
def password_hash():
    """测试账号共用一次真实 PBKDF2 计算，避免每条权限用例重复散列。"""
    return hash_password(PASSWORD)


@pytest.fixture
def session_api(password_hash, monkeypatch, tmp_path):
    """仅挂载路由到内存 SQLite，不启动真实应用、初始化真实库或发送邮件。"""
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)

    # 与生产数据库一样执行账号绑定和会话的外键约束。
    @event.listens_for(engine, "connect")
    def enable_foreign_keys(connection, _record):
        """为当前测试连接开启 SQLite 外键。"""
        connection.execute("PRAGMA foreign_keys=ON")

    Base.metadata.create_all(engine)
    sessions = sessionmaker(bind=engine, expire_on_commit=False)
    with sessions() as db:
        repository = PersonRepository(db)
        for person_id, name, gender in (("p:owner", "本人", "M"), ("p:other", "另一位家人", "F"), ("p:child", "孩子", "U")):
            repository.create_person({"personId": person_id, "name": name, "gender": gender})
        repository.create_family_unit({"familyUnitId": "f:parents", "type": "marriage"})
        repository.add_partner_to_family_unit("p:owner", "f:parents", {})
        repository.add_partner_to_family_unit("p:other", "f:parents", {})
        repository.add_child_to_family_unit("p:child", "f:parents", {})
        for username, person_id, is_admin, is_active in (("admin", None, True, True), ("owner", "p:owner", False, True), ("other", "p:other", False, True), ("disabled", None, False, False)):
            db.add(User(username=username, password=password_hash, email=f"{username}@example.com", real_name=username,
                        person_id=person_id, is_admin=is_admin, is_active=is_active))
        db.commit()

    app = FastAPI()
    for router in (auth, genealogy, graph, persons, family_units, relationships, admin):
        app.include_router(router.router)

    def isolated_db():
        """每个 HTTP 请求使用独立会话，成功提交、失败回滚。"""
        with sessions() as db:
            try:
                yield db
                db.commit()
            except Exception:
                db.rollback()
                raise

    app.dependency_overrides[get_db] = isolated_db
    approval_mail, result_mail = Mock(return_value=True), Mock(return_value=True)
    monkeypatch.setattr(auth, "send_registration_approval_email", approval_mail)
    monkeypatch.setattr(auth, "send_registration_result_email", result_mail)
    monkeypatch.setattr(genealogy, "UPLOAD_DIR", tmp_path / "uploads")
    try:
        with TestClient(app) as client:
            yield client, sessions, app, approval_mail, result_mail
    finally:
        engine.dispose()


def login_as(client, username="owner"):
    """通过真实登录接口设置当前浏览器 Cookie，并返回安全用户资料。"""
    response = client.post("/api/auth/login", json={"username": username, "password": PASSWORD})
    assert response.status_code == 200, response.text
    return response.json()["user"]


# --- Cookie 生命周期与身份真实性 --- #


@pytest.mark.parametrize("endpoint,parameter", [
    ("/api/persons/search", "name"),
    ("/api/graph/center-candidates", "keyword"),
    ("/api/genealogy/persons/search", "name"),
])
def test_authenticated_search_routes_share_initial_matching(session_api, endpoint, parameter):
    """通过真实Cookie请求覆盖顶部、中心及旧搜索接口的首拼调用链。"""
    client, sessions, _app, _approval_mail, _result_mail = session_api
    with sessions() as db:
        PersonRepository(db).update_person("p:owner", {"name": "张明远"})
        db.commit()
    login_as(client)
    response = client.get(endpoint, params={parameter: " Z M Y "})
    assert response.status_code == 200
    assert [person["id"] for person in response.json()] == ["p:owner"]
    if endpoint != "/api/genealogy/persons/search":
        assert response.json()[0]["name_initials"] == "zmy"
        assert response.json()[0]["name_pinyin"] == "zhangmingyuan"


def test_login_cookie_hash_logout_and_replay(session_api):
    """Cookie 不含账号编号，数据库只存散列，退出后历史凭据无法重放。"""
    client, sessions, _app, _approval_mail, _result_mail = session_api
    response = client.post("/api/auth/login", json={"username": "owner", "password": PASSWORD})
    token = client.cookies.get(SESSION_COOKIE)
    assert response.status_code == 200
    assert token and len(token) >= 40
    cookie = response.headers["set-cookie"]
    assert "HttpOnly" in cookie and "SameSite=lax" in cookie and "Path=/api" in cookie and "Max-Age=43200" in cookie
    assert "Secure" not in cookie
    with sessions() as db:
        stored = db.get(UserSession, session_hash(token))
        assert stored is not None and stored.token_hash != token
        assert utc_now() + timedelta(hours=11) < stored.expires_at <= utc_now() + timedelta(hours=12)
    assert client.get("/api/auth/me").json()["user"]["username"] == "owner"
    assert client.post("/api/auth/logout").status_code == 200
    assert client.get("/api/auth/me", headers={"Cookie": f"{SESSION_COOKIE}={token}"}).status_code == 401
    with sessions() as db:
        assert db.get(UserSession, session_hash(token)) is None


def test_https_cookie_is_secure(session_api):
    """HTTPS 登录下浏览器会话设置 Secure，防止通过明文连接发送。"""
    _client, _sessions, app, _approval_mail, _result_mail = session_api
    with TestClient(app, base_url="https://testserver") as secure_client:
        response = secure_client.post("/api/auth/login", json={"username": "owner", "password": PASSWORD})
        assert "Secure" in response.headers["set-cookie"]
        assert secure_client.get("/api/auth/me").status_code == 200


def test_relogin_rotates_and_revokes_previous_cookie(session_api):
    """同一浏览器重新登录后，旧凭据不再授权；新凭据正常使用。"""
    client, _sessions, _app, _approval_mail, _result_mail = session_api
    login_as(client)
    old_token = client.cookies.get(SESSION_COOKIE)
    login_as(client)
    assert client.cookies.get(SESSION_COOKIE) != old_token
    assert client.get("/api/auth/me", headers={"Cookie": f"{SESSION_COOKIE}={old_token}"}).status_code == 401
    assert client.get("/api/auth/me").status_code == 200


def test_query_user_id_cannot_forge_identity(session_api):
    """旧 user_id 参数既不能替代 Cookie，也不能将普通用户切换成管理员。"""
    client, sessions, _app, _approval_mail, _result_mail = session_api
    with sessions() as db:
        admin_id = db.scalar(select(User.id).where(User.username == "admin"))
    assert client.get(f"/api/auth/me?user_id={admin_id}").status_code == 401
    login_as(client)
    me = client.get(f"/api/auth/me?user_id={admin_id}").json()["user"]
    assert me["username"] == "owner" and me["is_admin"] is False
    assert "password" not in me and "token" not in me


@pytest.mark.parametrize("invalid_state", ["expired", "disabled", "deleted"])
def test_live_session_rechecks_expiry_and_account_state(session_api, invalid_state):
    """已登录会话仍须实时检查有效期、禁用状态及账号是否存在。"""
    client, sessions, _app, _approval_mail, _result_mail = session_api
    user = login_as(client)
    token = client.cookies.get(SESSION_COOKIE)
    with sessions() as db:
        if invalid_state == "expired":
            db.get(UserSession, session_hash(token)).expires_at = utc_now() - timedelta(seconds=1)
        elif invalid_state == "disabled":
            db.get(User, user["id"]).is_active = False
        else:
            db.delete(db.get(User, user["id"]))
        db.commit()
    assert client.get("/api/auth/me").status_code == 401
    assert client.get("/api/persons").status_code == 401


def test_legacy_password_upgrades_only_after_success(session_api):
    """错误登录不改历史散列，正确登录在同一事务中升级 PBKDF2。"""
    client, sessions, _app, _approval_mail, _result_mail = session_api
    legacy_hash = hashlib.sha256(PASSWORD.encode()).hexdigest()
    with sessions() as db:
        db.scalar(select(User).where(User.username == "owner")).password = legacy_hash
        db.commit()
    assert client.post("/api/auth/login", json={"username": "owner", "password": "wrong-password"}).status_code == 401
    with sessions() as db:
        assert db.scalar(select(User).where(User.username == "owner")).password == legacy_hash
        assert list(db.scalars(select(UserSession))) == []
    login_as(client)
    with sessions() as db:
        upgraded = db.scalar(select(User).where(User.username == "owner")).password
        assert upgraded.startswith("pbkdf2_sha256$") and verify_password(PASSWORD, upgraded)
    assert client.post("/api/auth/login", json={"username": "disabled", "password": PASSWORD}).status_code == 401


# --- 读取与结构写入权限 --- #


@pytest.mark.parametrize("method,path", [
    ("get", "/api/persons"), ("get", "/api/genealogy/persons"), ("get", "/api/graph/overview"),
    ("get", "/api/auth/pending-requests"), ("get", "/api/admin/graph-issues"),
    ("get", "/api/family-units"), ("get", "/api/relationships"),
    ("post", "/api/persons"), ("post", "/api/genealogy/persons"),
    ("post", "/api/family-units"), ("post", "/api/relationships"),
])
def test_anonymous_reads_and_writes_are_rejected(session_api, method, path):
    """所有族谱数据和管理路由均先校验真实服务端会话。"""
    client, _sessions, _app, _approval_mail, _result_mail = session_api
    assert getattr(client, method)(path).status_code == 401


@pytest.mark.parametrize("path", [
    "/api/persons", "/api/persons/search?name=本人", "/api/genealogy/persons",
    "/api/genealogy/persons/p:owner/detail", "/api/genealogy/family-tree/p:owner",
    "/api/graph/mainline/p:owner", "/api/graph/inlaw/p:owner/p:other",
    "/api/graph/bridge?person_id=p:owner&spouse_id=p:other", "/api/graph/branch/f:parents",
    "/api/graph/overview", "/api/graph/relation-path?from=p:owner&to=p:child",
    "/api/family-units", "/api/relationships",
])
def test_regular_user_retains_family_read_access(session_api, path):
    """普通登录用户保留人物、五图、路径、家庭与关系列表的读取功能。"""
    client, _sessions, _app, _approval_mail, _result_mail = session_api
    login_as(client)
    response = client.get(path)
    assert response.status_code == 200, response.text


@pytest.mark.parametrize("method,path,payload", [
    ("post", "/api/persons", {"name": "无权新增", "gender": "U"}),
    ("patch", "/api/persons/p:owner", {"name": "无权改名"}),
    ("delete", "/api/persons/p:other", None),
    ("post", "/api/genealogy/persons", {"name": "无权新增", "gender": "U"}),
    ("put", "/api/genealogy/persons/p:owner", {"name": "无权改名"}),
    ("delete", "/api/genealogy/persons/p:other", None),
    ("post", "/api/family-units", {"family_type": "single_parent"}),
    ("patch", "/api/family-units/f:parents", {"display_order": 2}),
    ("delete", "/api/family-units/f:parents", None),
    ("post", "/api/relationships", {"relationship_type": "spouse", "person_id": "p:owner", "target_person_id": "p:other"}),
    ("delete", "/api/relationships/SPOUSE_OF:p%3Aowner:p%3Aother", None),
    ("post", "/api/admin/init-database", None), ("post", "/api/admin/seed-demo-family", None),
    ("get", "/api/graph/issues", None), ("get", "/api/admin/graph-issues", None),
    ("get", "/api/auth/pending-requests", None), ("post", "/api/auth/init-demo-users", None),
])
def test_regular_user_cannot_write_structure_or_manage_accounts(session_api, method, path, payload):
    """普通用户即使绑定目标人物，也不能修改族谱结构或调用管理员入口。"""
    client, _sessions, _app, _approval_mail, _result_mail = session_api
    login_as(client)
    kwargs = {"json": payload} if payload is not None else {}
    assert getattr(client, method)(path, **kwargs).status_code == 403


def test_admin_retains_person_crud_and_diagnostics(session_api):
    """管理员可以真实创建、更新、删除人物并读取诊断，数据确实提交。"""
    client, _sessions, _app, _approval_mail, _result_mail = session_api
    login_as(client, "admin")
    created = client.post("/api/persons", json={"name": "新家人", "gender": "U"})
    assert created.status_code == 201
    person_id = created.json()["id"]
    assert client.patch(f"/api/persons/{person_id}", json={"name": "已更新"}).json()["name"] == "已更新"
    assert client.get("/api/admin/graph-issues").status_code == 200
    assert client.get("/api/graph/issues").status_code == 200
    assert client.delete(f"/api/persons/{person_id}").status_code == 204
    assert client.get(f"/api/persons/{person_id}").status_code == 404
    assert client.post("/api/auth/init-admin").status_code == 403


# --- 本人及管理员个人资料与图片 --- #


def test_profile_ownership_cannot_be_spoofed(session_api):
    """本人资料可更新和清空，他人资料不能由 user_id 或请求字段伪造权限。"""
    client, _sessions, _app, _approval_mail, _result_mail = session_api
    login_as(client)
    assert client.get("/api/genealogy/persons/p:owner/detail").json()["can_edit"] is True
    assert client.get("/api/genealogy/persons/p:other/detail?user_id=1").json()["can_edit"] is False
    updated = client.put("/api/genealogy/persons/p:owner/profile", json={"motto": "家族记忆", "occupation": "教师", "is_admin": True, "name": "不能改名"})
    assert updated.status_code == 200
    detail = client.get("/api/genealogy/persons/p:owner/detail").json()
    assert detail["name"] == "本人" and detail["occupation"] == "教师"
    assert client.get("/api/auth/me").json()["user"]["is_admin"] is False
    assert client.put("/api/genealogy/persons/p:other/profile?user_id=1", json={"motto": "越权"}).status_code == 403
    assert client.put("/api/genealogy/persons/p:owner/profile", json={"motto": None}).json()["motto"] is None
    assert client.get("/api/genealogy/persons/p:owner/detail").json()["motto"] is None


@pytest.mark.parametrize("username,target", [("owner", "p:owner"), ("admin", "p:other")])
def test_authorized_profile_avatar_and_photo_persist(session_api, username, target):
    """本人和管理员均可维护资料、头像、照片，刷新详情后仍能读取媒体。"""
    client, _sessions, _app, _approval_mail, _result_mail = session_api
    login_as(client, username)
    assert client.put(f"/api/genealogy/persons/{target}/profile", json={"biography": "人物故事"}).status_code == 200
    avatar = client.post(f"/api/genealogy/persons/{target}/avatar", files={"file": ("image.png", b"test-avatar", "image/png")})
    photo = client.post(f"/api/genealogy/persons/{target}/photo", files={"file": ("photo.jpg", b"test-photo", "image/jpeg")})
    assert avatar.status_code == photo.status_code == 200
    detail = client.get(f"/api/genealogy/persons/{target}/detail").json()
    assert detail["can_edit"] is True and detail["biography"] == "人物故事"
    assert detail["avatar"] == avatar.json()["avatar_url"]
    assert detail["photos"] == [photo.json()["photo_url"]]
    assert (genealogy.UPLOAD_DIR / "avatars" / Path(detail["avatar"]).name).read_bytes() == b"test-avatar"
    assert (genealogy.UPLOAD_DIR / "photos" / Path(detail["photos"][0]).name).read_bytes() == b"test-photo"


@pytest.mark.parametrize("kind", ["avatar", "photo"])
def test_upload_permission_precedes_filesystem_write(session_api, kind):
    """越权图片请求在创建上传目录之前拒绝，不留下未授权文件。"""
    client, _sessions, _app, _approval_mail, _result_mail = session_api
    login_as(client)
    response = client.post(f"/api/genealogy/persons/p:other/{kind}?user_id=1", files={"file": ("attack.png", b"image", "image/png")})
    assert response.status_code == 403
    assert not genealogy.UPLOAD_DIR.exists()


# --- 注册、站内审批与邮件确认 --- #


def test_register_admin_approval_and_login(session_api):
    """申请保存散列，站内审批只允许管理员，审批后可登录且唯一姓名绑定人物。"""
    client, sessions, _app, approval_mail, result_mail = session_api
    payload = {"username": " newcomer ", "password": "  spaced password  ", "email": " newcomer@example.com ", "real_name": " 孩子 "}
    assert client.post("/api/auth/register", json=payload).status_code == 200
    with sessions() as db:
        pending = db.scalar(select(RegistrationRequest))
        request_id = pending.id
        assert pending.username == "newcomer" and pending.real_name == "孩子"
        assert verify_password(payload["password"], pending.password)
        assert not verify_password(payload["password"].strip(), pending.password)
        assert db.scalar(select(User).where(User.username == "newcomer")) is None
    assert client.post("/api/auth/register", json=payload).status_code == 400
    assert approval_mail.call_count == 1
    login_as(client)
    assert client.post(f"/api/auth/requests/{request_id}/approve").status_code == 403
    login_as(client, "admin")
    pending_list = client.get("/api/auth/pending-requests").json()
    assert len(pending_list) == 1
    assert not {"password", "token"} & set(pending_list[0])
    assert client.post(f"/api/auth/requests/{request_id}/approve").status_code == 200
    assert client.post(f"/api/auth/requests/{request_id}/approve").status_code == 409
    assert client.get("/api/auth/pending-requests").json() == []
    assert result_mail.call_count == 1
    response = client.post("/api/auth/login", json={"username": "newcomer", "password": payload["password"]})
    assert response.status_code == 200
    assert response.json()["user"]["person_id"] == "p:child"
    assert response.json()["user"]["is_admin"] is False


@pytest.mark.parametrize("field,value", [("username", 42), ("real_name", []), ("email", {}), ("username", "   "), ("real_name", "   "), ("email", "not-an-email"), ("password", "short")])
def test_invalid_registration_is_422_without_side_effects(session_api, field, value):
    """错误类型和空白身份资料返回校验错误，不触发500、数据库写入或邮件。"""
    client, sessions, _app, approval_mail, _result_mail = session_api
    payload = {"username": "valid", "password": PASSWORD, "email": "valid@example.com", "real_name": "有效姓名", field: value}
    assert client.post("/api/auth/register", json=payload).status_code == 422
    with sessions() as db:
        assert list(db.scalars(select(RegistrationRequest))) == []
    approval_mail.assert_not_called()


@pytest.mark.parametrize("approved", [True, False])
def test_email_link_get_is_safe_and_post_processes_once(session_api, approved):
    """邮件预览不改变申请，确认页转义资料，POST只处理一次且保留邮件入口。"""
    client, sessions, _app, _approval_mail, result_mail = session_api
    payload = {"username": "<script>alert(1)</script>", "password": PASSWORD, "email": "person@example.com", "real_name": "<em>姓名</em>"}
    assert client.post("/api/auth/register", json=payload).status_code == 200
    with sessions() as db:
        pending = db.scalar(select(RegistrationRequest))
        token, request_id = pending.token, pending.id
    action = "approve" if approved else "reject"
    path = f"/api/auth/{action}/{token}"
    confirmation = client.get(path)
    assert confirmation.status_code == 200
    assert '<form method="post"' in confirmation.text
    assert "<script>" not in confirmation.text and "&lt;script&gt;" in confirmation.text
    assert "<em>姓名</em>" not in confirmation.text and "&lt;em&gt;姓名&lt;/em&gt;" in confirmation.text
    assert confirmation.headers["cache-control"] == "no-store"
    with sessions() as db:
        assert db.get(RegistrationRequest, request_id).status == "pending"
        assert db.scalar(select(User).where(User.username == payload["username"])) is None
    result_mail.assert_not_called()
    assert client.post(path).status_code == 200
    assert client.post(path).status_code == 409
    assert client.get(path).status_code == 409
    assert result_mail.call_count == 1
    with sessions() as db:
        assert db.get(RegistrationRequest, request_id).status == ("approved" if approved else "rejected")
        assert (db.scalar(select(User).where(User.username == payload["username"])) is not None) is approved
    assert client.get("/api/auth/approve/invalid-token").status_code == 404
    assert client.post("/api/auth/reject/invalid-token").status_code == 404
