"""
Neo4j 连接管理
封装官方 Driver 生命周期，供 repository 层复用。
"""
from collections.abc import Generator

from fastapi import HTTPException
from neo4j import GraphDatabase
from neo4j.exceptions import Neo4jError, ServiceUnavailable

from .config import get_settings


_driver = None


def get_driver():
    """获取全局 Neo4j Driver 实例。"""
    global _driver
    if _driver is None:
        settings = get_settings()
        _driver = GraphDatabase.driver(
            settings.neo4j_uri,
            auth=(settings.neo4j_user, settings.neo4j_password),
        )
    return _driver


def close_driver() -> None:
    """关闭全局 Neo4j Driver。"""
    global _driver
    if _driver is not None:
        _driver.close()
        _driver = None


def get_neo4j_session() -> Generator:
    """创建一次请求范围内的 Neo4j Session。"""
    settings = get_settings()
    try:
        with get_driver().session(database=settings.neo4j_database) as session:
            yield session
    except (Neo4jError, ServiceUnavailable) as exc:
        raise HTTPException(status_code=503, detail=f"Neo4j 服务不可用: {exc}") from exc
