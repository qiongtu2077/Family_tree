"""
Neo4j 人物 API
提供新架构下的人物 CRUD 和搜索接口。
"""
from fastapi import APIRouter, Depends, HTTPException, Query

from ..graph_schemas import GraphPerson, PersonCreateV2, PersonUpdateV2
from ..neo4j import get_neo4j_session
from ..repositories.person_repository import PersonRepository

router = APIRouter(prefix="/api/persons", tags=["Neo4j 人物"])


@router.get("", response_model=list[GraphPerson])
def list_persons(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    session=Depends(get_neo4j_session),
):
    """分页获取人物列表。"""
    repository = PersonRepository(session)
    return [_to_graph_person(person) for person in repository.list_persons(skip, limit)]


@router.get("/search", response_model=list[GraphPerson])
def search_persons(
    name: str = Query(..., min_length=1, description="姓名关键词"),
    session=Depends(get_neo4j_session),
):
    """根据姓名搜索人物。"""
    repository = PersonRepository(session)
    return [_to_graph_person(person) for person in repository.search_persons(name.strip())]


@router.get("/{person_id}", response_model=GraphPerson)
def get_person(person_id: str, session=Depends(get_neo4j_session)):
    """根据 ID 获取人物。"""
    repository = PersonRepository(session)
    person = repository.get_person(person_id)
    if not person:
        raise HTTPException(status_code=404, detail="人物不存在")
    return _to_graph_person(person)


@router.post("", response_model=GraphPerson, status_code=201)
def create_person(payload: PersonCreateV2, session=Depends(get_neo4j_session)):
    """创建人物。"""
    repository = PersonRepository(session)
    person = repository.create_person(payload.model_dump())
    return _to_graph_person(person)


@router.patch("/{person_id}", response_model=GraphPerson)
def update_person(
    person_id: str,
    payload: PersonUpdateV2,
    session=Depends(get_neo4j_session),
):
    """更新人物。"""
    repository = PersonRepository(session)
    person = repository.update_person(person_id, payload.model_dump(exclude_unset=True))
    if not person:
        raise HTTPException(status_code=404, detail="人物不存在")
    return _to_graph_person(person)


@router.delete("/{person_id}", status_code=204)
def delete_person(person_id: str, session=Depends(get_neo4j_session)):
    """删除人物。"""
    repository = PersonRepository(session)
    deleted = repository.delete_person(person_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="人物不存在")
    return None


def _to_graph_person(person: dict) -> GraphPerson:
    """把 Neo4j 人物属性转换为响应模型。"""
    person_id = str(person.get("personId") or person.get("id") or "")
    return GraphPerson(
        id=person_id,
        name=str(person.get("name", "未命名")),
        gender=person.get("gender", "U") or "U",
        birth_date=str(person.get("birthDate") or person.get("birth_date") or "") or None,
        death_date=str(person.get("deathDate") or person.get("death_date") or "") or None,
        is_alive=bool(person.get("isAlive", person.get("is_alive", True))),
        avatar=person.get("avatar"),
        occupation=person.get("occupation"),
        address=person.get("address"),
        biography=person.get("biography"),
        motto=person.get("motto"),
        achievements=person.get("achievements"),
    )
