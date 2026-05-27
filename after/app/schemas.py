"""
Pydantic 数据验证模型
用于 API 请求和响应的数据验证
"""
from pydantic import BaseModel, Field
from datetime import date
from typing import Optional, List


class PersonBase(BaseModel):
    """人员基础信息"""
    name: str = Field(..., description="姓名")
    gender: str = Field(..., description="性别：M=男性, F=女性")
    birth_date: Optional[date] = Field(None, description="出生日期")
    death_date: Optional[date] = Field(None, description="逝世日期")
    is_alive: bool = Field(True, description="是否健在")
    occupation: Optional[str] = Field(None, description="职业")
    address: Optional[str] = Field(None, description="地址")
    motto: Optional[str] = Field(None, description="个人名言")
    achievements: Optional[str] = Field(None, description="个人成就")
    biography: Optional[str] = Field(None, description="生平简介")
    avatar: Optional[str] = Field(None, description="头像路径")


class PersonCreate(PersonBase):
    """创建人员时的数据模型"""
    father_id: Optional[int] = Field(None, description="父亲ID（可选）")
    mother_id: Optional[int] = Field(None, description="母亲ID（可选）")


class PersonUpdate(BaseModel):
    """更新人员时的数据模型（所有字段可选）"""
    name: Optional[str] = None
    gender: Optional[str] = None
    birth_date: Optional[date] = None
    death_date: Optional[date] = None
    is_alive: Optional[bool] = None
    occupation: Optional[str] = None
    address: Optional[str] = None
    motto: Optional[str] = None
    achievements: Optional[str] = None
    biography: Optional[str] = None
    avatar: Optional[str] = None
    father_id: Optional[int] = None
    mother_id: Optional[int] = None


class PersonProfileUpdate(BaseModel):
    """用户可编辑的个人资料（名言、成就、简介、职业、地址）"""
    motto: Optional[str] = None
    achievements: Optional[str] = None
    biography: Optional[str] = None
    occupation: Optional[str] = None
    address: Optional[str] = None


class PersonResponse(PersonBase):
    """返回人员信息时的数据模型"""
    id: int
    father_id: Optional[int] = None
    mother_id: Optional[int] = None
    
    class Config:
        from_attributes = True  # 允许从 ORM 对象创建


# G6 可视化数据格式
class Node(BaseModel):
    """G6 节点数据格式"""
    id: str
    label: str
    gender: Optional[str] = None
    birth_date: Optional[str] = None
    death_date: Optional[str] = None
    is_alive: Optional[bool] = None
    father_id: Optional[str] = None
    mother_id: Optional[str] = None
    occupation: Optional[str] = None
    address: Optional[str] = None
    motto: Optional[str] = None
    achievements: Optional[str] = None
    biography: Optional[str] = None
    avatar: Optional[str] = None


class Edge(BaseModel):
    """G6 边数据格式"""
    source: str
    target: str
    relation: str


class FamilyTreeResponse(BaseModel):
    """族谱树返回数据格式"""
    nodes: List[Node]
    edges: List[Edge]


# 用户相关
class UserBase(BaseModel):
    """用户基础信息"""
    username: str
    email: str
    real_name: Optional[str] = None


class UserCreate(UserBase):
    """创建用户"""
    password: str


class UserResponse(UserBase):
    """用户响应"""
    id: int
    is_admin: bool
    is_active: bool
    person_id: Optional[int] = None
    
    class Config:
        from_attributes = True


class LoginRequest(BaseModel):
    """登录请求"""
    username: str
    password: str


class LoginResponse(BaseModel):
    """登录响应"""
    success: bool
    message: str
    user: Optional[UserResponse] = None


class RegisterRequest(BaseModel):
    """注册请求"""
    username: str
    password: str
    email: str
    real_name: str = Field(..., description="真实姓名（用于关联族谱人员）")


class PersonDetailResponse(BaseModel):
    """人员详情响应（包含完整信息）"""
    id: int
    name: str
    gender: str
    avatar: Optional[str] = None
    birth_date: Optional[date] = None
    death_date: Optional[date] = None
    is_alive: bool = True
    occupation: Optional[str] = None
    address: Optional[str] = None
    motto: Optional[str] = None
    achievements: Optional[str] = None
    biography: Optional[str] = None
    father_id: Optional[int] = None
    mother_id: Optional[int] = None
    father_name: Optional[str] = None
    mother_name: Optional[str] = None
    can_edit: bool = False  # 当前用户是否可以编辑
    
    class Config:
        from_attributes = True

