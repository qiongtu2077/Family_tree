"""
族谱关系校验服务
在写入 Neo4j 前校验明显不合理或重复的关系。
"""
from __future__ import annotations

from fastapi import HTTPException

from ..graph_schemas import RelationshipCreate
from ..repositories.person_repository import PersonRepository


class RelationshipValidationService:
    """校验关系创建请求的完整性。"""

    def __init__(self, repository: PersonRepository):
        """保存人物 repository。"""
        self.repository = repository

    def validate_create(self, payload: RelationshipCreate) -> None:
        """根据关系类型执行必填字段校验。"""
        if payload.relationship_type == "partner":
            self._require(payload.person_id, "person_id")
            self._require(payload.family_unit_id, "family_unit_id")
            self._ensure_person_exists(payload.person_id)
        elif payload.relationship_type == "child":
            self._require(payload.target_person_id, "target_person_id")
            self._require(payload.family_unit_id, "family_unit_id")
            self._ensure_person_exists(payload.target_person_id)
        elif payload.relationship_type == "parent_child":
            self._require(payload.person_id, "person_id")
            self._require(payload.target_person_id, "target_person_id")
            if payload.person_id == payload.target_person_id:
                raise HTTPException(status_code=400, detail="不能把人物设置为自己的父母")
            self._ensure_person_exists(payload.person_id)
            self._ensure_person_exists(payload.target_person_id)
        elif payload.relationship_type == "spouse":
            self._require(payload.person_id, "person_id")
            self._require(payload.target_person_id, "target_person_id")
            if payload.person_id == payload.target_person_id:
                raise HTTPException(status_code=400, detail="不能把人物设置为自己的配偶")
            self._ensure_person_exists(payload.person_id)
            self._ensure_person_exists(payload.target_person_id)
        else:
            raise HTTPException(status_code=400, detail="不支持的关系类型")

    def _ensure_person_exists(self, person_id: str | None) -> None:
        """确认人物存在。"""
        if person_id and not self.repository.get_person(person_id):
            raise HTTPException(status_code=404, detail=f"人物不存在: {person_id}")

    @staticmethod
    def _require(value: str | None, field_name: str) -> None:
        """校验必填字段。"""
        if not value:
            raise HTTPException(status_code=400, detail=f"缺少必填字段: {field_name}")
