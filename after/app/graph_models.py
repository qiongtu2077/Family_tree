"""PostgreSQL 族谱实体，保留稳定人物 ID、家庭单元和关系元数据。"""
from __future__ import annotations

from sqlalchemy import CheckConstraint, Column, DateTime, ForeignKey, JSON, String, func

from .database import Base


# --- 人物与家庭单元 --- #


class GenealogyPerson(Base):
    """保存当前族谱人物，独立于只供旧数据迁移使用的 persons 表。"""

    __tablename__ = "genealogy_persons"

    person_id = Column(String(128), primary_key=True)
    name = Column(String(100), nullable=False, index=True)
    gender = Column(String(1), nullable=False, default="U")
    properties = Column(JSON, nullable=False, default=dict)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())

    def to_dict(self) -> dict:
        """返回沿用原 API camelCase 字段的人物属性。"""
        return {
            **self.properties,
            "personId": self.person_id,
            "name": self.name,
            "gender": self.gender,
            "createdAt": self.created_at.isoformat(),
            "updatedAt": self.updated_at.isoformat(),
        }


class FamilyUnit(Base):
    """保存婚姻、单亲、收养或未知父母家庭单元。"""

    __tablename__ = "family_units"

    family_unit_id = Column(String(128), primary_key=True)
    family_type = Column(String(20), nullable=False, default="marriage")
    properties = Column(JSON, nullable=False, default=dict)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())

    def to_dict(self) -> dict:
        """返回沿用原 API 字段的家庭单元属性。"""
        return {
            **self.properties,
            "familyUnitId": self.family_unit_id,
            "type": self.family_type,
            "createdAt": self.created_at.isoformat(),
            "updatedAt": self.updated_at.isoformat(),
        }


# --- 家庭成员关系 --- #


class FamilyPartner(Base):
    """保存人物在家庭中的父母或伴侣成员身份及显示顺序。"""

    __tablename__ = "family_partners"

    family_unit_id = Column(String(128), ForeignKey("family_units.family_unit_id", ondelete="CASCADE"), primary_key=True)
    person_id = Column(String(128), ForeignKey("genealogy_persons.person_id", ondelete="CASCADE"), primary_key=True, index=True)
    properties = Column(JSON, nullable=False, default=dict)

    def to_dict(self) -> dict:
        """返回家庭成员关系的元数据。"""
        return dict(self.properties)


class FamilyChild(Base):
    """保存家庭子女、出生顺序和生育或收养等关系类型。"""

    __tablename__ = "family_children"

    family_unit_id = Column(String(128), ForeignKey("family_units.family_unit_id", ondelete="CASCADE"), primary_key=True)
    child_id = Column(String(128), ForeignKey("genealogy_persons.person_id", ondelete="CASCADE"), primary_key=True, index=True)
    properties = Column(JSON, nullable=False, default=dict)

    def to_dict(self) -> dict:
        """返回家庭子女关系的元数据。"""
        return dict(self.properties)


# --- 直接亲缘关系 --- #


class ParentChild(Base):
    """保存可用于路径查询的亲子事实，分别保留生育与收养关系。"""

    __tablename__ = "parent_child_relations"
    __table_args__ = (
        CheckConstraint("parent_id <> child_id", name="ck_parent_child_not_self"),
        CheckConstraint("relation_kind IN ('biological', 'adoptive', 'step', 'unknown')", name="ck_parent_child_kind"),
    )

    parent_id = Column(String(128), ForeignKey("genealogy_persons.person_id", ondelete="CASCADE"), primary_key=True)
    child_id = Column(String(128), ForeignKey("genealogy_persons.person_id", ondelete="CASCADE"), primary_key=True, index=True)
    relation_kind = Column(String(20), primary_key=True, default="biological")
    properties = Column(JSON, nullable=False, default=dict)

    def to_dict(self) -> dict:
        """返回亲子元数据，并明确此次亲子事实的类型。"""
        return {**self.properties, "relationKind": self.relation_kind}


class Spouse(Base):
    """保存无向配偶关系，端点按稳定字符串 ID 排序以避免反向重复。"""

    __tablename__ = "spouse_relations"
    __table_args__ = (CheckConstraint("person_a_id <> person_b_id", name="ck_spouse_not_self"),)

    person_a_id = Column(String(128), ForeignKey("genealogy_persons.person_id", ondelete="CASCADE"), primary_key=True)
    person_b_id = Column(String(128), ForeignKey("genealogy_persons.person_id", ondelete="CASCADE"), primary_key=True, index=True)
    properties = Column(JSON, nullable=False, default=dict)

    def to_dict(self) -> dict:
        """返回配偶关系的元数据。"""
        return dict(self.properties)


GRAPH_TABLES = tuple(model.__table__ for model in (
    GenealogyPerson, FamilyUnit, FamilyPartner, FamilyChild, ParentChild, Spouse,
))
