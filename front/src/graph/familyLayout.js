/**
 * 家谱领域布局：伴侣约束分组、代际分层、重心排序、正交布线。
 * 人物只有一份；家庭单元是关系及布局语义，不作为可见人物绘制。
 */
import { CHANNEL_GAP, analyzeCrossings, createRoutingChannels, findFreeColumn, findFreeRow, reserveRouteSegment } from './routing.js'

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
  layout.crossings = analyzeCrossings(layout)
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

/** 统计横向范围同时重叠的通道峰值，分处两端的独立分支可以复用同一高度。 */
function peakRoutingTracks(intervals) {
  const events = intervals.flatMap(interval => [{ x: interval.minX, delta: 1 }, { x: interval.maxX, delta: -1 }])
  events.sort((a, b) => a.x - b.x || a.delta - b.delta)
  let current = 0
  let peak = 0
  for (const event of events) {
    current += event.delta
    peak = Math.max(peak, current)
  }
  return peak * 2
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
  const familyTracks = new Map(ranks.map(rank => [rank, new Map()]))
  for (const family of model.families) {
    const ids = familyPeople(family)
    if (!ids.length) continue
    const xs = ids.map(id => {
      const block = grouping.byPerson.get(id)
      return block.x + memberOffset(block, id)
    })
    const interval = { minX: Math.min(...xs) - SIZE.width / 2 - ROUTE_GAP, maxX: Math.max(...xs) + SIZE.width / 2 + ROUTE_GAP }
    for (const id of ids) familyTracks.get(grouping.byPerson.get(id).rank).set(family.id, interval)
  }
  const rowY = new Map()
  let y = 0
  ranks.forEach((rank, index) => {
    if (index === 0) y = rank * LEVEL_GAP
    else {
      const previous = ranks[index - 1]
      const tracks = peakRoutingTracks([...familyTracks.get(previous).values(), ...familyTracks.get(rank).values()])
      // 代距容纳本层出线与下一层入口的独立轨道，人物多或家庭密集时不把线挤进卡片。
      y += Math.max((rank - previous) * LEVEL_GAP, SIZE.height + ROUTE_GAP * 2 + tracks * CHANNEL_GAP)
    }
    rowY.set(rank, y)
  })
  const positions = new Map()
  for (const block of grouping.blocks) {
    for (const id of block.members) positions.set(id, { x: block.x + memberOffset(block, id), y: rowY.get(block.rank), generation: block.rank })
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
    routeId: id, routeOwnerId: details.familyId, routingPart: 0,
    style: { stroke: details.relation === 'spouse' ? THEME.spouse : THEME.child, lineWidth: details.relation === 'spouse' ? 1.8 : 1.5, endArrow: false, lineAppendWidth: 6, ...(dashed ? { lineDash: [5, 4] } : {}) }
  })
}

/** 判断两位同层且相邻的家庭成员是否能直接使用卡片侧边横线。 */
function hasDirectPartnerLine(family, positions) {
  if (family.partners.length !== 2) return false
  const first = positions.get(family.partners[0])
  const second = positions.get(family.partners[1])
  if (first.y !== second.y) return false
  return ![...positions].some(([id, point]) => !family.partners.includes(id) && point.y === first.y &&
    point.x > Math.min(first.x, second.x) && point.x < Math.max(first.x, second.x))
}

/** 为人物的同一侧登记需要分开显示的家庭端口。 */
function requestPersonPort(requests, personId, familyId) {
  if (!requests.has(personId)) requests.set(personId, new Set())
  requests.get(personId).add(familyId)
}

/** 沿人物顶边或底边分配稳定端口，并预留短引线防止后来家庭占用。 */
function allocatePersonPorts(channels, requests, positions, side) {
  const result = new Map()
  for (const [personId, familyIds] of requests) {
    const person = positions.get(personId)
    const ids = [...familyIds].sort()
    const step = Math.min(8, (SIZE.width - 32) / Math.max(1, ids.length - 1))
    ids.forEach((familyId, index) => {
      const point = { x: person.x + (index - (ids.length - 1) / 2) * step, y: person.y + side * SIZE.height / 2 }
      if (!result.has(familyId)) result.set(familyId, new Map())
      result.get(familyId).set(personId, point)
      const fanout = ROUTE_GAP + (ids.length - 1) * CHANNEL_GAP
      reserveRouteSegment(channels, point, { x: point.x, y: point.y + side * fanout }, familyId, 'port')
    })
  }
  return result
}

