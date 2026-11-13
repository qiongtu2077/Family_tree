/**
 * 家谱领域布局：伴侣约束分组、代际分层、重心排序、正交布线。
 * 人物只有一份；家庭单元是关系及布局语义，不作为可见人物绘制。
 */
const SIZE = { width: 140, height: 52 }
const PARTNER_GAP = 36
const BLOCK_GAP = 68
const LEVEL_GAP = 160
const ROUTE_GAP = 18
const THEME = {
  fill: '#fffefa', stroke: '#c5cec8', text: '#203b32',
  child: '#8b9e94', spouse: '#b88753', capsule: '#f0f5ef'
}

// --- 对外入口与关系建模 --- //

/** 根据五图投影建立布局，并把旁支入口放到独立的导航区域。 */
export function createFamilyLayout(graph) {
  const complete = buildModel(graph)
  const model = selectProjection(complete)
  const layout = model.mode === 'overview' ? layoutOverview(model) : layoutFormal(model)
  appendCapsules(layout, complete, model)
  return layout
}

/** 建立人物、家庭、亲子类型索引；冗余直接关系仅在明确重复时合并。 */
function buildModel(graph) {
  const people = new Map()
  const families = new Map()
  const capsules = []
  for (const node of graph.nodes) {
    if (node.type === 'person') people.set(node.id, node)
    if (node.type === 'familyUnit') {
      families.set(node.id, { id: node.id, raw: node, partners: [], children: new Map() })
    }
    if (node.type === 'branchCapsule') capsules.push(node)
  }
  const direct = []
  const spouses = []
  for (const edge of graph.edges) {
    if (families.has(edge.target) && people.has(edge.source)) {
      const partners = families.get(edge.target).partners
      if (!partners.includes(edge.source)) partners.push(edge.source)
    } else if (families.has(edge.source) && people.has(edge.target)) {
      families.get(edge.source).children.set(edge.target, edge)
    } else if (people.has(edge.source) && people.has(edge.target)) {
      if (edge.relation === 'spouse') spouses.push(edge)
      if (['father', 'mother', 'parent'].includes(edge.relation)) direct.push(edge)
    }
  }
  for (const edge of spouses) {
    const exists = [...families.values()].some(family => (
      isPartnerFamily(family) && family.partners.includes(edge.source) && family.partners.includes(edge.target)
    ))
    if (!exists) {
      const id = 'spouse:' + [edge.source, edge.target].sort().join(':')
      families.set(id, { id, raw: { family_type: 'marriage' }, partners: [edge.source, edge.target], children: new Map() })
    }
  }
  for (const edge of direct) {
    const kind = edge.metadata?.relationKind || 'biological'
    const represented = [...families.values()].some(family => (
      family.partners.includes(edge.source) && family.children.has(edge.target) &&
      relationKind(family.children.get(edge.target)) === kind
    ))
    if (!represented) {
      const id = 'direct:' + edge.source + ':' + edge.target + ':' + kind
      families.set(id, { id, raw: { family_type: 'single_parent' }, partners: [edge.source], children: new Map([[edge.target, { ...edge, relation: kind }]]) })
    }
  }
  const orderedFamilies = [...families.values()].sort(compareFamilies)
  for (const family of orderedFamilies) {
    family.partners.sort((a, b) => comparePeople(people.get(a), people.get(b)))
    family.children = new Map([...family.children].sort(([a], [b]) => comparePeople(people.get(a), people.get(b))))
  }
  return {
    mode: graph.view_mode || 'mainline', context: graph.view_context || {},
    centerId: graph.view_context?.center_person_id || graph.center_person_id || null,
    people, families: orderedFamilies, capsules
  }
}

/** 返回家庭边的生养类型，保留 DTO 中明确给出的类型信息。 */
function relationKind(edge) {
  return edge.metadata?.relationKind || edge.relation
}

/** 只有婚姻或伴侣家庭能够表达伴侣关系，收养或共同育儿不等于婚姻。 */
function isPartnerFamily(family) {
  return ['marriage', 'partner'].includes(family.raw.family_type || 'marriage')
}

