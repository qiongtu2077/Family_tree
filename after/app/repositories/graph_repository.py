"""
族谱关系数据访问
使用 SQLAlchemy 查询人物、家庭单元和关系表，并组装既有五图投影。
"""
from __future__ import annotations

from collections import defaultdict
from typing import Any
from urllib.parse import quote

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from .person_repository import PersonRepository

from ..graph_models import (
    FamilyChild,
    FamilyPartner,
    FamilyUnit,
    GenealogyPerson,
    ParentChild,
    Spouse,
)


class GraphRepository:
    """读取关系数据库中的族谱投影和亲缘路径。"""

    def __init__(self, session: Session):
        """保存当前请求使用的 SQLAlchemy Session。"""
        self.session = session

    # --- 五图投影与范围裁剪 --- #

    def get_mainline_graph(
        self,
        person_id: str,
        ancestor_depth: int,
        descendant_depth: int,
    ) -> dict[str, Any] | None:
        """读取本家主线图所需的人物、家庭单元和关系。"""
        return self._get_mainline_projection(
            person_id,
            _safe_depth(ancestor_depth),
            _safe_depth(descendant_depth),
        )


    def get_focus_graph(self, person_id: str, generations: int) -> dict[str, Any] | None:
        """读取中心人物谱系图所需的人物、家庭单元和关系。"""
        depth = _safe_depth(generations)
        center = self._get_person_node(person_id)
        if not center:
            return None

        persons = [center]
        persons.extend(self._get_related_people(person_id, "ancestors", depth))
        persons.extend(self._get_related_people(person_id, "descendants", depth))
        persons.extend(self._get_siblings_for_lineage(person_id, depth))
        person_ids = _unique_ids([dict(person).get("personId") for person in persons])

        family_units = self._get_family_units_for_people(person_ids)
        family_unit_ids = _unique_ids([dict(unit).get("familyUnitId") for unit in family_units])
        partners = self._get_partners_for_family_units(family_unit_ids)
        persons.extend(partners)
        person_ids = [dict(person).get("personId") for person in persons]
        person_ids = _unique_ids(person_ids)
        person_ids = self._expand_people_from_family_units(person_ids, family_unit_ids)
        family_units = self._get_family_units_for_people(person_ids)
        family_unit_ids = _unique_ids([dict(unit).get("familyUnitId") for unit in family_units])
        persons = self._get_people_by_ids(person_ids)
        edges = self._get_edges_for_scope(person_ids, family_unit_ids)
        return {
            "persons": persons,
            "family_units": family_units,
            **edges,
        }


    def get_inlaw_graph(
        self,
        person_id: str,
        spouse_id: str,
        depth: int,
    ) -> dict[str, Any] | None:
        """读取配偶原生家族谱系图。"""
        if not self._are_spouses_or_partners(person_id, spouse_id):
            return None

        raw_graph = self._get_inlaw_projection(person_id, spouse_id, _safe_depth(depth))
        return raw_graph


    def get_bridge_graph(
        self,
        person_id: str,
        spouse_id: str,
        depth: int,
        family_unit_id: str | None = None,
    ) -> dict[str, Any] | None:
        """读取两边近亲通过婚姻连接的桥接图。"""
        if not self._are_spouses_or_partners(person_id, spouse_id, family_unit_id):
            return None

        bridge_depth = min(_safe_depth(depth), 4)
        return self._get_bridge_projection(
            person_id,
            spouse_id,
            bridge_depth,
            family_unit_id=family_unit_id,
        )


    def get_branch_graph(self, family_unit_id: str, depth: int) -> dict[str, Any] | None:
        """读取某个家庭单元向下展开的后代分支图。"""
        branch_depth = _safe_depth(depth)
        root = self._get_family_unit_node(family_unit_id)
        if not root:
            return None

        family_unit_ids = [str(family_unit_id)]
        person_ids = _unique_ids([
            dict(person).get("personId")
            for person in self._get_partners_for_family_units(family_unit_ids)
        ])
        frontier_unit_ids = [str(family_unit_id)]

        # 后代分支只沿 FamilyUnit -> HAS_CHILD -> Person -> PARTNER_IN -> FamilyUnit 展开，
        # 不再把 PARENT_OF 混进可变路径，避免把旁系关系网投影成毛线团。
        for _ in range(branch_depth):
            child_ids = self._get_child_person_ids_for_family_units(frontier_unit_ids)
            new_child_ids = [child_id for child_id in child_ids if child_id not in person_ids]
            person_ids = _unique_ids([*person_ids, *new_child_ids])
            if not new_child_ids:
                break

            child_family_units = self._get_family_units_for_people(new_child_ids)
            next_unit_ids = _unique_ids([
                dict(unit).get("familyUnitId")
                for unit in child_family_units
                if dict(unit).get("familyUnitId") not in family_unit_ids
            ])
            family_unit_ids = _unique_ids([*family_unit_ids, *next_unit_ids])
            frontier_unit_ids = next_unit_ids
            if not frontier_unit_ids:
                break

        partner_ids = _unique_ids([
            dict(person).get("personId")
            for person in self._get_partners_for_family_units(family_unit_ids)
        ])
        person_ids = _unique_ids([*person_ids, *partner_ids])
        return self._build_raw_graph(
            person_ids,
            family_unit_ids,
            view_context={
                "family_unit_id": str(family_unit_id),
                "root_type": "familyUnit",
                "root_id": str(family_unit_id),
                "projection_reason": "explicit_family_unit",
            },
        )


    def get_branch_graph_by_root(
        self,
        root_type: str,
        root_id: str,
        depth: int,
    ) -> dict[str, Any] | None:
        """按人物或家庭单元根节点读取后代分支图。"""
        if root_type == "familyUnit":
            return self.get_branch_graph(root_id, depth)

        root = self._get_person_node(root_id)
        if not root:
            return None

        branch_root = self._resolve_branch_root_for_person(root_id)
        if branch_root["family_unit_id"]:
            raw_graph = self.get_branch_graph(branch_root["family_unit_id"], depth)
            if not raw_graph:
                return None
            raw_graph["view_context"] = {
                "center_person_id": str(root_id),
                "family_unit_id": branch_root["family_unit_id"],
                "root_type": "person",
                "root_id": str(root_id),
                "projection_reason": branch_root["reason"],
            }
            raw_graph["warnings"] = _unique_strings([
                *raw_graph.get("warnings", []),
                branch_root["warning"],
            ])
            return raw_graph

        return {
            "persons": [root],
            "family_units": [],
            "partner_edges": [],
            "child_edges": [],
            "parent_edges": [],
            "spouse_edges": [],
            "warnings": [branch_root["warning"]],
            "view_context": {
                "center_person_id": str(root_id),
                "root_type": "person",
                "root_id": str(root_id),
                "projection_reason": branch_root["reason"],
            },
        }


    def get_overview_graph(self, scope: str, max_nodes: int) -> dict[str, Any] | None:
        """读取家族全景图，默认返回范围内全部人物和家庭单元。"""
        limit = _safe_limit(max_nodes)
        normalized_scope = (scope or "all").strip()

        if normalized_scope.startswith("center:"):
            center_person_id = normalized_scope.replace("center:", "", 1)
            return self._get_nine_kinship_overview(center_person_id, limit)

        if normalized_scope not in {"all", "demo"}:
            return self._get_family_scope_overview(normalized_scope, limit)

        persons, total_count = self._get_scoped_people(normalized_scope, limit)
        person_ids = _unique_ids([dict(person).get("personId") for person in persons])
        if total_count <= limit:
            family_units = self._get_scoped_family_units(normalized_scope)
        else:
            family_units = self._get_family_units_touching_people(person_ids)

        family_unit_ids = _unique_ids([dict(unit).get("familyUnitId") for unit in family_units])
        edges = self._get_edges_for_scope(person_ids, family_unit_ids)
        warnings = []
        if total_count > limit:
            warnings.append(f"已按上限显示 {limit} / {total_count} 人")

        return {
            "persons": persons,
            "family_units": family_units,
            "hidden_relation_count": max(total_count - limit, 0),
            "warnings": warnings,
            **edges,
        }


    def get_center_context(self, person_id: str) -> dict[str, Any] | None:
        """读取中心人物上下文和五图参数候选。"""
        person = self._get_person_node(person_id)
        if not person:
            return None

        spouse_options = self._get_center_spouse_options(person_id)
        family_options = self._get_center_family_options(person_id)
        summary = self._get_nine_kinship_summary(person_id)
        warnings = []
        if not spouse_options:
            warnings.append("当前中心人物暂无配偶/伴侣家庭，姻亲谱系和联姻桥接需要先补充关系")
        if not family_options:
            warnings.append("当前中心人物暂无可展开家庭单元，后代分支可能只显示本人")

        return {
            "person": person,
            "available_spouses": spouse_options,
            "available_family_units": family_options,
            "default_mainline_depth": 3,
            "nine_kinship_summary": summary,
            "warnings": warnings,
        }


    def _get_mainline_projection(
        self,
        person_id: str,
        ancestor_depth: int,
        descendant_depth: int,
    ) -> dict[str, Any] | None:
        """读取本家主线的收敛投影。"""
        center = self._get_person_node(person_id)
        if not center:
            return None

        ancestor_ids = self._get_direct_ancestor_person_ids(person_id, ancestor_depth)
        descendant_ids = self._get_direct_descendant_person_ids(person_id, descendant_depth)
        sibling_ids = self._get_sibling_person_ids(person_id)
        blood_ids = _unique_ids([str(person_id), *ancestor_ids, *descendant_ids])
        visible_seed_ids = _unique_ids([*blood_ids, *sibling_ids])
        lineage_family_ids = _unique_ids([
            *self._get_parent_family_unit_ids_for_people(visible_seed_ids),
            *self._get_child_family_unit_ids_for_people(blood_ids),
        ])
        partner_ids = _unique_ids([
            dict(person).get("personId")
            for person in self._get_partners_for_family_units(lineage_family_ids)
        ])
        person_ids = _unique_ids([*visible_seed_ids, *partner_ids])
        branch_capsules = [
            self._build_branch_capsule(
                "spouse_origin",
                "配偶原生家庭",
                owner_person_id=partner_id,
                root_family_unit_id=self._get_first_parent_family_unit_id(partner_id),
                relation_to_center="配偶原生家庭",
                target_view="inlaw",
            )
            for partner_id in partner_ids
            if partner_id not in blood_ids and self._get_first_parent_family_unit_id(partner_id)
        ]
        branch_capsules.extend(
            self._build_branch_capsule(
                "sibling_descendant",
                "兄弟姐妹后代",
                owner_person_id=sibling_id,
                root_family_unit_id=family_unit_id,
                relation_to_center="同胞后代",
                target_view="branch",
            )
            for sibling_id in sibling_ids
            for family_unit_id in [self._get_primary_child_family_unit_id(sibling_id)]
            if family_unit_id
        )
        branch_capsules = [capsule for capsule in branch_capsules if capsule]
        return self._build_raw_graph(
            person_ids,
            lineage_family_ids,
            branch_capsules=branch_capsules,
            hidden_relation_count=sum(capsule["person_count"] for capsule in branch_capsules),
            view_context={
                "center_person_id": str(person_id),
                "root_type": "person",
                "root_id": str(person_id),
                "projection_reason": "mainline_projection",
            },
        )


    def _get_inlaw_projection(
        self,
        person_id: str,
        spouse_id: str,
        depth: int,
    ) -> dict[str, Any] | None:
        """读取配偶原生家庭的姻亲投影。"""
        spouse = self._get_person_node(spouse_id)
        center = self._get_person_node(person_id)
        if not spouse or not center:
            return None

        common_family_ids = self._get_common_family_unit_ids(person_id, spouse_id)
        common_family_id = common_family_ids[0] if common_family_ids else None
        ancestor_ids = self._get_direct_ancestor_person_ids(spouse_id, depth)
        sibling_ids = self._get_sibling_person_ids(spouse_id)
        origin_ids = _unique_ids([str(spouse_id), *ancestor_ids, *sibling_ids])
        family_unit_ids = _unique_ids([
            *self._get_parent_family_unit_ids_for_people(origin_ids),
            *(common_family_ids[:1] if common_family_id else []),
        ])
        child_ids = self._get_child_person_ids_for_family_units([common_family_id]) if common_family_id else []
        partner_ids = _unique_ids([
            dict(person).get("personId")
            for person in self._get_partners_for_family_units(family_unit_ids)
        ])
        person_ids = _unique_ids([str(person_id), *origin_ids, *child_ids, *partner_ids])
        center_origin_family_id = self._get_first_parent_family_unit_id(person_id)
        branch_capsules = []
        if center_origin_family_id:
            branch_capsules.append(self._build_branch_capsule(
                "mainline_entry",
                "本家入口",
                owner_person_id=str(person_id),
                root_family_unit_id=center_origin_family_id,
                relation_to_center="当前人物本家",
                target_view="mainline",
            ))
        branch_capsules.extend(
            self._build_branch_capsule(
                "inlaw_branch",
                "姻亲旁支后代",
                owner_person_id=sibling_id,
                root_family_unit_id=family_unit_id,
                relation_to_center="配偶同胞后代",
                target_view="branch",
            )
            for sibling_id in sibling_ids
            for family_unit_id in [self._get_primary_child_family_unit_id(sibling_id)]
            if family_unit_id
        )
        branch_capsules = [capsule for capsule in branch_capsules if capsule]
        return self._build_raw_graph(
            person_ids,
            family_unit_ids,
            branch_capsules=branch_capsules,
            hidden_relation_count=sum(capsule["person_count"] for capsule in branch_capsules),
            view_context={
                "center_person_id": str(person_id),
                "spouse_id": str(spouse_id),
                "family_unit_id": common_family_id,
                "root_type": "person",
                "root_id": str(spouse_id),
                "projection_reason": "inlaw_origin_projection",
            },
        )


    def _get_bridge_projection(
        self,
        person_id: str,
        spouse_id: str,
        depth: int,
        family_unit_id: str | None = None,
    ) -> dict[str, Any] | None:
        """读取联姻桥接的双侧近亲投影。"""
        common_family_ids = [str(family_unit_id)] if family_unit_id else self._get_common_family_unit_ids(person_id, spouse_id)
        common_family_ids = _unique_ids(common_family_ids)
        if len(common_family_ids) != 1:
            return None

        bridge_family_id = common_family_ids[0]
        side_family_ids = _unique_ids([
            *self._get_parent_family_unit_ids(person_id),
            *self._get_parent_family_unit_ids(spouse_id),
        ])
        family_unit_ids = _unique_ids([bridge_family_id, *side_family_ids])
        child_ids = self._get_child_person_ids_for_family_units([bridge_family_id])
        partner_ids = _unique_ids([
            dict(person).get("personId")
            for person in self._get_partners_for_family_units(family_unit_ids)
        ])
        sibling_ids = self._get_child_person_ids_for_family_units(side_family_ids)
        person_ids = _unique_ids([str(person_id), str(spouse_id), *child_ids, *partner_ids, *sibling_ids])
        branch_capsules = []
        if depth > 1:
            branch_capsules.extend(
                self._build_branch_capsule(
                    "sibling_descendant",
                    "两侧同胞后代",
                    owner_person_id=sibling_id,
                    root_family_unit_id=family_id,
                    relation_to_center="同胞后代",
                    target_view="branch",
                )
                for sibling_id in sibling_ids
                if sibling_id not in {str(person_id), str(spouse_id)}
                for family_id in [self._get_primary_child_family_unit_id(sibling_id)]
                if family_id
            )
        branch_capsules = [capsule for capsule in branch_capsules if capsule]
        return self._build_raw_graph(
            person_ids,
            family_unit_ids,
            branch_capsules=branch_capsules,
            hidden_relation_count=sum(capsule["person_count"] for capsule in branch_capsules),
            view_context={
                "center_person_id": str(person_id),
                "spouse_id": str(spouse_id),
                "family_unit_id": bridge_family_id,
                "root_type": "familyUnit",
                "root_id": bridge_family_id,
                "projection_reason": "marriage_bridge_projection",
            },
        )


    def _get_nine_kinship_overview(self, person_id: str, limit: int) -> dict[str, Any] | None:
        """读取中心人物九族范围的全景索引投影。"""
        center = self._get_person_node(person_id)
        if not center:
            return None

        person_ids = self._get_nine_kinship_person_ids(person_id)
        total_count = len(person_ids)
        limited_person_ids = person_ids[:limit]
        family_unit_ids = self._get_nine_kinship_family_unit_ids(limited_person_ids)
        warnings = []
        if total_count > limit:
            warnings.append(f"已按上限显示 {limit} / {total_count} 人")
        return self._build_raw_graph(
            limited_person_ids,
            family_unit_ids,
            warnings=warnings,
            hidden_relation_count=max(total_count - limit, 0),
            view_context={
                "center_person_id": str(person_id),
                "root_type": "person",
                "root_id": str(person_id),
                "projection_reason": "nine_kinship_overview",
            },
        )


    def _build_raw_graph(
        self,
        person_ids: list[str],
        family_unit_ids: list[str],
        *,
        warnings: list[str] | None = None,
        branch_capsules: list[dict[str, Any]] | None = None,
        view_context: dict[str, Any] | None = None,
        hidden_relation_count: int = 0,
    ) -> dict[str, Any]:
        """根据已收敛的 ID 范围组装原始图记录。"""
        person_ids = _unique_ids(person_ids)
        family_unit_ids = _unique_ids(family_unit_ids)
        edges = self._get_edges_for_scope(person_ids, family_unit_ids)
        return {
            "persons": self._get_people_by_ids(person_ids),
            "family_units": self._get_family_units_by_ids(family_unit_ids),
            "branch_capsules": branch_capsules or [],
            "hidden_relation_count": int(hidden_relation_count or 0),
            "warnings": warnings or [],
            "view_context": view_context,
            **edges,
        }


    def _get_first_parent_family_unit_id(self, person_id: str) -> str | None:
        """读取人物首个父母家庭单元 ID。"""
        family_unit_ids = self._get_parent_family_unit_ids(person_id)
        return family_unit_ids[0] if family_unit_ids else None


    def _get_parent_family_chain(self, person_id: str, max_depth: int = 4) -> list[str]:
        """读取能覆盖人物的父母到祖先家庭单元链。"""
        chain = []
        frontier_ids = [str(person_id)]
        seen_people = {str(person_id)}
        for _ in range(max_depth):
            parent_family_ids = _unique_ids([
                family_unit_id
                for current_person_id in frontier_ids
                for family_unit_id in self._get_parent_family_unit_ids(current_person_id)
                if family_unit_id not in chain
            ])
            if not parent_family_ids:
                break
            parent_family_id = parent_family_ids[0]
            chain.append(parent_family_id)
            parent_ids = [
                parent_id
                for parent_id in self._get_partner_person_ids_for_family_unit(parent_family_id)
                if parent_id not in seen_people
            ]
            if not parent_ids:
                break
            seen_people.update(parent_ids)
            frontier_ids = parent_ids
        return chain


    def _resolve_branch_root_for_person(self, person_id: str) -> dict[str, str | None]:
        """解析人物后代分支应该使用的根家庭单元。"""
        own_family_id = self._get_primary_child_family_unit_id(person_id)
        if own_family_id:
            return {
                "family_unit_id": own_family_id,
                "reason": "own_descendant_branch",
                "warning": "已从本人家庭展开",
            }

        parent_chain = self._get_parent_family_chain(person_id, max_depth=4)
        if parent_chain:
            return {
                "family_unit_id": parent_chain[-1],
                "reason": "ancestor_family_fallback",
                "warning": "该人物暂无个人后代，已回退到父母或祖先家庭分支",
            }

        return {
            "family_unit_id": None,
            "reason": "isolated_person",
            "warning": "未找到可展开家庭单元，仅显示本人",
        }


    def _get_nine_kinship_person_ids(self, person_id: str) -> list[str]:
        """读取中心人物九族候选人物 ID。"""
        direct_ids = _unique_ids([
            str(person_id),
            *self._get_direct_ancestor_person_ids(person_id, 4),
            *self._get_direct_descendant_person_ids(person_id, 4),
        ])
        family_unit_ids = self._get_nine_kinship_family_unit_ids(direct_ids)
        partner_ids = _unique_ids([
            dict(person).get("personId")
            for person in self._get_partners_for_family_units(family_unit_ids)
        ])
        child_ids = self._get_child_person_ids_for_family_units(family_unit_ids)
        return _unique_ids([*direct_ids, *partner_ids, *child_ids])


    def _get_nine_kinship_family_unit_ids(self, person_ids: list[str]) -> list[str]:
        """读取九族候选人物必要家庭单元 ID。"""
        return _unique_ids([
            *self._get_parent_family_unit_ids_for_people(person_ids),
            *self._get_child_family_unit_ids_for_people(person_ids),
        ])


    def _build_branch_capsule(
        self,
        capsule_type: str,
        title: str,
        *,
        owner_person_id: str | None = None,
        root_family_unit_id: str | None = None,
        relation_to_center: str = "旁支",
        target_view: str = "branch",
    ) -> dict[str, Any] | None:
        """构造折叠分支胶囊摘要。"""
        if not root_family_unit_id and target_view == "branch":
            return None
        person_count = self._count_family_descendants(root_family_unit_id, 4) if root_family_unit_id else 0
        if capsule_type in {"spouse_origin", "mainline_entry"} and owner_person_id:
            person_count = max(person_count, self._count_spouse_origin_family(owner_person_id))
        return {
            "id": f"capsule:{capsule_type}:{owner_person_id or 'none'}:{root_family_unit_id or 'none'}",
            "title": title if person_count <= 0 else f"{title} · {person_count} 人",
            "owner_person_id": owner_person_id,
            "root_family_unit_id": root_family_unit_id,
            "relation_to_center": relation_to_center,
            "person_count": person_count,
            "generation_count": self._count_family_descendant_generations(root_family_unit_id, 4) if root_family_unit_id else 0,
            "preview_names": self._preview_family_descendants(root_family_unit_id, 3) if root_family_unit_id else [],
            "target_view": target_view,
        }


    def _count_family_descendants(self, family_unit_id: str | None, max_depth: int) -> int:
        """统计家庭单元下方可折叠后代人数。"""
        if not family_unit_id:
            return 0
        descendant_ids = []
        frontier_unit_ids = [str(family_unit_id)]
        for _ in range(max_depth):
            child_ids = self._get_child_person_ids_for_family_units(frontier_unit_ids)
            new_child_ids = [child_id for child_id in child_ids if child_id not in descendant_ids]
            if not new_child_ids:
                break
            descendant_ids = _unique_ids([*descendant_ids, *new_child_ids])
            frontier_unit_ids = self._get_child_family_unit_ids_for_people(new_child_ids)
            if not frontier_unit_ids:
                break
        return len(descendant_ids)


    def _count_family_descendant_generations(self, family_unit_id: str | None, max_depth: int) -> int:
        """统计家庭单元折叠后代层数。"""
        if not family_unit_id:
            return 0
        generation_count = 0
        frontier_unit_ids = [str(family_unit_id)]
        seen_person_ids = []
        for _ in range(max_depth):
            child_ids = self._get_child_person_ids_for_family_units(frontier_unit_ids)
            new_child_ids = [child_id for child_id in child_ids if child_id not in seen_person_ids]
            if not new_child_ids:
                break
            generation_count += 1
            seen_person_ids = _unique_ids([*seen_person_ids, *new_child_ids])
            frontier_unit_ids = self._get_child_family_unit_ids_for_people(new_child_ids)
            if not frontier_unit_ids:
                break
        return generation_count


    def _preview_family_descendants(self, family_unit_id: str | None, limit: int) -> list[str]:
        """预览家庭单元下方的前几个后代姓名。"""
        if not family_unit_id:
            return []
        child_ids = self._get_child_person_ids_for_family_units([str(family_unit_id)])[:limit]
        return [
            str(dict(person).get("name"))
            for person in self._get_people_by_ids(child_ids)
            if dict(person).get("name")
        ]


    def _count_spouse_origin_family(self, spouse_id: str) -> int:
        """统计人物原生家庭可折叠人数。"""
        parent_family_id = self._get_first_parent_family_unit_id(spouse_id)
        if not parent_family_id:
            return 0
        partner_count = len(self._get_partner_person_ids_for_family_unit(parent_family_id))
        descendant_count = self._count_family_descendants(parent_family_id, 4)
        return partner_count + descendant_count


    # --- 人物检索与关系路径 --- #

    def get_center_candidates(self, keyword: str, limit: int) -> list[dict[str, Any]]:
        """复用人物姓名/全拼/首拼检索，中心候选仍限制在1至50条。"""
        return PersonRepository(self.session).search_persons(keyword, min(max(int(limit), 1), 50))

    def get_relation_path(self, from_person_id: str, to_person_id: str) -> dict[str, Any] | None:
        """通过逐层邻接查询读取十条关系以内的最短亲缘路径。"""
        start_id, end_id = str(from_person_id), str(to_person_id)
        start = self._get_person_node(start_id)
        end = self._get_person_node(end_id)
        if start is None or end is None:
            return None
        if start_id == end_id:
            return {"persons": [start], "relations": []}

        previous: dict[str, tuple[str, dict[str, Any]]] = {}
        seen = {start_id}
        frontier = [start_id]
        for _ in range(10):
            adjacent = self._get_person_adjacency(frontier)
            next_frontier = []
            for current_id in frontier:
                for neighbor_id, relationship in adjacent.get(current_id, []):
                    if neighbor_id in seen:
                        continue
                    seen.add(neighbor_id)
                    previous[neighbor_id] = (current_id, relationship)
                    if neighbor_id == end_id:
                        return self._assemble_relation_path(start_id, end_id, previous)
                    next_frontier.append(neighbor_id)
            if not next_frontier:
                break
            frontier = next_frontier
        return None

    def _get_person_adjacency(self, person_ids: list[str]) -> dict[str, list[tuple[str, dict[str, Any]]]]:
        """仅查询当前 BFS 前沿接触的亲子和配偶关系。"""
        adjacency: dict[str, list[tuple[str, dict[str, Any]]]] = defaultdict(list)
        frontier = set(person_ids)
        parent_rows = self.session.scalars(
            select(ParentChild).where(or_(
                ParentChild.parent_id.in_(person_ids),
                ParentChild.child_id.in_(person_ids),
            ))
        )
        spouse_rows = self.session.scalars(
            select(Spouse).where(or_(
                Spouse.person_a_id.in_(person_ids),
                Spouse.person_b_id.in_(person_ids),
            ))
        )
        for row in parent_rows:
            relationship = _relationship_dict("PARENT_OF", row.parent_id, row.child_id, row.to_dict())
            if row.parent_id in frontier:
                adjacency[row.parent_id].append((row.child_id, relationship))
            if row.child_id in frontier:
                adjacency[row.child_id].append((row.parent_id, relationship))
        for row in spouse_rows:
            relationship = _relationship_dict("SPOUSE_OF", row.person_a_id, row.person_b_id, row.to_dict())
            if row.person_a_id in frontier:
                adjacency[row.person_a_id].append((row.person_b_id, relationship))
            if row.person_b_id in frontier:
                adjacency[row.person_b_id].append((row.person_a_id, relationship))
        for neighbors in adjacency.values():
            neighbors.sort(key=lambda item: (
                item[1]["type"],
                item[0],
                item[1].get("relationKind", "biological") != "biological",
                item[1]["id"],
            ))
        return adjacency

    def _assemble_relation_path(
        self,
        start_id: str,
        end_id: str,
        previous: dict[str, tuple[str, dict[str, Any]]],
    ) -> dict[str, Any]:
        """还原有序路径人物，关系端点保留父母到子女的真实方向。"""
        person_ids = [end_id]
        relations = []
        while person_ids[-1] != start_id:
            parent_id, relationship = previous[person_ids[-1]]
            relations.append(relationship)
            person_ids.append(parent_id)
        person_ids.reverse()
        relations.reverse()
        people = {person["personId"]: person for person in self._get_people_by_ids(person_ids)}
        return {"persons": [people[person_id] for person_id in person_ids], "relations": relations}

    # --- 管理诊断 --- #

    def get_graph_issues(self) -> list[dict[str, Any]]:
        """检查孤立人物、多位父母及祖先循环，最多返回二百项。"""
        people = list(self.session.scalars(select(GenealogyPerson)))
        parents = list(self.session.scalars(select(ParentChild)))
        connected = set()
        children: dict[str, set[str]] = defaultdict(set)
        parent_sides: dict[tuple[str, str], set[str]] = defaultdict(set)
        for row in parents:
            connected.update((row.parent_id, row.child_id))
            children[row.parent_id].add(row.child_id)
            side = row.to_dict().get("side")
            if side in {"father", "mother"} and row.relation_kind == "biological":
                parent_sides[(row.child_id, side)].add(row.parent_id)
        for row in self.session.scalars(select(FamilyPartner)):
            connected.add(row.person_id)
        for row in self.session.scalars(select(FamilyChild)):
            connected.add(row.child_id)
        for row in self.session.scalars(select(Spouse)):
            connected.update((row.person_a_id, row.person_b_id))

        issues = []
        for person in people:
            person_id = person.person_id
            if person_id not in connected:
                issues.append(_issue(person, "isolated_person", "人物没有任何关系"))
            for side, issue_type, label in (
                ("father", "multiple_fathers", "生父"),
                ("mother", "multiple_mothers", "生母"),
            ):
                if len(parent_sides[(person_id, side)]) > 1:
                    issues.append(_issue(person, issue_type, f"一个人物存在多个{label}"))
            # 诊断只扫描管理请求；普通五图和路径查询不读取全库关系。
            if _has_ancestor_cycle(person_id, children):
                issues.append(_issue(person, "ancestor_cycle", "祖先路径出现循环"))
        issues.sort(key=lambda item: (item["issue_type"], item["person"]["name"], item["person"]["personId"]))
        return issues[:200]

    # --- 节点与家庭成员读取 --- #

    def _get_person_node(self, person_id: str) -> dict[str, Any] | None:
        """按稳定字符串 ID 读取人物。"""
        person = self.session.get(GenealogyPerson, str(person_id))
        return person.to_dict() if person is not None else None

    def _get_family_unit_node(self, family_unit_id: str) -> dict[str, Any] | None:
        """按稳定字符串 ID 读取家庭单元。"""
        unit = self.session.get(FamilyUnit, str(family_unit_id))
        return unit.to_dict() if unit is not None else None

    def _get_people_by_ids(self, person_ids: list[str]) -> list[dict[str, Any]]:
        """按已裁剪的 ID 集合读取人物并稳定排序。"""
        if not person_ids:
            return []
        people = self.session.scalars(select(GenealogyPerson).where(GenealogyPerson.person_id.in_(person_ids)))
        return sorted((person.to_dict() for person in people), key=_person_sort_key)

    def _get_family_units_by_ids(self, family_unit_ids: list[str]) -> list[dict[str, Any]]:
        """按 ID 集合读取家庭单元并按展示顺序排序。"""
        if not family_unit_ids:
            return []
        units = self.session.scalars(select(FamilyUnit).where(FamilyUnit.family_unit_id.in_(family_unit_ids)))
        return sorted((unit.to_dict() for unit in units), key=_family_sort_key)

    def _get_family_units_for_people(self, person_ids: list[str]) -> list[dict[str, Any]]:
        """读取人物作为伴侣所属的家庭单元。"""
        if not person_ids:
            return []
        unit_ids = self.session.scalars(
            select(FamilyPartner.family_unit_id).where(FamilyPartner.person_id.in_(person_ids)).distinct()
        ).all()
        return self._get_family_units_by_ids(unit_ids)

    def _get_family_units_touching_people(self, person_ids: list[str]) -> list[dict[str, Any]]:
        """读取人物作为伴侣或子女接触的家庭单元。"""
        if not person_ids:
            return []
        partner_ids = self.session.scalars(
            select(FamilyPartner.family_unit_id).where(FamilyPartner.person_id.in_(person_ids))
        ).all()
        child_ids = self.session.scalars(
            select(FamilyChild.family_unit_id).where(FamilyChild.child_id.in_(person_ids))
        ).all()
        return self._get_family_units_by_ids(_unique_ids([*partner_ids, *child_ids]))

    def _get_partners_for_family_units(self, family_unit_ids: list[str]) -> list[dict[str, Any]]:
        """读取指定家庭单元中的伴侣人物。"""
        if not family_unit_ids:
            return []
        person_ids = self.session.scalars(
            select(FamilyPartner.person_id).where(FamilyPartner.family_unit_id.in_(family_unit_ids)).distinct()
        ).all()
        return self._get_people_by_ids(person_ids)

    def _get_child_person_ids_for_family_units(self, family_unit_ids: list[str]) -> list[str]:
        """读取家庭单元直接子女，并按生平字段稳定排序。"""
        if not family_unit_ids:
            return []
        person_ids = self.session.scalars(
            select(FamilyChild.child_id).where(FamilyChild.family_unit_id.in_(family_unit_ids)).distinct()
        ).all()
        return [person["personId"] for person in self._get_people_by_ids(person_ids)]

    def _get_partner_person_ids_for_family_unit(self, family_unit_id: str) -> list[str]:
        """读取某家庭单元的伴侣人物 ID。"""
        return [person["personId"] for person in self._get_partners_for_family_units([family_unit_id])]

    def _get_parent_family_unit_ids(self, person_id: str) -> list[str]:
        """读取人物作为子女所属的家庭单元 ID。"""
        return self._get_parent_family_unit_ids_for_people([str(person_id)])

    def _get_parent_family_unit_ids_for_people(self, person_ids: list[str]) -> list[str]:
        """读取一组人物的父母家庭单元 ID。"""
        if not person_ids:
            return []
        unit_ids = self.session.scalars(
            select(FamilyChild.family_unit_id).where(FamilyChild.child_id.in_(person_ids)).distinct()
        ).all()
        return [unit["familyUnitId"] for unit in self._get_family_units_by_ids(unit_ids)]

    def _get_child_family_unit_ids_for_people(self, person_ids: list[str]) -> list[str]:
        """读取人物作为伴侣且存在子女的家庭单元 ID。"""
        if not person_ids:
            return []
        unit_ids = self.session.scalars(
            select(FamilyPartner.family_unit_id)
            .join(FamilyChild, FamilyChild.family_unit_id == FamilyPartner.family_unit_id)
            .where(FamilyPartner.person_id.in_(person_ids))
            .distinct()
        ).all()
        return [unit["familyUnitId"] for unit in self._get_family_units_by_ids(unit_ids)]

    def _get_primary_child_family_unit_id(self, person_id: str) -> str | None:
        """读取人物首个具有子女的家庭单元。"""
        unit_ids = self._get_child_family_unit_ids_for_people([str(person_id)])
        return unit_ids[0] if unit_ids else None

    def _get_common_family_unit_ids(self, person_id: str, spouse_id: str) -> list[str]:
        """读取两位人物共同作为伴侣所属的家庭单元。"""
        left_ids = set(self.session.scalars(
            select(FamilyPartner.family_unit_id).where(FamilyPartner.person_id == str(person_id))
        ))
        right_ids = set(self.session.scalars(
            select(FamilyPartner.family_unit_id).where(FamilyPartner.person_id == str(spouse_id))
        ))
        return [unit["familyUnitId"] for unit in self._get_family_units_by_ids(list(left_ids & right_ids))]

    def _are_spouses_or_partners(
        self,
        person_id: str,
        spouse_id: str,
        family_unit_id: str | None = None,
    ) -> bool:
        """确认两人拥有指定家庭单元，或存在直接配偶关系。"""
        if str(person_id) == str(spouse_id):
            return False
        common_ids = self._get_common_family_unit_ids(person_id, spouse_id)
        if family_unit_id:
            return str(family_unit_id) in common_ids
        if common_ids:
            return True
        left_id, right_id = sorted((str(person_id), str(spouse_id)))
        return self.session.get(Spouse, (left_id, right_id)) is not None

    # --- 直系与同胞邻接遍历 --- #

    def _get_direct_ancestor_person_ids(self, person_id: str, depth: int) -> list[str]:
        """沿亲子表逐代查询上行祖先。"""
        return self._get_lineal_person_ids(person_id, depth, ancestors=True)

    def _get_direct_descendant_person_ids(self, person_id: str, depth: int) -> list[str]:
        """沿亲子表逐代查询下行后代。"""
        return self._get_lineal_person_ids(person_id, depth, ancestors=False)

    def _get_lineal_person_ids(self, person_id: str, depth: int, *, ancestors: bool) -> list[str]:
        """按请求代数读取必要邻接，访问过的人物不再扩展。"""
        source = ParentChild.child_id if ancestors else ParentChild.parent_id
        target = ParentChild.parent_id if ancestors else ParentChild.child_id
        seen = {str(person_id)}
        frontier = [str(person_id)]
        result = []
        for _ in range(depth):
            adjacent = self.session.scalars(select(target).where(source.in_(frontier)).distinct()).all()
            frontier = sorted(set(adjacent) - seen)
            if not frontier:
                break
            seen.update(frontier)
            result.extend(frontier)
        return [person["personId"] for person in self._get_people_by_ids(result)]

    def _get_sibling_person_ids(self, person_id: str) -> list[str]:
        """读取至少共享一位父母的兄弟姐妹。"""
        parent_ids = self.session.scalars(
            select(ParentChild.parent_id).where(ParentChild.child_id == str(person_id))
        ).all()
        if not parent_ids:
            return []
        sibling_ids = self.session.scalars(
            select(ParentChild.child_id)
            .where(ParentChild.parent_id.in_(parent_ids), ParentChild.child_id != str(person_id))
            .distinct()
        ).all()
        return [person["personId"] for person in self._get_people_by_ids(sibling_ids)]

    def _get_related_people(self, person_id: str, direction: str, depth: int) -> list[dict[str, Any]]:
        """读取中心人物某一方向上的直系人物。"""
        person_ids = self._get_lineal_person_ids(person_id, depth, ancestors=direction == "ancestors")
        return self._get_people_by_ids(person_ids)

    def _get_lineage_person_ids(self, person_id: str, depth: int) -> list[str]:
        """读取中心人物及其祖先链人物 ID。"""
        return _unique_ids([str(person_id), *self._get_direct_ancestor_person_ids(person_id, depth)])

    def _get_siblings_for_lineage(self, person_id: str, depth: int) -> list[dict[str, Any]]:
        """读取中心人物和祖先链中各人的兄弟姐妹。"""
        lineage_ids = self._get_lineage_person_ids(person_id, depth)
        parent_ids = self.session.scalars(
            select(ParentChild.parent_id).where(ParentChild.child_id.in_(lineage_ids)).distinct()
        ).all()
        if not parent_ids:
            return []
        sibling_ids = self.session.scalars(
            select(ParentChild.child_id).where(ParentChild.parent_id.in_(parent_ids)).distinct()
        ).all()
        return self._get_people_by_ids(sibling_ids)

    # --- 中心人物参数与全景 --- #

    def _get_center_family_options(self, person_id: str) -> list[dict[str, Any]]:
        """批量读取中心人物的家庭、伴侣和子女人数。"""
        units = self._get_family_units_for_people([str(person_id)])
        unit_ids = [unit["familyUnitId"] for unit in units]
        if not unit_ids:
            return []
        partner_rows = list(self.session.scalars(
            select(FamilyPartner).where(FamilyPartner.family_unit_id.in_(unit_ids))
        ))
        partners = {person["personId"]: person for person in self._get_people_by_ids(
            _unique_ids([row.person_id for row in partner_rows])
        )}
        counts = dict(self.session.execute(
            select(FamilyChild.family_unit_id, func.count(FamilyChild.child_id))
            .where(FamilyChild.family_unit_id.in_(unit_ids))
            .group_by(FamilyChild.family_unit_id)
        ).all())
        by_unit: dict[str, list[dict[str, Any]]] = defaultdict(list)
        for row in partner_rows:
            by_unit[row.family_unit_id].append(partners[row.person_id])
        options = []
        for unit in units:
            unit_id = unit["familyUnitId"]
            unit_partners = sorted(by_unit[unit_id], key=_person_sort_key)
            options.append({
                "family_unit_id": unit_id,
                "family_type": unit.get("type", "marriage"),
                "label": unit.get("label", "家庭单元"),
                "spouse_ids": [person["personId"] for person in unit_partners],
                "spouse_names": [person["name"] for person in unit_partners],
                "child_count": counts.get(unit_id, 0),
            })
        return options

    def _get_center_spouse_options(self, person_id: str) -> list[dict[str, Any]]:
        """读取中心人物各家庭单元中的其他伴侣候选。"""
        families = self._get_center_family_options(person_id)
        spouse_ids = _unique_ids([
            spouse_id for family in families for spouse_id in family["spouse_ids"]
            if spouse_id != str(person_id)
        ])
        people = {person["personId"]: person for person in self._get_people_by_ids(spouse_ids)}
        return [
            {"person": people[spouse_id], "family_unit_id": family["family_unit_id"], "child_count": family["child_count"]}
            for family in families
            for spouse_id in sorted(family["spouse_ids"], key=lambda value: (people.get(value, {}).get("name", ""), value))
            if spouse_id != str(person_id)
        ]

    def _get_nine_kinship_summary(self, person_id: str) -> dict[str, Any]:
        """统计中心人物上下四代的直系范围摘要。"""
        ancestors = self._get_direct_ancestor_person_ids(person_id, 4)
        descendants = self._get_direct_descendant_person_ids(person_id, 4)
        return {
            "ancestor_count": len(ancestors),
            "descendant_count": len(descendants),
            "visible_person_count": len(set([str(person_id), *ancestors, *descendants])),
            "hidden_relation_count": 0,
        }

    def _get_scoped_people(self, scope: str, limit: int) -> tuple[list[dict[str, Any]], int]:
        """在数据库中计数并限制 all/demo 全景的人物范围。"""
        statement = select(GenealogyPerson)
        count_statement = select(func.count()).select_from(GenealogyPerson)
        if scope == "demo":
            predicate = GenealogyPerson.person_id.startswith("demo:")
            statement = statement.where(predicate)
            count_statement = count_statement.where(predicate)
        statement = statement.order_by(
            GenealogyPerson.properties["birthDate"].as_string().asc().nulls_last(),
            GenealogyPerson.name,
            GenealogyPerson.person_id,
        ).limit(limit)
        people = [person.to_dict() for person in self.session.scalars(statement)]
        return people, int(self.session.scalar(count_statement) or 0)

    def _get_scoped_family_units(self, scope: str) -> list[dict[str, Any]]:
        """读取 all/demo 全景涉及的家庭单元。"""
        statement = select(FamilyUnit)
        if scope == "demo":
            statement = statement.where(FamilyUnit.family_unit_id.startswith("demo:"))
        return sorted((unit.to_dict() for unit in self.session.scalars(statement)), key=_family_sort_key)

    def _get_family_scope_overview(self, family_unit_id: str, limit: int) -> dict[str, Any] | None:
        """读取指定家庭成员及其接触家庭的全景子图。"""
        root = self._get_family_unit_node(family_unit_id)
        if root is None:
            return None
        people_ids = _unique_ids([
            *self._get_partner_person_ids_for_family_unit(family_unit_id),
            *self._get_child_person_ids_for_family_units([family_unit_id]),
        ])
        total_count = len(people_ids)
        person_ids = people_ids[:limit]
        units = [root, *self._get_family_units_touching_people(person_ids)]
        warnings = [f"已按上限显示 {limit} / {total_count} 人"] if total_count > limit else []
        return self._build_raw_graph(
            person_ids,
            [unit["familyUnitId"] for unit in units],
            warnings=warnings,
            hidden_relation_count=max(total_count - limit, 0),
        )

    def _expand_people_from_family_units(self, person_ids: list[str], family_unit_ids: list[str]) -> list[str]:
        """把指定家庭的伴侣和直接子女补入已裁剪人物范围。"""
        return _unique_ids([
            *person_ids,
            *[person["personId"] for person in self._get_partners_for_family_units(family_unit_ids)],
            *self._get_child_person_ids_for_family_units(family_unit_ids),
        ])

    # --- 范围内关系组装 --- #

    def _get_edges_for_scope(self, person_ids: list[str], family_unit_ids: list[str]) -> dict[str, list[Any]]:
        """只读取端点已纳入视图的关系，返回普通字典。"""
        people = {person["personId"]: person for person in self._get_people_by_ids(person_ids)}
        families = {unit["familyUnitId"]: unit for unit in self._get_family_units_by_ids(family_unit_ids)}
        result = {"partner_edges": [], "child_edges": [], "parent_edges": [], "spouse_edges": []}
        if not people:
            return result
        partner_rows = self.session.scalars(select(FamilyPartner).where(
            FamilyPartner.person_id.in_(person_ids), FamilyPartner.family_unit_id.in_(family_unit_ids)
        ))
        for row in partner_rows:
            result["partner_edges"].append(_edge_record(
                "PARTNER_IN", people[row.person_id], families[row.family_unit_id], row.to_dict()
            ))
        child_rows = self.session.scalars(select(FamilyChild).where(
            FamilyChild.child_id.in_(person_ids), FamilyChild.family_unit_id.in_(family_unit_ids)
        ))
        for row in child_rows:
            result["child_edges"].append(_edge_record(
                "HAS_CHILD", families[row.family_unit_id], people[row.child_id], row.to_dict()
            ))
        parent_rows = self.session.scalars(select(ParentChild).where(
            ParentChild.parent_id.in_(person_ids), ParentChild.child_id.in_(person_ids)
        ))
        for row in parent_rows:
            result["parent_edges"].append(_edge_record(
                "PARENT_OF", people[row.parent_id], people[row.child_id], row.to_dict()
            ))
        spouse_rows = self.session.scalars(select(Spouse).where(
            Spouse.person_a_id.in_(person_ids), Spouse.person_b_id.in_(person_ids)
        ))
        for row in spouse_rows:
            result["spouse_edges"].append(_edge_record(
                "SPOUSE_OF", people[row.person_a_id], people[row.person_b_id], row.to_dict()
            ))
        for edges in result.values():
            edges.sort(key=lambda edge: edge["relationship"]["id"])
        return result


