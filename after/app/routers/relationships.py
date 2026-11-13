"""
PostgreSQL 族谱关系 API
负责创建伴侣、子女、亲子和配偶关系。
"""
from fastapi import APIRouter, Depends, HTTPException, Query

from ..graph_schemas import RelationshipCreate
from ..database import get_db
from ..services.relationship_validation_service import RelationshipValidationService
from ..repositories.management_repository import ManagementRepository
from ..management_schemas import RelationshipDetail
from ..security import require_admin, require_user

router = APIRouter(prefix="/api/relationships", tags=["PostgreSQL 关系"])


@router.get("", response_model=list[RelationshipDetail], dependencies=[Depends(require_user)])
def list_relationships(skip: int = Query(0, ge=0), limit: int = Query(100, ge=1, le=1000), session=Depends(get_db)):
    """分页读取家庭成员、亲子与配偶事实及其稳定 ID。"""
    return ManagementRepository(session).list_relationships(skip, limit)


@router.post("", status_code=201, dependencies=[Depends(require_admin)])
def create_relationship(payload: RelationshipCreate, session=Depends(get_db)):
    """创建族谱关系。"""
    repository = ManagementRepository(session)
    RelationshipValidationService(repository).validate_create(payload)
    previous_facts = []
    if payload.relationship_type in {"partner", "child"}:
        family = repository.get_family_detail(payload.family_unit_id)
        if family is None:
            raise HTTPException(status_code=404, detail="家庭单元不存在")
        # 同一个人不能同时是同一家庭的父母和子女，避免派生自指亲子事实。
        opposite_members = family["children"] if payload.relationship_type == "partner" else family["partners"]
        member_id = payload.person_id if payload.relationship_type == "partner" else payload.target_person_id
        if any(member["person_id"] == member_id for member in opposite_members):
            raise HTTPException(status_code=400, detail="同一人物不能同时作为一个家庭的父母和子女")
        previous_facts = repository.capture_family_facts(payload.family_unit_id)

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

    repository.clean_unsupported_facts(previous_facts)
    return {"success": True, "message": "关系创建成功"}


@router.delete("/{relation_id:path}", status_code=204, dependencies=[Depends(require_admin)])
def delete_relationship(relation_id: str, session=Depends(get_db)):
    """按稳定复合 ID 移除关系，家庭派生事实通过家庭成员入口纠错。"""
    if not ManagementRepository(session).delete_relationship(relation_id):
        raise HTTPException(status_code=404, detail="关系不存在")
    return None
