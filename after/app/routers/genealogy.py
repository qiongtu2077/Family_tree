"""旧族谱 API 适配层，所有接口共用统一人物和亲缘关系数据。"""
from __future__ import annotations

from datetime import date
from pathlib import Path
import shutil
import uuid
from typing import Any

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import User
from ..security import require_admin, require_user
from ..repositories.person_repository import PersonRepository
from ..schemas import FamilyTreeResponse, PersonCreate, PersonProfileUpdate, PersonResponse, PersonUpdate
from ..services.family_tree import (
    PERSON_FIELD_NAMES,
    get_family_tree_data,
    get_parent_links,
    serialize_person,
)

router = APIRouter(prefix="/api/genealogy", tags=["族谱"], dependencies=[Depends(require_user)])
UPLOAD_DIR = Path(__file__).resolve().parents[2] / "uploads"
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp"}


# --- 人物读取 --- #


@router.get("/persons", response_model=list[PersonResponse])
def get_persons(
    skip: int = Query(0, ge=0, description="跳过记录数"),
    limit: int = Query(100, ge=1, le=1000, description="返回记录数"),
    db: Session = Depends(get_db),
):
    """分页读取统一人物表，并返回旧客户端字段。"""
    return _serialize_people(db, PersonRepository(db).list_persons(skip, limit))


@router.get("/persons/search")
def search_persons(name: str = Query(""), db: Session = Depends(get_db)):
    """按姓名搜索统一人物表，空关键词返回空列表。"""
    keyword = name.strip()
    if not keyword:
        return []
    return _serialize_people(db, PersonRepository(db).search_persons(keyword))


@router.get("/persons/{person_id}", response_model=PersonResponse)
def get_person(person_id: str, db: Session = Depends(get_db)):
    """根据稳定字符串 ID 读取人物及生父母字段。"""
    return _serialize_people(db, [_get_person_or_404(db, person_id)])[0]


@router.get("/persons/{person_id}/detail")
def get_person_detail(
    person_id: str,
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
):
    """读取人物详情、所有父母事实、照片、年龄和资料编辑权限。"""
    person = _serialize_people(db, [_get_person_or_404(db, person_id)])[0]
    age = None
    if person["birth_date"]:
        birth_date = date.fromisoformat(person["birth_date"])
        end_date = date.fromisoformat(person["death_date"]) if person["death_date"] else date.today()
        age = end_date.year - birth_date.year - ((end_date.month, end_date.day) < (birth_date.month, birth_date.day))
    return {
        **person,
        "age": age,
        "can_edit": bool(user and user.is_active and (user.is_admin or user.person_id == person_id)),
    }


# --- 人物与个人资料写入 --- #


@router.post("/persons", response_model=PersonResponse, status_code=201, dependencies=[Depends(require_admin)])
def create_person(person: PersonCreate, db: Session = Depends(get_db)):
    """在统一人物表创建记录；父母关系交由正式关系接口维护。"""
    payload = person.model_dump()
    _validate_parent_fields(payload, [])
    created = PersonRepository(db).create_person(_person_properties(payload))
    return _serialize_people(db, [created])[0]


@router.put("/persons/{person_id}", response_model=PersonResponse, dependencies=[Depends(require_admin)])
def update_person(person_id: str, person_update: PersonUpdate, db: Session = Depends(get_db)):
    """更新统一人物资料，拒绝通过旧单值字段改写家庭关系。"""
    _get_person_or_404(db, person_id)
    payload = person_update.model_dump(exclude_unset=True)
    links = get_parent_links(db, [person_id])[person_id]
    _validate_parent_fields(payload, links)
    updated = PersonRepository(db).update_person(person_id, _person_properties(payload))
    return _serialize_people(db, [updated])[0]


@router.delete("/persons/{person_id}", status_code=204, dependencies=[Depends(require_admin)])
def delete_person(person_id: str, db: Session = Depends(get_db)):
    """删除统一人物及关联关系，上传文件保留在原目录。"""
    if not PersonRepository(db).delete_person(person_id):
        raise HTTPException(status_code=404, detail="人员不存在")
    return None


@router.put("/persons/{person_id}/profile")
def update_person_profile(
    person_id: str,
    profile: PersonProfileUpdate,
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
):
    """管理员或本人账号更新个人资料，显式 null 可清空可选字段。"""
    _get_person_or_404(db, person_id)
    _require_edit_permission(user, person_id)
    updated = PersonRepository(db).update_person(person_id, profile.model_dump(exclude_unset=True))
    return {
        "success": True,
        "message": "资料更新成功",
        **{field: updated.get(field) for field in PersonProfileUpdate.model_fields},
    }


