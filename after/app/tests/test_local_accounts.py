"""验证初始化账号配置优先级及缺少凭据时的保密失败行为。"""
import pytest

from app import local_accounts


# --- 环境变量、配置文件与本地账密 --- #


@pytest.fixture
def account_files(monkeypatch, tmp_path):
    """仅使用测试临时文件，不访问用户真实 .env 或账密文件。"""
    env_file, credentials_file = tmp_path / ".env", tmp_path / "账密.txt"
    monkeypatch.setattr(local_accounts, "LOCAL_ENV_FILE", env_file)
    monkeypatch.setattr(local_accounts, "LOCAL_CREDENTIALS_FILE", credentials_file)
    for role in ("ADMIN", "TEST"):
        for field in ("USERNAME", "PASSWORD", "EMAIL", "REAL_NAME"):
            monkeypatch.delenv(f"FAMILYTREE_{role}_{field}", raising=False)
    return env_file, credentials_file


def test_env_file_configures_all_account_fields(account_files, capsys):
    """after/.env 声明的两组账号和密码可供既有初始化入口实际读取。"""
    env_file, credentials_file = account_files
    env_file.write_text("FAMILYTREE_ADMIN_USERNAME=file-admin\nFAMILYTREE_ADMIN_PASSWORD=file-admin-test-value\n"
                        "FAMILYTREE_ADMIN_EMAIL=file-admin@example.com\nFAMILYTREE_ADMIN_REAL_NAME=文件管理员\n"
                        "FAMILYTREE_TEST_USERNAME=file-member\nFAMILYTREE_TEST_PASSWORD=file-user-test-value\n"
                        "FAMILYTREE_TEST_EMAIL=file-member@example.com\nFAMILYTREE_TEST_REAL_NAME=文件成员\n", encoding="utf-8")
    credentials_file.write_text("Family_tree 管理员密码：local-admin-test-value\nFamily_tree 测试用户密码：local-user-test-value\n", encoding="utf-8")
    admin, member = local_accounts.get_demo_accounts()
    assert admin == {"username": "file-admin", "password": "file-admin-test-value", "email": "file-admin@example.com",
                     "real_name": "文件管理员", "is_admin": True, "person_id": None}
    assert member["username"] == "file-member" and member["password"] == "file-user-test-value"
    assert member["email"] == "file-member@example.com" and member["real_name"] == "文件成员"
    assert local_accounts.get_initial_admin_account() == {key: admin[key] for key in ("username", "password", "email", "real_name")}
    captured = capsys.readouterr()
    assert captured.out == captured.err == ""


def test_explicit_environment_overrides_env_file_and_local_file(account_files, monkeypatch, capsys):
    """显式进程环境配置始终优先，读取行为不修改环境或输出凭据。"""
    env_file, credentials_file = account_files
    env_file.write_text("FAMILYTREE_ADMIN_PASSWORD=file-test-value\nFAMILYTREE_ADMIN_USERNAME=file-admin\n", encoding="utf-8")
    credentials_file.write_text("Family_tree 管理员密码：local-test-value\n", encoding="utf-8")
    monkeypatch.setenv("FAMILYTREE_ADMIN_PASSWORD", "environment-test-value")
    monkeypatch.setenv("FAMILYTREE_ADMIN_USERNAME", "environment-admin")
    account = local_accounts.get_initial_admin_account()
    assert account["password"] == "environment-test-value" and account["username"] == "environment-admin"
    captured = capsys.readouterr()
    assert captured.out == captured.err == ""


def test_untracked_credentials_remain_last_resort(account_files, capsys):
    """没有上层密码配置时，中文冒号和英文冒号的既有账密格式仍然可用。"""
    _env_file, credentials_file = account_files
    credentials_file.write_text("Family_tree 管理员密码：local-admin-test-value\nFamily_tree 测试用户密码: local-user-test-value\n", encoding="utf-8")
    admin, member = local_accounts.get_demo_accounts()
    assert admin["password"] == "local-admin-test-value" and member["password"] == "local-user-test-value"
    captured = capsys.readouterr()
    assert captured.out == captured.err == ""


def test_missing_password_fails_without_disclosing_file_contents(account_files, capsys):
    """缺失密码时只报告必需配置名，不返回、打印或使用其他本地秘密。"""
    _env_file, credentials_file = account_files
    credentials_file.write_text("其他服务密码：unrelated-test-value\n", encoding="utf-8")
    with pytest.raises(RuntimeError) as error:
        local_accounts.get_initial_admin_account()
    assert "FAMILYTREE_ADMIN_PASSWORD" in str(error.value)
    assert "unrelated-test-value" not in str(error.value)
    captured = capsys.readouterr()
    assert captured.out == captured.err == ""


@pytest.mark.parametrize("source", ["environment", "env-file"])
def test_explicit_empty_password_does_not_silently_fall_back(account_files, monkeypatch, source):
    """明确留空密码会阻止初始化，不能静默改用下层配置中的其他密码。"""
    env_file, credentials_file = account_files
    credentials_file.write_text("Family_tree 管理员密码：local-test-value\n", encoding="utf-8")
    if source == "environment":
        env_file.write_text("FAMILYTREE_ADMIN_PASSWORD=file-test-value\n", encoding="utf-8")
        monkeypatch.setenv("FAMILYTREE_ADMIN_PASSWORD", "")
    else:
        env_file.write_text("FAMILYTREE_ADMIN_PASSWORD=\n", encoding="utf-8")
    with pytest.raises(RuntimeError, match="FAMILYTREE_ADMIN_PASSWORD"):
        local_accounts.get_initial_admin_account()
