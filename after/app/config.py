"""
应用配置
集中读取环境变量，避免业务代码直接依赖 os.getenv。
"""
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """系统运行配置。"""

    app_name: str = "族谱查询系统 API"
    debug: bool = False
    database_url: str = "sqlite:///./family_tree.db"
    neo4j_uri: str = "bolt://127.0.0.1:7687"
    neo4j_user: str = "neo4j"
    neo4j_password: str = ""
    neo4j_database: str = "neo4j"
    server_url: str = "http://localhost:8000"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    """返回缓存后的应用配置。"""
    return Settings()
