"""认证、服务端会话、注册申请和管理员审批接口。"""
from __future__ import annotations

from html import escape
import secrets
from typing import Annotated
from urllib.parse import quote

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from fastapi.responses import HTMLResponse
from pydantic import BaseModel, Field, StringConstraints
from sqlalchemy import or_
from sqlalchemy.orm import Session

from ..config import get_settings
from ..database import get_db
from ..graph_models import GenealogyPerson
from ..local_accounts import get_demo_accounts, get_initial_admin_account
from ..models import RegistrationRequest, User
from ..security import create_session, hash_password, require_admin, require_user, revoke_session, verify_password
from ..services.email_service import send_registration_approval_email, send_registration_result_email

router = APIRouter(prefix="/api/auth", tags=["认证"])
SERVER_URL = get_settings().server_url.rstrip("/")


# --- 请求契约及公开用户信息 --- #


class LoginRequest(BaseModel):
    """登录凭据，保留旧账号密码的验证能力。"""

    username: str = Field(min_length=1, max_length=50)
    password: str = Field(min_length=1, max_length=128)


class RegisterRequest(BaseModel):
    """新账号注册资料。"""

    username: Annotated[str, StringConstraints(strip_whitespace=True)] = Field(min_length=1, max_length=50)
    password: str = Field(min_length=8, max_length=128)
    email: Annotated[str, StringConstraints(strip_whitespace=True)] = Field(min_length=3, max_length=100, pattern=r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
    real_name: Annotated[str, StringConstraints(strip_whitespace=True)] = Field(min_length=1, max_length=100)


def serialize_user(user: User) -> dict:
    """返回安全用户信息，永不暴露密码或会话凭据。"""
    return {"id": user.id, "username": user.username, "email": user.email,
            "real_name": user.real_name, "is_admin": user.is_admin, "person_id": user.person_id}


# --- 登录、恢复与退出 --- #


@router.post("/login")
def login(request: LoginRequest, http_request: Request, response: Response, db: Session = Depends(get_db)):
    """验证账号后创建服务端会话，成功登录时升级历史 SHA256 密码。"""
    user = db.query(User).filter(User.username == request.username).first()
    if user is None or not verify_password(request.password, user.password):
        raise HTTPException(status_code=401, detail="用户名或密码错误")
    if not user.is_active:
        raise HTTPException(status_code=401, detail="账号已被禁用")
    if not user.password.startswith("pbkdf2_sha256$"):
        user.password = hash_password(request.password)
    create_session(db, user, http_request, response)
    return {"success": True, "user": serialize_user(user)}


@router.get("/me")
def get_current_user(user: User = Depends(require_user)):
    """返回当前用户及登录模式，供页面决定直接进入或显示登录页。"""
    return {"success": True, "user": serialize_user(user), "auth_enabled": get_settings().auth_enabled}


@router.post("/logout")
def logout(request: Request, response: Response, db: Session = Depends(get_db)):
    """即使会话已过期，也允许清除当前浏览器的会话。"""
    revoke_session(db, request, response)
    return {"success": True, "message": "已退出登录"}


# --- 注册及两种审批入口 --- #


@router.post("/register")
def register(request: RegisterRequest, db: Session = Depends(get_db)):
    """保存注册申请并通知管理员，账号只有审批后才创建。"""
    if db.query(User).filter(or_(User.username == request.username, User.email == request.email)).first():
        raise HTTPException(status_code=400, detail="用户名或邮箱已被注册")
    if db.query(RegistrationRequest).filter(RegistrationRequest.status == "pending", or_(
        RegistrationRequest.username == request.username, RegistrationRequest.email == request.email
    )).first():
        raise HTTPException(status_code=400, detail="该用户名或邮箱已有待审批的申请")
    token = secrets.token_urlsafe(32)
    pending = RegistrationRequest(username=request.username, password=hash_password(request.password),
                                  email=request.email, real_name=request.real_name, token=token, status="pending")
    db.add(pending)
    db.commit()
    send_registration_approval_email(username=request.username, user_email=request.email, real_name=request.real_name,
                                     approve_url=f"{SERVER_URL}/api/auth/approve/{token}", reject_url=f"{SERVER_URL}/api/auth/reject/{token}")
    return {"success": True, "message": "注册申请已提交，请等待管理员审批。审核通过后即可登录。"}


@router.get("/pending-requests", dependencies=[Depends(require_admin)])
def get_pending_requests(db: Session = Depends(get_db)):
    """管理员查看待审批申请，返回资料不包含密码和邮件授权凭据。"""
    requests = db.query(RegistrationRequest).filter(RegistrationRequest.status == "pending").order_by(RegistrationRequest.created_at, RegistrationRequest.id).all()
    return [{"id": item.id, "username": item.username, "email": item.email,
             "real_name": item.real_name, "created_at": item.created_at.isoformat() if item.created_at else None} for item in requests]


@router.post("/requests/{request_id}/approve", dependencies=[Depends(require_admin)])
def approve_request(request_id: int, db: Session = Depends(get_db)):
    """管理员在应用内批准申请。"""
    pending = _get_registration(db, request_id)
    _process_registration(db, pending, True)
    return {"success": True, "message": "已批准注册，申请人可以登录。"}


@router.post("/requests/{request_id}/reject", dependencies=[Depends(require_admin)])
def reject_request(request_id: int, db: Session = Depends(get_db)):
    """管理员在应用内拒绝申请。"""
    pending = _get_registration(db, request_id)
    _process_registration(db, pending, False)
    return {"success": True, "message": "已拒绝此注册申请。"}


@router.get("/approve/{token}", response_class=HTMLResponse)
def approve_registration(token: str, db: Session = Depends(get_db)):
    """显示邮件批准确认页，预览或安全扫描链接不会创建账号。"""
    return _email_registration_confirmation(db, token, True)


@router.get("/reject/{token}", response_class=HTMLResponse)
def reject_registration(token: str, db: Session = Depends(get_db)):
    """显示邮件拒绝确认页，只有提交确认后才修改申请。"""
    return _email_registration_confirmation(db, token, False)


@router.post("/approve/{token}", response_class=HTMLResponse)
def confirm_email_approval(token: str, db: Session = Depends(get_db)):
    """管理员使用随机邮件凭据明确确认批准。"""
    return _process_email_registration(db, token, True)


@router.post("/reject/{token}", response_class=HTMLResponse)
def confirm_email_rejection(token: str, db: Session = Depends(get_db)):
    """管理员使用随机邮件凭据明确确认拒绝。"""
    return _process_email_registration(db, token, False)


def _get_registration(db: Session, request_id: int) -> RegistrationRequest:
    """读取并锁定待处理申请，避免两位管理员重复创建账号。"""
    pending = db.query(RegistrationRequest).filter(RegistrationRequest.id == request_id).with_for_update().first()
    if pending is None:
        raise HTTPException(status_code=404, detail="注册申请不存在")
    return pending


def _process_registration(db: Session, pending: RegistrationRequest, approved: bool) -> None:
    """共用审批事务，并仅在姓名唯一匹配时绑定族谱人物。"""
    if pending.status != "pending":
        raise HTTPException(status_code=409, detail="此申请已经处理，请刷新列表")
    if approved:
        if db.query(User).filter(or_(User.username == pending.username, User.email == pending.email)).first():
            raise HTTPException(status_code=409, detail="用户名或邮箱已被占用，无法批准")
        matches = db.query(GenealogyPerson).filter(GenealogyPerson.name == pending.real_name).limit(2).all()
        person_id = matches[0].person_id if len(matches) == 1 else None
        db.add(User(username=pending.username, password=pending.password, email=pending.email,
                    real_name=pending.real_name, person_id=person_id, is_admin=False, is_active=True))
    pending.status = "approved" if approved else "rejected"
    db.commit()
    send_registration_result_email(pending.email, pending.username, approved)


def _email_registration_confirmation(db: Session, token: str, approved: bool) -> HTMLResponse:
    """读取邮件授权申请，并用同源 POST 表单呈现待确认操作。"""
    pending = db.query(RegistrationRequest).filter(RegistrationRequest.token == token).first()
    if pending is None:
        return _approval_page("链接无效", "此审批链接不存在。", 404)
    if pending.status != "pending":
        return _approval_page("申请已处理", "此申请已经处理，无需重复操作。", 409)
    action = "approve" if approved else "reject"
    title = "确认批准注册" if approved else "确认拒绝注册"
    message = f"账号：{pending.username}；真实姓名：{pending.real_name}；邮箱：{pending.email}。请核对申请资料后确认。"
    return _approval_page(title, message, action_url=f"/api/auth/{action}/{quote(token, safe='')}")


def _process_email_registration(db: Session, token: str, approved: bool) -> HTMLResponse:
    """以随机邮件凭据定位申请，并输出转义后的审批结果页。"""
    pending = db.query(RegistrationRequest).filter(RegistrationRequest.token == token).with_for_update().first()
    if pending is None:
        return _approval_page("链接无效", "此审批链接不存在。", 404)
    try:
        _process_registration(db, pending, approved)
    except HTTPException as error:
        return _approval_page("申请未处理", error.detail, error.status_code)
    title = "注册已批准" if approved else "注册已拒绝"
    return _approval_page(title, f"申请账号：{pending.username}。审批结果已记录。")


def _approval_page(title: str, message: str, status_code: int = 200, action_url: str | None = None) -> HTMLResponse:
    """转义邮件审批资料，并在确认页提供明确的 POST 提交按钮。"""
    form = (f'<form method="post" action="{escape(action_url, quote=True)}"><button type="submit" style="padding:12px 18px;border:0;border-radius:8px;background:#203b32;color:white">确认操作</button></form>'
            if action_url else "")
    return HTMLResponse(f'<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><body style="font-family:sans-serif;background:#f6f4ef;color:#203b32;padding:40px"><main style="max-width:520px;margin:40px auto;background:white;padding:30px;border-radius:16px"><h2>{escape(title)}</h2><p>{escape(message)}</p>{form}</main></body></html>', status_code=status_code,
                        headers={"Cache-Control": "no-store", "Referrer-Policy": "no-referrer"})


# --- 显式初始化入口 --- #


@router.post("/init-admin")
def init_admin(db: Session = Depends(get_db)):
    """只有系统尚无管理员时，才能从本地受保护配置初始化管理员。"""
    if db.query(User).filter(User.is_admin.is_(True)).first():
        raise HTTPException(status_code=403, detail="管理员已存在，初始化入口已关闭")
    account = get_initial_admin_account()
    db.add(User(username=account["username"], password=hash_password(account["password"]), email=account["email"],
                real_name=account["real_name"], is_admin=True, is_active=True))
    db.commit()
    return {"success": True, "message": "管理员账号已创建", "username": account["username"]}


@router.post("/init-demo-users", dependencies=[Depends(require_admin)])
def init_demo_users(db: Session = Depends(get_db)):
    """管理员显式初始化演示账号，保留数据库参数供已有初始化工具调用。"""
    accounts = get_demo_accounts()
    created, updated = [], []
    for account in accounts:
        user = db.query(User).filter(User.username == account["username"]).first()
        payload = {"password": hash_password(account["password"]), "email": account["email"],
                   "real_name": account["real_name"], "is_admin": account["is_admin"], "is_active": True}
        if user:
            for field, value in payload.items():
                setattr(user, field, value)
            updated.append(account["username"])
        else:
            db.add(User(username=account["username"], **payload))
            created.append(account["username"])
    db.commit()
    return {"success": True, "message": "演示账号已初始化", "created": created, "updated": updated,
            "accounts": [{"username": account["username"], "role": "管理员" if account["is_admin"] else "测试用户"} for account in accounts]}
