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
    "mysql+pymysql://root:password@localhost:3306/family_tree?charset=utf8mb4"
)

# 创建数据库引擎
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,  # 连接前检查连接是否有效
    pool_recycle=3600,   # 连接回收时间（秒）
    echo=False           # 是否打印 SQL 语句（开发时可设为 True）
)

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


