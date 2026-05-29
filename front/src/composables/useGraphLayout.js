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
const BRIDGE_PARTNER_SPACING = 300
const BRIDGE_PARENT_OFFSET = 150
const BRIDGE_SIBLING_STEP = PERSON_SIZE.width + SIBLING_GAP
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
  const layouts = {
    mainline: layoutMainline,
    inlaw: layoutInlaw,
    bridge: layoutBridge,
    branch: layoutBranch,
    overview: layoutOverview
  }
  const layoutFactory = layouts[model.viewMode] || layoutMainline
  const layout = layoutFactory(model)
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
  const viewMode = graph.view_mode || 'mainline'
  const viewContext = graph.view_context || {}
  const persons = graph.nodes.filter(node => node.type === 'person')
  const branchCapsules = graph.nodes.filter(node => node.type === 'branchCapsule')
  const personMap = new Map(persons.map(person => [person.id, person]))
  const familyMap = new Map(
    graph.nodes
      .filter(node => node.type === 'familyUnit')
      .map(unit => [unit.id, createFamily(unit.id, unit)])
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

  const model = buildModelIndexes(personMap, familyMap)
  return {
    ...model,
    viewMode,
    viewContext,
    branchCapsules,
    centerPersonId: graph.center_person_id || viewContext.center_person_id || null
  }
}

/**
 * 创建家庭索引项。
 */