# --- 查询边界与原始记录转换 --- #


def _safe_depth(depth: int) -> int:
    """把展开深度限制在一到十代。"""
    return min(max(int(depth), 1), 10)


def _safe_limit(limit: int) -> int:
    """把全景人物上限限制在一到一千人。"""
    return min(max(int(limit), 1), 1000)


def _unique_ids(values: list[str]) -> list[str]:
    """保留首次出现顺序并去除重复及空 ID。"""
    return list(dict.fromkeys(value for value in values if value))


def _unique_strings(values: list[str]) -> list[str]:
    """保留首次出现顺序并去除重复及空提示。"""
    return list(dict.fromkeys(value for value in values if value))


def _person_sort_key(person: dict[str, Any]) -> tuple[bool, str, str, str]:
    """按出生日期、姓名和稳定 ID 排序，未知日期放末尾。"""
    birth_date = person.get("birthDate")
    return (not bool(birth_date), str(birth_date or ""), str(person.get("name", "")), person["personId"])


def _family_sort_key(unit: dict[str, Any]) -> tuple[int, str]:
    """按家庭展示顺序及稳定 ID 排序。"""
    return (int(unit.get("displayOrder", 0) or 0), unit["familyUnitId"])


def _relationship_dict(relation_type: str, source_id: str, target_id: str, properties: dict[str, Any]) -> dict[str, Any]:
    """生成数据库无关的关系字典，端点编码防止复合 ID 冲突。"""
    relation_id = f"{relation_type}:{quote(source_id, safe='')}:{quote(target_id, safe='')}"
    if relation_type == "PARENT_OF":
        relation_id += f":{quote(properties['relationKind'], safe='')}"
    return {
        **properties,
        "id": relation_id,
        "type": relation_type,
        "source": source_id,
        "target": target_id,
    }


def _edge_record(relation_type: str, source: dict[str, Any], target: dict[str, Any], properties: dict[str, Any]) -> dict[str, Any]:
    """把关系表记录转换为视图服务使用的边记录。"""
    source_id = source["personId"] if "personId" in source else source["familyUnitId"]
    target_id = target["personId"] if "personId" in target else target["familyUnitId"]
    return {
        "source": source,
        "relationship": _relationship_dict(relation_type, source_id, target_id, properties),
        "target": target,
    }


def _issue(person: GenealogyPerson, issue_type: str, message: str) -> dict[str, Any]:
    """生成管理员诊断记录。"""
    return {"person": person.to_dict(), "issue_type": issue_type, "message": message}


def _has_ancestor_cycle(person_id: str, children: dict[str, set[str]]) -> bool:
    """检查人物是否在十二条亲子边以内回到自身。"""
    seen = set()
    frontier = {person_id}
    for _ in range(12):
        next_frontier = {child_id for current in frontier for child_id in children.get(current, set())}
        if person_id in next_frontier:
            return True
        frontier = next_frontier - seen
        if not frontier:
            return False
        seen.update(frontier)
    return False
