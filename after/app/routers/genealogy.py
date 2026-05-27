"""
族谱相关 API 路由
"""
import os
import uuid
import shutil
from fastapi import APIRouter, Depends, HTTPException, Query, Request, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Optional
from ..database import get_db
from ..models import Person
from ..schemas import (
    PersonCreate, 
    PersonUpdate, 
    PersonResponse, 
    FamilyTreeResponse,
    PersonProfileUpdate,
    PersonDetailResponse
)
from ..services.family_tree import get_family_tree_data
from ..models import User

router = APIRouter(prefix="/api/genealogy", tags=["族谱"])

# 上传目录
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads")
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp"}


@router.get("/persons", response_model=List[PersonResponse])
def get_persons(
    skip: int = Query(0, ge=0, description="跳过记录数"),
    limit: int = Query(100, ge=1, le=1000, description="返回记录数"),
    db: Session = Depends(get_db)
):
    """
    获取人员列表（分页）
    """
    persons = db.query(Person).offset(skip).limit(limit).all()
    return persons


@router.get("/persons/search")
async def search_persons(
    request: Request,
    db: Session = Depends(get_db)
):
    """
    根据姓名搜索人员
    """
    # 直接从查询参数获取 name
    name = request.query_params.get("name", "")
    
    # 处理空字符串
    if not name or not name.strip():
        return []
    
    persons = db.query(Person).filter(Person.name.like(f"%{name.strip()}%")).all()
    # 手动构建响应
    result = []
    for p in persons:
        result.append({
            "id": p.id,
            "name": p.name,
            "gender": p.gender,
            "birth_date": str(p.birth_date) if p.birth_date else None,
            "death_date": str(p.death_date) if p.death_date else None,
            "is_alive": p.is_alive,
            "biography": p.biography,
            "father_id": p.father_id,
            "mother_id": p.mother_id
        })
    return result


@router.get("/persons/{person_id}", response_model=PersonResponse)
def get_person(person_id: int, db: Session = Depends(get_db)):
    """
    根据ID获取单个人员信息
    """
    person = db.query(Person).filter(Person.id == person_id).first()
    if not person:
        raise HTTPException(status_code=404, detail="人员不存在")
    return person


@router.get("/persons/{person_id}/detail")
def get_person_detail(
    person_id: int, 
    user_id: Optional[int] = Query(None, description="当前登录用户ID"),
    db: Session = Depends(get_db)
):
    """
    获取人员详细信息（包含父母姓名和编辑权限）
    """
    person = db.query(Person).filter(Person.id == person_id).first()
    if not person:
        raise HTTPException(status_code=404, detail="人员不存在")
    
    # 获取父母姓名
    father_name = None
    mother_name = None
    if person.father_id:
        father = db.query(Person).filter(Person.id == person.father_id).first()
        if father:
            father_name = father.name
    if person.mother_id:
        mother = db.query(Person).filter(Person.id == person.mother_id).first()
        if mother:
            mother_name = mother.name
    
    # 计算年龄
    age = None
    if person.birth_date:
        from datetime import date
        today = date.today()
        end_date = person.death_date if person.death_date else today
        age = end_date.year - person.birth_date.year
        if (end_date.month, end_date.day) < (person.birth_date.month, person.birth_date.day):
            age -= 1
    
    # 判断是否可以编辑（管理员或本人账号）
    can_edit = False
    if user_id:
        user = db.query(User).filter(User.id == user_id).first()
        if user:
            # 管理员可以编辑所有人
            if user.is_admin:
                can_edit = True
            # 普通用户只能编辑自己关联的人员
            elif user.person_id == person_id:
                can_edit = True
    
    return {
        "id": person.id,
        "name": person.name,
        "gender": person.gender,
        "avatar": person.avatar,
        "birth_date": str(person.birth_date) if person.birth_date else None,
        "death_date": str(person.death_date) if person.death_date else None,
        "is_alive": person.is_alive,
        "age": age,
        "occupation": person.occupation,
        "address": person.address,
        "motto": person.motto,
        "achievements": person.achievements,
        "biography": person.biography,
        "father_id": person.father_id,
        "mother_id": person.mother_id,
        "father_name": father_name,
        "mother_name": mother_name,
        "can_edit": can_edit
    }


@router.put("/persons/{person_id}/profile")
def update_person_profile(
    person_id: int,
    profile: PersonProfileUpdate,
    user_id: int = Query(..., description="当前登录用户ID"),
    db: Session = Depends(get_db)
):
    """
    更新人员个人资料（名言和成就）
    只有管理员或本人账号可以编辑
    """
    person = db.query(Person).filter(Person.id == person_id).first()
    if not person:
        raise HTTPException(status_code=404, detail="人员不存在")
    
    # 验证权限
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="用户不存在")
    
    # 检查是否有权限编辑
    if not user.is_admin and user.person_id != person_id:
        raise HTTPException(status_code=403, detail="没有权限编辑此人员资料")
    
    # 更新资料
    if profile.motto is not None:
        person.motto = profile.motto
    if profile.achievements is not None:
        person.achievements = profile.achievements
    if profile.biography is not None:
        person.biography = profile.biography
    if profile.occupation is not None:
        person.occupation = profile.occupation
    if profile.address is not None:
        person.address = profile.address
    
    db.commit()
    db.refresh(person)
    
    return {
        "success": True,
        "message": "资料更新成功",
        "motto": person.motto,
        "achievements": person.achievements,
        "biography": person.biography,
        "occupation": person.occupation,
        "address": person.address
    }


