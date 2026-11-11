"""与族谱共用 PostgreSQL 的账号及注册审批模型。"""
from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import relationship

from .database import Base
from .graph_models import GenealogyPerson


class User(Base):
    """登录账号，绑定统一族谱中的稳定人物 ID。"""

    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    username = Column(String(50), unique=True, nullable=False)
    password = Column(String(255), nullable=False)
    email = Column(String(100), unique=True, nullable=False)
    real_name = Column(String(100))
    person_id = Column(String(255), ForeignKey("genealogy_persons.person_id", ondelete="SET NULL"))
    is_admin = Column(Boolean, default=False, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    person = relationship(GenealogyPerson)


class RegistrationRequest(Base):
    """保存待审批的注册申请。"""

    __tablename__ = "registration_requests"

    id = Column(Integer, primary_key=True)
    username = Column(String(50), nullable=False)
    password = Column(String(255), nullable=False)
    email = Column(String(100), nullable=False)
    real_name = Column(String(100))
    status = Column(String(20), default="pending", nullable=False)
    token = Column(String(100), unique=True, nullable=False)
    created_at = Column(DateTime, server_default=func.now())
