/** 独立的正交通道索引与交叉分析，所有坐标均使用最终布局坐标。 */
const EPSILON = 0.01
export const CHANNEL_GAP = 6
const CARD_GAP = 18

// --- 通道占用和空闲轨道 --- //

/** 创建人物障碍物与已占线段索引；人物使用现有 G6 卡片尺寸。 */
export function createRoutingChannels(people) {
  return {
    people: people.map(person => ({ x: person.x, y: person.y, width: person.size[0], height: person.size[1] })),
    horizontal: [], vertical: []
  }
}

/** 登记一段真实关系或预留的人物端口；同家庭可以在自身接头上会合。 */
export function reserveRouteSegment(channels, start, end, familyId, reservation = 'route') {
  if (Math.abs(start.x - end.x) < EPSILON && Math.abs(start.y - end.y) < EPSILON) return
  const vertical = Math.abs(start.x - end.x) < EPSILON
  channels[vertical ? 'vertical' : 'horizontal'].push({
    familyId, reservation, coordinate: vertical ? start.x : start.y,
    min: vertical ? Math.min(start.y, end.y) : Math.min(start.x, end.x),
    max: vertical ? Math.max(start.y, end.y) : Math.max(start.x, end.x)
  })
}

/** 判断两个开区间是否有真实长度的重合，端点相接不占用一整段轨道。 */
function overlaps(minA, maxA, minB, maxB) {
  return Math.min(maxA, maxB) - Math.max(minA, minB) > EPSILON
}

/** 在人物和其他家庭的垂直通道之间选择最近空白列。 */
export function findFreeColumn(channels, familyId, desired, fromY, toY) {
  const min = Math.min(fromY, toY)
  const max = Math.max(fromY, toY)
  const people = channels.people.filter(person => overlaps(min, max, person.y - person.height / 2, person.y + person.height / 2))
  const occupied = channels.vertical.filter(segment => segment.familyId !== familyId && overlaps(min, max, segment.min, segment.max))
  const candidates = [desired]
  for (const person of people) candidates.push(person.x - person.width / 2 - CARD_GAP, person.x + person.width / 2 + CARD_GAP)
  for (const segment of occupied) candidates.push(segment.coordinate - CHANNEL_GAP, segment.coordinate + CHANNEL_GAP)
  // 最外侧候选越过全部障碍和已占通道，保证有限的输入总能找到有限的轨道。
  candidates.push(Math.min(...candidates) - CARD_GAP - CHANNEL_GAP, Math.max(...candidates) + CARD_GAP + CHANNEL_GAP)
  candidates.sort((a, b) => Math.abs(a - desired) - Math.abs(b - desired) || a - b)
  const column = candidates.find(x => people.every(person => Math.abs(x - person.x) >= person.width / 2 + CARD_GAP - EPSILON) &&
    occupied.every(segment => Math.abs(x - segment.coordinate) >= CHANNEL_GAP - EPSILON))
  if (column === undefined) throw new Error('无法为家庭关系分配垂直通道')
  return column
}

