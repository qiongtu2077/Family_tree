/**
 * 本地演示图谱兜底数据
 * 当 Neo4j 暂不可用时维持图谱界面可见，不写入数据库。
 */

const DEMO_PEOPLE = [
  person('demo:paternal-great-grandfather', '张怀礼', 'M', '1915-04-08'),
  person('demo:paternal-great-grandmother', '周佩芝', 'F', '1918-11-16'),
  person('demo:maternal-li-great-grandfather', '李承安', 'M', '1919-02-14'),
  person('demo:maternal-li-great-grandmother', '陈月娥', 'F', '1921-07-03'),
  person('demo:wang-grandfather', '王德昌', 'M', '1943-01-22'),
  person('demo:wang-grandmother', '赵美珍', 'F', '1947-06-15'),
  person('demo:grandfather', '张立德', 'M', '1942-03-18'),
  person('demo:grandmother', '李秀兰', 'F', '1946-09-02'),
  person('demo:father', '张明远', 'M', '1970-07-11'),
  person('demo:mother', '王清雅', 'F', '1972-05-21'),
  person('demo:child', '张一宁', 'F', '2000-10-06'),
  person('demo:uncle', '张明川', 'M', '1975-12-25'),
  person('demo:uncle-spouse', '吴安琪', 'F', '1977-03-04'),
  person('demo:uncle-child', '张若辰', 'M', '2004-08-22'),
  person('demo:paternal-aunt-lihua', '张丽华', 'F', '1939-05-12'),
  person('demo:paternal-aunt-lihua-spouse', '刘建国', 'M', '1937-08-19'),
  person('demo:paternal-aunt-lihua-child', '刘晓晨', 'M', '1965-04-03'),
  person('demo:paternal-uncle-liqiang', '张立强', 'M', '1945-12-04'),
  person('demo:paternal-uncle-liqiang-spouse', '孙桂英', 'F', '1948-01-27'),
  person('demo:paternal-uncle-liqiang-child', '张明涛', 'M', '1973-09-14'),
  person('demo:paternal-aunt-liyan', '张丽燕', 'F', '1949-06-30'),
  person('demo:paternal-aunt-liyan-spouse', '马志远', 'M', '1947-03-09'),
  person('demo:paternal-aunt-liyan-child', '马小雨', 'F', '1978-02-11'),
  person('demo:li-uncle-xiuwen', '李修文', 'M', '1941-10-10'),
  person('demo:li-uncle-xiuwen-spouse', '胡芳', 'F', '1944-04-24'),
  person('demo:li-uncle-xiuwen-child', '李博文', 'M', '1969-01-18'),
  person('demo:li-aunt-xiuzhen', '李秀珍', 'F', '1948-05-06'),
  person('demo:li-aunt-xiuzhen-spouse', '郑海平', 'M', '1946-12-01'),
  person('demo:li-aunt-xiuzhen-child', '郑予安', 'F', '1974-07-07'),
  person('demo:li-uncle-xiuguo', '李修国', 'M', '1950-02-17'),
  person('demo:li-uncle-xiuguo-spouse', '曹敏', 'F', '1951-09-25'),
  person('demo:li-uncle-xiuguo-child', '李子昂', 'M', '1980-11-29'),
  person('demo:li-aunt-xiufang', '李秀芳', 'F', '1953-08-08'),
  person('demo:li-aunt-xiufang-spouse', '唐志新', 'M', '1952-06-20'),
  person('demo:li-aunt-xiufang-child', '唐若溪', 'F', '1982-03-16'),
  person('demo:wang-uncle-qinghe', '王清河', 'M', '1968-03-02'),
  person('demo:wang-uncle-qinghe-spouse', '何静', 'F', '1970-10-18'),
  person('demo:wang-uncle-qinghe-child', '王嘉树', 'M', '1995-06-21'),
  person('demo:wang-aunt-qingmei', '王清梅', 'F', '1975-04-13'),
  person('demo:wang-aunt-qingmei-spouse', '许文斌', 'M', '1973-12-05'),
  person('demo:wang-aunt-qingmei-child', '许念安', 'F', '2002-09-09'),
  person('demo:wang-uncle-qinglin', '王清林', 'M', '1978-11-26'),
  person('demo:wang-uncle-qinglin-spouse', '林雅琴', 'F', '1980-01-31'),
  person('demo:wang-uncle-qinglin-child', '王辰宇', 'M', '2006-05-17')
]

