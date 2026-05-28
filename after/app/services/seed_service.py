"""
Neo4j 示例数据初始化服务
创建可用于登录后查看的完整演示族谱数据。
"""
from __future__ import annotations

from ..repositories.person_repository import PersonRepository


class SeedService:
    """初始化 Neo4j 约束和示例族谱数据。"""

    def __init__(self, repository: PersonRepository):
        """保存人物 repository。"""
        self.repository = repository

    def seed_demo_family(self) -> dict[str, int]:
        """写入示例人物、家庭单元和关系。"""
        self.repository.ensure_constraints()
        self.repository.clear_demo_family()
        people = _demo_people()
        family_units = _demo_family_units()
        parent_child_relations = _demo_parent_child_relations()

        for person in people:
            existing = self.repository.get_person(person["personId"])
            if existing:
                self.repository.update_person(person["personId"], person)
            else:
                self.repository.create_person(person)

        for unit in family_units:
            self.repository.create_or_update_family_unit(unit)
            for index, partner_id in enumerate(unit["partners"], start=1):
                self.repository.add_partner_to_family_unit(
                    partner_id,
                    unit["familyUnitId"],
                    {"displayOrder": index},
                )
            if len(unit["partners"]) >= 2:
                self.repository.add_spouse_relation(
                    unit["partners"][0],
                    unit["partners"][1],
                    {"displayOrder": unit.get("display_order", 1)},
                )
            for index, child_id in enumerate(unit["children"], start=1):
                self.repository.add_child_to_family_unit(
                    child_id,
                    unit["familyUnitId"],
                    {"birthOrder": index, "relationKind": "biological", "certainty": 1.0},
                )

        for parent_id, child_id, side in parent_child_relations:
            self.repository.add_parent_child_relation(
                parent_id,
                child_id,
                {"side": side, "relationKind": "biological", "certainty": 1.0},
            )

        return {"people": len(people), "family_units": len(family_units)}


# --- 示例数据定义 --- #


def _demo_people() -> list[dict]:
    """返回演示族谱人物。"""
    core_people = [
        _person("demo:paternal-great-grandfather", "张怀礼", "M", "1915-04-08", "乡绅", "张家上代长辈。"),
        _person("demo:paternal-great-grandmother", "周佩芝", "F", "1918-11-16", "织造师", "张家上代长辈。"),
        _person("demo:maternal-li-great-grandfather", "李承安", "M", "1919-02-14", "账房先生", "李家上代长辈。"),
        _person("demo:maternal-li-great-grandmother", "陈月娥", "F", "1921-07-03", "教师", "李家上代长辈。"),
        _person("demo:wang-grandfather", "王德昌", "M", "1943-01-22", "医生", "王家长辈。"),
        _person("demo:wang-grandmother", "赵美珍", "F", "1947-06-15", "护士", "王家长辈。"),
        _person("demo:grandfather", "张立德", "M", "1942-03-18", "退休教师", "家族长辈，重视教育与家风传承。"),
        _person("demo:grandmother", "李秀兰", "F", "1946-09-02", "医生", "温和坚定，是家族记忆的守护者。"),
        _person("demo:father", "张明远", "M", "1970-07-11", "工程师", "负责整理族谱资料。"),
        _person("demo:mother", "王清雅", "F", "1972-05-21", "设计师", "喜欢用照片记录家庭故事。"),
        _person("demo:child", "张一宁", "F", "2000-10-06", "研究生", "示例测试用户绑定人物。"),
        _person("demo:uncle", "张明川", "M", "1975-12-25", "摄影师", "常年记录家族聚会。"),
        _person("demo:uncle-spouse", "吴安琪", "F", "1977-03-04", "编辑", "张明川的配偶。"),
        _person("demo:uncle-child", "张若辰", "M", "2004-08-22", "学生", "张明川的小家庭成员。"),
    ]
    branch_people = []
    branch_people.extend(_branch_people(_paternal_grandfather_siblings()))
    branch_people.extend(_branch_people(_paternal_grandmother_siblings()))
    branch_people.extend(_branch_people(_maternal_siblings()))
    return [*core_people, *branch_people]


def _branch_people(branches: list[dict]) -> list[dict]:
    """把旁系定义展开为人物列表。"""
    people = []
    for branch in branches:
        people.append(
            _person(
                branch["person_id"],
                branch["name"],
                branch["gender"],
                branch["birth_date"],
                branch["occupation"],
                branch["biography"],
            )
        )
        people.append(
            _person(
                branch["spouse_id"],
                branch["spouse_name"],
                branch["spouse_gender"],
                branch["spouse_birth_date"],
                branch["spouse_occupation"],
                f"{branch['name']}的配偶。",
            )
        )
        people.append(
            _person(
                branch["child_id"],
                branch["child_name"],
                branch["child_gender"],
                branch["child_birth_date"],
                branch["child_occupation"],
                f"{branch['name']}的小家庭成员。",
            )
        )
    return people


