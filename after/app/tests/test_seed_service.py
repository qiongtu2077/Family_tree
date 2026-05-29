from app.services.seed_service import SeedService


class RecordingRepository:
    """记录 SeedService 写入动作的仓库替身。"""

    def __init__(self):
        """初始化记录容器。"""
        self.people = {}
        self.family_units = {}
        self.partner_links = []
        self.child_links = []
        self.parent_links = []
        self.spouse_links = []
        self.constraints_ensured = False
        self.demo_cleared = False

    def ensure_constraints(self):
        """记录约束初始化动作。"""
        self.constraints_ensured = True

    def clear_demo_family(self):
        """记录清理旧演示数据动作。"""
        self.demo_cleared = True

    def get_person(self, person_id):
        """查询已记录人物。"""
        return self.people.get(person_id)

    def create_person(self, payload):
        """记录新建人物。"""
        self.people[payload["personId"]] = payload
        return payload

    def update_person(self, person_id, payload):
        """记录更新人物。"""
        self.people[person_id] = payload
        return payload

    def create_or_update_family_unit(self, payload):
        """记录家庭单元。"""
        self.family_units[payload["familyUnitId"]] = payload
        return payload

    def add_partner_to_family_unit(self, person_id, family_unit_id, properties):
        """记录伴侣到家庭单元关系。"""
        self.partner_links.append((person_id, family_unit_id, properties))
        return True

    def add_child_to_family_unit(self, child_id, family_unit_id, properties):
        """记录家庭单元到子女关系。"""
        self.child_links.append((family_unit_id, child_id, properties))
        return True

    def add_parent_child_relation(self, parent_id, child_id, properties):
        """记录直接亲子关系。"""
        self.parent_links.append((parent_id, child_id, properties))
        return True

    def add_spouse_relation(self, person_a_id, person_b_id, properties):
        """记录配偶关系。"""
        self.spouse_links.append((person_a_id, person_b_id, properties))
        return True


def test_seed_demo_family_writes_complete_neo4j_graph_dataset():
    """示例族谱必须通过仓库写入完整 Neo4j 图谱数据。"""
    repository = RecordingRepository()
    result = SeedService(repository).seed_demo_family()

    assert result == {"people": 44, "family_units": 16}
    assert repository.constraints_ensured is True
    assert repository.demo_cleared is True
    assert len(repository.people) == 44
    assert len(repository.family_units) == 16
    assert repository.people["demo:uncle-spouse"]["name"] == "吴安琪"
    assert repository.family_units["demo:unit-uncle"]["children"] == ["demo:uncle-child"]
    assert ("demo:uncle", "demo:unit-uncle", {"displayOrder": 1}) in repository.partner_links
    assert any(link[0] == "demo:unit-uncle" and link[1] == "demo:uncle-child" for link in repository.child_links)