/** 使用稳定字段排序人物，避免接口节点顺序改变布局。 */
function comparePeople(a, b) {
  return String(a.birth_date || '').localeCompare(String(b.birth_date || '')) ||
    a.name.localeCompare(b.name, 'zh-CN') || a.id.localeCompare(b.id)
}

/** 使用显式显示顺序和稳定 ID 排列家庭。 */
function compareFamilies(a, b) {
  return (a.raw.display_order || 0) - (b.raw.display_order || 0) || a.id.localeCompare(b.id)
}

/** 返回家庭涉及的全部人物。 */
function familyPeople(family) {
  return [...family.partners, ...family.children.keys()]
}

/** 根据已确认的家庭 ID 契约找到上下文家庭。 */
function contextFamily(model) {
  const id = model.context.family_unit_id
  if (!id) return null
  return model.families.find(family => family.id === id || family.id === 'family:' + id) || null
}

// --- 五图投影边界 --- //

/** 保留后端投影范围，并为桥接、姻亲和分支明确选择各自的根。 */
function selectProjection(model) {
  if (model.mode === 'overview') return model
  let selected = null
  let selectedFamilies = model.families
  if (model.mode === 'bridge') {
    const central = contextFamily(model) || model.families.find(family => (
      family.partners.length > 1 && (!model.centerId || family.partners.includes(model.centerId))
    ))
    if (central) {
      selectedFamilies = model.families.filter(family => family.id === central.id ||
        central.partners.some(id => family.children.has(id)))
      selected = new Set(selectedFamilies.flatMap(familyPeople))
    }
  } else if (model.mode === 'inlaw' && model.context.spouse_id) {
    const ancestorIds = new Set([model.context.spouse_id])
    const familyIds = new Set()
    const queue = [model.context.spouse_id]
    while (queue.length) {
      const childId = queue.shift()
      for (const family of model.families) {
        if (!family.children.has(childId)) continue
        familyIds.add(family.id)
        for (const parentId of family.partners) {
          if (!ancestorIds.has(parentId)) {
            ancestorIds.add(parentId)
            queue.push(parentId)
          }
        }
      }
    }
    const central = contextFamily(model) || model.families.find(family => (
      family.partners.includes(model.centerId) && family.partners.includes(model.context.spouse_id)
    ))
    if (central) familyIds.add(central.id)
    selectedFamilies = model.families.filter(family => familyIds.has(family.id))
    selected = new Set([model.centerId, model.context.spouse_id, ...selectedFamilies.flatMap(familyPeople)])
  }
  if (!selected) {
    const root = contextFamily(model)
    const seed = root ? familyPeople(root)[0] : model.centerId
    if (seed && model.people.has(seed)) {
      const roots = connectedRoots(model)
      const component = findRoot(roots, seed)
      selected = new Set([...model.people.keys()].filter(id => findRoot(roots, id) === component))
      selectedFamilies = model.families.filter(family => familyPeople(family).some(id => selected.has(id)))
    }
  }
  if (!selected) return model
  return { ...model, families: selectedFamilies, people: new Map([...model.people].filter(([id]) => selected.has(id))) }
}

/** 建立真实关系连通分量；同一个人跨家庭只属于一个分量。 */
function connectedRoots(model) {
  const roots = new Map([...model.people.keys()].map(id => [id, id]))
  for (const family of model.families) {
    const ids = familyPeople(family)
    for (const id of ids.slice(1)) mergeRoots(roots, ids[0], id)
  }
  return roots
}

/** 查询并压缩不相交集合的父路径。 */
function findRoot(roots, id) {
  const parent = roots.get(id)
  if (parent !== id) roots.set(id, findRoot(roots, parent))
  return roots.get(id)
}

/** 使用稳定 ID 合并集合，保证顺序无关的分组标识。 */
function mergeRoots(roots, a, b) {
  const first = findRoot(roots, a)
  const second = findRoot(roots, b)
  if (first !== second) roots.set(first < second ? second : first, first < second ? first : second)
}

