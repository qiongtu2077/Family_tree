"""
本地凭据读取
只从环境变量或未跟踪的账密.txt 读取开发账号，避免在代码中硬编码密码。
"""
from __future__ import annotations

import os
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[2]
LOCAL_CREDENTIALS_FILE = PROJECT_ROOT / "账密.txt"


# --- 通用读取 --- #


def get_secret(env_name: str, local_label: str | None = None) -> str:
    """优先从环境变量读取密钥，其次从本地账密文件读取。"""
    env_value = os.getenv(env_name)
    if env_value:
        return env_value
    if not local_label:
        return ""
    return _read_local_value(local_label)


def require_secret(env_name: str, local_label: str | None = None) -> str:
    """读取必需密钥，缺失时用明确错误阻止继续初始化。"""
    value = get_secret(env_name, local_label)
    if not value:
        label_hint = f" 或账密.txt 的“{local_label}”" if local_label else ""
        raise RuntimeError(f"缺少必需凭据：请设置环境变量 {env_name}{label_hint}")
    return value


# --- 账号凭据 --- #


def get_demo_accounts() -> list[dict]:
    """读取本地演示账号配置。"""
    return [
        {
            "username": os.getenv("FAMILYTREE_ADMIN_USERNAME", "admin"),
            "password": require_secret("FAMILYTREE_ADMIN_PASSWORD", "Family_tree 管理员密码"),
            "email": os.getenv("FAMILYTREE_ADMIN_EMAIL", "admin@familytree.local"),
            "real_name": os.getenv("FAMILYTREE_ADMIN_REAL_NAME", "系统管理员"),
            "is_admin": True,
            "person_id": None,
        },
        {
            "username": os.getenv("FAMILYTREE_TEST_USERNAME", "test"),
            "password": require_secret("FAMILYTREE_TEST_PASSWORD", "Family_tree 测试用户密码"),
            "email": os.getenv("FAMILYTREE_TEST_EMAIL", "test@familytree.local"),
            "real_name": os.getenv("FAMILYTREE_TEST_REAL_NAME", "测试用户"),
            "is_admin": False,
            "person_id": None,
        },
    ]


def get_initial_admin_account() -> dict:
    """读取首次管理员初始化配置。"""
    return {
        "username": os.getenv("FAMILYTREE_ADMIN_USERNAME", "admin"),
        "password": require_secret("FAMILYTREE_ADMIN_PASSWORD", "Family_tree 管理员密码"),
        "email": os.getenv("FAMILYTREE_ADMIN_EMAIL", "admin@familytree.local"),
        "real_name": os.getenv("FAMILYTREE_ADMIN_REAL_NAME", "系统管理员"),
    }


# --- 文件解析 --- #


def _read_local_value(label: str) -> str:
    """从本地账密文件中读取指定中文标签后的值。"""
    if not LOCAL_CREDENTIALS_FILE.exists():
        return ""

    for raw_line in LOCAL_CREDENTIALS_FILE.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line.startswith(f"{label}：") and not line.startswith(f"{label}:"):
            continue
        _, value = line.replace("：", ":", 1).split(":", 1)
        return value.strip()
    return ""
