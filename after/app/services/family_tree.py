"""旧族谱树接口的数据适配，统一读取人物与亲缘关系表。"""
from __future__ import annotations

from collections import defaultdict
from typing import Any

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from ..graph_models import FamilyChild, FamilyPartner, GenealogyPerson, ParentChild, Spouse


# --- 旧响应字段与父母信息 --- #


PERSON_FIELD_NAMES = {
    "birth_date": "birthDate",
    "death_date": "deathDate",
    "is_alive": "isAlive",
    "avatar": "avatar",
    "occupation": "occupation",
    "address": "address",
    "motto": "motto",
    "achievements": "achievements",
    "biography": "biography",
}


def get_parent_links(db: Session, person_ids: list[str]) -> dict[str, list[dict[str, Any]]]:
    """批量读取人物全部亲子事实，旧父母字段仅由生育关系推导。"""
    links: dict[str, list[dict[str, Any]]] = defaultdict(list)
    if not person_ids:
        return links
    rows = db.execute(
        select(ParentChild, GenealogyPerson)
        .join(GenealogyPerson, GenealogyPerson.person_id == ParentChild.parent_id)
        .where(ParentChild.child_id.in_(person_ids))
        .order_by(ParentChild.parent_id, ParentChild.relation_kind)
    )
    for relation, parent in rows:
        links[relation.child_id].append({
            **relation.to_dict(),
            "parent_id": relation.parent_id,
            "parent_name": parent.name,
            "side": relation.properties.get("side", "parent"),
            "relation_kind": relation.relation_kind,
        })
    return links


def serialize_person(person: dict[str, Any], parent_links: list[dict[str, Any]]) -> dict[str, Any]:
    """将统一人物属性转换为旧接口字段，并保留完整父母事实和照片列表。"""
    result = {
        "id": person["personId"],
        "name": person["name"],
        "gender": person["gender"],
        **{field: person.get(attribute) for field, attribute in PERSON_FIELD_NAMES.items()},
        "parent_relations": parent_links,
        "photos": person.get("photos", []),
    }
    result["is_alive"] = person.get("isAlive", True)
    for side in ("father", "mother"):
        parents = {
            link["parent_id"]: link["parent_name"] for link in parent_links
            if link["side"] == side and link["relation_kind"] == "biological"
        }
        # 旧单值字段不能代表多位父母；详情中的 parent_relations 保留所有事实。
        unique_id = next(iter(parents)) if len(parents) == 1 else None
        result[f"{side}_id"] = unique_id
        result[f"{side}_name"] = parents[unique_id] if unique_id is not None else None
    return result


# --- 有界亲缘遍历 --- #


def _lineal_person_ids(db: Session, person_id: str, generations: int, *, ancestors: bool) -> set[str]:
    """逐代查询必要亲子邻接，避免每次查询都在内存构建全库图。"""
    source = ParentChild.child_id if ancestors else ParentChild.parent_id
    target = ParentChild.parent_id if ancestors else ParentChild.child_id
    seen = {str(person_id)}
    frontier = {str(person_id)}
    result = set()
    for _ in range(min(max(int(generations), 1), 10)):
        adjacent = set(db.scalars(select(target).where(source.in_(frontier)).distinct()))
        frontier = adjacent - seen
        if not frontier:
            break
        seen.update(frontier)
        result.update(frontier)
    return result


def get_ancestors(db: Session, person_id: str, generations: int = 3) -> set[str]:
    """返回指定代数以内的祖先稳定 ID。"""
    return _lineal_person_ids(db, person_id, generations, ancestors=True)


def get_descendants(db: Session, person_id: str, generations: int = 3) -> set[str]:
    """返回指定代数以内的后代稳定 ID。"""
    return _lineal_person_ids(db, person_id, generations, ancestors=False)


def get_siblings(db: Session, person_id: str) -> set[str]:
    """读取至少共享一位父母的同胞，包括生育与收养家庭事实。"""
    parent_ids = list(db.scalars(select(ParentChild.parent_id).where(
        ParentChild.child_id == str(person_id),
    ).distinct()))
    if not parent_ids:
        return set()
    return set(db.scalars(select(ParentChild.child_id).where(
        ParentChild.parent_id.in_(parent_ids), ParentChild.child_id != str(person_id),
    ).distinct()))


# --- 旧树接口投影 --- #


def get_family_tree_data(db: Session, person_id: str, generations: int = 5) -> dict[str, list[dict[str, Any]]]:
    """用统一关系数据返回旧客户端需要的人物节点和直接亲缘边。"""
    person_id = str(person_id)
    siblings = get_siblings(db, person_id)
    person_ids = {
        person_id,
        *get_ancestors(db, person_id, generations),
        *get_descendants(db, person_id, generations),
        *siblings,
    }
    for sibling_id in sorted(siblings):
        person_ids.update(get_ancestors(db, sibling_id, generations))
        person_ids.update(get_descendants(db, sibling_id, generations))

    # 沿用旧接口补齐配偶父母的范围，最多额外向上扩展四轮。
    for _ in range(4):
        parent_ids = set(db.scalars(select(ParentChild.parent_id).where(
            ParentChild.child_id.in_(person_ids),
        ).distinct()))
        additional_ids = parent_ids - person_ids
        if not additional_ids:
            break
        person_ids.update(additional_ids)

    partner_unit_ids = set(db.scalars(select(FamilyPartner.family_unit_id).where(
        FamilyPartner.person_id.in_(person_ids),
    )))
    child_unit_ids = set(db.scalars(select(FamilyChild.family_unit_id).where(
        FamilyChild.child_id.in_(person_ids),
    )))
    family_ids = partner_unit_ids | child_unit_ids
    if family_ids:
        person_ids.update(db.scalars(select(FamilyPartner.person_id).where(
            FamilyPartner.family_unit_id.in_(family_ids),
        )))
    spouse_rows = list(db.scalars(select(Spouse).where(or_(
        Spouse.person_a_id.in_(person_ids), Spouse.person_b_id.in_(person_ids),
    ))))
    for spouse in spouse_rows:
        person_ids.update((spouse.person_a_id, spouse.person_b_id))

    people = list(db.scalars(select(GenealogyPerson).where(
        GenealogyPerson.person_id.in_(person_ids),
    ).order_by(GenealogyPerson.name, GenealogyPerson.person_id)))
    parent_links = get_parent_links(db, [person.person_id for person in people])
    nodes = []
    for person in people:
        node = serialize_person(person.to_dict(), parent_links[person.person_id])
        node["label"] = node.pop("name")
        nodes.append(node)

    relations = db.scalars(select(ParentChild).where(
        ParentChild.parent_id.in_(person_ids), ParentChild.child_id.in_(person_ids),
    ).order_by(ParentChild.parent_id, ParentChild.child_id, ParentChild.relation_kind))
    edges = [{
        "source": relation.parent_id,
        "target": relation.child_id,
        "relation": relation.properties.get("side", "parent") if relation.relation_kind == "biological" else relation.relation_kind,
    } for relation in relations]
    edges.extend({"source": spouse.person_a_id, "target": spouse.person_b_id, "relation": "spouse"}
                 for spouse in spouse_rows)
    return {"nodes": nodes, "edges": edges}
