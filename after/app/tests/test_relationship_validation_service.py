"""
RelationshipValidationService 单元测试
验证不同关系类型的必填字段和基础业务限制。
"""
import pytest
from fastapi import HTTPException

from app.graph_schemas import RelationshipCreate
from app.services.relationship_validation_service import RelationshipValidationService


class FakePersonRepository:
    """模拟人物查询 repository。"""

    def __init__(self, existing_ids):
        """保存存在的人物 ID。"""
        self.existing_ids = set(existing_ids)

    def get_person(self, person_id):
        """根据 ID 返回人物或 None。"""
        if person_id in self.existing_ids:
            return {"personId": person_id, "name": person_id}
        return None


def test_validate_parent_child_rejects_self_parent():
    """亲子关系不能把自己设为自己的父母。"""
    service = RelationshipValidationService(FakePersonRepository({"p1"}))
    payload = RelationshipCreate(
        relationship_type="parent_child",
        person_id="p1",
        target_person_id="p1",
    )

    with pytest.raises(HTTPException) as exc_info:
        service.validate_create(payload)

    assert exc_info.value.status_code == 400


def test_validate_spouse_rejects_missing_target():
    """配偶关系必须同时提供两个不同人物。"""
    service = RelationshipValidationService(FakePersonRepository({"p1"}))
    payload = RelationshipCreate(relationship_type="spouse", person_id="p1")

    with pytest.raises(HTTPException) as exc_info:
        service.validate_create(payload)

    assert exc_info.value.status_code == 400
    assert "target_person_id" in exc_info.value.detail


def test_validate_partner_accepts_existing_person_and_family_unit():
    """人物加入家庭单元时必须提供 person_id 与 family_unit_id。"""
    service = RelationshipValidationService(FakePersonRepository({"p1"}))
    payload = RelationshipCreate(
        relationship_type="partner",
        person_id="p1",
        family_unit_id="f1",
    )

    service.validate_create(payload)
