"""为仓储功能测试提供独立数据库，不自动影响其他测试。"""
from __future__ import annotations

import os
from uuid import uuid4

import pytest
from sqlalchemy import create_engine, event, text
from sqlalchemy.engine import make_url
from sqlalchemy.orm import Session

from app.database import Base
from app import graph_models, models  # noqa: F401：注册需要建表的模型。


@pytest.fixture
def repository_session():
    """优先使用指定 PostgreSQL 的独立 schema，否则使用开启外键的内存 SQLite。"""
    test_url = os.getenv("TEST_DATABASE_URL")
    url = make_url(test_url or "sqlite+pysqlite:///:memory:")
    if test_url:
        if url.get_backend_name() != "postgresql":
            raise ValueError("TEST_DATABASE_URL 必须指向 PostgreSQL 测试库")
        url = url.set(drivername="postgresql+psycopg")
    database_engine = create_engine(url)
    schema_name = None

    if database_engine.dialect.name == "sqlite":
        event.listen(database_engine, "connect", _enable_sqlite_foreign_keys)
        test_engine = database_engine
    else:
        # 每个测试使用随机 schema，不删除或覆盖目标库已有表和数据。
        schema_name = f"repository_test_{uuid4().hex}"
        with database_engine.begin() as connection:
            connection.execute(text(f'CREATE SCHEMA "{schema_name}"'))
        test_engine = database_engine.execution_options(schema_translate_map={None: schema_name})

    try:
        Base.metadata.create_all(test_engine)
        with Session(test_engine) as session:
            yield session
    finally:
        if schema_name is not None:
            with database_engine.begin() as connection:
                connection.execute(text(f'DROP SCHEMA "{schema_name}" CASCADE'))
        database_engine.dispose()


def _enable_sqlite_foreign_keys(connection, _connection_record):
    """让内存 SQLite 同样执行级联删除和账号绑定外键约束。"""
    cursor = connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()