// --- 代际约束和人物块 --- //

/** 构建父母到子女的分组依赖，保留跨代婚配的独立人物层级。 */
function lineageDependencies(model, roots) {
  const outgoing = new Map([...model.people.keys()].map(id => [findRoot(roots, id), new Set()]))
  for (const family of model.families) {
    for (const parent of family.partners) {
      for (const child of family.children.keys()) outgoing.get(findRoot(roots, parent)).add(findRoot(roots, child))
    }
  }
  return outgoing
}

/** 拓扑计算最长亲子代际；异常循环稳定保留在末层，交给诊断界面处理。 */
function rankDependencies(outgoing) {
  const indegree = new Map([...outgoing.keys()].map(id => [id, 0]))
  for (const targets of outgoing.values()) for (const target of targets) indegree.set(target, indegree.get(target) + 1)
  const queue = [...indegree.keys()].filter(id => indegree.get(id) === 0).sort()
  const ranks = new Map([...outgoing.keys()].map(id => [id, 0]))
  let processed = 0
  // 拓扑层级取最长路径，与就绪节点出队顺序无关；队列游标避免反复全量排序。
  for (let head = 0; head < queue.length; head += 1) {
    const id = queue[head]
    processed += 1
    for (const target of outgoing.get(id)) {
      ranks.set(target, Math.max(ranks.get(target), ranks.get(id) + 1))
      indegree.set(target, indegree.get(target) - 1)
      if (indegree.get(target) === 0) queue.push(target)
    }
  }
  const cyclic = processed !== outgoing.size
  if (cyclic) {
    const lastRank = Math.max(0, ...ranks.values()) + 1
    for (const [id, degree] of indegree) if (degree > 0) ranks.set(id, lastRank)
  }
  return { ranks, cyclic }
}

/** 仅接受不破坏亲子 DAG 的伴侣同层约束，避免跨代婚姻把后代提升。 */
function partnerBlocks(model) {
  let roots = new Map([...model.people.keys()].map(id => [id, id]))
  for (const family of model.families) {
    if (family.partners.length < 2) continue
    const candidate = new Map(roots)
    for (const id of family.partners.slice(1)) mergeRoots(candidate, family.partners[0], id)
    if (!rankDependencies(lineageDependencies(model, candidate)).cyclic) roots = candidate
  }
  const { ranks, cyclic } = rankDependencies(lineageDependencies(model, roots))
  const groups = new Map()
  for (const id of model.people.keys()) {
    const root = findRoot(roots, id)
    if (!groups.has(root)) groups.set(root, [])
    groups.get(root).push(id)
  }
  const central = contextFamily(model) || model.families.find(family => family.partners.includes(model.centerId))
  const blocks = []
  const byPerson = new Map()
  for (const [id, members] of groups) {
    members.sort((a, b) => comparePeople(model.people.get(a), model.people.get(b)))
    if (central && ['inlaw', 'bridge'].includes(model.mode)) {
      const first = model.centerId || central.partners[0]
      const preferred = [first, ...central.partners.filter(personId => personId !== first)]
      members.sort((a, b) => {
        const ai = preferred.indexOf(a)
        const bi = preferred.indexOf(b)
        return (ai < 0 ? preferred.length : ai) - (bi < 0 ? preferred.length : bi)
      })
    }
    const block = { id, members, rank: ranks.get(id), width: members.length * SIZE.width + (members.length - 1) * PARTNER_GAP, x: 0 }
    blocks.push(block)
    members.forEach(personId => byPerson.set(personId, block))
  }
  return { blocks, byPerson, cyclic, central }
}

/** 返回人物在其伴侣块中的局部横向坐标。 */
function memberOffset(block, id) {
  return -block.width / 2 + SIZE.width / 2 + block.members.indexOf(id) * (SIZE.width + PARTNER_GAP)
}

