"""统一 PostgreSQL 数据库初始化和族谱诊断入口。"""
from fastapi import APIRouter, Depends

from ..database import get_db
from ..graph_schemas import GraphIssue
from ..repositories.graph_repository import GraphRepository
from ..repositories.person_repository import PersonRepository
from ..services.graph_view_service import GraphViewService
from ..services.seed_service import SeedService

router = APIRouter(prefix="/api/admin", tags=["管理员"])


@router.post("/init-database")
def init_database(session=Depends(get_db)):
    """初始化 PostgreSQL 族谱表及其约束。"""
    PersonRepository(session).ensure_constraints()
    return {"success": True, "message": "PostgreSQL 表和约束已初始化"}


@router.get("/graph-issues", response_model=list[GraphIssue])
def get_graph_issues(session=Depends(get_db)):
    """获取族谱关系异常诊断。"""
    return GraphViewService(GraphRepository(session)).get_graph_issues()


@router.post("/seed-demo-family")
def seed_demo_family(session=Depends(get_db)):
    """初始化示例族谱，保留非演示人物。"""
    result = SeedService(PersonRepository(session)).seed_demo_family()
    return {"success": True, "message": "示例族谱已初始化", "result": result}
