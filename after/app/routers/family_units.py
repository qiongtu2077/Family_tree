"""
PostgreSQL 家庭单元 API
负责创建婚姻、伴侣、单亲、未知父母等家庭单元。
"""
from fastapi import APIRouter, Depends, HTTPException, Query

from ..graph_schemas import FamilyUnitCreate, GraphFamilyUnit
from ..database import get_db
from ..repositories.person_repository import PersonRepository
from ..repositories.management_repository import ManagementRepository
from ..management_schemas import FamilyUnitDetail, FamilyUnitUpdate
from ..security import require_admin, require_user

router = APIRouter(prefix="/api/family-units", tags=["PostgreSQL 家庭单元"])


@router.get("", response_model=list[FamilyUnitDetail], dependencies=[Depends(require_user)])
def list_family_units(skip: int = Query(0, ge=0), limit: int = Query(100, ge=1, le=1000), session=Depends(get_db)):
    """分页读取家庭和完整成员，使用不带图谱前缀的原始家庭 ID。"""
    return ManagementRepository(session).list_family_units(skip, limit)


@router.post("", response_model=GraphFamilyUnit, status_code=201, dependencies=[Depends(require_admin)])
def create_family_unit(payload: FamilyUnitCreate, session=Depends(get_db)):
    """创建家庭单元。"""
    repository = PersonRepository(session)
    unit = repository.create_family_unit(
        {
            "family_type": payload.family_type,
            "start_date": payload.start_date,
            "end_date": payload.end_date,
            "display_order": payload.display_order,
        }
    )
    return GraphFamilyUnit(
        id=f"family:{unit.get('familyUnitId')}",
        family_type=unit.get("type", "marriage"),
        display_order=int(unit.get("displayOrder", 0) or 0),
    )


@router.patch("/{family_id:path}", response_model=FamilyUnitDetail, dependencies=[Depends(require_admin)])
def update_family_unit(family_id: str, payload: FamilyUnitUpdate, session=Depends(get_db)):
    """修改家庭属性并同步家庭类型变化带来的派生关系。"""
    changes = payload.model_dump(exclude_unset=True)
    if changes.get("family_type", "marriage") is None or changes.get("display_order", 0) is None:
        raise HTTPException(status_code=422, detail="家庭类型和显示顺序不能为 null")
    family = ManagementRepository(session).update_family(family_id, changes)
    if family is None:
        raise HTTPException(status_code=404, detail="家庭单元不存在")
    return family


@router.delete("/{family_id:path}", status_code=204, dependencies=[Depends(require_admin)])
def delete_family_unit(family_id: str, session=Depends(get_db)):
    """删除家庭和成员身份，不删除人物或独立记录的亲缘事实。"""
    if not ManagementRepository(session).delete_family(family_id):
        raise HTTPException(status_code=404, detail="家庭单元不存在")
    return None
