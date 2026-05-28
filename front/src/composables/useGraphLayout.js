/**
 * 图谱布局
 * 把后端图数据库结构投影为传统家谱树视图。
 */
const PERSON_SIZE = { width: 118, height: 46 }
const OVERVIEW_PERSON_SIZE = { width: 96, height: 38 }
const PARTNER_GAP = 96
const SIBLING_GAP = 76
const FAMILY_GAP = 138
const LEVEL_GAP = 128
const TOP_PADDING = 42
const CHILD_BUS_OFFSET = 70
const GRAPH_STYLE = {
  nodeFill: 'rgba(24, 24, 20, 0.94)',
  nodeStroke: 'rgba(255, 238, 137, 0.72)',
  nodeShadow: 'rgba(255, 250, 0, 0.16)',
  labelFill: '#fff8d6',
  lineStroke: 'rgba(224, 211, 157, 0.72)',
  lineShadow: 'rgba(255, 250, 0, 0.08)'
}

// --- 对外转换 --- //

/**
 * 把后端 GraphViewDTO 转换为 G6 家谱数据。
 */
export async function layoutGraph(graph) {
  const model = buildFamilyModel(graph)
  const layout = graph.view_mode === 'overview'
    ? layoutOverview(model)
    : layoutGenealogy(model, graph.view_mode)
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
 * 创建正式家谱布局数据。
 */
function layoutGenealogy(model) {
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
 * 创建家族全景布局数据。
 */
function layoutOverview(model) {
  const state = createLayoutState(model)
  const components = findConnectedComponents(model)
  const columns = Math.max(1, Math.ceil(Math.sqrt(components.length || 1)))
  const clusterWidth = 760
  const clusterHeight = 520

  components.forEach((component, index) => {
    const origin = {
      x: (index % columns) * clusterWidth,
      y: Math.floor(index / columns) * clusterHeight
    }
    layoutOverviewComponent(state, component, origin)
  })

  layoutOverviewRemainingPersons(state, components.length, columns, clusterWidth, clusterHeight)
  addOverviewEdges(state)
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

// --- 全景布局 --- //

/**
 * 查找全景图中的连通分量。
 */
function findConnectedComponents(model) {
  const adjacency = new Map(model.persons.map(person => [person.id, new Set()]))
  model.familyMap.forEach(family => {
    const members = [...family.partners, ...family.children].filter(id => adjacency.has(id))
    members.forEach(source => {
      members.forEach(target => {
        if (source !== target) adjacency.get(source).add(target)
      })
    })
  })

  const visited = new Set()
  const components = []
  model.persons.forEach(person => {
    if (visited.has(person.id)) return
    const queue = [person.id]
    const ids = []
    visited.add(person.id)
    while (queue.length) {
      const id = queue.shift()
      ids.push(id)
      adjacency.get(id)?.forEach(nextId => {
        if (visited.has(nextId)) return
        visited.add(nextId)
        queue.push(nextId)
      })
    }
    components.push(ids.sort((a, b) => comparePersons(model.personMap.get(a), model.personMap.get(b))))
  })

  return components.sort((a, b) => b.length - a.length || a[0].localeCompare(b[0]))
}

/**
 * 布局单个全景分量。
 */
function layoutOverviewComponent(state, personIds, origin) {
  const generations = assignOverviewGenerations(state, personIds)
  const grouped = groupByGeneration(personIds, generations)
  const rowGap = 104
  const colGap = 136
  let rowIndex = 0

  ;[...grouped.keys()].sort((a, b) => a - b).forEach(generation => {
    const ids = grouped.get(generation).sort((a, b) => (
      comparePersons(state.personMap.get(a), state.personMap.get(b))
    ))
    const totalWidth = (ids.length - 1) * colGap
    ids.forEach((personId, index) => {
      placeOverviewPerson(
        state,
        personId,
        origin.x + totalWidth / -2 + index * colGap,
        origin.y + rowIndex * rowGap
      )
    })
    rowIndex += 1
  })
}

/**
 * 给全景分量估算代际层级。
 */
function assignOverviewGenerations(state, personIds) {
  const idSet = new Set(personIds)
  const childToParents = new Map()
  const parentToChildren = new Map()
  state.familyMap.forEach(family => {
    const partners = family.partners.filter(id => idSet.has(id))
    const children = family.children.filter(id => idSet.has(id))
    children.forEach(childId => {
      partners.forEach(parentId => {
        pushToMap(childToParents, childId, parentId)
        pushToMap(parentToChildren, parentId, childId)
      })
    })
  })

  const roots = personIds.filter(personId => !childToParents.has(personId))
  const queue = (roots.length ? roots : [personIds[0]]).map(personId => ({ personId, generation: 0 }))
  const generations = new Map()
  while (queue.length) {
    const { personId, generation } = queue.shift()
    if (generations.has(personId) && generations.get(personId) <= generation) continue
    generations.set(personId, generation)
    ;(parentToChildren.get(personId) || []).forEach(childId => {
      queue.push({ personId: childId, generation: generation + 1 })
    })
  }

  personIds.forEach(personId => {
    if (!generations.has(personId)) generations.set(personId, 0)
  })
  return generations
}

/**
 * 按代际分组人物。
 */
function groupByGeneration(personIds, generations) {
  const grouped = new Map()
  personIds.forEach(personId => {
    const generation = generations.get(personId) || 0
    if (!grouped.has(generation)) grouped.set(generation, [])
    grouped.get(generation).push(personId)
  })
  return grouped
}

/**
 * 布局全景中未进入连通分量的人物。
 */
function layoutOverviewRemainingPersons(state, componentCount, columns, clusterWidth, clusterHeight) {
  const startIndex = componentCount
  let cursor = 0
  state.persons.forEach(person => {
    if (state.placedPersons.has(person.id)) return
    const index = startIndex + cursor
    placeOverviewPerson(
      state,
      person.id,
      (index % columns) * clusterWidth,
      Math.floor(index / columns) * clusterHeight
    )
    cursor += 1
  })
}

/**
 * 放置全景人物节点。
 */
function placeOverviewPerson(state, personId, x, y) {
  if (state.positions.has(personId)) return state.positions.get(personId)

  const person = state.personMap.get(personId)
  if (!person) return null

  const position = { x, y }
  state.positions.set(personId, position)
  state.placedPersons.add(personId)
  state.nodes.push(toPersonNode(person, position, OVERVIEW_PERSON_SIZE))
  return position
}

/**
 * 生成全景关系线。
 */
function addOverviewEdges(state) {
  state.familyMap.forEach(family => {
    addOverviewSpouseEdges(state, family)
    addOverviewChildEdges(state, family)
  })
}

/**
 * 生成全景配偶线。
 */
function addOverviewSpouseEdges(state, family) {
  if (family.partners.length < 2) return
  for (let index = 0; index < family.partners.length - 1; index += 1) {
    const source = family.partners[index]
    const target = family.partners[index + 1]
    if (!state.positions.has(source) || !state.positions.has(target)) continue
    state.edges.push({
      id: `overview:spouse:${family.id}:${source}:${target}`,
      source,
      target,
      label: '',
      type: 'line',
      relation: 'spouse',
      style: treeLineStyle(1.6)
    })
  }
}

/**
 * 生成全景亲子线。
 */
function addOverviewChildEdges(state, family) {
  const parents = family.partners.filter(id => state.positions.has(id))
  const children = family.children.filter(id => state.positions.has(id))
  if (!parents.length || !children.length) return

  const parentCenter = averagePosition(state, parents)
  children.forEach(childId => {
    addRoutedLine(
      state,
      `overview:child:${family.id}:${childId}`,
      parentCenter,
      state.positions.get(childId),
      'child',
      'overview-link'
    )
  })
}

/**
 * 计算一组人物的平均位置。
 */
function averagePosition(state, personIds) {
  const points = personIds.map(id => state.positions.get(id)).filter(Boolean)
  return {
    x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
    y: points.reduce((sum, point) => sum + point.y, 0) / points.length
  }
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
  const partnerPositions = placePartners(state, partners, centerX, y, requiredPersonId)
  const familyCenter = getFamilyCenter(partnerPositions, centerX)
  addSpouseEdge(state, familyId, partners)

  const anchor = createFamilyAnchor(state, familyId, familyCenter.x, y)
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
  const childAreaLeft = anchor.x - totalChildrenWidth / 2
  const minLeft = familyLeft + (familyWidth - totalChildrenWidth) / 2
  let cursor = family.children.length === 1 ? childAreaLeft : Math.max(minLeft, childAreaLeft)
  const childPositions = []

  family.children.forEach((childId, index) => {
    const childWidth = childWidths[index]
    const childPosition = layoutPersonSubtree(state, childId, cursor, level + 1, visitedFamilies)
    if (childPosition) childPositions.push({ childId, position: childPosition })
    cursor += childWidth + SIBLING_GAP
  })

  addFamilyChildEdges(state, family.id, anchor, childPositions, level)
}

/**
 * 放置配偶组。
 */
function placePartners(state, partners, centerX, y, requiredPersonId) {
  const width = getPartnerWidth({ partners })
  let cursor = requiredPersonId ? centerX - PERSON_SIZE.width / 2 : centerX - width / 2
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
  const y = parentY
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
 * 计算家庭亲子线下接点。
 */
function getFamilyCenter(partnerPositions, fallbackX) {
  const validPositions = partnerPositions.filter(Boolean)
  if (!validPositions.length) return { x: fallbackX }
  if (validPositions.length === 1) return validPositions[0]

  const first = validPositions[0]
  const last = validPositions[validPositions.length - 1]
  return {
    x: (first.x + last.x) / 2
  }
}

/**
 * 添加不可见线段端点。
 */
function addLineAnchor(state, id, point) {
  state.nodes.push({
    id,
    x: point.x,
    y: point.y,
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
}

/**
 * 添加一条由固定端点控制的家谱线段。
 */
function addRoutedLine(state, id, startPoint, endPoint, relation, segment) {
  if (startPoint.x === endPoint.x && startPoint.y === endPoint.y) return

  const startId = `${id}:start`
  const endId = `${id}:end`
  addLineAnchor(state, startId, startPoint)
  addLineAnchor(state, endId, endPoint)
  state.edges.push({
    id,
    source: startId,
    target: endId,
    label: '',
    type: 'line',
    relation,
    segment,
    style: treeLineStyle(1.8)
  })
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
    style: treeLineStyle(2)
  })
}

/**
 * 添加家庭到子女的树状分叉线。
 */
function addFamilyChildEdges(state, familyId, anchor, childPositions, level) {
  if (!childPositions.length) return

  const parentY = TOP_PADDING + level * LEVEL_GAP
  const childTopY = Math.min(...childPositions.map(child => child.position.y - PERSON_SIZE.height / 2))
  const busY = childPositions.length === 1
    ? childTopY
    : parentY + PERSON_SIZE.height / 2 + CHILD_BUS_OFFSET
  const childXs = childPositions.map(child => child.position.x)
  const busStartX = Math.min(anchor.x, ...childXs)
  const busEndX = Math.max(anchor.x, ...childXs)

  addRoutedLine(
    state,
    `child:${familyId}:parent-stem`,
    { x: anchor.x, y: parentY },
    { x: anchor.x, y: busY },
    'child',
    'parent-stem'
  )
  addRoutedLine(
    state,
    `child:${familyId}:sibling-bus`,
    { x: busStartX, y: busY },
    { x: busEndX, y: busY },
    'child',
    'sibling-bus'
  )

  childPositions.forEach(({ childId, position }) => {
    addRoutedLine(
      state,
      `child:${familyId}:${childId}:child-stem`,
      { x: position.x, y: busY },
      { x: position.x, y: position.y - PERSON_SIZE.height / 2 },
      'child',
      'child-stem'
    )
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
function toPersonNode(person, position, size = PERSON_SIZE) {
  return {
    id: person.id,
    x: position.x,
    y: position.y,
    type: 'rect',
    label: person.name,
    nodeType: 'person',
    raw: person,
    size: [size.width, size.height],
    style: {
      radius: 7,
      fill: GRAPH_STYLE.nodeFill,
      stroke: GRAPH_STYLE.nodeStroke,
      lineWidth: 1.8,
      shadowColor: GRAPH_STYLE.nodeShadow,
      shadowBlur: 14
    },
    labelCfg: {
      style: {
        fill: GRAPH_STYLE.labelFill,
        fontSize: 15,
        fontWeight: 800
      }
    }
  }
}

/**
 * 按稳定字段比较人物顺序。
 */
function comparePersons(left, right) {
  return String(left?.birth_date || '').localeCompare(String(right?.birth_date || '')) ||
    String(left?.name || '').localeCompare(String(right?.name || '')) ||
    String(left?.id || '').localeCompare(String(right?.id || ''))
}

/**
 * 返回家谱线样式。
 */
function treeLineStyle(lineWidth) {
  return {
    stroke: GRAPH_STYLE.lineStroke,
    lineWidth,
    endArrow: false,
    lineAppendWidth: 6,
    shadowColor: GRAPH_STYLE.lineShadow,
    shadowBlur: 4
  }
}