def _person(
    person_id: str,
    name: str,
    gender: str,
    birth_date: str,
    occupation: str,
    biography: str,
) -> dict:
    """创建人物属性字典。"""
    return {
        "personId": person_id,
        "name": name,
        "gender": gender,
        "birth_date": birth_date,
        "is_alive": True,
        "occupation": occupation,
        "biography": biography,
    }


def _demo_family_units() -> list[dict]:
    """返回演示家庭单元。"""
    units = [
        _family_unit(
            "demo:unit-paternal-great-grandparents",
            ["demo:paternal-great-grandfather", "demo:paternal-great-grandmother"],
            [
                "demo:paternal-aunt-lihua",
                "demo:grandfather",
                "demo:paternal-uncle-liqiang",
                "demo:paternal-aunt-liyan",
            ],
            1,
        ),
        _family_unit(
            "demo:unit-li-great-grandparents",
            ["demo:maternal-li-great-grandfather", "demo:maternal-li-great-grandmother"],
            [
                "demo:li-uncle-xiuwen",
                "demo:grandmother",
                "demo:li-aunt-xiuzhen",
                "demo:li-uncle-xiuguo",
                "demo:li-aunt-xiufang",
            ],
            2,
        ),
        _family_unit(
            "demo:unit-wang-grandparents",
            ["demo:wang-grandfather", "demo:wang-grandmother"],
            [
                "demo:wang-uncle-qinghe",
                "demo:mother",
                "demo:wang-aunt-qingmei",
                "demo:wang-uncle-qinglin",
            ],
            3,
        ),
        _family_unit(
            "demo:unit-grandparents",
            ["demo:grandfather", "demo:grandmother"],
            ["demo:father", "demo:uncle"],
            4,
        ),
        _family_unit(
            "demo:unit-parents",
            ["demo:father", "demo:mother"],
            ["demo:child"],
            5,
        ),
        _family_unit(
            "demo:unit-uncle",
            ["demo:uncle", "demo:uncle-spouse"],
            ["demo:uncle-child"],
            6,
        ),
    ]
    units.extend(_branch_family_units(_paternal_grandfather_siblings(), 10))
    units.extend(_branch_family_units(_paternal_grandmother_siblings(), 30))
    units.extend(_branch_family_units(_maternal_siblings(), 60))
    return units


def _family_unit(
    family_unit_id: str,
    partners: list[str],
    children: list[str],
    display_order: int,
) -> dict:
    """创建家庭单元属性字典。"""
    return {
        "familyUnitId": family_unit_id,
        "type": "marriage",
        "display_order": display_order,
        "partners": partners,
        "children": children,
    }


def _branch_family_units(branches: list[dict], start_order: int) -> list[dict]:
    """把旁系人物定义展开为家庭单元列表。"""
    return [
        _family_unit(
            branch["family_unit_id"],
            [branch["person_id"], branch["spouse_id"]],
            [branch["child_id"]],
            start_order + index,
        )
        for index, branch in enumerate(branches, start=1)
    ]


def _demo_parent_child_relations() -> list[tuple[str, str, str]]:
    """返回演示直接亲子关系。"""
    relations = []
    relations.extend(
        _parent_child_edges(
            "demo:paternal-great-grandfather",
            "demo:paternal-great-grandmother",
            [
                "demo:paternal-aunt-lihua",
                "demo:grandfather",
                "demo:paternal-uncle-liqiang",
                "demo:paternal-aunt-liyan",
            ],
        )
    )
    relations.extend(
        _parent_child_edges(
            "demo:maternal-li-great-grandfather",
            "demo:maternal-li-great-grandmother",
            [
                "demo:li-uncle-xiuwen",
                "demo:grandmother",
                "demo:li-aunt-xiuzhen",
                "demo:li-uncle-xiuguo",
                "demo:li-aunt-xiufang",
            ],
        )
    )
    relations.extend(
        _parent_child_edges(
            "demo:wang-grandfather",
            "demo:wang-grandmother",
            [
                "demo:wang-uncle-qinghe",
                "demo:mother",
                "demo:wang-aunt-qingmei",
                "demo:wang-uncle-qinglin",
            ],
        )
    )
    relations.extend(
        _parent_child_edges(
            "demo:grandfather",
            "demo:grandmother",
            ["demo:father", "demo:uncle"],
        )
    )
    relations.extend(_parent_child_edges("demo:father", "demo:mother", ["demo:child"]))
    relations.extend(_parent_child_edges("demo:uncle", "demo:uncle-spouse", ["demo:uncle-child"]))
    relations.extend(_branch_parent_child_edges(_paternal_grandfather_siblings()))
    relations.extend(_branch_parent_child_edges(_paternal_grandmother_siblings()))
    relations.extend(_branch_parent_child_edges(_maternal_siblings()))
    return relations


def _parent_child_edges(father_id: str, mother_id: str, child_ids: list[str]) -> list[tuple[str, str, str]]:
    """创建父母到子女的直接亲子边。"""
    edges = []
    for child_id in child_ids:
        edges.append((father_id, child_id, "father"))
        edges.append((mother_id, child_id, "mother"))
    return edges


