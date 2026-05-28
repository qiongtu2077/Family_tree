/**
 * 图谱布局
 * 把后端图数据库结构投影为传统家谱树视图。
 */
const PERSON_SIZE = { width: 118, height: 46 }
const PARTNER_GAP = 96
const SIBLING_GAP = 76
const FAMILY_GAP = 138
const LEVEL_GAP = 128
const TOP_PADDING = 42
const CHILD_BUS_OFFSET = 70

// --- 对外转换 --- //

/**
 * 把后端 GraphViewDTO 转换为 G6 家谱数据。
 */
export async function layoutGraph(graph) {
  const model = buildFamilyModel(graph)
  const layout = createLayout(model)
  return {
    nodes: layout.nodes,
    edges: layout.edges
  }
}

// --- 数据建模 --- //

/**
 * 构建人物、家庭和亲子关系索引。
 */
function buildFamilyModel(graph) {
  const persons = graph.nodes.filter(node => node.type === 'person')
  const personMap = new Map(persons.map(person => [person.id, person]))
  const familyMap = new Map(
    graph.nodes
      .filter(node => node.type === 'familyUnit')
      .map(unit => [unit.id, createFamily(unit.id)])
  )
  const spousePairs = []
  const directParentEdges = []

  graph.edges.forEach(edge => {
    if (familyMap.has(edge.target) && personMap.has(edge.source)) {
      addUnique(familyMap.get(edge.target).partners, edge.source)
      return
    }
    if (familyMap.has(edge.source) && personMap.has(edge.target)) {
      addUnique(familyMap.get(edge.source).children, edge.target)
      return
    }
    if (edge.relation === 'spouse' && personMap.has(edge.source) && personMap.has(edge.target)) {
      spousePairs.push([edge.source, edge.target])
      return
    }
    if (isParentRelation(edge) && personMap.has(edge.source) && personMap.has(edge.target)) {
      directParentEdges.push(edge)
    }
  })

  foldSpousePairs(spousePairs, familyMap)
  foldDirectParentEdges(directParentEdges, familyMap)

  return buildModelIndexes(personMap, familyMap)
}

/**
 * 创建家庭索引项。
 */
function createFamily(id) {
  return {
    id,
    partners: [],
    children: []
  }
}

/**
 * 判断是否为直接亲子边。
 */
function isParentRelation(edge) {
  return ['father', 'mother', 'parent'].includes(edge.relation)
}

/**
 * 折叠配偶边，避免重复绘制双向关系。
 */
function foldSpousePairs(spousePairs, familyMap) {
  spousePairs.forEach(pair => {
    const [source, target] = pair
    if (findFamilyByPartners(familyMap, source, target)) return
    const familyId = `spouse:${[source, target].sort().join(':')}`
    if (!familyMap.has(familyId)) {
      const family = createFamily(familyId)
      family.partners = [source, target]
      familyMap.set(familyId, family)
    }
  })
}

/**
 * 折叠缺少家庭单元的直接亲子边。
 */
function foldDirectParentEdges(parentEdges, familyMap) {
  parentEdges.forEach(edge => {
    if (findFamilyByChild(familyMap, edge.target)) return
    const familyId = `direct:${edge.source}:${edge.target}`
    if (!familyMap.has(familyId)) {
      const family = createFamily(familyId)
      family.partners = [edge.source]
      family.children = [edge.target]
      familyMap.set(familyId, family)
    }
  })
}

/**
 * 生成布局需要的反向索引。
 */
function buildModelIndexes(personMap, familyMap) {
  const partnerFamiliesByPerson = new Map()
  const parentFamiliesByChild = new Map()

  familyMap.forEach(family => {
    family.partners.forEach(personId => {
      pushToMap(partnerFamiliesByPerson, personId, family.id)
    })
    family.children.forEach(personId => {
      pushToMap(parentFamiliesByChild, personId, family.id)
    })
  })

  partnerFamiliesByPerson.forEach(familyIds => {
    familyIds.sort((a, b) => {
      const familyA = familyMap.get(a)
      const familyB = familyMap.get(b)
      return familyB.children.length - familyA.children.length
    })
  })

  return {
    persons: [...personMap.values()],
    personMap,
    familyMap,
    partnerFamiliesByPerson,
    parentFamiliesByChild
  }
}

/**
 * 查找是否已存在同一组配偶家庭。
 */
function findFamilyByPartners(familyMap, source, target) {
  return [...familyMap.values()].find(family => (
    family.partners.includes(source) && family.partners.includes(target)
  ))
}

/**
 * 查找子女是否已经归属某个家庭。
 */
function findFamilyByChild(familyMap, childId) {
  return [...familyMap.values()].find(family => family.children.includes(childId))
}

/**
 * 向数组中添加不重复值。
 */
function addUnique(list, value) {
  if (!list.includes(value)) list.push(value)
}

