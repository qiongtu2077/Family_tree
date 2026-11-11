"""
系统初始化脚本
创建 PostgreSQL 表、演示账号和示例族谱。
"""
from .database import Base, SessionLocal, engine
from .models import User
from .repositories.person_repository import PersonRepository
from .routers.auth import hash_password
from .services.seed_service import SeedService
from .local_accounts import get_demo_accounts


def init_sql_accounts() -> dict[str, list[str]]:
    """初始化本地账号数据库和演示账号。"""
    Base.metadata.create_all(bind=engine)
    demo_accounts = get_demo_accounts()
    created = []
    updated = []
    db = SessionLocal()
    try:
        for account in demo_accounts:
            user = db.query(User).filter(User.username == account["username"]).first()
            payload = {
                "password": hash_password(account["password"]),
                "email": account["email"],
                "real_name": account["real_name"],
                "is_admin": account["is_admin"],
                "is_active": True,
                "person_id": account["person_id"],
            }
            if user:
                for field, value in payload.items():
                    setattr(user, field, value)
                updated.append(account["username"])
            else:
                db.add(User(username=account["username"], **payload))
                created.append(account["username"])
        db.commit()
    finally:
        db.close()
    return {"created": created, "updated": updated}


def init_demo_family() -> dict[str, int]:
    """在同一 PostgreSQL 事务中初始化示例族谱。"""
    Base.metadata.create_all(bind=engine)
    with SessionLocal.begin() as session:
        return SeedService(PersonRepository(session)).seed_demo_family()


def main() -> None:
    """执行完整初始化流程。"""
    account_result = init_sql_accounts()
    family_result = init_demo_family()
    print({"accounts": account_result, "family": family_result})


if __name__ == "__main__":
    main()
