"""验证本地测试和部署模式使用不同的连接配置要求，不连接真实数据库。"""
from types import SimpleNamespace

import pytest

from app import database


@pytest.mark.parametrize("auth_enabled", [False, True])
def test_empty_database_password_follows_local_test_mode(monkeypatch, auth_enabled):
    """测试模式允许空密码使用既有角色；启用认证时仍要求显式连接密码。"""
    settings = SimpleNamespace(database_url="", auth_enabled=auth_enabled, postgres_user="", postgres_password="",
                               postgres_host="127.0.0.1", postgres_port=5432, postgres_db="familytree")
    monkeypatch.setattr(database, "get_settings", lambda: settings)
    if auth_enabled:
        with pytest.raises(ValueError, match="POSTGRES_PASSWORD"):
            database.build_database_url()
    else:
        url = database.build_database_url()
        assert url.username == "familytree"
        assert url.password is None
        assert url.host == "127.0.0.1"


def test_explicit_connection_settings_remain_effective(monkeypatch):
    """测试模式仍采用用户明确填写的角色和密码，不替换已有连接参数。"""
    settings = SimpleNamespace(database_url="", auth_enabled=False, postgres_user="configured-role",
                               postgres_password="test-only-value", postgres_host="db.example.com",
                               postgres_port=5433, postgres_db="configured-db")
    monkeypatch.setattr(database, "get_settings", lambda: settings)
    url = database.build_database_url()
    assert (url.username, url.password, url.host, url.port, url.database) == (
        "configured-role", "test-only-value", "db.example.com", 5433, "configured-db")
