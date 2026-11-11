"""用真实数据库 Session 验证重建演示族谱时的账号绑定和事务。"""
import pytest
from sqlalchemy import func, select

from app.graph_models import GenealogyPerson
from app.models import User
from app.repositories.person_repository import PersonRepository
from app.services.seed_service import SeedService


def test_reseed_preserves_account_bindings_and_non_demo_people(repository_session):
    """重复初始化保留现存演示绑定和非演示数据，并清除已移除人物的绑定。"""
    db = repository_session
    db.autoflush = False
    repository = PersonRepository(db)
    service = SeedService(repository)
    service.seed_demo_family()
    repository.create_person({"personId": "family:kept", "name": "真实族人", "photos": ["/uploads/kept.jpg"]})
    repository.create_person({"personId": "demo:retired", "name": "已移出演示集"})
    demo_user = User(username="demo-binding", password="test", email="demo@example.invalid", person_id="demo:child")
    family_user = User(username="family-binding", password="test", email="family@example.invalid", person_id="family:kept")
    retired_user = User(username="retired-binding", password="test", email="retired@example.invalid", person_id="demo:retired")
    db.add_all([demo_user, family_user, retired_user])
    db.flush()
    demo_id, family_id, retired_id = demo_user.id, family_user.id, retired_user.id
    db.commit()

    result = service.seed_demo_family()
    db.flush()
    db.expire_all()

    assert result == {"people": 44, "family_units": 16}
    assert db.get(User, demo_id).person_id == "demo:child"
    assert db.get(User, family_id).person_id == "family:kept"
    assert db.get(User, retired_id).person_id is None
    assert repository.get_person("family:kept")["photos"] == ["/uploads/kept.jpg"]
    assert db.scalar(select(func.count()).select_from(GenealogyPerson)) == 45


def test_failed_reseed_can_rollback_people_and_account_bindings(repository_session, monkeypatch):
    """清理后的初始化失败时，外层回滚同时恢复人物和外键绑定。"""
    db = repository_session
    repository = PersonRepository(db)
    service = SeedService(repository)
    service.seed_demo_family()
    user = User(username="rollback-binding", password="test", email="rollback@example.invalid", person_id="demo:child")
    db.add(user)
    db.flush()
    user_id = user.id
    db.commit()

    def fail_create(_payload):
        """模拟清理完毕后的初始化中断。"""
        raise RuntimeError("模拟重建失败")

    monkeypatch.setattr(repository, "create_person", fail_create)
    with pytest.raises(RuntimeError, match="模拟重建失败"):
        service.seed_demo_family()
    db.rollback()

    assert db.get(User, user_id).person_id == "demo:child"
    assert repository.get_person("demo:child") is not None
    assert db.scalar(select(func.count()).select_from(GenealogyPerson)) == 44
