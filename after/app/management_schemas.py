"""定义资料维护页面使用的家庭及关系契约。"""
from __future__ import annotations

from datetime import date

from pydantic import BaseModel, Field

from .graph_schemas import FamilyUnitType, RelationshipCreate, RelationshipType


class FamilyPartnerDetail(BaseModel):
    """家庭父母或伴侣成员及显示顺序。"""

    person_id: str
    relationship_id: str
    display_order: int = 0


class FamilyChildDetail(BaseModel):
    """家庭子女及亲缘事实属性。"""

    person_id: str
    relationship_id: str
    birth_order: int = 0
    relation_kind: str = "biological"
    certainty: float = 1.0


class FamilyUnitDetail(BaseModel):
    """使用原始家庭 ID，避免图谱投影的 family: 前缀进入写接口。"""

    id: str
    family_type: FamilyUnitType
    start_date: str | None = None
    end_date: str | None = None
    display_order: int = 0
    partners: list[FamilyPartnerDetail]
    children: list[FamilyChildDetail]


class FamilyUnitUpdate(BaseModel):
    """家庭类型、起止日期和展示顺序的部分更新参数。"""

    family_type: FamilyUnitType | None = None
    start_date: date | None = None
    end_date: date | None = None
    display_order: int | None = None


class RelationshipDetail(RelationshipCreate):
    """维护列表中的可寻址关系及其家庭派生来源。"""

    id: str
    relationship_type: RelationshipType
    derived_from_family: bool = False
    source_family_ids: list[str] = Field(default_factory=list)
