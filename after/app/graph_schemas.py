"""
Neo4j 族谱接口数据模型
定义前端图谱、关系路径和管理诊断所需 DTO。
"""
from __future__ import annotations

from datetime import date
from typing import Any, Literal

from pydantic import BaseModel, Field


Gender = Literal["M", "F", "U"]
FamilyUnitType = Literal["marriage", "partner", "single_parent", "unknown_parent", "adoptive"]
RelationshipType = Literal["partner", "child", "parent_child", "spouse"]
ViewMode = Literal["mainline", "inlaw", "bridge", "path", "branch", "overview"]
BranchTargetView = Literal["mainline", "inlaw", "bridge", "branch", "overview"]


class GraphPerson(BaseModel):
    """图谱人物节点。"""

    id: str
    type: Literal["person"] = "person"
    name: str
    gender: Gender = "U"
    birth_date: str | None = None
    death_date: str | None = None
    is_alive: bool = True
    avatar: str | None = None
    occupation: str | None = None
    address: str | None = None
    biography: str | None = None
    motto: str | None = None
    achievements: str | None = None
    badges: list[str] = Field(default_factory=list)


class GraphFamilyUnit(BaseModel):
    """图谱家庭单元节点。"""

    id: str
    type: Literal["familyUnit"] = "familyUnit"
    family_type: FamilyUnitType = "marriage"
    label: str = "家庭单元"
    display_order: int = 0


class GraphBranchCapsule(BaseModel):
    """折叠分支入口节点。"""

    id: str
    type: Literal["branchCapsule"] = "branchCapsule"
    title: str
    owner_person_id: str | None = None
    root_family_unit_id: str | None = None
    relation_to_center: str = "旁支"
    person_count: int = 0
    generation_count: int = 0
    preview_names: list[str] = Field(default_factory=list)
    target_view: BranchTargetView = "branch"


class GraphEdge(BaseModel):
    """图谱连线。"""

    id: str
    source: str
    target: str
    relation: str
    label: str | None = None
    style: Literal["solid", "dashed", "spouse", "highlight"] = "solid"
    metadata: dict[str, Any] = Field(default_factory=dict)


class GraphViewResponse(BaseModel):
    """前端族谱视图数据。"""

    view_mode: ViewMode
    center_person_id: str | None = None
    nodes: list[GraphPerson | GraphFamilyUnit | GraphBranchCapsule]
    edges: list[GraphEdge]
    hidden_relation_count: int = 0
    warnings: list[str] = Field(default_factory=list)


class CenterFamilyOption(BaseModel):
    """中心人物可切换的家庭单元选项。"""

    family_unit_id: str
    label: str
    family_type: FamilyUnitType = "marriage"
    spouse_ids: list[str] = Field(default_factory=list)
    spouse_names: list[str] = Field(default_factory=list)
    child_count: int = 0


class CenterSpouseOption(BaseModel):
    """中心人物可选择的配偶/伴侣选项。"""

    person: GraphPerson
    family_unit_id: str | None = None
    child_count: int = 0


class NineKinshipSummary(BaseModel):
    """中心人物九族范围摘要。"""

    ancestor_depth: int = 4
    descendant_depth: int = 4
    ancestor_count: int = 0
    descendant_count: int = 0
    visible_person_count: int = 0
    hidden_relation_count: int = 0


class CenterContextResponse(BaseModel):
    """中心人物上下文，用于前端五图参数选择。"""

    person: GraphPerson
    available_spouses: list[CenterSpouseOption] = Field(default_factory=list)
    available_family_units: list[CenterFamilyOption] = Field(default_factory=list)
    default_mainline_depth: int = 3
    nine_kinship_summary: NineKinshipSummary = Field(default_factory=NineKinshipSummary)
    warnings: list[str] = Field(default_factory=list)


class PersonCreateV2(BaseModel):
    """Neo4j 人物创建参数。"""

    name: str = Field(..., min_length=1, description="姓名")
    gender: Gender = Field("U", description="性别：M/F/U")
    birth_date: date | None = None
    death_date: date | None = None
    is_alive: bool = True
    avatar: str | None = None
    occupation: str | None = None
    address: str | None = None
    biography: str | None = None
    motto: str | None = None
    achievements: str | None = None


class PersonUpdateV2(BaseModel):
    """Neo4j 人物更新参数。"""

    name: str | None = Field(None, min_length=1)
    gender: Gender | None = None
    birth_date: date | None = None
    death_date: date | None = None
    is_alive: bool | None = None
    avatar: str | None = None
    occupation: str | None = None
    address: str | None = None
    biography: str | None = None
    motto: str | None = None
    achievements: str | None = None


class FamilyUnitCreate(BaseModel):
    """家庭单元创建参数。"""

    family_type: FamilyUnitType = "marriage"
    start_date: date | None = None
    end_date: date | None = None
    display_order: int = 0


class RelationshipCreate(BaseModel):
    """关系创建参数。"""

    relationship_type: RelationshipType
    person_id: str | None = None
    target_person_id: str | None = None
    family_unit_id: str | None = None
    side: Literal["father", "mother", "parent"] | None = None
    relation_kind: Literal["biological", "adoptive", "step", "unknown"] = "biological"
    birth_order: int | None = None
    display_order: int | None = None
    certainty: float = Field(1.0, ge=0, le=1)


class LayoutHintUpdate(BaseModel):
    """布局顺序提示更新参数。"""

    target_type: Literal["person", "familyUnit", "relationship"]
    target_id: str
    birth_order: int | None = None
    spouse_order: int | None = None
    branch_order: int | None = None
    display_order: int | None = None


class RelationPathResponse(BaseModel):
    """两人关系路径查询结果。"""

    from_person_id: str
    to_person_id: str
    relation_text: str
    path: GraphViewResponse
    alternative_count: int = 0


class GraphIssue(BaseModel):
    """管理员图谱异常项。"""

    person_id: str
    person_name: str
    issue_type: str
    message: str