@router.post("/persons", response_model=PersonResponse, status_code=201)
def create_person(person: PersonCreate, db: Session = Depends(get_db)):
    """
    创建新人员
    """
    # 验证父亲和母亲是否存在
    if person.father_id:
        father = db.query(Person).filter(Person.id == person.father_id).first()
        if not father:
            raise HTTPException(status_code=400, detail="父亲ID不存在")
    
    if person.mother_id:
        mother = db.query(Person).filter(Person.id == person.mother_id).first()
        if not mother:
            raise HTTPException(status_code=400, detail="母亲ID不存在")
    
    db_person = Person(**person.dict())
    db.add(db_person)
    db.commit()
    db.refresh(db_person)
    return db_person


@router.put("/persons/{person_id}", response_model=PersonResponse)
def update_person(
    person_id: int, 
    person_update: PersonUpdate, 
    db: Session = Depends(get_db)
):
    """
    更新人员信息
    """
    db_person = db.query(Person).filter(Person.id == person_id).first()
    if not db_person:
        raise HTTPException(status_code=404, detail="人员不存在")
    
    # 验证父亲和母亲是否存在
    if person_update.father_id is not None:
        if person_update.father_id:
            father = db.query(Person).filter(Person.id == person_update.father_id).first()
            if not father:
                raise HTTPException(status_code=400, detail="父亲ID不存在")
    
    if person_update.mother_id is not None:
        if person_update.mother_id:
            mother = db.query(Person).filter(Person.id == person_update.mother_id).first()
            if not mother:
                raise HTTPException(status_code=400, detail="母亲ID不存在")
    
    # 更新字段
    update_data = person_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_person, field, value)
    
    db.commit()
    db.refresh(db_person)
    return db_person


@router.delete("/persons/{person_id}", status_code=204)
def delete_person(person_id: int, db: Session = Depends(get_db)):
    """
    删除人员（软删除，只设置关系为NULL）
    """
    db_person = db.query(Person).filter(Person.id == person_id).first()
    if not db_person:
        raise HTTPException(status_code=404, detail="人员不存在")
    
    db.delete(db_person)
    db.commit()
    return None


@router.get("/family-tree/{person_id}", response_model=FamilyTreeResponse)
def get_family_tree(
    person_id: int,
    generations: int = Query(5, ge=1, le=10, description="向上和向下各追溯的代数"),
    db: Session = Depends(get_db)
):
    """
    获取族谱树数据（用于 G6 可视化）
    返回完整的家族树，包含所有分支
    
    - **person_id**: 中心人员ID
    - **generations**: 向上和向下各追溯的代数（默认5代，最大10代）
    """
    # 验证人员是否存在
    person = db.query(Person).filter(Person.id == person_id).first()
    if not person:
        raise HTTPException(status_code=404, detail="人员不存在")
    
    # 获取族谱树数据（包含完整分支）
    tree_data = get_family_tree_data(db, person_id, generations)
    return tree_data


@router.post("/persons/{person_id}/avatar")
async def upload_avatar(
    person_id: int,
    file: UploadFile = File(...),
    user_id: int = Query(..., description="当前登录用户ID"),
    db: Session = Depends(get_db)
):
    """
    上传人员头像
    只有管理员或本人账号可以上传
    """
    # 验证人员存在
    person = db.query(Person).filter(Person.id == person_id).first()
    if not person:
        raise HTTPException(status_code=404, detail="人员不存在")
    
    # 验证权限
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="用户不存在")
    if not user.is_admin and user.person_id != person_id:
        raise HTTPException(status_code=403, detail="没有权限上传此人员头像")
    
    # 验证文件类型
    file_ext = os.path.splitext(file.filename)[1].lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"不支持的文件格式，仅支持: {', '.join(ALLOWED_EXTENSIONS)}")
    
    # 生成唯一文件名
    unique_filename = f"{person_id}_{uuid.uuid4().hex[:8]}{file_ext}"
    file_path = os.path.join(UPLOAD_DIR, "avatars", unique_filename)
    
    # 删除旧头像
    if person.avatar:
        old_path = os.path.join(UPLOAD_DIR, person.avatar.replace("/uploads/", ""))
        if os.path.exists(old_path):
            os.remove(old_path)
    
    # 保存新头像
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # 更新数据库
    avatar_url = f"/uploads/avatars/{unique_filename}"
    person.avatar = avatar_url
    db.commit()
    
    return {
        "success": True,
        "message": "头像上传成功",
        "avatar_url": avatar_url
    }


@router.post("/persons/{person_id}/photo")
async def upload_photo(
    person_id: int,
    file: UploadFile = File(...),
    user_id: int = Query(..., description="当前登录用户ID"),
    db: Session = Depends(get_db)
):
    """
    上传人员照片（可多张）
    只有管理员或本人账号可以上传
    """
    # 验证人员存在
    person = db.query(Person).filter(Person.id == person_id).first()
    if not person:
        raise HTTPException(status_code=404, detail="人员不存在")
    
    # 验证权限
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="用户不存在")
    if not user.is_admin and user.person_id != person_id:
        raise HTTPException(status_code=403, detail="没有权限上传此人员照片")
    
    # 验证文件类型
    file_ext = os.path.splitext(file.filename)[1].lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"不支持的文件格式，仅支持: {', '.join(ALLOWED_EXTENSIONS)}")
    
    # 生成唯一文件名
    unique_filename = f"{person_id}_{uuid.uuid4().hex[:8]}{file_ext}"
    file_path = os.path.join(UPLOAD_DIR, "photos", unique_filename)
    
    # 保存照片
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    photo_url = f"/uploads/photos/{unique_filename}"
    
    return {
        "success": True,
        "message": "照片上传成功",
        "photo_url": photo_url
    }

