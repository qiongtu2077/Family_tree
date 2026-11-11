"""将只读旧数据快照导入空的 PostgreSQL 数据库。"""
from datetime import datetime

from sqlalchemy import func, select, text

from ..graph_models import FamilyUnit, GenealogyPerson
from ..models import RegistrationRequest, User
from ..repositories.person_repository import PersonRepository


class MigrationService:
    """在调用者事务内迁移人物、关系、账号和审批记录。"""

    def __init__(self, repository: PersonRepository):
        """保存目标仓库和同一事务的数据库会话。"""
        self.repository = repository
        self.session = repository.session

    def import_snapshot(self, snapshot: dict) -> dict:
        """导入明确版本的完整快照，拒绝覆盖已有目标数据。"""
        if snapshot.get("format_version") != 1:
            raise ValueError("不支持的迁移快照版本")
        for model in (GenealogyPerson, FamilyUnit, User, RegistrationRequest):
            if self.session.scalar(select(func.count()).select_from(model)):
                raise ValueError("目标数据库已有数据，请使用空数据库导入；不会覆盖现有记录")

        for person in snapshot["persons"]:
            self.repository.create_person(person)
            _restore_timestamps(self.session.get(GenealogyPerson, person["personId"]), person)
        for unit in snapshot["family_units"]:
            self.repository.create_or_update_family_unit(unit)
            _restore_timestamps(self.session.get(FamilyUnit, unit["familyUnitId"]), unit)

        # 先恢复家庭成员，再恢复直接关系；仓库同步维护派生亲子关系。
        relationships = snapshot["relationships"]
        for kind in ("PARTNER_IN", "HAS_CHILD", "PARENT_OF", "SPOUSE_OF"):
            for relation in relationships:
                if relation["type"] != kind:
                    continue
                source, target, props = relation["source"], relation["target"], relation["properties"]
                if kind == "PARTNER_IN":
                    self.repository.add_partner_to_family_unit(source, target, props)
                elif kind == "HAS_CHILD":
                    self.repository.add_child_to_family_unit(target, source, props)
                elif kind == "PARENT_OF":
                    self.repository.add_parent_child_relation(source, target, props)
                else:
                    self.repository.add_spouse_relation(source, target, props)
        unknown_types = {rel["type"] for rel in relationships} - {"PARTNER_IN", "HAS_CHILD", "PARENT_OF", "SPOUSE_OF"}
        if unknown_types:
            raise ValueError(f"快照包含未定义关系类型：{sorted(unknown_types)}")

        for account in snapshot["users"]:
            data = dict(account)
            data["created_at"] = _parse_datetime(data.get("created_at"))
            if data.get("person_id") and not self.repository.get_person(data["person_id"]):
                raise ValueError(f"账号 {data['id']} 绑定人物不存在，已中止迁移")
            self.session.add(User(**data))
        for approval in snapshot["registration_requests"]:
            data = dict(approval)
            data["created_at"] = _parse_datetime(data.get("created_at"))
            self.session.add(RegistrationRequest(**data))
        self.session.flush()

        # 导入时保留原账号 ID，随后校准 PostgreSQL 自增序列避免新注册撞号。
        if self.session.bind.dialect.name == "postgresql":
            connection = self.session.connection()
            schema = connection.get_execution_options().get("schema_translate_map", {}).get(None)
            schema = schema or self.session.scalar(text("SELECT current_schema()"))
            quote_identifier = connection.dialect.identifier_preparer.quote_identifier
            for model in (User, RegistrationRequest):
                next_id = (self.session.scalar(select(func.max(model.id))) or 0) + 1
                self.session.execute(text("SELECT setval(pg_get_serial_sequence(:table_name, 'id'), :next_id, false)"),
                                     {"table_name": f"{quote_identifier(schema)}.{quote_identifier(model.__tablename__)}", "next_id": next_id})
        return {"people": len(snapshot["persons"]), "family_units": len(snapshot["family_units"]),
                "source_relationships": len(relationships), "users": len(snapshot["users"]),
                "registration_requests": len(snapshot["registration_requests"])}


def _parse_datetime(value):
    """解析旧 SQLAlchemy 和 Neo4j 快照中的 ISO 时间。"""
    return datetime.fromisoformat(value) if value else None


def _restore_timestamps(entity, properties):
    """保留源图人物及家庭的原创建与修改时间。"""
    for column, key in (("created_at", "createdAt"), ("updated_at", "updatedAt")):
        if properties.get(key):
            setattr(entity, column, _parse_datetime(properties[key]))
