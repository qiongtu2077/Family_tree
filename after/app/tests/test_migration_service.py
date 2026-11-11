"""验证迁移的账号绑定、时间保留、序列及事务边界。"""
from copy import deepcopy

import pytest
from sqlalchemy import func, select

from app.graph_models import GenealogyPerson
from app.migrate_postgres import build_snapshot
from app.models import RegistrationRequest, User
from app.repositories.person_repository import PersonRepository
from app.services.migration_service import MigrationService


def snapshot_data():
    """构造包含原始账号 ID、密码哈希与人物绑定的明确源快照。"""
    return {"format_version": 1,
            "persons": [{"personId": "parent", "name": "父亲", "gender": "M", "createdAt": "2020-01-02T03:04:05+00:00"},
                        {"personId": "child", "name": "孩子", "gender": "F", "avatar": "/uploads/avatars/original.png"}],
            "family_units": [],
            "relationships": [{"type": "PARENT_OF", "source": "parent", "target": "child",
                               "properties": {"relationKind": "biological", "side": "father"}}],
            "users": [{"id": 7, "username": "original", "password": "unchanged-password-hash", "email": "original@example.com",
                       "real_name": "孩子", "person_id": "child", "is_admin": False, "is_active": True,
                       "created_at": "2021-02-03T04:05:06"}],
            "registration_requests": [{"id": 11, "username": "pending", "password": "approval-hash", "email": "pending@example.com",
                                       "real_name": None, "status": "pending", "token": "original-token", "created_at": "2021-03-04T00:00:00"}]}


def test_migration_preserves_accounts_bindings_and_sequences(repository_session):
    """账号和审批原样迁入，随后新增记录不与导入 ID 冲突。"""
    session = repository_session
    result = MigrationService(PersonRepository(session)).import_snapshot(snapshot_data())
    user = session.get(User, 7)
    assert result["people"] == 2
    assert user.password == "unchanged-password-hash"
    assert user.person_id == "child"
    assert session.get(GenealogyPerson, "child").properties["avatar"].endswith("original.png")
    assert session.get(GenealogyPerson, "parent").created_at.year == 2020
    assert session.get(RegistrationRequest, 11).token == "original-token"
    new_user = User(username="next", password="next-hash", email="next@example.com")
    session.add(new_user)
    session.flush()
    assert new_user.id != 7
    if session.bind.dialect.name == "postgresql":
        assert new_user.id == 8


def test_migration_rejects_existing_target_without_overwriting(repository_session):
    """重复导入明确拒绝，已有账号和人物保持原值。"""
    service = MigrationService(PersonRepository(repository_session))
    service.import_snapshot(snapshot_data())
    with pytest.raises(ValueError, match="目标数据库已有数据"):
        service.import_snapshot(snapshot_data())
    assert repository_session.scalar(select(func.count()).select_from(User)) == 1


def test_failed_migration_rolls_back_all_target_writes(repository_session):
    """未定义关系使整次导入回滚，不留下半份人物或账号。"""
    snapshot = deepcopy(snapshot_data())
    snapshot["relationships"].append({"type": "UNDEFINED", "source": "parent", "target": "child", "properties": {}})
    with pytest.raises(ValueError, match="未定义关系类型"):
        with repository_session.begin_nested():
            MigrationService(PersonRepository(repository_session)).import_snapshot(snapshot)
    assert repository_session.scalar(select(func.count()).select_from(GenealogyPerson)) == 0


def test_two_sources_with_same_stable_id_require_explicit_resolution():
    """迁移不按姓名猜测身份，也不覆盖两个源中相同 ID 的记录。"""
    graph = {"persons": [{"personId": "legacy:1", "name": "同名"}], "family_units": [], "relationships": []}
    legacy = {"persons": [{"id": 1, "name": "同名"}], "users": [], "registration_requests": []}
    with pytest.raises(ValueError, match="同时包含 legacy:1"):
        build_snapshot(graph, legacy)