def _branch_parent_child_edges(branches: list[dict]) -> list[tuple[str, str, str]]:
    """创建旁系小家庭的直接亲子边。"""
    edges = []
    for branch in branches:
        if branch["gender"] == "M":
            edges.append((branch["person_id"], branch["child_id"], "father"))
            edges.append((branch["spouse_id"], branch["child_id"], "mother"))
        else:
            edges.append((branch["spouse_id"], branch["child_id"], "father"))
            edges.append((branch["person_id"], branch["child_id"], "mother"))
    return edges


def _paternal_grandfather_siblings() -> list[dict]:
    """返回爷爷的三个兄妹及各自小家庭。"""
    return [
        _branch("demo:paternal-aunt-lihua", "张丽华", "F", "1939-05-12", "会计", "demo:paternal-aunt-lihua-spouse", "刘建国", "M", "1937-08-19", "厂长", "demo:paternal-aunt-lihua-child", "刘晓晨", "M", "1965-04-03", "建筑师"),
        _branch("demo:paternal-uncle-liqiang", "张立强", "M", "1945-12-04", "木匠", "demo:paternal-uncle-liqiang-spouse", "孙桂英", "F", "1948-01-27", "教师", "demo:paternal-uncle-liqiang-child", "张明涛", "M", "1973-09-14", "律师"),
        _branch("demo:paternal-aunt-liyan", "张丽燕", "F", "1949-06-30", "护士", "demo:paternal-aunt-liyan-spouse", "马志远", "M", "1947-03-09", "记者", "demo:paternal-aunt-liyan-child", "马小雨", "F", "1978-02-11", "策展人"),
    ]


def _paternal_grandmother_siblings() -> list[dict]:
    """返回奶奶的四个兄妹及各自小家庭。"""
    return [
        _branch("demo:li-uncle-xiuwen", "李修文", "M", "1941-10-10", "中学校长", "demo:li-uncle-xiuwen-spouse", "胡芳", "F", "1944-04-24", "编辑", "demo:li-uncle-xiuwen-child", "李博文", "M", "1969-01-18", "医生"),
        _branch("demo:li-aunt-xiuzhen", "李秀珍", "F", "1948-05-06", "药剂师", "demo:li-aunt-xiuzhen-spouse", "郑海平", "M", "1946-12-01", "工程师", "demo:li-aunt-xiuzhen-child", "郑予安", "F", "1974-07-07", "教师"),
        _branch("demo:li-uncle-xiuguo", "李修国", "M", "1950-02-17", "司机", "demo:li-uncle-xiuguo-spouse", "曹敏", "F", "1951-09-25", "会计", "demo:li-uncle-xiuguo-child", "李子昂", "M", "1980-11-29", "摄影师"),
        _branch("demo:li-aunt-xiufang", "李秀芳", "F", "1953-08-08", "护士长", "demo:li-aunt-xiufang-spouse", "唐志新", "M", "1952-06-20", "厨师", "demo:li-aunt-xiufang-child", "唐若溪", "F", "1982-03-16", "设计师"),
    ]


def _maternal_siblings() -> list[dict]:
    """返回妈妈的三个兄妹及各自小家庭。"""
    return [
        _branch("demo:wang-uncle-qinghe", "王清河", "M", "1968-03-02", "外科医生", "demo:wang-uncle-qinghe-spouse", "何静", "F", "1970-10-18", "药剂师", "demo:wang-uncle-qinghe-child", "王嘉树", "M", "1995-06-21", "程序员"),
        _branch("demo:wang-aunt-qingmei", "王清梅", "F", "1975-04-13", "教师", "demo:wang-aunt-qingmei-spouse", "许文斌", "M", "1973-12-05", "建筑师", "demo:wang-aunt-qingmei-child", "许念安", "F", "2002-09-09", "大学生"),
        _branch("demo:wang-uncle-qinglin", "王清林", "M", "1978-11-26", "律师", "demo:wang-uncle-qinglin-spouse", "林雅琴", "F", "1980-01-31", "会计", "demo:wang-uncle-qinglin-child", "王辰宇", "M", "2006-05-17", "学生"),
    ]


def _branch(
    person_id: str,
    name: str,
    gender: str,
    birth_date: str,
    occupation: str,
    spouse_id: str,
    spouse_name: str,
    spouse_gender: str,
    spouse_birth_date: str,
    spouse_occupation: str,
    child_id: str,
    child_name: str,
    child_gender: str,
    child_birth_date: str,
    child_occupation: str,
) -> dict:
    """创建旁系小家庭定义。"""
    return {
        "person_id": person_id,
        "name": name,
        "gender": gender,
        "birth_date": birth_date,
        "occupation": occupation,
        "biography": "旁系家族成员，用于展示复杂族谱效果。",
        "spouse_id": spouse_id,
        "spouse_name": spouse_name,
        "spouse_gender": spouse_gender,
        "spouse_birth_date": spouse_birth_date,
        "spouse_occupation": spouse_occupation,
        "child_id": child_id,
        "child_name": child_name,
        "child_gender": child_gender,
        "child_birth_date": child_birth_date,
        "child_occupation": child_occupation,
        "family_unit_id": person_id.replace("demo:", "demo:unit-"),
    }
