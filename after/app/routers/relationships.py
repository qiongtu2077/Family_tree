"""
Neo4j 族谱关系 API
负责创建伴侣、子女、亲子和配偶关系。
"""
from fastapi import APIRouter, Depends

from ..graph_schemas import RelationshipCreate
from ..neo4j import get_neo4j_session
from ..repositories.person_repository import PersonRepository
from ..services.relationship_validation_service import RelationshipValidationService

router = APIRouter(prefix="/api/relationships", tags=["Neo4j 关系"])


@router.post("", status_code=201)
def create_relationship(payload: RelationshipCreate, session=Depends(get_neo4j_session)):
    """创建族谱关系。"""
    repository = PersonRepository(session)
    RelationshipValidationService(repository).validate_create(payload)

    if payload.relationship_type == "partner":
        repository.add_partner_to_family_unit(
            payload.person_id,
            payload.family_unit_id,
            {"displayOrder": payload.display_order or 0},
        )
    elif payload.relationship_type == "child":
        repository.add_child_to_family_unit(
            payload.target_person_id,
            payload.family_unit_id,
            {
                "birthOrder": payload.birth_order or 0,
                "relationKind": payload.relation_kind,
                "certainty": payload.certainty,
            },
        )
    elif payload.relationship_type == "parent_child":
        repository.add_parent_child_relation(
            payload.person_id,
            payload.target_person_id,
            {
                "side": payload.side or "parent",
                "relationKind": payload.relation_kind,
                "certainty": payload.certainty,
            },
        )
    elif payload.relationship_type == "spouse":
        repository.add_spouse_relation(
            payload.person_id,
            payload.target_person_id,
            {"displayOrder": payload.display_order or 0},
        )

    return {"success": True, "message": "关系创建成功"}