/** 只为实际共用同一侧的人物分配多端口，保留普通家庭原有的正中连接。 */
function prepareFamilyRouting(model, positions, nodes) {
  const channels = createRoutingChannels(nodes)
  const topRequests = new Map()
  const bottomRequests = new Map()
  const directFamilies = new Set()
  const pairs = new Map()
  const pairRows = new Map()
  const pairCenters = new Map()
  for (const family of model.families) {
    for (const childId of family.children.keys()) requestPersonPort(topRequests, childId, family.id)
    if (hasDirectPartnerLine(family, positions)) {
      directFamilies.add(family.id)
      const key = JSON.stringify([...family.partners].sort())
      if (!pairs.has(key)) pairs.set(key, [])
      pairs.get(key).push(family)
    } else if (family.partners.length === 1) {
      requestPersonPort(bottomRequests, family.partners[0], family.id)
    } else {
      for (const parentId of family.partners) requestPersonPort(topRequests, parentId, family.id)
    }
  }
  const top = allocatePersonPorts(channels, topRequests, positions, -1)
  const bottom = allocatePersonPorts(channels, bottomRequests, positions, 1)
  for (const families of pairs.values()) {
    const step = Math.min(8, (SIZE.height - 16) / Math.max(1, families.length - 1))
    families.forEach((family, index) => {
      const partners = family.partners.map(id => positions.get(id)).sort((a, b) => a.x - b.x)
      const y = partners[0].y + (index - (families.length - 1) / 2) * step
      const gapWidth = partners[1].x - partners[0].x - SIZE.width
      const junctionStep = Math.min(6, Math.max(0, gapWidth - 12) / Math.max(1, families.length - 1))
      const center = (partners[0].x + partners[1].x) / 2 + (index - (families.length - 1) / 2) * junctionStep
      pairRows.set(family.id, y)
      pairCenters.set(family.id, center)
      reserveRouteSegment(channels, { x: partners[0].x + SIZE.width / 2, y }, { x: partners[1].x - SIZE.width / 2, y }, family.id, 'port')
    })
  }
  // 先保护全部家庭的出发引线，再布长干；否则先布的长干会占用后来家庭必经的接头。
  for (const family of model.families) {
    if (!family.children.size) continue
    const childTop = Math.min(...[...family.children.keys()].map(id => positions.get(id).y - SIZE.height / 2))
    if (directFamilies.has(family.id)) {
      const x = pairCenters.get(family.id)
      reserveRouteSegment(channels, { x, y: pairRows.get(family.id) }, { x, y: childTop }, family.id, 'potential')
    } else if (family.partners.length === 1) {
      const port = bottom.get(family.id).get(family.partners[0])
      reserveRouteSegment(channels, port, { x: port.x, y: childTop }, family.id, 'potential')
    }
  }
  return { channels, top, bottom, pairRows, pairCenters, directFamilies }
}

/** 联合规划人物顶端入口的列和横接行，扩展搜索范围直至两条轨道同时可用。 */
function planTopPort(channels, familyId, port, destinationY) {
  const desiredExitY = port.y - ROUTE_GAP
  let minY = -Infinity
  // 顶端短引线不能为了避开横线而穿回上一代卡片，或穿过已有的同列长干。
  for (const person of channels.people) {
    const bottom = person.y + person.height / 2
    if (Math.abs(port.x - person.x) < person.width / 2 - 0.01 && bottom <= port.y - 0.01) minY = Math.max(minY, bottom)
  }
  for (const segment of channels.vertical) {
    if (segment.reservation !== 'potential' && segment.familyId !== familyId && Math.abs(segment.coordinate - port.x) < 0.01 && segment.max <= port.y - 0.01) minY = Math.max(minY, segment.max)
  }
  let exitY = desiredExitY
  let minX = port.x
  let maxX = port.x
  while (true) {
    const routeX = findFreeColumn(channels, familyId, port.x, Math.min(port.y, destinationY, exitY), Math.max(port.y, destinationY, exitY))
    if (routeX === port.x) return { routeX, exitY }
    minX = Math.min(minX, routeX)
    maxX = Math.max(maxX, routeX)
    const nextY = findFreeRow(channels, familyId, desiredExitY, minX, maxX, { minY, maxY: port.y })
    if (Math.abs(nextY - exitY) < 0.01) return { routeX, exitY }
    exitY = nextY
  }
}

