"""
数据库连接配置
使用 SQLAlchemy 连接 MySQL 数据库
"""
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()

# 数据库连接配置
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "sqlite:///./family_tree.db"
)

# 创建数据库引擎
engine_options = {
    "echo": False,
}
if DATABASE_URL.startswith("sqlite"):
    engine_options["connect_args"] = {"check_same_thread": False}
else:
    engine_options.update({
        "pool_pre_ping": True,
        "pool_recycle": 3600,
    })

engine = create_engine(DATABASE_URL, **engine_options)

# 创建会话工厂
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 声明基类
Base = declarative_base()


def get_db():
    """
    获取数据库会话
    用于依赖注入，FastAPI 会自动管理会话的生命周期
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