/** 为桥接两侧同胞指定相对顺序，中心夫妻始终位于两边家族之间。 */
function bridgeSides(model, central) {
  const sides = new Map()
  if (!central || !['bridge', 'inlaw'].includes(model.mode)) return sides
  const first = model.centerId || central.partners[0]
  const partners = [first, ...central.partners.filter(id => id !== first)]
  partners.forEach((partner, index) => {
    const side = index === 0 ? -1 : 1
    const queue = [partner]
    const visited = new Set()
    while (queue.length) {
      const personId = queue.shift()
      if (visited.has(personId)) continue
      visited.add(personId)
      for (const family of model.families) {
        if (family.id === central.id || !family.children.has(personId)) continue
        for (const id of familyPeople(family)) if (!partners.includes(id)) sides.set(id, side)
        queue.push(...family.partners)
      }
    }
  })
  return sides
}

/** 计算当前块通过上行或下行家庭连接期望对齐的位置。 */
function desiredBlockX(block, families, byPerson, descending) {
  const desired = []
  for (const family of families) {
    if (!family.partners.length) continue
    const parentX = family.partners.reduce((sum, id) => {
      const parent = byPerson.get(id)
      return sum + parent.x + memberOffset(parent, id)
    }, 0) / family.partners.length
    for (const childId of family.children.keys()) {
      const child = byPerson.get(childId)
      if (descending && child === block) desired.push(parentX - memberOffset(block, childId))
      if (!descending) {
        const ownParents = family.partners.filter(id => byPerson.get(id) === block)
        if (ownParents.length) {
          const ownOffset = ownParents.reduce((sum, id) => sum + memberOffset(block, id), 0) / ownParents.length
          desired.push(child.x + memberOffset(child, childId) - ownOffset)
        }
      }
    }
  }
  return desired.length ? desired.reduce((sum, value) => sum + value, 0) / desired.length : block.x
}

/** 按真实块宽度压紧一层，保证任何人物卡片不重叠。 */
function compactLayer(layer, desired) {
  let previous = null
  for (const block of layer) {
    block.x = Math.max(desired.get(block.id), previous ? previous.x + (previous.width + block.width) / 2 + BLOCK_GAP : -Infinity)
    previous = block
  }
  const correction = layer.reduce((sum, block) => sum + desired.get(block.id) - block.x, 0) / layer.length
  for (const block of layer) block.x += correction
}

/** 双向重心扫描减少交叉，同时用不重叠压紧约束分配祖先所需宽度。 */
function positionBlocks(model, grouping) {
  const layers = new Map()
  const incoming = new Map(grouping.blocks.map(block => [block.id, []]))
  const outgoing = new Map(grouping.blocks.map(block => [block.id, []]))
  const sides = bridgeSides(model, grouping.central)
  // 每个块只读取相邻家庭，避免每一轮重心扫描都重复遍历整张家谱。
  for (const family of model.families) {
    for (const id of new Set(family.partners.map(personId => grouping.byPerson.get(personId).id))) outgoing.get(id).push(family)
    for (const id of new Set([...family.children.keys()].map(personId => grouping.byPerson.get(personId).id))) incoming.get(id).push(family)
  }
  for (const block of grouping.blocks) {
    if (!layers.has(block.rank)) layers.set(block.rank, [])
    layers.get(block.rank).push(block)
    block.side = block.members.reduce((sum, id) => sum + (sides.get(id) || 0), 0) / block.members.length
  }
  const ranks = [...layers.keys()].sort((a, b) => a - b)
  for (const layer of layers.values()) {
    layer.sort((a, b) => a.side - b.side || comparePeople(model.people.get(a.members[0]), model.people.get(b.members[0])))
    compactLayer(layer, new Map(layer.map(block => [block.id, 0])))
  }
  for (let pass = 0; pass < 8; pass += 1) {
    const descending = pass % 2 === 0
    for (const rank of descending ? ranks : [...ranks].reverse()) {
      const layer = layers.get(rank)
      const neighbors = descending ? incoming : outgoing
      const desired = new Map(layer.map(block => [block.id, desiredBlockX(block, neighbors.get(block.id), grouping.byPerson, descending)]))
      layer.sort((a, b) => a.side - b.side || desired.get(a.id) - desired.get(b.id) || a.id.localeCompare(b.id))
      compactLayer(layer, desired)
    }
  }
  const positions = new Map()
  for (const block of grouping.blocks) {
    for (const id of block.members) positions.set(id, { x: block.x + memberOffset(block, id), y: block.rank * LEVEL_GAP, generation: block.rank })
  }
  return positions
}