/**
 * 向 Map 数组桶添加值。
 */
function pushToMap(map, key, value) {
  if (!map.has(key)) map.set(key, [])
  addUnique(map.get(key), value)
}

// --- 家谱布局 --- //

/**
 * 创建完整 G6 布局数据。
 */
function createLayout(model) {
  const state = createLayoutState(model)
  const roots = findRootFamilies(model)
  let cursor = 0

  roots.forEach(familyId => {
    const width = measureFamily(model, familyId, new Set())
    layoutFamily(state, familyId, cursor, 0, null, new Set())
    cursor += width + FAMILY_GAP
  })

  layoutRemainingPersons(state, cursor)
  return {
    nodes: state.nodes,
    edges: state.edges
  }
}

/**
 * 创建布局运行状态。
 */
function createLayoutState(model) {
  return {
    ...model,
    nodes: [],
    edges: [],
    positions: new Map(),
    placedPersons: new Set(),
    placedFamilies: new Set()
  }
}

/**
 * 查找最上层家庭。
 */
function findRootFamilies(model) {
  const roots = [...model.familyMap.values()]
    .filter(family => family.partners.length > 0)
    .filter(family => family.partners.every(personId => !model.parentFamiliesByChild.has(personId)))
    .map(family => family.id)

  return roots.length ? roots : [...model.familyMap.keys()]
}

/**
 * 布局尚未被家庭递归覆盖的人物。
 */
function layoutRemainingPersons(state, startX) {
  let cursor = startX
  state.persons.forEach(person => {
    if (state.placedPersons.has(person.id)) return
    placePerson(state, person.id, cursor + PERSON_SIZE.width / 2, TOP_PADDING)
    cursor += PERSON_SIZE.width + SIBLING_GAP
  })
}

/**
 * 测量家庭子树宽度。
 */
function measureFamily(model, familyId, visitedFamilies) {
  if (visitedFamilies.has(familyId)) return PERSON_SIZE.width
  visitedFamilies.add(familyId)

  const family = model.familyMap.get(familyId)
  if (!family) return PERSON_SIZE.width

  const partnerWidth = getPartnerWidth(family)
  const childWidths = family.children.map(childId => measurePersonSubtree(model, childId, visitedFamilies))
  const childrenWidth = getTotalWidth(childWidths, SIBLING_GAP)
  visitedFamilies.delete(familyId)
  return Math.max(partnerWidth, childrenWidth, PERSON_SIZE.width)
}

/**
 * 测量人物及其配偶/后代子树宽度。
 */
function measurePersonSubtree(model, personId, visitedFamilies) {
  const familyId = findPrimaryPartnerFamily(model, personId, visitedFamilies)
  if (!familyId) return PERSON_SIZE.width
  return measureFamily(model, familyId, visitedFamilies)
}

/**
 * 递归布局家庭。
 */
function layoutFamily(state, familyId, left, level, requiredPersonId, visitedFamilies) {
  if (visitedFamilies.has(familyId) || state.placedFamilies.has(familyId)) {
    if (requiredPersonId) return state.positions.get(requiredPersonId)
    return null
  }

  visitedFamilies.add(familyId)
  state.placedFamilies.add(familyId)

  const family = state.familyMap.get(familyId)
  const width = measureFamily(state, familyId, new Set())
  const centerX = left + width / 2
  const y = TOP_PADDING + level * LEVEL_GAP
  const partners = orderPartners(family.partners, requiredPersonId)
  const partnerPositions = placePartners(state, partners, centerX, y)
  addSpouseEdge(state, familyId, partners)

  const anchor = createFamilyAnchor(state, familyId, centerX, y)
  layoutChildren(state, family, anchor, left, width, level, visitedFamilies)

  visitedFamilies.delete(familyId)
  return requiredPersonId ? state.positions.get(requiredPersonId) : partnerPositions[0]
}

/**
 * 递归布局人物子树。
 */
function layoutPersonSubtree(state, personId, left, level, visitedFamilies) {
  const familyId = findPrimaryPartnerFamily(state, personId, visitedFamilies)
  if (familyId) {
    return layoutFamily(state, familyId, left, level, personId, visitedFamilies)
  }

  const x = left + PERSON_SIZE.width / 2
  const y = TOP_PADDING + level * LEVEL_GAP
  return placePerson(state, personId, x, y)
}

/**
 * 布局家庭中的所有子女。
 */
function layoutChildren(state, family, anchor, familyLeft, familyWidth, level, visitedFamilies) {
  const childWidths = family.children.map(childId => measurePersonSubtree(state, childId, visitedFamilies))
  const totalChildrenWidth = getTotalWidth(childWidths, SIBLING_GAP)
  let cursor = familyLeft + (familyWidth - totalChildrenWidth) / 2

  family.children.forEach((childId, index) => {
    const childWidth = childWidths[index]
    const childPosition = layoutPersonSubtree(state, childId, cursor, level + 1, visitedFamilies)
    if (childPosition) addChildEdge(state, family.id, anchor, childId, childPosition, level)
    cursor += childWidth + SIBLING_GAP
  })
}