function createFamily(id, raw = null) {
  return {
    id,
    raw,
    displayOrder: Number(raw?.display_order || raw?.displayOrder || 0),
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
    family.partners.sort((a, b) => comparePersons(personMap.get(a), personMap.get(b)))
    family.children.sort((a, b) => comparePersons(personMap.get(a), personMap.get(b)))
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
      return familyB.children.length - familyA.children.length || compareFamilies(familyA, familyB)
    })
  })

  parentFamiliesByChild.forEach(familyIds => {
    familyIds.sort((a, b) => compareFamilies(familyMap.get(a), familyMap.get(b)))
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
 * 创建本家主线二维投影。
 */
function layoutMainline(model) {
  if (!model.centerPersonId || !model.personMap.has(model.centerPersonId)) {
    return layoutGenealogy(model)
  }

  const state = createLayoutState(model)
  const centerLevel = getAncestorDepth(model, model.centerPersonId, new Set())
  placePerson(state, model.centerPersonId, 0, TOP_PADDING + centerLevel * LEVEL_GAP)
  layoutAncestorFamilies(state, model.centerPersonId, 0, centerLevel, new Set())
  layoutDescendantFamilies(state, model.centerPersonId, 0, centerLevel, new Set())
  layoutFormalCapsules(state, PERSON_SIZE.width + FAMILY_GAP)
  return {
    nodes: state.nodes,
    edges: state.edges
  }
}

/**
 * 创建姻亲谱系二维投影。
 */
function layoutInlaw(model) {
  const spouseId = model.viewContext.spouse_id
  const centerId = model.viewContext.center_person_id || model.centerPersonId
  if (!spouseId || !centerId || !model.personMap.has(spouseId) || !model.personMap.has(centerId)) {
    return layoutMainline({ ...model, centerPersonId: spouseId || model.centerPersonId })
  }

  const centralFamily = findContextFamily(model) || findFamilyByPartners(model.familyMap, centerId, spouseId)
  const state = createLayoutState(model)
  const partnerY = TOP_PADDING + LEVEL_GAP * 2
  const partners = centralFamily?.partners?.length ? orderPartners(centralFamily.partners, centerId) : [centerId, spouseId]
  const partnerPositions = placePartners(state, partners, 0, partnerY, centerId)
  const familyCenter = getFamilyCenter(partnerPositions, 0)
  let anchor = null
  if (centralFamily) {
    anchor = createFamilyAnchor(state, centralFamily.id, familyCenter.x, partnerY)
    state.placedFamilies.add(centralFamily.id)
    addSpouseEdge(state, centralFamily.id, partners)
  } else {
    addSpouseEdge(state, `inlaw:${centerId}:${spouseId}`, partners)
  }

  layoutInlawOriginFamily(state, spouseId, spouseId === partners[0] ? -1 : 1, partnerY)
  if (centralFamily && anchor) {
    layoutBridgeChildren(state, centralFamily, anchor, partnerY)
  }
  layoutFormalCapsules(state, PERSON_SIZE.width + FAMILY_GAP)
  return {
    nodes: state.nodes,
    edges: state.edges
  }
}

/**
 * 创建联姻桥接二维投影。
 */
function layoutBridge(model) {
  const centralFamily = findBridgeFamily(model)
  if (!centralFamily) return layoutMainline(model)

  const state = createLayoutState(model)
  const partnerY = TOP_PADDING + LEVEL_GAP * 2
  const partners = orderPartners(centralFamily.partners, model.centerPersonId)
  const partnerPositions = placeBridgePartners(state, partners, partnerY)
  const familyCenter = getFamilyCenter(partnerPositions, 0)
  const anchor = createFamilyAnchor(state, centralFamily.id, familyCenter.x, partnerY)
  state.placedFamilies.add(centralFamily.id)
  addSpouseEdge(state, centralFamily.id, partners)
  layoutBridgeSideFamily(state, partners[0], -1, partnerY)
  layoutBridgeSideFamily(state, partners[1], 1, partnerY)
  layoutBridgeChildren(state, centralFamily, anchor, partnerY)
  return {
    nodes: state.nodes,
    edges: state.edges
  }
}

/**
 * 创建后代分支二维投影。
 */
function layoutBranch(model) {
  return layoutGenealogy(model)
}

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

  layoutFormalCapsules(state, cursor)
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
  const clusters = findOverviewClusters(model)
  const columns = Math.max(1, Math.ceil(Math.sqrt(clusters.length || 1)))
  const clusterWidth = 820
  const clusterHeight = 560

  clusters.forEach((cluster, index) => {
    const origin = {
      x: (index % columns) * clusterWidth,
      y: Math.floor(index / columns) * clusterHeight
    }
    layoutOverviewComponent(state, cluster.personIds, origin)
  })

  layoutOverviewRemainingPersons(state, clusters.length, columns, clusterWidth, clusterHeight)
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
    .sort(compareFamilies)
    .map(family => family.id)

  return roots.length ? roots : [...model.familyMap.keys()]
}

/**
 * 估算人物到顶层祖先的层数。
 */
function getAncestorDepth(model, personId, visitedPeople) {
  if (visitedPeople.has(personId)) return 0
  visitedPeople.add(personId)
  const parentFamilyId = model.parentFamiliesByChild.get(personId)?.[0]
  const parentFamily = model.familyMap.get(parentFamilyId)
  if (!parentFamily?.partners.length) return 0
  const depth = 1 + Math.max(
    ...parentFamily.partners.map(parentId => getAncestorDepth(model, parentId, visitedPeople))
  )
  visitedPeople.delete(personId)
  return depth
}

/**
 * 子女排序时把主线人物固定在中心，其他人按稳定字段排列。
 */
function orderChildren(children, primaryChildId, model) {
  const ordered = [...children].sort((a, b) => (
    comparePersons(model.personMap.get(a), model.personMap.get(b))
  ))
  if (!primaryChildId || !ordered.includes(primaryChildId)) return ordered

  const others = ordered.filter(childId => childId !== primaryChildId)
  const middle = Math.floor(others.length / 2)
  return [
    ...others.slice(0, middle),
    primaryChildId,
    ...others.slice(middle)
  ]
}

/**
 * 按显示顺序和家庭 ID 排列家庭。
 */
function compareFamilies(left, right) {
  return Number(left.displayOrder || 0) - Number(right.displayOrder || 0) ||
    String(left.id).localeCompare(String(right.id))
}

/**
 * 布局正式图中的折叠胶囊，避免把无关人物追加成孤儿节点。
 */
function layoutFormalCapsules(state, startX) {
  const explicitCapsules = state.branchCapsules || []
  let cursor = startX
  explicitCapsules.forEach(capsule => {
    placeBranchCapsule(state, capsule, cursor, TOP_PADDING)
    cursor += PERSON_SIZE.width * 1.9 + SIBLING_GAP
  })

  const hiddenPersons = state.persons.filter(person => !state.placedPersons.has(person.id))
  if (hiddenPersons.length) {
    placeBranchCapsule(
      state,
      {
        id: `capsule:hidden:${state.viewMode}`,
        title: `已折叠旁支 · ${hiddenPersons.length} 人`,
        person_count: hiddenPersons.length,
        generation_count: 0,
        preview_names: hiddenPersons.slice(0, 3).map(person => person.name),
        target_view: 'overview'
      },
      cursor,
      TOP_PADDING
    )
  }
}

/**
 * 布局全景中尚未被分簇覆盖的人物。
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
 * 布局中心人物向上的父母家庭。
 */
function layoutAncestorFamilies(state, personId, x, level, visitedFamilies) {
  const parentFamilyId = state.parentFamiliesByChild.get(personId)?.[0]
  if (!parentFamilyId || visitedFamilies.has(parentFamilyId) || state.placedFamilies.has(parentFamilyId)) return

  const family = state.familyMap.get(parentFamilyId)
  if (!family) return

  visitedFamilies.add(parentFamilyId)
  state.placedFamilies.add(parentFamilyId)

  const parentY = TOP_PADDING + (level - 1) * LEVEL_GAP
  const partners = orderPartners(family.partners)
  const partnerPositions = placePartners(state, partners, x, parentY)
  const familyCenter = getFamilyCenter(partnerPositions, x)
  const anchor = createFamilyAnchor(state, parentFamilyId, familyCenter.x, parentY)
  addSpouseEdge(state, parentFamilyId, partners)

  const childPositions = layoutFamilyChildrenOnLevel(
    state,
    family,
    personId,
    x,
    level,
    false,
    visitedFamilies
  )
  addFamilyChildEdges(state, parentFamilyId, anchor, childPositions, level - 1, hasSpouseLine(family))

  partners.forEach(parentId => {
    layoutAncestorFamilies(state, parentId, state.positions.get(parentId)?.x || x, level - 1, visitedFamilies)
  })
  visitedFamilies.delete(parentFamilyId)
}

/**
 * 布局中心人物向下的子女家庭。
 */
function layoutDescendantFamilies(state, personId, x, level, visitedFamilies) {
  const familyIds = state.partnerFamiliesByPerson.get(personId) || []
  familyIds.forEach((familyId, index) => {
    if (visitedFamilies.has(familyId) || state.placedFamilies.has(familyId)) return
    const offset = (index - (familyIds.length - 1) / 2) * (PERSON_SIZE.width + PARTNER_GAP + SIBLING_GAP)
    layoutFamilyFromAnchorPerson(state, familyId, personId, x + offset, level, visitedFamilies)
  })
}

/**
 * 在指定人物位置上展开一个配偶家庭。
 */
function layoutFamilyFromAnchorPerson(state, familyId, anchorPersonId, x, level, visitedFamilies) {
  const family = state.familyMap.get(familyId)
  if (!family) return null

  visitedFamilies.add(familyId)
  state.placedFamilies.add(familyId)

  const y = TOP_PADDING + level * LEVEL_GAP
  placePerson(state, anchorPersonId, x, y)
  const partners = orderPartners(family.partners, anchorPersonId)
  const partnerPositions = placePartners(state, partners, x, y, anchorPersonId)
  const familyCenter = getFamilyCenter(partnerPositions, x)
  const anchor = createFamilyAnchor(state, familyId, familyCenter.x, y)
  addSpouseEdge(state, familyId, partners)

  const childPositions = layoutFamilyChildrenOnLevel(
    state,
    family,
    null,
    familyCenter.x,
    level + 1,
    true,
    visitedFamilies
  )
  addFamilyChildEdges(state, familyId, anchor, childPositions, level, hasSpouseLine(family))
  childPositions.forEach(({ childId, position }) => {
    layoutDescendantFamilies(state, childId, position.x, level + 1, visitedFamilies)
  })

  visitedFamilies.delete(familyId)
  return anchor
}

/**
 * 把一个家庭的子女放到指定代际，主线人物始终对齐下行线。
 */
function layoutFamilyChildrenOnLevel(state, family, primaryChildId, centerX, level, includeSpouseSubtree, visitedFamilies) {
  const children = orderChildren(family.children, primaryChildId, state)
  const childWidths = children.map(childId => {
    if (childId === primaryChildId) return PERSON_SIZE.width
    if (!includeSpouseSubtree || state.positions.has(childId)) return PERSON_SIZE.width
    return measurePersonSubtree(state, childId, visitedFamilies)
  })
  const totalWidth = getTotalWidth(childWidths, SIBLING_GAP)
  const primaryIndex = children.indexOf(primaryChildId)
  const primaryOffset = primaryIndex >= 0
    ? childWidths.slice(0, primaryIndex).reduce((sum, width) => sum + width + SIBLING_GAP, 0) + childWidths[primaryIndex] / 2
    : totalWidth / 2
  let cursor = centerX - primaryOffset
  const childPositions = []

  children.forEach((childId, index) => {
    const childWidth = childWidths[index]
    const x = cursor + childWidth / 2
    const position = includeSpouseSubtree && !state.positions.has(childId)
      ? layoutPersonSubtree(state, childId, cursor, level, visitedFamilies)
      : placePerson(state, childId, x, TOP_PADDING + level * LEVEL_GAP)
    if (position) childPositions.push({ childId, position })
    cursor += childWidth + SIBLING_GAP
  })

  return childPositions
}

/**
 * 为桥接图选择中间婚姻家庭。
 */
function findBridgeFamily(model) {
  const contextFamily = findContextFamily(model)
  if (contextFamily) return contextFamily

  const families = [...model.familyMap.values()]
    .filter(family => family.partners.length >= 2)
    .sort(compareFamilies)
  if (!model.centerPersonId) return families[0]
  return families.find(family => family.partners.includes(model.centerPersonId)) || families[0]
}

/**
 * 根据后端投影上下文查找指定家庭单元。
 */
function findContextFamily(model) {
  const familyUnitId = model.viewContext?.family_unit_id
  if (!familyUnitId) return null
  return model.familyMap.get(normalizeFamilyId(familyUnitId)) || model.familyMap.get(String(familyUnitId)) || null
}

/**
 * 规范化家庭单元前端 ID。
 */
function normalizeFamilyId(familyUnitId) {
  const value = String(familyUnitId || '')
  return value.startsWith('family:') ? value : `family:${value}`
}

/**
 * 在桥接图中固定放置中间联姻夫妻，避免被双方原生家庭挤偏。
 */
function placeBridgePartners(state, partners, y) {
  if (partners.length !== 2) {
    return placePartners(state, partners, 0, y, partners[0])
  }

  return partners.map((personId, index) => {
    const side = index === 0 ? -1 : 1
    return placePerson(state, personId, side * BRIDGE_PARTNER_SPACING / 2, y)
  })
}

/**
 * 布局桥接人物的原生家庭，只展示父母和同胞，避免桥接图递归失控。
 */
function layoutBridgeSideFamily(state, personId, side, partnerY) {
  if (!personId || !side) return

  const parentFamilyId = state.parentFamiliesByChild.get(personId)?.[0]
  const family = state.familyMap.get(parentFamilyId)
  const personPosition = state.positions.get(personId)
  if (!family || !personPosition || state.placedFamilies.has(parentFamilyId)) return

  state.placedFamilies.add(parentFamilyId)
  const parentY = partnerY - LEVEL_GAP
  const parentLevel = (parentY - TOP_PADDING) / LEVEL_GAP
  const parentCenterX = personPosition.x + side * BRIDGE_PARENT_OFFSET
  const parentPositions = placePartners(state, family.partners, parentCenterX, parentY)
  const familyCenter = getFamilyCenter(parentPositions, parentCenterX)
  const anchor = createFamilyAnchor(state, parentFamilyId, familyCenter.x, parentY)
  addSpouseEdge(state, parentFamilyId, family.partners)

  const childPositions = collectBridgeSiblingPositions(state, family, personId, side, personPosition)
  addFamilyChildEdges(state, parentFamilyId, anchor, childPositions, parentLevel, hasSpouseLine(family))
}

/**
 * 布局姻亲图中配偶的原生家庭。
 */
function layoutInlawOriginFamily(state, spouseId, side, partnerY) {
  const parentFamilyId = state.parentFamiliesByChild.get(spouseId)?.[0]
  const family = state.familyMap.get(parentFamilyId)
  const spousePosition = state.positions.get(spouseId)
  if (!family || !spousePosition || state.placedFamilies.has(parentFamilyId)) return

  state.placedFamilies.add(parentFamilyId)
  const parentY = partnerY - LEVEL_GAP
  const parentLevel = (parentY - TOP_PADDING) / LEVEL_GAP
  const parentCenterX = spousePosition.x + side * BRIDGE_PARENT_OFFSET
  const parentPositions = placePartners(state, family.partners, parentCenterX, parentY)
  const familyCenter = getFamilyCenter(parentPositions, parentCenterX)
  const anchor = createFamilyAnchor(state, parentFamilyId, familyCenter.x, parentY)
  addSpouseEdge(state, parentFamilyId, family.partners)

  const childPositions = collectBridgeSiblingPositions(state, family, spouseId, side, spousePosition)
  addFamilyChildEdges(state, parentFamilyId, anchor, childPositions, parentLevel, hasSpouseLine(family))
}

/**
 * 收集桥接图同胞位置，中心联姻人物靠近婚姻桥，其他同胞向外侧展开。
 */
function collectBridgeSiblingPositions(state, family, personId, side, personPosition) {
  const positions = [{ childId: personId, position: personPosition }]
  const siblings = family.children
    .filter(childId => childId !== personId)
    .sort((a, b) => comparePersons(state.personMap.get(a), state.personMap.get(b)))

  siblings.forEach((childId, index) => {
    const x = personPosition.x + side * BRIDGE_SIBLING_STEP * (index + 1)
    const position = placePerson(state, childId, x, personPosition.y)
    if (position) positions.push({ childId, position })
  })

  return positions.sort((left, right) => left.position.x - right.position.x)
}

/**
 * 布局桥接家庭的共同子女。
 */
function layoutBridgeChildren(state, family, anchor, partnerY) {
  const parentLevel = (partnerY - TOP_PADDING) / LEVEL_GAP
  const childPositions = layoutFamilyChildrenOnLevel(
    state,
    family,
    null,
    anchor.x,
    parentLevel + 1,
    false,
    new Set()
  )
  addFamilyChildEdges(state, family.id, anchor, childPositions, parentLevel, hasSpouseLine(family))
}

// --- 全景布局 --- //

/**
 * 查找全景图索引簇，全景默认不连全量关系线。
 */
function findOverviewClusters(model) {
  const familyClusters = [...model.familyMap.values()]
    .map(family => ({
      id: family.id,
      personIds: [...family.partners, ...family.children]
        .filter(id => model.personMap.has(id))
        .sort((a, b) => comparePersons(model.personMap.get(a), model.personMap.get(b))),
      displayOrder: family.displayOrder
    }))
    .filter(cluster => cluster.personIds.length > 0)
    .sort((a, b) => Number(a.displayOrder || 0) - Number(b.displayOrder || 0) || a.id.localeCompare(b.id))

  const seen = new Set()
  const clusters = familyClusters.map(cluster => {
    cluster.personIds.forEach(personId => seen.add(personId))
    return cluster
  })
  model.persons.forEach(person => {
    if (seen.has(person.id)) return
    clusters.push({ id: `person:${person.id}`, personIds: [person.id], displayOrder: 9999 })
  })
  return clusters
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
 * 放置折叠分支胶囊。
 */
function placeBranchCapsule(state, capsule, x, y) {
  state.nodes.push({
    id: capsule.id,
    x,
    y,
    type: 'rect',
    label: capsule.title,
    nodeType: 'branchCapsule',
    raw: capsule,
    size: [PERSON_SIZE.width * 1.65, PERSON_SIZE.height * 0.82],
    style: {
      radius: 18,
      fill: 'rgba(212, 175, 55, 0.12)',
      stroke: 'rgba(255, 238, 137, 0.42)',
      lineWidth: 1.4,
      lineDash: [5, 4],
      shadowColor: GRAPH_STYLE.nodeShadow,
      shadowBlur: 10
    },
    labelCfg: {
      style: {
        fill: '#f5e7ad',
        fontSize: 12,
        fontWeight: 700
      }
    }
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

  addFamilyChildEdges(state, family.id, anchor, childPositions, level, hasSpouseLine(family))
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
function addFamilyChildEdges(state, familyId, anchor, childPositions, level, hasVisibleSpouseLine = false) {
  if (!childPositions.length) return

  const parentY = TOP_PADDING + level * LEVEL_GAP
  const childTopY = Math.min(...childPositions.map(child => child.position.y - PERSON_SIZE.height / 2))
  const busY = childPositions.length === 1
    ? childTopY
    : parentY + PERSON_SIZE.height / 2 + CHILD_BUS_OFFSET
  const childXs = childPositions.map(child => child.position.x)
  const busStartX = Math.min(anchor.x, ...childXs)
  const busEndX = Math.max(anchor.x, ...childXs)
  const stemStartY = childPositions.length === 1
    ? getChildStemStartY(parentY, hasVisibleSpouseLine)
    : parentY

  addRoutedLine(
    state,
    `child:${familyId}:parent-stem`,
    { x: anchor.x, y: stemStartY },
    { x: anchor.x, y: busY },
    'child',
    'parent-stem'
  )
  if (childPositions.length > 1) {
    addRoutedLine(
      state,
      `child:${familyId}:sibling-bus`,
      { x: busStartX, y: busY },
      { x: busEndX, y: busY },
      'child',
      'sibling-bus'
    )
  }

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
 * 计算单子女下行线起点；有夫妻线时从夫妻线中心直下，避免断线。
 */
function getChildStemStartY(parentY, hasVisibleSpouseLine) {
  return hasVisibleSpouseLine ? parentY : parentY + PERSON_SIZE.height / 2
}

/**
 * 选择人物作为配偶时承载的家庭。
 */
function findPrimaryPartnerFamily(model, personId, visitedFamilies) {
  const familyIds = model.partnerFamiliesByPerson.get(personId) || []
  return familyIds.find(familyId => !visitedFamilies.has(familyId))
}

/**
 * 判断家庭是否存在可见夫妻横线。
 */
function hasSpouseLine(family) {
  return family.partners.length >= 2
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
