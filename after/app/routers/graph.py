"""
Neo4j 族谱图谱 API
提供主线图、分支图、关系路径和异常诊断接口。
"""
from fastapi import APIRouter, Depends, HTTPException, Query

from ..graph_schemas import GraphIssue, GraphViewResponse, RelationPathResponse
from ..neo4j import get_neo4j_session
from ..repositories.graph_repository import GraphRepository
from ..services.graph_view_service import GraphViewService
from ..services.relation_path_service import RelationPathService

router = APIRouter(prefix="/api/graph", tags=["Neo4j 图谱"])


@router.get("/focus/{person_id}", response_model=GraphViewResponse)
def get_focus_graph(
    person_id: str,
    generations: int = Query(5, ge=1, le=10, description="向上/向下追溯代数"),
    session=Depends(get_neo4j_session),
):
    """获取中心人物本家主线图。"""
    service = GraphViewService(GraphRepository(session))
    graph = service.get_focus_graph(person_id, generations)
    if not graph:
        raise HTTPException(status_code=404, detail="中心人物不存在或没有可展示图谱")
    return graph


@router.get("/branch/{family_unit_id}", response_model=GraphViewResponse)
def get_branch_graph(
    family_unit_id: str,
    depth: int = Query(5, ge=1, le=10, description="向下展开深度"),
    session=Depends(get_neo4j_session),
):
    """获取某个家庭单元的后代分支图。"""
    service = GraphViewService(GraphRepository(session))
    graph = service.get_branch_graph(family_unit_id, depth)
    if not graph:
        raise HTTPException(status_code=404, detail="家庭单元不存在或没有可展示分支")
    return graph


@router.get("/relation-path", response_model=RelationPathResponse)
def get_relation_path(
    from_person_id: str = Query(..., alias="from", description="起点人物 ID"),
    to_person_id: str = Query(..., alias="to", description="终点人物 ID"),
    session=Depends(get_neo4j_session),
):
    """查询两个人之间的最短亲缘路径。"""
    service = RelationPathService(GraphRepository(session))
    path = service.get_relation_path(from_person_id, to_person_id)
    if not path:
        raise HTTPException(status_code=404, detail="未找到两人之间的关系路径")
    return path


@router.get("/issues", response_model=list[GraphIssue])
def get_graph_issues(session=Depends(get_neo4j_session)):
    """获取管理员图谱异常诊断列表。"""
    service = GraphViewService(GraphRepository(session))
    return service.get_graph_issues()