// --- 正式图和全景布局 --- //

/** 布局有限家谱投影，使用同层伴侣块和正交家庭连线。 */
function layoutFormal(model) {
  const grouping = partnerBlocks(model)
  const positions = positionBlocks(model, grouping)
  const layout = { nodes: [], edges: [], clusters: [], layoutWarnings: grouping.cyclic ? ['存在亲子循环，已保留关系并停止递归展开。'] : [] }
  const ordered = [...model.people.keys()].sort((a, b) => {
    if (a === b) return 0
    if (a === model.centerId) return -1
    if (b === model.centerId) return 1
    return positions.get(a).y - positions.get(b).y || positions.get(a).x - positions.get(b).x || a.localeCompare(b)
  })
  for (const id of ordered) layout.nodes.push(personNode(model.people.get(id), positions.get(id), id === model.centerId))
  drawFamilies(layout, model, positions)
  return layout
}

/** 全景独立计算真实连通分量，并按各分量实际尺寸装箱，保留全部关系。 */
function layoutOverview(model) {
  const roots = connectedRoots(model)
  const components = new Map()
  for (const id of model.people.keys()) {
    const root = findRoot(roots, id)
    if (!components.has(root)) components.set(root, [])
    components.get(root).push(id)
  }
  const pieces = []
  for (const [id, ids] of [...components].sort(([a], [b]) => a.localeCompare(b))) {
    const selected = new Set(ids)
    const component = { ...model, mode: 'overview', people: new Map([...model.people].filter(([personId]) => selected.has(personId))), families: model.families.filter(family => familyPeople(family).some(personId => selected.has(personId))) }
    const layout = layoutFormal(component)
    pieces.push({ id, ids, layout, bounds: layoutBounds(layout.nodes) })
  }
  const area = pieces.reduce((sum, piece) => sum + (piece.bounds.width + 80) * (piece.bounds.height + 80), 0)
  const shelfWidth = Math.max(1, ...pieces.map(piece => piece.bounds.width + 80), Math.sqrt(area) * 1.3)
  const result = { nodes: [], edges: [], clusters: [], layoutWarnings: [] }
  let cursorX = 0
  let cursorY = 0
  let rowHeight = 0
  for (const piece of pieces) {
    const width = piece.bounds.width + 80
    const height = piece.bounds.height + 80
    if (cursorX && cursorX + width > shelfWidth) {
      cursorX = 0
      cursorY += rowHeight
      rowHeight = 0
    }
    const dx = cursorX + 40 - piece.bounds.minX
    const dy = cursorY + 40 - piece.bounds.minY
    for (const node of piece.layout.nodes) result.nodes.push({ ...node, x: node.x + dx, y: node.y + dy, ...(node.nodeType === 'person' ? { componentId: piece.id } : {}) })
    result.edges.push(...piece.layout.edges)
    result.layoutWarnings.push(...piece.layout.layoutWarnings)
    result.clusters.push({ id: piece.id, personIds: [...piece.ids].sort(), x: cursorX, y: cursorY, width, height })
    cursorX += width
    rowHeight = Math.max(rowHeight, height)
  }
  return result
}

// --- 显式正交布线 --- //

/** 返回人物节点和线段锚点的实际边界。 */
function layoutBounds(nodes) {
  if (!nodes.length) return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 }
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const node of nodes) {
    const size = node.size || [0, 0]
    const width = Array.isArray(size) ? size[0] : size
    const height = Array.isArray(size) ? size[1] : size
    minX = Math.min(minX, node.x - width / 2)
    minY = Math.min(minY, node.y - height / 2)
    maxX = Math.max(maxX, node.x + width / 2)
    maxY = Math.max(maxY, node.y + height / 2)
  }
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY }
}

