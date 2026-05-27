"""
数据库模型定义
使用 SQLAlchemy ORM 定义数据表结构
"""
from sqlalchemy import Column, Integer, String, Date, Boolean, ForeignKey, Text, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base


class User(Base):
    """
    用户表 - 用于登录认证
    """
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False, comment="用户名")
    password = Column(String(255), nullable=False, comment="密码（哈希）")
    email = Column(String(100), unique=True, nullable=False, comment="邮箱")
    real_name = Column(String(100), nullable=True, comment="真实姓名")
    person_id = Column(Integer, ForeignKey('persons.id', ondelete='SET NULL'), nullable=True, comment="关联的族谱人员ID")
    is_admin = Column(Boolean, default=False, comment="是否管理员")
    is_active = Column(Boolean, default=True, comment="是否激活")
    created_at = Column(DateTime, server_default=func.now(), comment="创建时间")
    
    # 关联的族谱人员
    person = relationship("Person", backref="user_account")
    
    def __repr__(self):
        return f"<User(id={self.id}, username='{self.username}', real_name='{self.real_name}')>"


class RegistrationRequest(Base):
    """
    注册申请表 - 等待管理员审批
    """
    __tablename__ = "registration_requests"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), nullable=False, comment="申请用户名")
    password = Column(String(255), nullable=False, comment="密码（哈希）")
    email = Column(String(100), nullable=False, comment="邮箱")
    real_name = Column(String(100), nullable=True, comment="真实姓名")
    status = Column(String(20), default="pending", comment="状态: pending/approved/rejected")
    token = Column(String(100), unique=True, nullable=False, comment="审批令牌")
    created_at = Column(DateTime, server_default=func.now(), comment="申请时间")
    
    def __repr__(self):
        return f"<RegistrationRequest(id={self.id}, username='{self.username}', real_name='{self.real_name}')>"


class Person(Base):
    """
    家族成员表
    使用自引用外键实现父子关系
    """
    __tablename__ = "persons"
    
    # 主键
    id = Column(Integer, primary_key=True, index=True, comment="主键ID")
    
    # 1. 基础信息
    name = Column(String(100), nullable=False, comment="姓名")
    gender = Column(String(1), nullable=False, comment="性别：M=男性, F=女性")
    avatar = Column(String(255), nullable=True, comment="头像路径")
    
    # 2. 生平信息
    birth_date = Column(Date, nullable=True, comment="出生日期")
    death_date = Column(Date, nullable=True, comment="逝世日期")
    is_alive = Column(Boolean, default=True, comment="是否健在")
    
    # 3. 扩展信息
    occupation = Column(String(100), nullable=True, comment="职业")
    address = Column(String(255), nullable=True, comment="地址")
    motto = Column(Text, nullable=True, comment="个人名言")
    achievements = Column(Text, nullable=True, comment="个人成就")
    
    # 4. 核心关系 (自引用)
    # 父亲指向另一个Person对象。ondelete='SET NULL' 意味着如果父亲的记录被删了，孩子记录还在，只是父亲字段变空。
    father_id = Column(
        Integer, 
        ForeignKey('persons.id', ondelete='SET NULL'), 
        nullable=True, 
        comment="父亲ID"
    )
    mother_id = Column(
        Integer, 
        ForeignKey('persons.id', ondelete='SET NULL'), 
        nullable=True, 
        comment="母亲ID"
    )
    
    # 关系定义（用于在代码中访问关联对象）
    father = relationship(
        "Person", 
        remote_side=[id], 
        foreign_keys=[father_id], 
        backref="children_father"
    )
    mother = relationship(
        "Person", 
        remote_side=[id], 
        foreign_keys=[mother_id], 
        backref="children_mother"
    )
    
    # 5. 其它信息
    biography = Column(Text, nullable=True, comment="生平简介")
    
    # 6. 时间戳
    created_at = Column(Date, server_default=func.now(), comment="创建时间")
    updated_at = Column(Date, server_default=func.now(), onupdate=func.now(), comment="更新时间")
    
    def __repr__(self):
        return f"<Person(id={self.id}, name='{self.name}', gender='{self.gender}')>"

