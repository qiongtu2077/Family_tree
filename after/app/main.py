"""
FastAPI 应用主入口
"""
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from .database import engine, Base
from .routers import genealogy, auth

# 创建数据库表（如果不存在）
Base.metadata.create_all(bind=engine)

# 确保上传目录存在
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
os.makedirs(os.path.join(UPLOAD_DIR, "avatars"), exist_ok=True)
os.makedirs(os.path.join(UPLOAD_DIR, "photos"), exist_ok=True)

# 创建 FastAPI 应用实例
app = FastAPI(
    title="族谱查询系统 API",
    description="基于 FastAPI 的族谱查询和显示系统",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# 挂载静态文件目录（图片访问）
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# 配置 CORS（跨域资源共享）
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 生产环境应设置为具体的前端域名
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由
app.include_router(genealogy.router)
app.include_router(auth.router)


@app.get("/")
def root():
    """
    根路径，返回 API 信息
    """
    return {
        "message": "族谱查询系统 API",
        "docs": "/docs",
        "redoc": "/redoc"
    }


@app.get("/health")
def health_check():
    """
    健康检查接口
    """
    return {"status": "ok"}


