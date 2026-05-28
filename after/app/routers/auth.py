"""
用户认证 API 路由
负责登录、注册审批、会话检测和演示账号初始化。
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
import hashlib
import uuid
import os

from ..database import get_db
from ..local_accounts import get_demo_accounts, get_initial_admin_account
from ..models import User, RegistrationRequest
from ..services.email_service import send_registration_approval_email, send_registration_result_email

router = APIRouter(prefix="/api/auth", tags=["认证"])

# 获取服务器地址（部署时需要修改）
SERVER_URL = os.getenv("SERVER_URL", "http://localhost:8000")


# 请求模型
class LoginRequest(BaseModel):
    username: str
    password: str


class RegisterRequest(BaseModel):
    username: str
    password: str
    email: str
    real_name: str  # 真实姓名


class UserResponse(BaseModel):
    """登录用户响应模型。"""

    id: int
    username: str
    email: str
    real_name: Optional[str] = None
    is_admin: bool
    person_id: Optional[int] = None
    
    class Config:
        from_attributes = True


def hash_password(password: str) -> str:
    """简单的密码哈希（生产环境建议使用 bcrypt）"""
    return hashlib.sha256(password.encode()).hexdigest()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """验证密码"""
    return hash_password(plain_password) == hashed_password


def serialize_user(user: User) -> dict:
    """把 User ORM 对象转换为前端安全响应。"""
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "real_name": user.real_name,
        "is_admin": user.is_admin,
        "person_id": user.person_id,
    }


@router.post("/login")
def login(request: LoginRequest, db: Session = Depends(get_db)):
    """
    用户登录
    """
    user = db.query(User).filter(User.username == request.username).first()
    
    if not user:
        raise HTTPException(status_code=401, detail="用户名或密码错误")
    
    if not verify_password(request.password, user.password):
        raise HTTPException(status_code=401, detail="用户名或密码错误")
    
    if not user.is_active:
        raise HTTPException(status_code=401, detail="账号已被禁用")
    
    return {
        "success": True,
        "user": serialize_user(user)
    }


@router.get("/me")
def get_current_user(user_id: int = Query(..., description="当前用户 ID"), db: Session = Depends(get_db)):
    """检测当前本地会话用户是否仍有效。"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="登录状态已失效，请重新登录")
    if not user.is_active:
        raise HTTPException(status_code=401, detail="账号已被禁用")
    return {"success": True, "user": serialize_user(user)}


@router.post("/register")
def register(request: RegisterRequest, db: Session = Depends(get_db)):
    """
    提交注册申请（需要管理员审批）
    """
    # 检查用户名是否已存在
    existing_user = db.query(User).filter(User.username == request.username).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="用户名已存在")
    
    # 检查邮箱是否已存在
    existing_email = db.query(User).filter(User.email == request.email).first()
    if existing_email:
        raise HTTPException(status_code=400, detail="邮箱已被注册")
    
    # 检查是否有待处理的申请
    pending_request = db.query(RegistrationRequest).filter(
        RegistrationRequest.username == request.username,
        RegistrationRequest.status == "pending"
    ).first()
    if pending_request:
        raise HTTPException(status_code=400, detail="该用户名已有待审批的申请")
    
    # 创建注册申请
    token = str(uuid.uuid4())
    reg_request = RegistrationRequest(
        username=request.username,
        password=hash_password(request.password),
        email=request.email,
        real_name=request.real_name,
        token=token,
        status="pending"
    )
    db.add(reg_request)
    db.commit()
    
    # 发送审批邮件给管理员
    approve_url = f"{SERVER_URL}/api/auth/approve/{token}"
    reject_url = f"{SERVER_URL}/api/auth/reject/{token}"
    
    send_registration_approval_email(
        username=request.username,
        user_email=request.email,
        real_name=request.real_name,
        approve_url=approve_url,
        reject_url=reject_url
    )
    
    return {
        "success": True,
        "message": "注册申请已提交，请等待管理员审批"
    }


