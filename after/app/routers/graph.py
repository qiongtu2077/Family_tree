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


@router.get("/mainline/{person_id}", response_model=GraphViewResponse)
def get_mainline_graph(
    person_id: str,
    ancestor_depth: int = Query(3, ge=1, le=10, description="向上追溯代数"),
    descendant_depth: int = Query(3, ge=1, le=10, description="向下展开代数"),
    session=Depends(get_neo4j_session),
):
    """获取本家主线图。"""
    service = GraphViewService(GraphRepository(session))
    graph = service.get_mainline_graph(person_id, ancestor_depth, descendant_depth)
    if not graph:
        raise HTTPException(status_code=404, detail="中心人物不存在或没有可展示图谱")
    return graph


@router.get("/inlaw/{person_id}/{spouse_id}", response_model=GraphViewResponse)
def get_inlaw_graph(
    person_id: str,
    spouse_id: str,
    depth: int = Query(3, ge=1, le=10, description="配偶原生家族追溯深度"),
    session=Depends(get_neo4j_session),
):
    """获取姻亲谱系图。"""
    service = GraphViewService(GraphRepository(session))
    graph = service.get_inlaw_graph(person_id, spouse_id, depth)
    if not graph:
        raise HTTPException(status_code=404, detail="两人不是配偶关系或姻亲谱系不可展示")
    return graph


@router.get("/bridge", response_model=GraphViewResponse)
def get_bridge_graph(
    person_id: str = Query(..., description="本家人物 ID"),
    spouse_id: str = Query(..., description="配偶人物 ID"),
    family_unit_id: str | None = Query(None, description="可选家庭单元 ID"),
    depth: int = Query(2, ge=1, le=6, description="两侧近亲展开深度"),
    session=Depends(get_neo4j_session),
):
    """获取联姻桥接图。"""
    service = GraphViewService(GraphRepository(session))
    graph = service.get_bridge_graph(
        person_id,
        spouse_id,
        depth,
        family_unit_id=family_unit_id,
    )
    if not graph:
        raise HTTPException(status_code=404, detail="未找到可桥接的配偶或伴侣家庭单元")
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


@router.get("/branch", response_model=GraphViewResponse)
def get_branch_graph_by_root(
    root_type: str = Query("person", pattern="^(person|familyUnit)$", description="根节点类型"),
    root_id: str = Query(..., description="人物或家庭单元 ID"),
    depth: int = Query(5, ge=1, le=10, description="向下展开深度"),
    session=Depends(get_neo4j_session),
):
    """按人物或家庭单元获取后代分支图。"""
    service = GraphViewService(GraphRepository(session))
    graph = service.get_branch_graph_by_root(root_type, root_id, depth)
    if not graph:
        raise HTTPException(status_code=404, detail="根节点不存在或没有可展示分支")
    return graph


@router.get("/overview", response_model=GraphViewResponse)
def get_overview_graph(
    scope: str = Query("all", description="all、demo 或 familyUnitId"),
    max_nodes: int = Query(300, ge=1, le=1000, description="最大人物节点数"),
    session=Depends(get_neo4j_session),
):
    """获取家族全景图。"""
    service = GraphViewService(GraphRepository(session))
    graph = service.get_overview_graph(scope, max_nodes)
    if not graph:
        raise HTTPException(status_code=404, detail="当前范围没有可展示图谱")
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
