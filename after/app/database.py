"""PostgreSQL 连接与请求事务管理。"""
from collections.abc import Generator

from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.engine import URL, make_url
from sqlalchemy.exc import IntegrityError, OperationalError
from sqlalchemy.orm import declarative_base, sessionmaker

from .config import get_settings


def build_database_url() -> URL:
    """构造 PostgreSQL URL，分项密码交给驱动编码。"""
    settings = get_settings()
    if settings.database_url:
        url = make_url(settings.database_url)
        if url.get_backend_name() != "postgresql":
            raise ValueError("DATABASE_URL 必须使用 PostgreSQL；旧 SQLite 文件请通过迁移工具读取")
        return url.set(drivername="postgresql+psycopg")
    if settings.auth_enabled and not settings.postgres_password:
        raise ValueError("缺少 POSTGRES_PASSWORD，请在 after/.env 中配置 PostgreSQL 连接")
    # 本地免登录测试使用现有数据库角色，连接端可以不提供密码。
    username = settings.postgres_user or ("familytree" if not settings.auth_enabled else None)
    return URL.create("postgresql+psycopg", username=username,
                      password=settings.postgres_password or None, host=settings.postgres_host,
                      port=settings.postgres_port, database=settings.postgres_db)


engine = create_engine(build_database_url(), pool_pre_ping=True, pool_recycle=3600)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db() -> Generator:
    """每个请求共享一次事务，成功提交，失败回滚。"""
    with SessionLocal() as db:
        try:
            yield db
            db.commit()
        except IntegrityError as exc:
            db.rollback()
            raise HTTPException(status_code=409, detail="数据违反唯一性或关系约束") from exc
        except OperationalError as exc:
            db.rollback()
            raise HTTPException(status_code=503, detail="PostgreSQL 服务不可用") from exc
        except Exception:
            db.rollback()
            raise