@router.get("/approve/{token}", response_class=HTMLResponse)
def approve_registration(token: str, db: Session = Depends(get_db)):
    """
    管理员同意注册申请
    """
    reg_request = db.query(RegistrationRequest).filter(
        RegistrationRequest.token == token
    ).first()
    
    if not reg_request:
        return HTMLResponse(content="""
            <html><body style="font-family: Arial; text-align: center; padding: 50px;">
                <h2 style="color: #dc3545;">❌ 链接无效或已过期</h2>
            </body></html>
        """)
    
    if reg_request.status != "pending":
        return HTMLResponse(content=f"""
            <html><body style="font-family: Arial; text-align: center; padding: 50px;">
                <h2 style="color: #999;">此申请已处理过</h2>
                <p>状态: {reg_request.status}</p>
            </body></html>
        """)
    
    # 检查用户名是否已被占用
    existing_user = db.query(User).filter(User.username == reg_request.username).first()
    if existing_user:
        reg_request.status = "rejected"
        db.commit()
        return HTMLResponse(content="""
            <html><body style="font-family: Arial; text-align: center; padding: 50px;">
                <h2 style="color: #dc3545;">❌ 用户名已被占用</h2>
            </body></html>
        """)
    
    # 尝试根据真实姓名匹配族谱人员
    from ..models import Person
    matched_person = None
    if reg_request.real_name:
        matched_person = db.query(Person).filter(Person.name == reg_request.real_name).first()
    
    # 创建用户
    new_user = User(
        username=reg_request.username,
        password=reg_request.password,
        email=reg_request.email,
        real_name=reg_request.real_name,
        person_id=matched_person.id if matched_person else None,
        is_admin=False,
        is_active=True
    )
    db.add(new_user)
    
    # 更新申请状态
    reg_request.status = "approved"
    db.commit()
    
    # 发送通知邮件给用户
    send_registration_result_email(reg_request.email, reg_request.username, True)
    
    return HTMLResponse(content=f"""
        <html>
        <head><meta charset="utf-8"></head>
        <body style="font-family: Arial; text-align: center; padding: 50px; background: #f5f5f5;">
            <div style="max-width: 500px; margin: 0 auto; background: #fff; padding: 40px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                <h2 style="color: #28a745;">✅ 注册已批准</h2>
                <p><strong>用户名：</strong>{reg_request.username}</p>
                <p><strong>邮箱：</strong>{reg_request.email}</p>
                <p style="color: #666;">该用户现在可以登录系统了。</p>
            </div>
        </body>
        </html>
    """)


@router.get("/reject/{token}", response_class=HTMLResponse)
def reject_registration(token: str, db: Session = Depends(get_db)):
    """
    管理员拒绝注册申请
    """
    reg_request = db.query(RegistrationRequest).filter(
        RegistrationRequest.token == token
    ).first()
    
    if not reg_request:
        return HTMLResponse(content="""
            <html><body style="font-family: Arial; text-align: center; padding: 50px;">
                <h2 style="color: #dc3545;">❌ 链接无效或已过期</h2>
            </body></html>
        """)
    
    if reg_request.status != "pending":
        return HTMLResponse(content=f"""
            <html><body style="font-family: Arial; text-align: center; padding: 50px;">
                <h2 style="color: #999;">此申请已处理过</h2>
                <p>状态: {reg_request.status}</p>
            </body></html>
        """)
    
    # 更新申请状态
    reg_request.status = "rejected"
    db.commit()
    
    # 发送通知邮件给用户
    send_registration_result_email(reg_request.email, reg_request.username, False)
    
    return HTMLResponse(content=f"""
        <html>
        <head><meta charset="utf-8"></head>
        <body style="font-family: Arial; text-align: center; padding: 50px; background: #f5f5f5;">
            <div style="max-width: 500px; margin: 0 auto; background: #fff; padding: 40px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                <h2 style="color: #dc3545;">❌ 注册已拒绝</h2>
                <p><strong>用户名：</strong>{reg_request.username}</p>
                <p style="color: #666;">已通知申请人。</p>
            </div>
        </body>
        </html>
    """)


@router.get("/pending-requests")
def get_pending_requests(db: Session = Depends(get_db)):
    """
    获取待审批的注册申请（管理员用）
    """
    requests = db.query(RegistrationRequest).filter(
        RegistrationRequest.status == "pending"
    ).all()
    
    return [
        {
            "id": r.id,
            "username": r.username,
            "email": r.email,
            "real_name": r.real_name,
            "created_at": str(r.created_at) if r.created_at else None
        }
        for r in requests
    ]


@router.post("/init-admin")
def init_admin(db: Session = Depends(get_db)):
    """
    初始化管理员账号（仅在没有管理员时可用）。
    """
    existing_admin = db.query(User).filter(User.is_admin == True).first()
    if existing_admin:
        raise HTTPException(status_code=400, detail="管理员账号已存在")

    account = get_initial_admin_account()
    admin = User(
        username=account["username"],
        password=hash_password(account["password"]),
        email=account["email"],
        real_name=account["real_name"],
        is_admin=True,
        is_active=True
    )
    db.add(admin)
    db.commit()
    
    return {
        "success": True,
        "message": "管理员账号已创建",
        "username": account["username"],
    }


@router.post("/init-demo-users")
def init_demo_users(db: Session = Depends(get_db)):
    """初始化管理员与测试用户账号，重复执行会更新密码和启用状态。"""
    accounts = get_demo_accounts()

    created = []
    updated = []
    for account in accounts:
        user = db.query(User).filter(User.username == account["username"]).first()
        payload = {
            "password": hash_password(account["password"]),
            "email": account["email"],
            "real_name": account["real_name"],
            "is_admin": account["is_admin"],
            "is_active": True,
        }
        if user:
            for field, value in payload.items():
                setattr(user, field, value)
            updated.append(account["username"])
        else:
            db.add(User(username=account["username"], **payload))
            created.append(account["username"])

    db.commit()
    return {
        "success": True,
        "message": "演示账号已初始化",
        "created": created,
        "updated": updated,
        "accounts": [
            {
                "username": account["username"],
                "role": "管理员" if account["is_admin"] else "测试用户",
            }
            for account in accounts
        ],
    }

