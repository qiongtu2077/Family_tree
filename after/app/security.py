"""基于服务端会话的认证、角色校验及密码散列。"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
import hashlib
import hmac
import secrets

from fastapi import Depends, HTTPException, Request, Response
from sqlalchemy import Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Session

from .database import Base, get_db
from .models import User

SESSION_COOKIE = "familytree_session"
SESSION_SECONDS = 12 * 60 * 60
PASSWORD_ITERATIONS = 600_000


class UserSession(Base):
    """仅保存会话凭据的不可逆散列，原始随机凭据只写入浏览器 Cookie。"""

    __tablename__ = "user_sessions"
    token_hash = Column(String(64), primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    expires_at = Column(DateTime, nullable=False, index=True)


# --- 密码存储与旧密码升级 --- #


def hash_password(password: str) -> str:
    """使用随机盐和 PBKDF2-HMAC-SHA256 生成带参数的密码散列。"""
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(salt), PASSWORD_ITERATIONS).hex()
    return f"pbkdf2_sha256${PASSWORD_ITERATIONS}${salt}${digest}"


def verify_password(password: str, stored: str) -> bool:
    """校验新散列或历史 SHA256，历史值只用于成功登录时迁移。"""
    if "$" not in stored:
        return hmac.compare_digest(hashlib.sha256(password.encode()).hexdigest(), stored)
    try:
        algorithm, iterations, salt, expected = stored.split("$")
        if algorithm != "pbkdf2_sha256" or int(iterations) != PASSWORD_ITERATIONS:
            return False
        actual = hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(salt), int(iterations)).hex()
        return hmac.compare_digest(actual, expected)
    except ValueError:
        return False


# --- 会话生命周期与请求权限 --- #


def utc_now() -> datetime:
    """返回不带时区的 UTC 时间，与数据库 DateTime 列一致。"""
    return datetime.now(timezone.utc).replace(tzinfo=None)


def session_hash(token: str) -> str:
    """计算随机会话凭据的数据库索引值。"""
    return hashlib.sha256(token.encode()).hexdigest()


def create_session(db: Session, user: User, request: Request, response: Response) -> None:
    """旋转当前浏览器会话并设置十二小时 HttpOnly Cookie，同时清理过期记录。"""
    now = utc_now()
    db.query(UserSession).filter(UserSession.expires_at <= now).delete(synchronize_session=False)
    previous_token = request.cookies.get(SESSION_COOKIE)
    if previous_token:
        # 同一浏览器重新登录会替换旧凭据，退出后不能继续使用其历史 Cookie。
        db.query(UserSession).filter(UserSession.token_hash == session_hash(previous_token)).delete(synchronize_session=False)
    token = secrets.token_urlsafe(32)
    db.add(UserSession(token_hash=session_hash(token), user_id=user.id, expires_at=now + timedelta(seconds=SESSION_SECONDS)))
    db.commit()
    response.set_cookie(SESSION_COOKIE, token, max_age=SESSION_SECONDS, httponly=True,
                        secure=request.url.scheme == "https", samesite="lax", path="/api")


def revoke_session(db: Session, request: Request, response: Response) -> None:
    """注销当前浏览器会话，并同时清除浏览器 Cookie。"""
    token = request.cookies.get(SESSION_COOKIE)
    if token:
        db.query(UserSession).filter(UserSession.token_hash == session_hash(token)).delete(synchronize_session=False)
        db.commit()
    response.delete_cookie(SESSION_COOKIE, path="/api", httponly=True, samesite="lax")


def require_user(request: Request, db: Session = Depends(get_db)) -> User:
    """根据 Cookie 查验服务端会话及账号状态，拒绝伪造用户编号。"""
    token = request.cookies.get(SESSION_COOKIE)
    session = db.get(UserSession, session_hash(token)) if token else None
    if session is None or session.expires_at <= utc_now():
        raise HTTPException(status_code=401, detail="登录状态已过期，请重新登录")
    user = db.get(User, session.user_id)
    if user is None or not user.is_active:
        raise HTTPException(status_code=401, detail="账号已被禁用或登录状态已失效")
    return user


def require_admin(user: User = Depends(require_user)) -> User:
    """只有有效管理员会话才能修改族谱或处理管理事务。"""
    if not user.is_admin:
        raise HTTPException(status_code=403, detail="此操作需要管理员权限")
    return user
