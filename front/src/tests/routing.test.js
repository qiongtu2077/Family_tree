import { describe, expect, it } from 'vitest'
import { analyzeCrossings, createRoutingChannels, findFreeColumn, findFreeRow, reserveRouteSegment } from '../graph/routing.js'

// --- 几何样本 --- //

/** 创建具有真实人物边界的测试卡片。 */
function person(id, x, y) {
  return { id, x, y, nodeType: 'person', size: [140, 52] }
}

/** 生成保持 familyId 和语义 routeId 的显式直线布局。 */
function lineLayout(lines, people = []) {
  const nodes = [...people]
  const edges = lines.map(line => {
    nodes.push({ id: line.id + ':start', ...line.start }, { id: line.id + ':end', ...line.end })
    return { id: line.id, source: line.id + ':start', target: line.id + ':end', familyId: line.familyId, routeId: 'semantic:' + line.id, personIds: line.personIds || [] }
  })
  return { nodes, edges }
}

// --- 已占通道与边界约束 --- //

describe('orthogonal family routing channels', () => {
  it('separates foreign collinear tracks while allowing a real same-family junction', () => {
    const channels = createRoutingChannels([])
    reserveRouteSegment(channels, { x: 0, y: 0 }, { x: 0, y: 100 }, 'birth')
    const first = findFreeColumn(channels, 'adoptive', 0, 20, 80)
    expect(Math.abs(first)).toBeGreaterThanOrEqual(6)
    reserveRouteSegment(channels, { x: first, y: 20 }, { x: first, y: 80 }, 'adoptive')
    const second = findFreeColumn(channels, 'step', 0, 20, 80)
    expect(Math.abs(second)).toBeGreaterThanOrEqual(6)
    expect(Math.abs(second - first)).toBeGreaterThanOrEqual(6)
    expect(findFreeColumn(channels, 'birth', 0, 20, 80)).toBe(0)
    expect(findFreeColumn(channels, 'other', 0, 101, 120)).toBe(0)

    reserveRouteSegment(channels, { x: 0, y: 0 }, { x: 100, y: 0 }, 'birth')
    expect(Math.abs(findFreeRow(channels, 'other', 0, 20, 80))).toBeGreaterThanOrEqual(6)
    expect(findFreeRow(channels, 'birth', 0, 20, 80)).toBe(0)
    expect(findFreeRow(channels, 'other', 0, 101, 120)).toBe(0)
    // 垂直穿越水平轨道仍是合法路由，交叉分析会明确描述其遮盖层次。
    expect(findFreeRow(channels, 'other', 50, -20, 20)).toBe(50)
  })

  it('returns finite outer tracks after nearby card gaps and channels are full', () => {
    const channels = createRoutingChannels([person('left', 0, 0), person('right', 160, 0)])
    for (let index = -20; index <= 20; index += 1) {
      reserveRouteSegment(channels, { x: index * 6, y: -100 }, { x: index * 6, y: 100 }, 'occupied')
      reserveRouteSegment(channels, { x: -500, y: index * 6 }, { x: 500, y: index * 6 }, 'occupied')
    }
    const column = findFreeColumn(channels, 'new', 80, -100, 100)
    const row = findFreeRow(channels, 'new', 0, -500, 500, { maxY: -26 })
    expect(Number.isFinite(column) && Number.isFinite(row)).toBe(true)
    expect(column < -70 || column > 230).toBe(true)
    expect(row).toBeLessThanOrEqual(-26)
    expect(Math.abs(row)).toBeGreaterThanOrEqual(126)
  })

  it('uses local horizontal space beside cards and never returns undefined for an impossible bounded row', () => {
    const channels = createRoutingChannels([person('card', 0, 0)])
    expect(findFreeRow(channels, 'other', 0, 100, 200)).toBe(0)
    expect(() => findFreeRow(channels, 'other', 0, -10, 10, { minY: -10, maxY: 10 })).toThrow('无法在指定人物边界外分配水平通道')
    reserveRouteSegment(channels, { x: 10, y: 10 }, { x: 10, y: 10 }, 'zero-length')
    expect(channels.horizontal).toHaveLength(0)
    expect(channels.vertical).toHaveLength(0)
  })
})

// --- 交叉消歧与真实端点 --- //

describe('family crossing descriptors', () => {
  it('reports the exact edge IDs, semantic routes and final coordinates of a foreign crossing', () => {
    const layout = lineLayout([
      { id: 'horizontal', familyId: 'left', start: { x: -80, y: 15 }, end: { x: 80, y: 15 } },
      { id: 'vertical', familyId: 'right', start: { x: 20, y: -60 }, end: { x: 20, y: 80 } }
    ])
    const crossings = analyzeCrossings(layout)
    expect(crossings).toHaveLength(1)
    expect(crossings[0]).toMatchObject({ x: 20, y: 15, overEdgeId: 'vertical', underEdgeId: 'horizontal', overRouteId: 'semantic:vertical', underRouteId: 'semantic:horizontal', overFamilyId: 'right', underFamilyId: 'left', gap: 8 })
    expect(analyzeCrossings({ nodes: [...layout.nodes].reverse(), edges: [...layout.edges].reverse() })).toEqual(crossings)
    const moved = { nodes: layout.nodes.map(node => ({ ...node, x: node.x + 400, y: node.y + 600 })), edges: layout.edges }
    expect(analyzeCrossings(moved)[0]).toMatchObject({ x: 420, y: 615 })
  })

  it('keeps real same-family junctions continuous', () => {
    const layout = lineLayout([
      { id: 'sibling-bus', familyId: 'same', start: { x: -80, y: 0 }, end: { x: 80, y: 0 } },
      { id: 'child-stem', familyId: 'same', start: { x: 0, y: 0 }, end: { x: 0, y: 80 } }
    ])
    expect(analyzeCrossings(layout)).toEqual([])
  })

  it('keeps a genuine shared-person boundary endpoint continuous', () => {
    const layout = lineLayout([
      { id: 'birth', familyId: 'birth', personIds: ['shared'], start: { x: 0, y: -100 }, end: { x: 0, y: -26 } },
      { id: 'adoptive', familyId: 'adoptive', personIds: ['shared'], start: { x: -120, y: -26 }, end: { x: 0, y: -26 } }
    ], [person('shared', 0, 0)])
    expect(analyzeCrossings(layout)).toEqual([])
  })

  it('does not mistake a passing bus for a shared-person endpoint', () => {
    const layout = lineLayout([
      { id: 'birth', familyId: 'birth', personIds: ['shared'], start: { x: 0, y: -100 }, end: { x: 0, y: -26 } },
      { id: 'passing-bus', familyId: 'other', personIds: ['shared'], start: { x: -120, y: -26 }, end: { x: 120, y: -26 } }
    ], [person('shared', 0, 0)])
    expect(analyzeCrossings(layout)).toHaveLength(1)
  })

  it('distinguishes unrelated T intersections and ignores lines outside the crossing interval', () => {
    const layout = lineLayout([
      { id: 'horizontal', familyId: 'one', start: { x: -40, y: 0 }, end: { x: 40, y: 0 } },
      { id: 'touching', familyId: 'two', start: { x: 0, y: -50 }, end: { x: 0, y: 0 } },
      { id: 'far-right', familyId: 'three', start: { x: 90, y: -50 }, end: { x: 90, y: 50 } },
      { id: 'far-above', familyId: 'four', start: { x: -40, y: -100 }, end: { x: 40, y: -100 } }
    ])
    expect(analyzeCrossings(layout).map(crossing => [crossing.overEdgeId, crossing.underEdgeId])).toEqual([['touching', 'horizontal']])
  })
})
