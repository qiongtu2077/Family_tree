"""
族谱关系处理服务
使用 NetworkX 处理复杂的家族关系查询
"""
import networkx as nx
from typing import List, Dict, Set
from sqlalchemy.orm import Session
from ..models import Person


def build_family_graph(db: Session) -> nx.DiGraph:
    """
    从数据库构建族谱图
    
    Args:
        db: 数据库会话
        
    Returns:
        NetworkX 有向图对象
    """
    persons = db.query(Person).all()
    G = nx.DiGraph()
    
    for person in persons:
        G.add_node(
            person.id, 
            name=person.name, 
            gender=person.gender,
            birth_date=str(person.birth_date) if person.birth_date else None,
            is_alive=person.is_alive
        )
        if person.father_id:
            G.add_edge(person.father_id, person.id, relation='father')
        if person.mother_id:
            G.add_edge(person.mother_id, person.id, relation='mother')
    
    return G


def get_ancestors(db: Session, person_id: int, generations: int = 3) -> Set[int]:
    """
    获取指定代数内的所有祖先
    
    Args:
        db: 数据库会话
        person_id: 起始人员ID
        generations: 向上追溯的代数（默认3代）
        
    Returns:
        祖先ID集合
    """
    G = build_family_graph(db)
    ancestors = set()
    
    def traverse(node_id: int, depth: int):
        """递归遍历祖先"""
        if depth >= generations:
            return
        # 图的边方向是"父→子"，所以用 predecessors 获取父节点（指向该节点的节点）
        for parent_id in G.predecessors(node_id):
            if parent_id not in ancestors:
                ancestors.add(parent_id)
                traverse(parent_id, depth + 1)
    
    traverse(person_id, 0)
    return ancestors


def get_descendants(db: Session, person_id: int, generations: int = 3) -> Set[int]:
    """
    获取指定代数内的所有后代
    
    Args:
        db: 数据库会话
        person_id: 起始人员ID
        generations: 向下追溯的代数（默认3代）
        
    Returns:
        后代ID集合
    """
    G = build_family_graph(db)
    descendants = set()
    
    def traverse(node_id: int, depth: int):
        """递归遍历后代"""
        if depth >= generations:
            return
        # 图的边方向是"父→子"，所以用 successors 获取子节点（该节点指向的节点）
        for child_id in G.successors(node_id):
            if child_id not in descendants:
                descendants.add(child_id)
                traverse(child_id, depth + 1)
    
    traverse(person_id, 0)
    return descendants


def get_siblings(db: Session, person_id: int) -> Set[int]:
    """
    获取所有兄弟姐妹（包括同父异母、同母异父、同父同母）
    
    Args:
        db: 数据库会话
        person_id: 起始人员ID
        
    Returns:
        兄弟姐妹ID集合（不包括自己）
    """
    person = db.query(Person).filter(Person.id == person_id).first()
    if not person:
        return set()
    
    siblings = set()
    
    # 如果有父亲，获取所有同父的兄弟姐妹
    if person.father_id:
        same_father = db.query(Person).filter(
            Person.father_id == person.father_id,
            Person.id != person_id
        ).all()
        siblings.update([p.id for p in same_father])
    
    # 如果有母亲，获取所有同母的兄弟姐妹
    if person.mother_id:
        same_mother = db.query(Person).filter(
            Person.mother_id == person.mother_id,
            Person.id != person_id
        ).all()
        siblings.update([p.id for p in same_mother])
    
    return siblings


def get_family_tree_data(db: Session, person_id: int, generations: int = 5) -> Dict:
    """
    获取族谱树数据（用于 G6 可视化）
    包含完整的家族分支，包括兄弟姐妹和所有配偶，不删除任何节点
    
    Args:
        db: 数据库会话
        person_id: 中心人员ID
        generations: 向上和向下各追溯的代数（默认5代，确保显示完整）
        
    Returns:
        包含 nodes 和 edges 的字典
    """
    # 获取所有相关人员的ID（包括祖先、后代和兄弟姐妹）
    ancestors = get_ancestors(db, person_id, generations)
    descendants = get_descendants(db, person_id, generations)
    siblings = get_siblings(db, person_id)
    
    # 还需要获取兄弟姐妹的祖先和后代，以确保完整显示
    all_sibling_ancestors = set()
    all_sibling_descendants = set()
    for sibling_id in siblings:
        all_sibling_ancestors.update(get_ancestors(db, sibling_id, generations))
        all_sibling_descendants.update(get_descendants(db, sibling_id, generations))
    
    # 合并所有相关人员ID
    all_person_ids = ancestors | descendants | siblings | {person_id} | all_sibling_ancestors | all_sibling_descendants
    
    # 查询所有相关人员
    persons = db.query(Person).filter(Person.id.in_(all_person_ids)).all()
    
    # 重要：确保所有后代的父母都被包含（包括配偶）
    # 例如：如果张小明在 descendants 中，他的母亲李妈妈也应该被包含
    additional_parents = set()
    for person in persons:
        if person.father_id and person.father_id not in all_person_ids:
            additional_parents.add(person.father_id)
        if person.mother_id and person.mother_id not in all_person_ids:
            additional_parents.add(person.mother_id)
    
    # 如果找到了额外的父母，需要递归包含他们的关系
    if additional_parents:
        all_person_ids.update(additional_parents)
        # 重新查询，包含额外的父母
        persons = db.query(Person).filter(Person.id.in_(all_person_ids)).all()
        # 再次检查是否有更多需要包含的父母
        max_iterations = 3  # 防止无限循环
        for _ in range(max_iterations):
            new_parents = set()
            for person in persons:
                if person.father_id and person.father_id not in all_person_ids:
                    new_parents.add(person.father_id)
                if person.mother_id and person.mother_id not in all_person_ids:
                    new_parents.add(person.mother_id)
            if not new_parents:
                break
            all_person_ids.update(new_parents)
            persons = db.query(Person).filter(Person.id.in_(all_person_ids)).all()
    
    # 构建节点和边
    nodes = []
    edges = []
    person_dict = {p.id: p for p in persons}
    # 使用集合来避免重复边
    edges_set = set()
    
    # 先添加所有人员节点（包含完整信息，用于前端显示）
    for person in persons:
        nodes.append({
            "id": str(person.id),
            "label": person.name,
            "gender": person.gender,
            "birth_date": str(person.birth_date) if person.birth_date else None,
            "death_date": str(person.death_date) if person.death_date else None,
            "is_alive": person.is_alive,
            "father_id": str(person.father_id) if person.father_id else None,
            "mother_id": str(person.mother_id) if person.mother_id else None,
            "occupation": person.occupation,
            "address": person.address,
            "motto": person.motto,
            "achievements": person.achievements,
            "biography": person.biography,
            "avatar": person.avatar
        })
    
    # 暂时移除虚拟婚姻节点，先确保基本功能正常
    # 直接添加所有父子/母子关系
    for person in persons:
        if person.father_id and person.father_id in person_dict:
            edge_key = (str(person.father_id), str(person.id), "father")
            if edge_key not in edges_set:
                edges.append({
                    "source": str(person.father_id),
                    "target": str(person.id),
                    "relation": "father"
                })
                edges_set.add(edge_key)
        
        if person.mother_id and person.mother_id in person_dict:
            edge_key = (str(person.mother_id), str(person.id), "mother")
            if edge_key not in edges_set:
                edges.append({
                    "source": str(person.mother_id),
                    "target": str(person.id),
                    "relation": "mother"
                })
                edges_set.add(edge_key)
    
    return {
        "nodes": nodes,
        "edges": edges
    }