/** 绘制完整家庭关系；单子女错位也明确连接横向段，不产生悬空线。 */
function drawFamilies(layout, model, positions) {
  const routing = prepareFamilyRouting(model, positions, layout.nodes)
  const { channels } = routing

  /** 输出实际线段后立即登记占用，使后续家庭使用独立通道。 */
  function segment(id, start, end, details) {
    addSegment(layout, id, start, end, details)
    reserveRouteSegment(channels, start, end, details.familyId)
  }

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
    const children = [...family.children].map(([id, raw]) => ({ id, raw, ...positions.get(id), portX: routing.top.get(family.id).get(id).x }))
    if (!partners.length && !children.length) continue
    const parentY = partners.length ? Math.max(...partners.map(point => point.y)) : Math.min(...children.map(child => child.y)) - LEVEL_GAP
    const lane = laneByGeneration.get(parentY) || 0
    laneByGeneration.set(parentY, lane + 1)
    const members = partners.length ? partners : children
    let centerX = partners.length === 1 ? routing.bottom.get(family.id).get(partners[0].id).x : members.reduce((sum, point) => sum + point.x, 0) / members.length
    let stemY = parentY + SIZE.height / 2
    const partnerRelation = isPartnerFamily(family) ? 'spouse' : 'co-parent'
    const directPartners = routing.directFamilies.has(family.id)
    if (directPartners) {
      const y = routing.pairRows.get(family.id)
      for (let index = 1; index < partners.length; index += 1) {
        segment('spouse:' + family.id + ':' + index, { x: partners[index - 1].x + SIZE.width / 2, y }, { x: partners[index].x - SIZE.width / 2, y }, { relation: partnerRelation, relationKind: family.raw.family_type, familyId: family.id, personIds: family.partners, segment: 'spouse' })
      }
      centerX = routing.pairCenters.get(family.id)
      stemY = y
    } else if (partners.length > 1) {
      // 跨代、多家庭或三位以上共同育儿成员使用卡片外的总线，避免支干穿过中间人物。
      const desiredY = Math.min(...partners.map(point => point.y)) - SIZE.height / 2 - ROUTE_GAP - lane * Math.min(10, 60 / counts.get(parentY))
      const desiredCenterX = centerX
      let minX = partners[0].x
      let maxX = partners[partners.length - 1].x
      let plans
      while (true) {
        stemY = findFreeRow(channels, family.id, desiredY, minX, maxX, { maxY: Math.min(...partners.map(point => point.y - SIZE.height / 2)) - ROUTE_GAP })
        centerX = findFreeColumn(channels, family.id, desiredCenterX, stemY, parentY + SIZE.height / 2)
        plans = partners.map(partner => {
          const port = routing.top.get(family.id).get(partner.id)
          return { partner, port, ...planTopPort(channels, family.id, port, stemY) }
        })
        minX = Math.min(minX, centerX, ...plans.map(plan => plan.routeX))
        maxX = Math.max(maxX, centerX, ...plans.map(plan => plan.routeX))
        const nextY = findFreeRow(channels, family.id, desiredY, minX, maxX, { maxY: Math.min(...partners.map(point => point.y - SIZE.height / 2)) - ROUTE_GAP })
        if (Math.abs(nextY - stemY) < 0.01) break
      }
      const xs = [centerX, ...plans.map(plan => plan.routeX)]
      for (const { partner, port, routeX, exitY } of plans) {
        const details = { relation: partnerRelation, relationKind: family.raw.family_type, familyId: family.id, personIds: family.partners, segment: 'spouse-stem' }
        const topY = port.y
        if (routeX === port.x) {
          segment('spouse:' + family.id + ':' + partner.id + ':stem', { x: port.x, y: topY }, { x: port.x, y: stemY }, details)
        } else {
          segment('spouse:' + family.id + ':' + partner.id + ':exit', { x: port.x, y: topY }, { x: port.x, y: exitY }, details)
          segment('spouse:' + family.id + ':' + partner.id + ':route', { x: port.x, y: exitY }, { x: routeX, y: exitY }, details)
          segment('spouse:' + family.id + ':' + partner.id + ':stem', { x: routeX, y: exitY }, { x: routeX, y: stemY }, details)
        }
      }
      segment('spouse:' + family.id + ':bus', { x: Math.min(...xs), y: stemY }, { x: Math.max(...xs), y: stemY }, { relation: partnerRelation, relationKind: family.raw.family_type, familyId: family.id, personIds: family.partners, segment: 'spouse' })
    }
    if (!children.length) continue
    const nearestChildTop = Math.min(...children.map(child => child.y - SIZE.height / 2))
    const alignedSingle = partners.length > 0 && children.length === 1 && Math.abs(children[0].portX - centerX) < 0.001 && nearestChildTop > stemY
    // 未知父母家庭仍保留同胞归属，只绘制子女总线，不生成虚构的父母卡片。
    const desiredBusY = !partners.length ? nearestChildTop - ROUTE_GAP - lane * Math.min(12, 64 / counts.get(parentY))
      : alignedSingle ? nearestChildTop : parentY + SIZE.height / 2 + ROUTE_GAP + lane * Math.min(12, 64 / counts.get(parentY))
    let minX = Math.min(centerX, ...children.map(child => child.portX))
    let maxX = Math.max(centerX, ...children.map(child => child.portX))
    let busY
    let parentExitY
    let trunkX
    let childPlans
    // 子女绕行可能延长总线；先扩大整个家庭占用范围，再一次性输出，避免先画后补产生重合。
    while (true) {
      busY = findFreeRow(channels, family.id, desiredBusY, minX, maxX)
      parentExitY = directPartners ? parentY + SIZE.height / 2 + ROUTE_GAP : stemY
      trunkX = partners.length ? findFreeColumn(channels, family.id, centerX, parentExitY + 0.01, busY) : centerX
      if (partners.length && trunkX !== centerX) {
        const minY = directPartners || partners.length === 1 ? parentY + SIZE.height / 2 : -Infinity
        parentExitY = findFreeRow(channels, family.id, parentExitY, centerX, trunkX, { minY })
        trunkX = findFreeColumn(channels, family.id, centerX, parentExitY, busY)
      }
      childPlans = children.map(child => ({ child, ...planTopPort(channels, family.id, { x: child.portX, y: child.y - SIZE.height / 2 }, busY) }))
      minX = Math.min(minX, trunkX, ...childPlans.map(plan => plan.routeX))
      maxX = Math.max(maxX, trunkX, ...childPlans.map(plan => plan.routeX))
      const nextY = findFreeRow(channels, family.id, desiredBusY, minX, maxX)
      if (Math.abs(nextY - busY) < 0.01) break
    }
    const common = { relation: 'child', familyId: family.id, personIds: [...family.partners, ...family.children.keys()] }
    const kinds = new Set(children.map(child => relationKind(child.raw)))
    const sharedRaw = kinds.size === 1 ? children[0].raw : null
    const shared = { ...common, relationKind: kinds.size === 1 ? [...kinds][0] : 'mixed', raw: sharedRaw }
    // 支干和兄弟姐妹总线分别绘制；每个子女支线保存自己的生养类型。
    if (partners.length && trunkX !== centerX) {
      segment('child:' + family.id + ':parent-connector', { x: centerX, y: stemY }, { x: centerX, y: parentExitY }, { ...shared, segment: 'parent-connector' })
      segment('child:' + family.id + ':parent-exit', { x: centerX, y: parentExitY }, { x: trunkX, y: parentExitY }, { ...shared, segment: 'parent-exit' })
    }
    if (partners.length) segment('child:' + family.id + ':parent-stem', { x: trunkX, y: trunkX === centerX ? stemY : parentExitY }, { x: trunkX, y: busY }, { ...shared, segment: 'parent-stem' })
    if (!alignedSingle || trunkX !== centerX) {
      const xs = [trunkX, ...children.map(child => child.portX)]
      const kind = children.length > 1 ? 'sibling-bus' : 'child-connector'
      segment('child:' + family.id + ':' + kind, { x: Math.min(...xs), y: busY }, { x: Math.max(...xs), y: busY }, { ...shared, segment: kind })
    }
    for (const { child, routeX: childX, exitY: childLaneY } of childPlans) {
      const top = child.y - SIZE.height / 2
      const details = { ...common, childId: child.id, relationKind: relationKind(child.raw), raw: child.raw, metadata: child.raw.metadata, segment: 'child-stem' }
      if (childX === child.portX) {
        segment('child:' + family.id + ':' + child.id + ':child-stem', { x: child.portX, y: busY }, { x: child.portX, y: top }, details)
      } else {
        segment('child:' + family.id + ':' + child.id + ':route', { x: child.portX, y: busY }, { x: childX, y: busY }, { ...details, segment: 'child-route' })
        segment('child:' + family.id + ':' + child.id + ':long-stem', { x: childX, y: busY }, { x: childX, y: childLaneY }, details)
        segment('child:' + family.id + ':' + child.id + ':entry', { x: childX, y: childLaneY }, { x: child.portX, y: childLaneY }, { ...details, segment: 'child-entry' })
        segment('child:' + family.id + ':' + child.id + ':child-stem', { x: child.portX, y: childLaneY }, { x: child.portX, y: top }, details)
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