/**
 * 放置配偶组。
 */
function placePartners(state, partners, centerX, y) {
  const width = getPartnerWidth({ partners })
  let cursor = centerX - width / 2
  return partners.map(personId => {
    const position = placePerson(state, personId, cursor + PERSON_SIZE.width / 2, y)
    cursor += PERSON_SIZE.width + PARTNER_GAP
    return position
  })
}

/**
 * 放置单个人物节点。
 */
function placePerson(state, personId, x, y) {
  if (state.positions.has(personId)) return state.positions.get(personId)

  const person = state.personMap.get(personId)
  if (!person) return null

  const position = { x, y }
  state.positions.set(personId, position)
  state.placedPersons.add(personId)
  state.nodes.push(toPersonNode(person, position))
  return position
}

/**
 * 创建不显示的家庭连线锚点。
 */
function createFamilyAnchor(state, familyId, x, parentY) {
  const id = `anchor:${familyId}`
  const y = parentY + PERSON_SIZE.height / 2 + CHILD_BUS_OFFSET / 2
  state.nodes.push({
    id,
    x,
    y,
    type: 'circle',
    size: 1,
    label: '',
    nodeType: 'anchor',
    style: {
      opacity: 0,
      fill: 'transparent',
      stroke: 'transparent'
    }
  })
  return { id, x, y }
}

/**
 * 添加配偶水平线。
 */
function addSpouseEdge(state, familyId, partners) {
  if (partners.length < 2) return
  state.edges.push({
    id: `spouse:${familyId}:${partners[0]}:${partners[1]}`,
    source: partners[0],
    target: partners[1],
    sourceAnchor: 3,
    targetAnchor: 2,
    label: '',
    type: 'line',
    relation: 'spouse',
    style: treeLineStyle(3.8)
  })
}

/**
 * 添加家庭到子女的树状分叉线。
 */
function addChildEdge(state, familyId, anchor, childId, childPosition, level) {
  const parentY = TOP_PADDING + level * LEVEL_GAP
  const busY = parentY + PERSON_SIZE.height / 2 + CHILD_BUS_OFFSET
  state.edges.push({
    id: `child:${familyId}:${childId}`,
    source: anchor.id,
    target: childId,
    targetAnchor: 0,
    label: '',
    type: 'polyline',
    relation: 'child',
    controlPoints: [
      { x: anchor.x, y: busY },
      { x: childPosition.x, y: busY }
    ],
    style: treeLineStyle(4.4)
  })
}

/**
 * 选择人物作为配偶时承载的家庭。
 */
function findPrimaryPartnerFamily(model, personId, visitedFamilies) {
  const familyIds = model.partnerFamiliesByPerson.get(personId) || []
  return familyIds.find(familyId => !visitedFamilies.has(familyId))
}

/**
 * 把指定人物排在其配偶组首位。
 */
function orderPartners(partners, requiredPersonId) {
  if (!requiredPersonId || !partners.includes(requiredPersonId)) return partners
  return [requiredPersonId, ...partners.filter(personId => personId !== requiredPersonId)]
}

/**
 * 计算配偶组宽度。
 */
function getPartnerWidth(family) {
  if (!family.partners.length) return PERSON_SIZE.width
  return family.partners.length * PERSON_SIZE.width + Math.max(0, family.partners.length - 1) * PARTNER_GAP
}

/**
 * 计算一组宽度的总占用。
 */
function getTotalWidth(widths, gap) {
  if (!widths.length) return 0
  return widths.reduce((sum, width) => sum + width, 0) + (widths.length - 1) * gap
}

// --- G6 渲染模型 --- //

/**
 * 把人物转换为 G6 节点。
 */
function toPersonNode(person, position) {
  return {
    id: person.id,
    x: position.x,
    y: position.y,
    type: 'rect',
    label: person.name,
    nodeType: 'person',
    raw: person,
    size: [PERSON_SIZE.width, PERSON_SIZE.height],
    style: {
      radius: 4,
      fill: '#191919',
      stroke: '#ff3b42',
      lineWidth: 4,
      shadowColor: 'rgba(255, 59, 66, 0.18)',
      shadowBlur: 12
    },
    labelCfg: {
      style: {
        fill: '#f0f0f0',
        fontSize: 15,
        fontWeight: 800
      }
    }
  }
}

/**
 * 返回家谱线样式。
 */
function treeLineStyle(lineWidth) {
  return {
    stroke: '#00a6ff',
    lineWidth,
    endArrow: false,
    lineAppendWidth: 8,
    shadowColor: 'rgba(0, 166, 255, 0.18)',
    shadowBlur: 6
  }
}
