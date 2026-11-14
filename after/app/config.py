"""
应用配置
集中读取环境变量，避免业务代码直接依赖 os.getenv。
"""
from functools import lru_cache

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """系统运行配置。"""

    app_name: str = "族谱查询系统 API"
    debug: bool = False
    auth_enabled: bool = True
    database_url: str = ""
    postgres_host: str = "127.0.0.1"
    postgres_port: int = 5432
    postgres_user: str = "familytree"
    postgres_password: str = ""
    postgres_db: str = "familytree"
    server_url: str = "http://localhost:8000"
    smtp_server: str = "smtp.163.com"
    smtp_port: int = 465
    smtp_sender_email: str = ""
    smtp_sender_password: str = ""
    smtp_admin_email: str = ""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @field_validator("debug", mode="before")
    @classmethod
    def parse_debug_mode(cls, value):
        """把运行环境模式值规范化为 debug 布尔开关。"""
        if isinstance(value, str):
            normalized = value.strip().lower()
            if normalized in {"release", "prod", "production"}:
                return False
            if normalized in {"debug", "dev", "development"}:
                return True
        return value


@lru_cache
def get_settings() -> Settings:
    """返回缓存后的应用配置。"""
    return Settings()