const DEMO_FAMILIES = [
  family('demo:unit-paternal-great-grandparents', ['demo:paternal-great-grandfather', 'demo:paternal-great-grandmother'], ['demo:paternal-aunt-lihua', 'demo:grandfather', 'demo:paternal-uncle-liqiang', 'demo:paternal-aunt-liyan'], 1),
  family('demo:unit-li-great-grandparents', ['demo:maternal-li-great-grandfather', 'demo:maternal-li-great-grandmother'], ['demo:li-uncle-xiuwen', 'demo:grandmother', 'demo:li-aunt-xiuzhen', 'demo:li-uncle-xiuguo', 'demo:li-aunt-xiufang'], 2),
  family('demo:unit-wang-grandparents', ['demo:wang-grandfather', 'demo:wang-grandmother'], ['demo:wang-uncle-qinghe', 'demo:mother', 'demo:wang-aunt-qingmei', 'demo:wang-uncle-qinglin'], 3),
  family('demo:unit-grandparents', ['demo:grandfather', 'demo:grandmother'], ['demo:father', 'demo:uncle'], 4),
  family('demo:unit-parents', ['demo:father', 'demo:mother'], ['demo:child'], 5),
  family('demo:unit-uncle', ['demo:uncle', 'demo:uncle-spouse'], ['demo:uncle-child'], 6),
  family('demo:unit-paternal-aunt-lihua', ['demo:paternal-aunt-lihua', 'demo:paternal-aunt-lihua-spouse'], ['demo:paternal-aunt-lihua-child'], 10),
  family('demo:unit-paternal-uncle-liqiang', ['demo:paternal-uncle-liqiang', 'demo:paternal-uncle-liqiang-spouse'], ['demo:paternal-uncle-liqiang-child'], 11),
  family('demo:unit-paternal-aunt-liyan', ['demo:paternal-aunt-liyan', 'demo:paternal-aunt-liyan-spouse'], ['demo:paternal-aunt-liyan-child'], 12),
  family('demo:unit-li-uncle-xiuwen', ['demo:li-uncle-xiuwen', 'demo:li-uncle-xiuwen-spouse'], ['demo:li-uncle-xiuwen-child'], 30),
  family('demo:unit-li-aunt-xiuzhen', ['demo:li-aunt-xiuzhen', 'demo:li-aunt-xiuzhen-spouse'], ['demo:li-aunt-xiuzhen-child'], 31),
  family('demo:unit-li-uncle-xiuguo', ['demo:li-uncle-xiuguo', 'demo:li-uncle-xiuguo-spouse'], ['demo:li-uncle-xiuguo-child'], 32),
  family('demo:unit-li-aunt-xiufang', ['demo:li-aunt-xiufang', 'demo:li-aunt-xiufang-spouse'], ['demo:li-aunt-xiufang-child'], 33),
  family('demo:unit-wang-uncle-qinghe', ['demo:wang-uncle-qinghe', 'demo:wang-uncle-qinghe-spouse'], ['demo:wang-uncle-qinghe-child'], 60),
  family('demo:unit-wang-aunt-qingmei', ['demo:wang-aunt-qingmei', 'demo:wang-aunt-qingmei-spouse'], ['demo:wang-aunt-qingmei-child'], 61),
  family('demo:unit-wang-uncle-qinglin', ['demo:wang-uncle-qinglin', 'demo:wang-uncle-qinglin-spouse'], ['demo:wang-uncle-qinglin-child'], 62)
]

const FALLBACK_WARNING = 'Neo4j 暂不可用，当前显示本地演示族谱数据。'

/**
 * 返回本地演示人物列表。
 */
export function getFallbackPeople() {
  return [...DEMO_PEOPLE].sort(comparePeople)
}

/**
 * 返回本地演示图谱。
 */
