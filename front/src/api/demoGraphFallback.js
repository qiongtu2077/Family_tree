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
const FALLBACK_BRANCH_WARNING = 'Neo4j 暂不可用，当前显示本地演示后代分支。'

/**
 * 返回本地演示人物列表。
 */
export function getFallbackPeople() {
  return [...DEMO_PEOPLE].sort(comparePeople)
}

/**
 * 返回本地演示中心人物上下文。
 */
export function getFallbackCenterContext(personId = 'demo:child') {
  const safePersonId = normalizeCenterPersonId(personId)
  const person = DEMO_PEOPLE.find(item => item.id === safePersonId)
  if (!person) return null

  return {
    person,
    available_spouses: buildFallbackSpouseOptions(safePersonId),
    available_family_units: buildFallbackFamilyOptions(safePersonId),
    default_mainline_depth: 3,
    nine_kinship_summary: buildFallbackKinshipSummary(safePersonId),
    warnings: ['当前使用本地演示中心人物上下文']
  }
}

/**
 * 返回本地演示图谱。
 */
export function getFallbackGraph(viewMode = 'mainline', centerPersonId = 'demo:child', options = {}) {
  const safeCenterPersonId = normalizeCenterPersonId(centerPersonId)
  if (viewMode === 'overview') {
    return graphResponse('overview', null, DEMO_PEOPLE, DEMO_FAMILIES)
  }

  if (viewMode === 'branch') {
    const branch = collectBranchProjection(
      options.rootType,
      options.rootId,
      safeCenterPersonId,
      options.depth
    )
    return graphResponse('branch', safeCenterPersonId, branch.people, branch.families, branch.warnings)
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
function graphResponse(viewMode, centerPersonId, people, families, warnings = [FALLBACK_WARNING]) {
  return {
    view_mode: viewMode,
    center_person_id: centerPersonId,
    nodes: [
      ...[...people].sort(comparePeople),
      ...families.map(({ partners, children, ...node }) => node)
    ],
    edges: buildEdges(families),
    hidden_relation_count: 0,
    warnings
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
 * 只沿 FamilyUnit -> children -> children 的家庭单元收集后代分支。
 */
function collectBranchProjection(rootType, rootId, centerPersonId, depth = 5) {
  const rootFamily = resolveBranchRootFamily(rootType, rootId, centerPersonId)
  if (!rootFamily) {
    const person = DEMO_PEOPLE.find(item => item.id === centerPersonId)
    return {
      people: person ? [person] : [],
      families: [],
      warnings: [FALLBACK_BRANCH_WARNING, '本地演示数据中该人物暂无可展开后代分支。']
    }
  }

  const maxDepth = normalizeDepth(depth)
  const projectedFamilies = new Map()
  const personIds = new Set()
  let frontier = [{ family: rootFamily, generation: 0 }]

  addProjectedFamily(projectedFamilies, rootFamily, rootFamily.partners, [])
  rootFamily.partners.forEach(id => personIds.add(id))

  while (frontier.length) {
    const nextFrontier = []
    frontier.forEach(({ family: currentFamily, generation }) => {
      const nextGeneration = generation + 1
      if (nextGeneration > maxDepth) return

      const projectedFamily = projectedFamilies.get(currentFamily.id)
      currentFamily.children.forEach(childId => {
        projectedFamily.children.push(childId)
        personIds.add(childId)

        // 只从“后代本人作为伴侣”的家庭继续向下，不拉入配偶原生父母。
        findChildFamilies(childId).forEach(childFamily => {
          childFamily.partners.forEach(partnerId => personIds.add(partnerId))
          if (nextGeneration < maxDepth) {
            addProjectedFamily(projectedFamilies, childFamily, childFamily.partners, [])
            nextFrontier.push({ family: childFamily, generation: nextGeneration })
          } else {
            addProjectedFamily(projectedFamilies, childFamily, childFamily.partners, [])
          }
        })
      })
    })
    frontier = nextFrontier
  }

  const people = DEMO_PEOPLE.filter(item => personIds.has(item.id))
  const families = [...projectedFamilies.values()].filter(item => (
    item.partners.some(id => personIds.has(id)) || item.children.some(id => personIds.has(id))
  ))
  return {
    people,
    families,
    warnings: [FALLBACK_BRANCH_WARNING]
  }
}

/**
 * 根据人物或家庭单元入口解析后代分支根家庭。
 */
function resolveBranchRootFamily(rootType, rootId, centerPersonId) {
  if (rootType === 'familyUnit') {
    const familyId = normalizeFamilyUnitId(rootId)
    return DEMO_FAMILIES.find(item => normalizeFamilyUnitId(item.id) === familyId) || null
  }

  const personId = normalizeCenterPersonId(rootId || centerPersonId)
  return findChildFamilies(personId)[0] || null
}

/**
 * 查找人物作为伴侣且拥有子女的家庭单元。
 */
function findChildFamilies(personId) {
  return DEMO_FAMILIES
    .filter(item => item.partners.includes(personId) && item.children.length)
    .sort(compareFamilies)
}

/**
 * 添加投影家庭，允许按深度裁剪子女列表。
 */
function addProjectedFamily(projectedFamilies, familyNode, partners, children) {
  if (projectedFamilies.has(familyNode.id)) return projectedFamilies.get(familyNode.id)
  const projectedFamily = {
    ...familyNode,
    partners: [...partners],
    children: [...children]
  }
  projectedFamilies.set(familyNode.id, projectedFamily)
  return projectedFamily
}

/**
 * 构造本地演示配偶候选。
 */
function buildFallbackSpouseOptions(personId) {
  return DEMO_FAMILIES
    .filter(item => item.partners.includes(personId))
    .flatMap(item => item.partners
      .filter(partnerId => partnerId !== personId)
      .map(partnerId => ({
        person: DEMO_PEOPLE.find(personNode => personNode.id === partnerId),
        family_unit_id: stripGraphFamilyPrefix(item.id),
        child_count: item.children.length
      }))
    )
    .filter(item => item.person)
}

/**
 * 构造本地演示后代根家庭候选。
 */
function buildFallbackFamilyOptions(personId) {
  return DEMO_FAMILIES
    .filter(item => item.partners.includes(personId))
    .sort(compareFamilies)
    .map(item => ({
      family_unit_id: stripGraphFamilyPrefix(item.id),
      family_type: item.family_type,
      label: item.label,
      spouse_ids: [...item.partners],
      spouse_names: item.partners
        .map(partnerId => DEMO_PEOPLE.find(personNode => personNode.id === partnerId)?.name)
        .filter(Boolean),
      child_count: item.children.length
    }))
}

/**
 * 构造本地演示九族摘要。
 */
function buildFallbackKinshipSummary(personId) {
  const ancestors = collectAncestors(personId)
  const descendants = collectDescendants(personId)
  return {
    ancestor_depth: 4,
    descendant_depth: 4,
    ancestor_count: ancestors.size,
    descendant_count: descendants.size,
    visible_person_count: new Set([personId, ...ancestors, ...descendants]).size,
    hidden_relation_count: 0
  }
}

/**
 * 收集本地演示祖先 ID。
 */
function collectAncestors(personId, visited = new Set()) {
  DEMO_FAMILIES
    .filter(item => item.children.includes(personId))
    .forEach(item => {
      item.partners.forEach(parentId => {
        if (visited.has(parentId)) return
        visited.add(parentId)
        collectAncestors(parentId, visited)
      })
    })
  return visited
}

/**
 * 收集本地演示后代 ID。
 */
function collectDescendants(personId, visited = new Set()) {
  findChildFamilies(personId).forEach(item => {
    item.children.forEach(childId => {
      if (visited.has(childId)) return
      visited.add(childId)
      collectDescendants(childId, visited)
    })
  })
  return visited
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
 * 按家庭显示顺序稳定排序。
 */
function compareFamilies(left, right) {
  return Number(left.display_order || 0) - Number(right.display_order || 0) ||
    String(left.id).localeCompare(String(right.id))
}

/**
 * 兼容前端 family: 前缀和后端原始家庭单元 ID。
 */
function normalizeFamilyUnitId(familyUnitId) {
  return stripGraphFamilyPrefix(String(familyUnitId || ''))
}

/**
 * 去掉图谱节点层 family: 前缀。
 */
function stripGraphFamilyPrefix(familyUnitId) {
  return String(familyUnitId || '').replace(/^family:/, '')
}

/**
 * 规范化后代分支深度。
 */
function normalizeDepth(depth) {
  const parsedDepth = Number.parseInt(depth, 10)
  if (Number.isNaN(parsedDepth)) return 5
  return Math.min(Math.max(parsedDepth, 1), 10)
}

/**
 * 兜底图只接受演示人物作为中心，避免异常 ID 过滤成空图。
 */
function normalizeCenterPersonId(personId) {
  const value = String(personId || '')
  return DEMO_PEOPLE.some(item => item.id === value) ? value : 'demo:child'
}