/** 为一条固定水平或垂直线添加不可见端点，并保存真实关系元数据。 */
function addSegment(layout, id, start, end, details) {
  if (Math.abs(start.x - end.x) < 0.001 && Math.abs(start.y - end.y) < 0.001) return
  for (const [suffix, point] of [['start', start], ['end', end]]) {
    layout.nodes.push({ id: id + ':' + suffix, ...point, type: 'circle', size: 1, label: '', nodeType: 'anchor', style: { opacity: 0, fill: 'transparent', stroke: 'transparent' } })
  }
  const dashed = details.raw?.style === 'dashed' || ['adoptive', 'step', 'unknown'].includes(details.relationKind)
  layout.edges.push({
    id, source: id + ':start', target: id + ':end', type: 'line', label: '', ...details,
    style: { stroke: details.relation === 'spouse' ? THEME.spouse : THEME.child, lineWidth: details.relation === 'spouse' ? 1.8 : 1.5, endArrow: false, lineAppendWidth: 6, ...(dashed ? { lineDash: [5, 4] } : {}) }
  })
}

/** 在整条垂直路径上寻找不穿过人物卡片的最近空白列。 */
function clearColumn(positions, desired, fromY, toY) {
  const minY = Math.min(fromY, toY)
  const maxY = Math.max(fromY, toY)
  const obstacles = [...positions.values()].filter(point => point.y + SIZE.height / 2 > minY + 0.01 && point.y - SIZE.height / 2 < maxY - 0.01)
  const candidates = [desired]
  for (const point of obstacles) candidates.push(point.x - SIZE.width / 2 - ROUTE_GAP, point.x + SIZE.width / 2 + ROUTE_GAP)
  candidates.sort((a, b) => Math.abs(a - desired) - Math.abs(b - desired) || a - b)
  return candidates.find(x => obstacles.every(point => Math.abs(x - point.x) >= SIZE.width / 2 + ROUTE_GAP - 0.01))
}

