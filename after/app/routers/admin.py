"""
管理员 API
提供 Neo4j 初始化和图谱诊断入口。
"""
from fastapi import APIRouter, Depends

from ..graph_schemas import GraphIssue
from ..database import get_db
from ..neo4j import get_neo4j_session
from ..repositories.graph_repository import GraphRepository
from ..repositories.person_repository import PersonRepository
from ..services.graph_view_service import GraphViewService
from ..services.migration_service import MigrationService
from ..services.seed_service import SeedService

router = APIRouter(prefix="/api/admin", tags=["管理员"])


@router.post("/init-neo4j")
def init_neo4j(session=Depends(get_neo4j_session)):
    """初始化 Neo4j 约束。"""
    PersonRepository(session).ensure_constraints()
    return {"success": True, "message": "Neo4j 约束已初始化"}


@router.get("/graph-issues", response_model=list[GraphIssue])
def get_graph_issues(session=Depends(get_neo4j_session)):
    """获取族谱图异常诊断。"""
    return GraphViewService(GraphRepository(session)).get_graph_issues()


@router.post("/migrate-legacy")
def migrate_legacy_data(db=Depends(get_db), session=Depends(get_neo4j_session)):
    """把旧关系型人物数据迁移到 Neo4j。"""
    result = MigrationService(db, PersonRepository(session)).migrate_people()
    return {"success": True, "message": "旧数据迁移完成", "result": result}


@router.post("/seed-demo-family")
def seed_demo_family(session=Depends(get_neo4j_session)):
    """初始化 Neo4j 示例族谱数据。"""
    result = SeedService(PersonRepository(session)).seed_demo_family()
    return {"success": True, "message": "示例族谱已初始化", "result": result}
