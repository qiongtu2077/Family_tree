import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .config import get_settings
from .database import engine, Base
from .neo4j import close_driver
from .routers import admin, auth, family_units, genealogy, graph, persons, relationships

"""
FastAPI 应用主入口
负责应用初始化、中间件、静态文件和路由注册。
"""

settings = get_settings()

# 旧 SQLAlchemy 表仍用于兼容登录、注册和上传接口。
Base.metadata.create_all(bind=engine)

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
os.makedirs(os.path.join(UPLOAD_DIR, "avatars"), exist_ok=True)
os.makedirs(os.path.join(UPLOAD_DIR, "photos"), exist_ok=True)

app = FastAPI(
    title=settings.app_name,
    description="基于 FastAPI + Neo4j 的族谱查询和显示系统",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
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


@app.on_event("shutdown")
def shutdown_event():
    """应用关闭时释放 Neo4j Driver。"""
    close_driver()


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
    """健康检查接口。"""
    return {"status": "ok", "database": "neo4j-ready"}
