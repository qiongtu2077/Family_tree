"""
认证路由单元测试
验证密码校验、用户响应序列化和演示账号初始化。
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.models import Base, User
from app.routers.auth import hash_password, init_demo_users, serialize_user, verify_password


def test_password_hash_and_verify():
    """密码哈希后应能通过明文校验。"""
    hashed = hash_password("<ROTATED_ADMIN_PASSWORD>")

    assert hashed != "<ROTATED_ADMIN_PASSWORD>"
    assert verify_password("<ROTATED_ADMIN_PASSWORD>", hashed)
    assert not verify_password("wrong-password", hashed)


def test_serialize_user_excludes_password():
    """用户响应不应包含密码哈希。"""
    user = User(
        id=1,
        username="admin",
        password="secret",
        email="admin@example.com",
        real_name="系统管理员",
        is_admin=True,
        is_active=True,
    )

    payload = serialize_user(user)

    assert payload["username"] == "admin"
    assert payload["is_admin"] is True
    assert "password" not in payload


def test_init_demo_users_creates_and_updates_accounts():
    """演示账号初始化应可重复执行。"""
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    TestingSession = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)
    db = TestingSession()
    try:
        first_result = init_demo_users(db)
        second_result = init_demo_users(db)

        users = db.query(User).order_by(User.username).all()

        assert first_result["success"] is True
        assert set(first_result["created"]) == {"admin", "test"}
        assert second_result["updated"] == ["admin", "test"]
        assert [user.username for user in users] == ["admin", "test"]
        assert users[0].is_admin is True
        assert users[1].is_admin is False
    finally:
        db.close()