/** 绘制完整家庭关系；单子女错位也明确连接横向段，不产生悬空线。 */
function drawFamilies(layout, model, positions) {
  const laneByGeneration = new Map()
  const counts = new Map()
  for (const family of model.families) {
    if (!family.partners.length && !family.children.size) continue
    const y = family.partners.length
      ? Math.max(...family.partners.map(id => positions.get(id).y))
      : Math.min(...[...family.children.keys()].map(id => positions.get(id).y)) - LEVEL_GAP
    counts.set(y, (counts.get(y) || 0) + 1)
  }
  for (const family of model.families) {
    const partners = family.partners.map(id => ({ id, ...positions.get(id) })).sort((a, b) => a.x - b.x)
    const children = [...family.children].map(([id, raw]) => ({ id, raw, ...positions.get(id) }))
    if (!partners.length && !children.length) continue
    const parentY = partners.length ? Math.max(...partners.map(point => point.y)) : Math.min(...children.map(child => child.y)) - LEVEL_GAP
    const lane = laneByGeneration.get(parentY) || 0
    laneByGeneration.set(parentY, lane + 1)
    const members = partners.length ? partners : children
    let centerX = members.reduce((sum, point) => sum + point.x, 0) / members.length
    let stemY = parentY + SIZE.height / 2
    const partnerRelation = isPartnerFamily(family) ? 'spouse' : 'co-parent'
    const sameLevel = partners.every(point => point.y === parentY)
    const between = partners.length > 1 && [...positions.values()].some(point => point.y === parentY && point.x > partners[0].x && point.x < partners[partners.length - 1].x && !partners.some(partner => partner.x === point.x))
    if (partners.length === 2 && sameLevel && !between) {
      for (let index = 1; index < partners.length; index += 1) {
        addSegment(layout, 'spouse:' + family.id + ':' + index, { x: partners[index - 1].x + SIZE.width / 2, y: parentY }, { x: partners[index].x - SIZE.width / 2, y: parentY }, { relation: partnerRelation, relationKind: family.raw.family_type, familyId: family.id, personIds: family.partners, segment: 'spouse' })
      }
      centerX = (partners[0].x + partners[partners.length - 1].x) / 2
      stemY = parentY
    } else if (partners.length > 1) {
      // 跨代、多家庭或三位以上共同育儿成员使用卡片外的总线，避免支干穿过中间人物。
      stemY = Math.min(...partners.map(point => point.y)) - SIZE.height / 2 - ROUTE_GAP - lane * Math.min(10, 60 / counts.get(parentY))
      centerX = clearColumn(positions, centerX, stemY, parentY + SIZE.height / 2)
      const xs = [centerX]
      for (const partner of partners) {
        const details = { relation: partnerRelation, relationKind: family.raw.family_type, familyId: family.id, personIds: family.partners, segment: 'spouse-stem' }
        const topY = partner.y - SIZE.height / 2
        const exitY = topY - ROUTE_GAP
        const routeX = clearColumn(positions, partner.x, exitY, stemY)
        xs.push(routeX)
        if (routeX === partner.x) {
          addSegment(layout, 'spouse:' + family.id + ':' + partner.id + ':stem', { x: partner.x, y: topY }, { x: partner.x, y: stemY }, details)
        } else {
          addSegment(layout, 'spouse:' + family.id + ':' + partner.id + ':exit', { x: partner.x, y: topY }, { x: partner.x, y: exitY }, details)
          addSegment(layout, 'spouse:' + family.id + ':' + partner.id + ':route', { x: partner.x, y: exitY }, { x: routeX, y: exitY }, details)
          addSegment(layout, 'spouse:' + family.id + ':' + partner.id + ':stem', { x: routeX, y: exitY }, { x: routeX, y: stemY }, details)
        }
      }
      addSegment(layout, 'spouse:' + family.id + ':bus', { x: Math.min(...xs), y: stemY }, { x: Math.max(...xs), y: stemY }, { relation: partnerRelation, relationKind: family.raw.family_type, familyId: family.id, personIds: family.partners, segment: 'spouse' })
    }
    if (!children.length) continue
    const nearestChildTop = Math.min(...children.map(child => child.y - SIZE.height / 2))
    const alignedSingle = partners.length > 0 && children.length === 1 && Math.abs(children[0].x - centerX) < 0.001 && nearestChildTop > stemY
    // 未知父母家庭仍保留同胞归属，只绘制子女总线，不生成虚构的父母卡片。
    const busY = !partners.length ? nearestChildTop - ROUTE_GAP - lane * Math.min(12, 64 / counts.get(parentY))
      : alignedSingle ? nearestChildTop : parentY + SIZE.height / 2 + ROUTE_GAP + lane * Math.min(12, 64 / counts.get(parentY))
    const parentExitY = stemY === parentY && partners.length > 1 ? parentY + SIZE.height / 2 + ROUTE_GAP : stemY
    const trunkX = partners.length ? clearColumn(positions, centerX, parentExitY + 0.01, busY) : centerX
    const common = { relation: 'child', familyId: family.id, personIds: [...family.partners, ...family.children.keys()] }
    const kinds = new Set(children.map(child => relationKind(child.raw)))
    const sharedRaw = kinds.size === 1 ? children[0].raw : null
    const shared = { ...common, relationKind: kinds.size === 1 ? [...kinds][0] : 'mixed', raw: sharedRaw }
    // 支干和兄弟姐妹总线分别绘制；每个子女支线保存自己的生养类型。
    if (partners.length && trunkX !== centerX) {
      addSegment(layout, 'child:' + family.id + ':parent-connector', { x: centerX, y: stemY }, { x: centerX, y: parentExitY }, { ...shared, segment: 'parent-connector' })
      addSegment(layout, 'child:' + family.id + ':parent-exit', { x: centerX, y: parentExitY }, { x: trunkX, y: parentExitY }, { ...shared, segment: 'parent-exit' })
    }
    if (partners.length) addSegment(layout, 'child:' + family.id + ':parent-stem', { x: trunkX, y: trunkX === centerX ? stemY : parentExitY }, { x: trunkX, y: busY }, { ...shared, segment: 'parent-stem' })
    if (!alignedSingle || trunkX !== centerX) {
      const xs = [trunkX, ...children.map(child => child.x)]
      const segment = children.length > 1 ? 'sibling-bus' : 'child-connector'
      addSegment(layout, 'child:' + family.id + ':' + segment, { x: Math.min(...xs), y: busY }, { x: Math.max(...xs), y: busY }, { ...shared, segment })
    }
    for (const child of children) {
      const top = child.y - SIZE.height / 2
      const childLaneY = top - ROUTE_GAP
      const childX = clearColumn(positions, child.x, busY, childLaneY)
      const details = { ...common, childId: child.id, relationKind: relationKind(child.raw), raw: child.raw, metadata: child.raw.metadata, segment: 'child-stem' }
      if (childX === child.x) {
        addSegment(layout, 'child:' + family.id + ':' + child.id + ':child-stem', { x: child.x, y: busY }, { x: child.x, y: top }, details)
      } else {
        addSegment(layout, 'child:' + family.id + ':' + child.id + ':route', { x: child.x, y: busY }, { x: childX, y: busY }, { ...details, segment: 'child-route' })
        addSegment(layout, 'child:' + family.id + ':' + child.id + ':long-stem', { x: childX, y: busY }, { x: childX, y: childLaneY }, details)
        addSegment(layout, 'child:' + family.id + ':' + child.id + ':entry', { x: childX, y: childLaneY }, { x: child.x, y: childLaneY }, { ...details, segment: 'child-entry' })
        addSegment(layout, 'child:' + family.id + ':' + child.id + ':child-stem', { x: child.x, y: childLaneY }, { x: child.x, y: top }, details)
      }
    }
  }
}