export function getFallbackGraph(viewMode = 'mainline', centerPersonId = 'demo:child') {
  const safeCenterPersonId = normalizeCenterPersonId(centerPersonId)
  if (viewMode === 'overview') {
    return graphResponse('overview', null, DEMO_PEOPLE, DEMO_FAMILIES)
  }

  if (viewMode === 'branch') {
    return graphResponse('branch', safeCenterPersonId, DEMO_PEOPLE, DEMO_FAMILIES)
  }

  if (viewMode === 'bridge') {
    return graphResponse('bridge', safeCenterPersonId, DEMO_PEOPLE, DEMO_FAMILIES)
  }

  const personIds = collectFocusPeople(safeCenterPersonId)
  const families = DEMO_FAMILIES.filter(item => (
    item.partners.some(id => personIds.has(id)) || item.children.some(id => personIds.has(id))
  ))
  families.forEach(item => {
    item.partners.forEach(id => personIds.add(id))
    item.children.forEach(id => personIds.add(id))
  })
  const people = DEMO_PEOPLE.filter(item => personIds.has(item.id))
  return graphResponse(viewMode, safeCenterPersonId, people, families)
}

/**
 * 创建人物节点。
 */
function person(id, name, gender, birthDate) {
  return {
    id,
    type: 'person',
    name,
    gender,
    birth_date: birthDate,
    death_date: null,
    is_alive: true,
    badges: []
  }
}

/**
 * 创建家庭定义。
 */
function family(id, partners, children, displayOrder) {
  return {
    id: `family:${id}`,
    type: 'familyUnit',
    family_type: 'marriage',
    label: '婚姻家庭',
    display_order: displayOrder,
    partners,
    children
  }
}

/**
 * 组装 GraphViewResponse 结构。
 */
function graphResponse(viewMode, centerPersonId, people, families) {
  return {
    view_mode: viewMode,
    center_person_id: centerPersonId,
    nodes: [
      ...people.sort(comparePeople),
      ...families.map(({ partners, children, ...node }) => node)
    ],
    edges: buildEdges(families),
    hidden_relation_count: 0,
    warnings: [FALLBACK_WARNING]
  }
}

/**
 * 根据家庭定义生成前端图谱边。
 */
function buildEdges(families) {
  const edges = []
  families.forEach(item => {
    item.partners.forEach((partnerId, index) => {
      edges.push({
        id: `${partnerId}->${item.id}:partner:${index}`,
        source: partnerId,
        target: item.id,
        relation: 'partner',
        label: '伴侣',
        style: 'spouse',
        metadata: { displayOrder: index + 1 }
      })
    })
    item.children.forEach((childId, index) => {
      edges.push({
        id: `${item.id}->${childId}:child:${index}`,
        source: item.id,
        target: childId,
        relation: 'biological',
        label: '子女',
        style: 'solid',
        metadata: { birthOrder: index + 1 }
      })
    })
  })
  return edges
}

/**
 * 收集中心人物附近的演示人物。
 */
function collectFocusPeople(centerPersonId) {
  const ids = new Set([centerPersonId])
  DEMO_FAMILIES.forEach(item => {
    if (item.children.includes(centerPersonId) || item.partners.includes(centerPersonId)) {
      item.partners.forEach(id => ids.add(id))
      item.children.forEach(id => ids.add(id))
    }
  })
  DEMO_FAMILIES.forEach(item => {
    if (!item.children.some(id => ids.has(id))) return
    item.partners.forEach(id => ids.add(id))
    item.children.forEach(id => ids.add(id))
  })
  return ids
}

/**
 * 按出生日期和 ID 稳定排序人物。
 */
function comparePeople(left, right) {
  return String(left.birth_date || '').localeCompare(String(right.birth_date || '')) ||
    String(left.id).localeCompare(String(right.id))
}

/**
 * 兜底图只接受演示人物作为中心，避免异常 ID 过滤成空图。
 */
function normalizeCenterPersonId(personId) {
  const value = String(personId || '')
  return DEMO_PEOPLE.some(item => item.id === value) ? value : 'demo:child'
}