# --- 族谱树与图片 --- #


@router.get("/family-tree/{person_id}", response_model=FamilyTreeResponse)
def get_family_tree(
    person_id: str,
    generations: int = Query(5, ge=1, le=10, description="向上和向下各追溯的代数"),
    db: Session = Depends(get_db),
):
    """基于统一关系表返回旧客户端使用的人物树数据。"""
    _get_person_or_404(db, person_id)
    return get_family_tree_data(db, person_id, generations)


@router.post("/persons/{person_id}/avatar")
def upload_avatar(
    person_id: str,
    file: UploadFile = File(...),
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
):
    """保存 UUID 文件名的头像，并更新统一人物资料，保留旧文件。"""
    _get_person_or_404(db, person_id)
    _require_edit_permission(user, person_id)
    avatar_url = _save_image(file, "avatars")
    PersonRepository(db).update_person(person_id, {"avatar": avatar_url})
    return {"success": True, "message": "头像上传成功", "avatar_url": avatar_url}


@router.post("/persons/{person_id}/photo")
def upload_photo(
    person_id: str,
    file: UploadFile = File(...),
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
):
    """保存照片，并把照片 URL 追加到统一人物资料的照片列表。"""
    person = _get_person_or_404(db, person_id)
    _require_edit_permission(user, person_id)
    photo_url = _save_image(file, "photos")
    PersonRepository(db).update_person(person_id, {"photos": [*person.get("photos", []), photo_url]})
    return {"success": True, "message": "照片上传成功", "photo_url": photo_url}


# --- 字段适配与权限 --- #


def _get_person_or_404(db: Session, person_id: str) -> dict[str, Any]:
    """读取统一人物，不存在时返回明确的 HTTP 404。"""
    person = PersonRepository(db).get_person(person_id)
    if person is None:
        raise HTTPException(status_code=404, detail="人员不存在")
    return person


def _serialize_people(db: Session, people: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """批量补齐父母事实，避免列表接口逐个人物查询。"""
    links = get_parent_links(db, [person["personId"] for person in people])
    return [serialize_person(person, links[person["personId"]]) for person in people]


def _person_properties(payload: dict[str, Any]) -> dict[str, Any]:
    """转换旧字段名，禁止必需资料字段通过 null 静默失效。"""
    for field in ("name", "gender", "is_alive"):
        if field in payload and payload[field] is None:
            raise HTTPException(status_code=422, detail=f"{field} 不能为空")
    return {
        PERSON_FIELD_NAMES.get(field, field): value
        for field, value in payload.items() if field not in {"father_id", "mother_id"}
    }


def _validate_parent_fields(payload: dict[str, Any], links: list[dict[str, Any]]) -> None:
    """旧父母字段只允许原值回传，任何关系变更均明确交给正式关系接口。"""
    for side in ("father", "mother"):
        field = f"{side}_id"
        if field not in payload:
            continue
        existing_ids = {link["parent_id"] for link in links
                        if link["side"] == side and link["relation_kind"] == "biological"}
        unchanged = (not existing_ids and payload[field] is None) or existing_ids == {payload[field]}
        if not unchanged:
            raise HTTPException(
                status_code=409,
                detail=f"请通过 /api/relationships 维护{field}，旧人物接口不能改写或清空家庭关系",
            )


def _require_edit_permission(user: User, person_id: str) -> None:
    """只按已认证的会话账号检查管理员或本人资料权限。"""
    if not user.is_active:
        raise HTTPException(status_code=401, detail="用户不存在或账号已被禁用")
    if not user.is_admin and user.person_id != person_id:
        raise HTTPException(status_code=403, detail="没有权限编辑此人员资料")


def _save_image(file: UploadFile, folder: str) -> str:
    """校验图片扩展名，并使用不含人物 ID 的 UUID 安全文件名保存。"""
    extension = Path(file.filename or "").suffix.lower()
    if extension not in ALLOWED_EXTENSIONS:
        allowed = ", ".join(sorted(ALLOWED_EXTENSIONS))
        raise HTTPException(status_code=400, detail=f"不支持的文件格式，仅支持: {allowed}")
    target_dir = UPLOAD_DIR / folder
    target_dir.mkdir(parents=True, exist_ok=True)
    filename = f"{uuid.uuid4().hex}{extension}"
    with (target_dir / filename).open("xb") as output:
        shutil.copyfileobj(file.file, output)
    return f"/uploads/{folder}/{filename}"