// --- 人物和旁支导航样式 --- //

/** 生成只含姓名的浅色人物卡片，完整资料留在详情侧栏。 */
function personNode(person, position, isCenter) {
  return {
    id: person.id, ...position, type: 'rect', nodeType: 'person', raw: person, label: person.name, isCenter,
    size: [SIZE.width, SIZE.height],
    style: { radius: 8, fill: THEME.fill, stroke: isCenter ? '#2d6a54' : THEME.stroke, lineWidth: isCenter ? 2 : 1.4 },
    labelCfg: { style: { fill: THEME.text, fontSize: 15, fontWeight: 600 } }
  }
}

/** 把语义胶囊放到图谱下方；保留目标视图与根对象，点击仍能导航。 */
function appendCapsules(layout, complete, visible) {
  const capsules = [...complete.capsules]
  const hidden = [...complete.people.values()].filter(person => !visible.people.has(person.id)).sort(comparePeople)
  if (hidden.length) capsules.push({ id: 'capsule:hidden:' + complete.mode, type: 'branchCapsule', title: '已折叠旁支 · ' + hidden.length + ' 人', person_count: hidden.length, target_view: 'overview', preview_names: hidden.slice(0, 3).map(person => person.name) })
  if (!capsules.length) return
  const bounds = layoutBounds(layout.nodes)
  const width = 252
  const gap = 20
  const columns = Math.max(1, Math.min(3, Math.floor(Math.max(bounds.width, width) / (width + gap))))
  const totalWidth = columns * width + (columns - 1) * gap
  const left = (bounds.minX + bounds.maxX - totalWidth) / 2
  capsules.sort((a, b) => a.id.localeCompare(b.id))
  capsules.forEach((capsule, index) => {
    layout.nodes.push({
      id: capsule.id, x: left + width / 2 + (index % columns) * (width + gap), y: bounds.maxY + 78 + Math.floor(index / columns) * 64,
      type: 'rect', nodeType: 'branchCapsule', raw: capsule, label: capsule.title, size: [width, 44],
      style: { radius: 20, fill: THEME.capsule, stroke: '#cbd6cd', lineWidth: 1.2, lineDash: [4, 3] },
      labelCfg: { style: { fill: '#405e4f', fontSize: 12, fontWeight: 500 } }
    })
  })
}
