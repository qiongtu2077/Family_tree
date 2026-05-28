"""
旧关系型数据到 Neo4j 的迁移服务
把 Person.father_id/mother_id 转成 Person + FamilyUnit + PARENT_OF 图模型。
"""
from __future__ import annotations

from sqlalchemy.orm import Session

from ..models import Person
from ..repositories.person_repository import PersonRepository


class MigrationService:
    """迁移旧 SQLAlchemy 人物数据到 Neo4j。"""

    def __init__(self, db: Session, repository: PersonRepository):
        """保存旧数据库会话和 Neo4j repository。"""
        self.db = db
        self.repository = repository

    def migrate_people(self) -> dict[str, int]:
        """迁移人物节点和直接亲子关系。"""
        self.repository.ensure_constraints()
        persons = self.db.query(Person).all()
        migrated_people = 0
        migrated_parent_edges = 0

        for person in persons:
            payload = _person_to_payload(person)
            existing = self.repository.get_person(payload["personId"])
            if existing:
                self.repository.update_person(payload["personId"], payload)
            else:
                self.repository.create_person(payload)
            migrated_people += 1

        for person in persons:
            child_id = _legacy_person_id(person.id)
            if person.father_id:
                self.repository.add_parent_child_relation(
                    _legacy_person_id(person.father_id),
                    child_id,
                    {"side": "father", "relationKind": "biological", "certainty": 1.0},
                )
                migrated_parent_edges += 1
            if person.mother_id:
                self.repository.add_parent_child_relation(
                    _legacy_person_id(person.mother_id),
                    child_id,
                    {"side": "mother", "relationKind": "biological", "certainty": 1.0},
                )
                migrated_parent_edges += 1

        return {
            "people": migrated_people,
            "parent_edges": migrated_parent_edges,
        }


def _person_to_payload(person: Person) -> dict:
    """把旧 Person ORM 对象转换为 Neo4j Person 属性。"""
    return {
        "personId": _legacy_person_id(person.id),
        "name": person.name,
        "gender": person.gender or "U",
        "birth_date": person.birth_date,
        "death_date": person.death_date,
        "is_alive": person.is_alive,
        "avatar": person.avatar,
        "occupation": person.occupation,
        "address": person.address,
        "motto": person.motto,
        "achievements": person.achievements,
        "biography": person.biography,
    }


def _legacy_person_id(person_id: int) -> str:
    """为旧数据库人物生成稳定 Neo4j personId。"""
    return f"legacy:{person_id}"