/** 在代际空白带内选择横向轨道，避开已被其他家庭占用的重叠区间。 */
export function findFreeRow(channels, familyId, desired, fromX, toX, { minY = -Infinity, maxY = Infinity } = {}) {
  const min = Math.min(fromX, toX)
  const max = Math.max(fromX, toX)
  const people = channels.people.filter(person => overlaps(min, max, person.x - person.width / 2, person.x + person.width / 2))
  const occupied = channels.horizontal.filter(segment => segment.familyId !== familyId && overlaps(min, max, segment.min, segment.max))
  const candidates = [desired]
  for (const person of people) candidates.push(person.y - person.height / 2 - CARD_GAP, person.y + person.height / 2 + CARD_GAP)
  for (const segment of occupied) candidates.push(segment.coordinate - CHANNEL_GAP, segment.coordinate + CHANNEL_GAP)
  candidates.push(Math.min(Number.isFinite(maxY) ? maxY : desired, ...candidates) - CARD_GAP - CHANNEL_GAP,
    Math.max(Number.isFinite(minY) ? minY : desired, ...candidates) + CARD_GAP + CHANNEL_GAP)
  if (Number.isFinite(minY)) candidates.push(minY)
  if (Number.isFinite(maxY)) candidates.push(maxY)
  candidates.sort((a, b) => Math.abs(a - desired) - Math.abs(b - desired) || a - b)
  const row = candidates.find(y => Number.isFinite(y) && y >= minY && y <= maxY &&
    people.every(person => y <= person.y - person.height / 2 + EPSILON || y >= person.y + person.height / 2 - EPSILON) &&
    occupied.every(segment => Math.abs(y - segment.coordinate) >= CHANNEL_GAP - EPSILON))
  if (row === undefined) throw new Error('无法在指定人物边界外分配水平通道')
  return row
}

// --- 交叉与真实关系接点 --- //

/** 判断交点是否为两个家庭共同人物卡片上的真实关系端点。 */
function isSharedPersonPort(point, first, second, people) {
  if (Math.min(Math.abs(point.y - first.minY), Math.abs(point.y - first.maxY)) > EPSILON ||
    Math.min(Math.abs(point.x - second.minX), Math.abs(point.x - second.maxX)) > EPSILON) return false
  return people.some(person => {
    if (!first.edge.personIds.includes(person.id) || !second.edge.personIds.includes(person.id)) return false
    const dx = Math.abs(point.x - person.x)
    const dy = Math.abs(point.y - person.y)
    return (Math.abs(dx - person.size[0] / 2) < EPSILON && dy <= person.size[1] / 2 + EPSILON) ||
      (Math.abs(dy - person.size[1] / 2) < EPSILON && dx <= person.size[0] / 2 + EPSILON)
  })
}

/** 分析异家庭的正交交叉；垂直线跨过水平线，同家庭真实接头不产生断口。 */
export function analyzeCrossings(layout) {
  const positions = new Map(layout.nodes.map(node => [node.id, node]))
  const people = layout.nodes.filter(node => node.nodeType === 'person')
  const horizontal = []
  const vertical = []
  for (const edge of layout.edges) {
    const start = positions.get(edge.source)
    const end = positions.get(edge.target)
    if (Math.abs(start.x - end.x) < EPSILON) vertical.push({ edge, x: start.x, minY: Math.min(start.y, end.y), maxY: Math.max(start.y, end.y) })
    else horizontal.push({ edge, y: start.y, minX: Math.min(start.x, end.x), maxX: Math.max(start.x, end.x) })
  }
  horizontal.sort((a, b) => a.minX - b.minX || a.edge.id.localeCompare(b.edge.id))
  vertical.sort((a, b) => a.x - b.x || a.edge.id.localeCompare(b.edge.id))
  const crossings = []
  let active = []
  let next = 0
  // 横向扫描只检查覆盖当前列的水平线，避免对全部线段做笛卡尔积比较。
  for (const over of vertical) {
    while (next < horizontal.length && horizontal[next].minX <= over.x + EPSILON) active.push(horizontal[next++])
    active = active.filter(under => under.maxX >= over.x - EPSILON)
    for (const under of active) {
      if (over.edge.familyId === under.edge.familyId || under.y < over.minY - EPSILON || under.y > over.maxY + EPSILON) continue
      const point = { x: over.x, y: under.y }
      if (isSharedPersonPort(point, over, under, people)) continue
      crossings.push({
        id: 'crossing:' + over.edge.id + ':' + under.edge.id,
        ...point, overEdgeId: over.edge.id, underEdgeId: under.edge.id,
        overRouteId: over.edge.routeId, underRouteId: under.edge.routeId,
        overFamilyId: over.edge.familyId, underFamilyId: under.edge.familyId, gap: 8
      })
    }
  }
  return crossings
}
