"""验证首拼搜索的匹配规则、限量时机、改名和响应模型契约。"""
import pytest

from app.graph_schemas import GraphPerson
from app.person_search import matches_person_name, name_search_keys, normalize_search_text
from app.repositories.graph_repository import GraphRepository
from app.repositories.person_repository import PersonRepository


# --- 姓名检索与响应契约 --- #


@pytest.mark.parametrize("keyword", ["张明远", "明远", "zmy", "ZMY", " Z M Y ", "zhangmingyuan", "ZHANG MING YUAN", "my"])
def test_chinese_name_matches_text_pinyin_and_initials(keyword):
    """同一姓名支持中文子串、完整拼音和不区分大小写/空白的首拼。"""
    assert matches_person_name("张明远", keyword)
    assert not matches_person_name("王清雅", keyword)


def test_literal_latin_and_empty_queries_keep_clear_semantics():
    """保留英文与SQL通配字符的字面匹配，空白不触发全量搜索。"""
    assert matches_person_name("Alpha_%", "ALPHA")
    assert matches_person_name("Alpha_%", "_%")
    assert not matches_person_name("Alpha", "_%")
    assert not matches_person_name("张明远", " \t\n ")
    assert normalize_search_text(" LÜ \t Bu ") == "lvbu"
    assert matches_person_name("吕布", "LÜ BU")
    assert name_search_keys("欧阳娜娜") == ("欧阳娜娜", "ouyangnana", "oynn")


def test_graph_person_keys_follow_current_name_and_ignore_supplied_keys():
    """计算字段随当前姓名更新，避免客户端传入或改名留下错误的索引。"""
    person = GraphPerson(id="p1", name="张明远", name_initials="wrong", name_pinyin="wrong")
    assert person.model_dump()["name_initials"] == "zmy"
    assert person.model_dump()["name_pinyin"] == "zhangmingyuan"
    person.name = "王清雅"
    assert person.model_dump()["name_initials"] == "wqy"
    assert person.model_dump()["name_pinyin"] == "wangqingya"


# --- 仓储限量、共享入口与改名 --- #


def test_repository_filters_before_limiting_and_center_reuses_same_search(repository_session):
    """首拼匹配不能先截取姓名排序前30人，中心候选遵循同一规则。"""
    repository = PersonRepository(repository_session)
    for index in range(35):
        repository.create_person({"personId": f"unrelated:{index:02}", "name": f"Alpha{index:02}", "gender": "U"})
    for index in range(4):
        repository.create_person({"personId": f"match:{index}", "name": f"张明远{index}", "gender": "U"})
    expected = [f"match:{index}" for index in range(4)]
    assert [person["personId"] for person in repository.search_persons("Z M Y")] == expected
    assert [person["personId"] for person in GraphRepository(repository_session).get_center_candidates("zmy", 2)] == expected[:2]
    assert repository.search_persons(" \t ") == []


def test_existing_people_and_renames_need_no_database_backfill(repository_session):
    """已有资料直接参与首拼检索，改名后旧首拼立即失效。"""
    repository = PersonRepository(repository_session)
    repository.create_person({"personId": "person:existing", "name": "张明远", "gender": "U"})
    assert [person["personId"] for person in repository.search_persons("zmy")] == ["person:existing"]
    repository.update_person("person:existing", {"name": "王清雅"})
    assert repository.search_persons("zmy") == []
    assert [person["personId"] for person in repository.search_persons("wqy")] == ["person:existing"]
