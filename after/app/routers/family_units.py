"""
PostgreSQL 家庭单元 API
负责创建婚姻、伴侣、单亲、未知父母等家庭单元。
"""
from fastapi import APIRouter, Depends

from ..graph_schemas import FamilyUnitCreate, GraphFamilyUnit
from ..database import get_db
from ..repositories.person_repository import PersonRepository

router = APIRouter(prefix="/api/family-units", tags=["PostgreSQL 家庭单元"])


@router.post("", response_model=GraphFamilyUnit, status_code=201)
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
