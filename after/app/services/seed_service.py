"""
Neo4j 示例数据初始化服务
创建可用于登录后查看的最小完整族谱数据。
"""
from __future__ import annotations

from ..repositories.person_repository import PersonRepository


class SeedService:
    """初始化 Neo4j 约束和示例族谱数据。"""

    def __init__(self, repository: PersonRepository):
        """保存人物 repository。"""
        self.repository = repository

    def seed_demo_family(self) -> dict[str, int]:
        """写入示例人物、家庭单元和关系。"""
        self.repository.ensure_constraints()
        people = [
            {"personId": "demo:grandfather", "name": "张立德", "gender": "M", "birth_date": "1942-03-18", "is_alive": True, "occupation": "退休教师", "biography": "家族长辈，重视教育与家风传承。"},
            {"personId": "demo:grandmother", "name": "李秀兰", "gender": "F", "birth_date": "1946-09-02", "is_alive": True, "occupation": "医生", "biography": "温和坚定，是家族记忆的守护者。"},
            {"personId": "demo:father", "name": "张明远", "gender": "M", "birth_date": "1970-07-11", "is_alive": True, "occupation": "工程师", "biography": "负责整理族谱资料。"},
            {"personId": "demo:mother", "name": "王清雅", "gender": "F", "birth_date": "1972-05-21", "is_alive": True, "occupation": "设计师", "biography": "喜欢用照片记录家庭故事。"},
            {"personId": "demo:child", "name": "张一宁", "gender": "F", "birth_date": "2000-10-06", "is_alive": True, "occupation": "研究生", "biography": "示例测试用户绑定人物。"},
            {"personId": "demo:uncle", "name": "张明川", "gender": "M", "birth_date": "1975-12-25", "is_alive": True, "occupation": "摄影师", "biography": "常年记录家族聚会。"},
        ]
        for person in people:
            existing = self.repository.get_person(person["personId"])
            if existing:
                self.repository.update_person(person["personId"], person)
            else:
                self.repository.create_person(person)

        family_units = [
            {"familyUnitId": "demo:unit-grandparents", "type": "marriage", "display_order": 1},
            {"familyUnitId": "demo:unit-parents", "type": "marriage", "display_order": 2},
        ]
        for unit in family_units:
            self.repository.create_or_update_family_unit(unit)

        self.repository.add_partner_to_family_unit("demo:grandfather", "demo:unit-grandparents", {"displayOrder": 1})
        self.repository.add_partner_to_family_unit("demo:grandmother", "demo:unit-grandparents", {"displayOrder": 2})
        self.repository.add_child_to_family_unit("demo:father", "demo:unit-grandparents", {"birthOrder": 1, "relationKind": "biological", "certainty": 1.0})
        self.repository.add_child_to_family_unit("demo:uncle", "demo:unit-grandparents", {"birthOrder": 2, "relationKind": "biological", "certainty": 1.0})
        self.repository.add_parent_child_relation("demo:grandfather", "demo:father", {"side": "father", "relationKind": "biological", "certainty": 1.0})
        self.repository.add_parent_child_relation("demo:grandmother", "demo:father", {"side": "mother", "relationKind": "biological", "certainty": 1.0})
        self.repository.add_parent_child_relation("demo:grandfather", "demo:uncle", {"side": "father", "relationKind": "biological", "certainty": 1.0})
        self.repository.add_parent_child_relation("demo:grandmother", "demo:uncle", {"side": "mother", "relationKind": "biological", "certainty": 1.0})

        self.repository.add_partner_to_family_unit("demo:father", "demo:unit-parents", {"displayOrder": 1})
        self.repository.add_partner_to_family_unit("demo:mother", "demo:unit-parents", {"displayOrder": 2})
        self.repository.add_spouse_relation("demo:father", "demo:mother", {"displayOrder": 1})
        self.repository.add_child_to_family_unit("demo:child", "demo:unit-parents", {"birthOrder": 1, "relationKind": "biological", "certainty": 1.0})
        self.repository.add_parent_child_relation("demo:father", "demo:child", {"side": "father", "relationKind": "biological", "certainty": 1.0})
        self.repository.add_parent_child_relation("demo:mother", "demo:child", {"side": "mother", "relationKind": "biological", "certainty": 1.0})

        return {"people": len(people), "family_units": len(family_units)}
