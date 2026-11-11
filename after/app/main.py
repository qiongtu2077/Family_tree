import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text

from .config import get_settings
from .database import engine, Base
from .routers import admin, auth, family_units, genealogy, graph, persons, relationships

"""
FastAPI 应用主入口
负责应用初始化、中间件、静态文件和路由注册。
"""

settings = get_settings()

@asynccontextmanager
async def lifespan(app: FastAPI):
    """启动时初始化统一数据库，退出时释放连接池。"""
    Base.metadata.create_all(bind=engine)
    try:
        yield
    finally:
        engine.dispose()

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
os.makedirs(os.path.join(UPLOAD_DIR, "avatars"), exist_ok=True)
os.makedirs(os.path.join(UPLOAD_DIR, "photos"), exist_ok=True)

app = FastAPI(
    title=settings.app_name,
    description="基于 FastAPI + PostgreSQL 的族谱查询和显示系统",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(genealogy.router)
app.include_router(graph.router)
app.include_router(persons.router)
app.include_router(family_units.router)
app.include_router(relationships.router)
app.include_router(admin.router)


@app.get("/")
def root():
    """根路径，返回 API 信息。"""
    return {
        "message": "族谱查询系统 API",
        "version": "2.0.0",
        "docs": "/docs",
        "redoc": "/redoc",
    }


@app.get("/health")
def health_check():
    """查询数据库确认实际可用后返回健康状态。"""
    with engine.connect() as connection:
        connection.execute(text("SELECT 1"))
    return {"status": "ok", "database": "postgresql"}
