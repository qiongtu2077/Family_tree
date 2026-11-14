import { describe, expect, it } from 'vitest'
import { layoutGraph } from '../composables/useGraphLayout'

// --- 家系样本和几何断言 --- //

/** 由明确的家庭样本创建真实 GraphViewDTO 结构。 */
function makeGraph(families, options = {}) {
  const people = new Set(options.extraPeople || [])
  const nodes = []
  const edges = []
  for (const family of families) {
    for (const id of family.parents) people.add(id)
    for (const child of family.children) people.add(child.id)
    const familyId = 'family:' + family.id
    nodes.push({ id: familyId, type: 'familyUnit', family_type: family.type || 'marriage' })
    for (const parent of family.parents) edges.push({ id: parent + '>' + familyId, source: parent, target: familyId, relation: 'partner', style: 'spouse' })
    for (const child of family.children) edges.push({
      id: familyId + '>' + child.id, source: familyId, target: child.id,
      relation: child.kind, style: child.kind === 'biological' ? 'solid' : 'dashed',
      metadata: { relationKind: child.kind }
    })
  }
  for (const id of people) nodes.push({ id, type: 'person', name: id })
  return { view_mode: options.mode || 'mainline', center_person_id: options.center || null, view_context: options.context || {}, nodes, edges }
}

/** 创建家庭样本，子女默认明确标为亲生关系。 */
function unit(id, parents, childIds) {
  return { id, parents, children: childIds.map(childId => ({ id: childId, kind: 'biological' })) }
}

/** 生成可重复的高密度无环家系，包含多配偶及跨代婚配。 */
function denseFamilies(seed, count) {
  let state = seed
  const families = []
  for (let child = 4; child < count; child += 1) {
    state = (state * 1664525 + 1013904223) >>> 0
    const first = state % child
    state = (state * 1664525 + 1013904223) >>> 0
    let second = state % child
    if (second === first) second = (second + 1) % child
    families.push(unit('unit-' + child, ['p' + first, 'p' + second], ['p' + child]))
  }
  return families
}

/** 根据布局节点索引还原每条可视线段的实际端点。 */
function segments(layout, familyId = null) {
  const nodes = new Map(layout.nodes.map(node => [node.id, node]))
  return layout.edges.filter(edge => !familyId || edge.familyId === familyId).map(edge => ({
    edge, a: nodes.get(edge.source), b: nodes.get(edge.target)
  }))
}

/** 验证每个人物只出现一次，真实卡片矩形没有重叠。 */
function expectDistinctCards(layout) {
  const persons = layout.nodes.filter(node => node.nodeType === 'person')
  expect(new Set(persons.map(node => node.id)).size).toBe(persons.length)
  const collisions = []
  for (let i = 0; i < persons.length; i += 1) {
    for (let j = i + 1; j < persons.length; j += 1) {
      const a = persons[i]
      const b = persons[j]
      const overlaps = Math.abs(a.x - b.x) < (a.size[0] + b.size[0]) / 2 - 0.01 &&
        Math.abs(a.y - b.y) < (a.size[1] + b.size[1]) / 2 - 0.01
      if (overlaps) collisions.push([a.id, b.id])
    }
  }
  expect(collisions).toEqual([])
}

/** 判断某个坐标是否落在线段上，允许浮点计算误差。 */
function onSegment(point, segment) {
  return Math.abs((segment.b.x - segment.a.x) * (point.y - segment.a.y) -
    (segment.b.y - segment.a.y) * (point.x - segment.a.x)) < 0.01 &&
    point.x >= Math.min(segment.a.x, segment.b.x) - 0.01 &&
    point.x <= Math.max(segment.a.x, segment.b.x) + 0.01 &&
    point.y >= Math.min(segment.a.y, segment.b.y) - 0.01 &&
    point.y <= Math.max(segment.a.y, segment.b.y) + 0.01
}

/** 判断两条正交线段是否接触或相交，包括线段中点的家庭接头。 */
function intersects(a, b) {
  if ([a.a, a.b].some(point => onSegment(point, b)) || [b.a, b.b].some(point => onSegment(point, a))) return true
  const point = a.a.x === a.b.x ? { x: a.a.x, y: b.a.y } : { x: b.a.x, y: a.a.y }
  return onSegment(point, a) && onSegment(point, b)
}

/** 判断实际线段端点是否抵达人卡边界，允许多家庭使用独立端口。 */
function touchesCard(line, node, topOnly = false) {
  const left = node.x - node.size[0] / 2
  const right = node.x + node.size[0] / 2
  const top = node.y - node.size[1] / 2
  const bottom = node.y + node.size[1] / 2
  return [line.a, line.b].some(point => {
    if (Math.abs(point.y - top) < 0.01 && point.x >= left - 0.01 && point.x <= right + 0.01) return true
    return !topOnly && ((Math.abs(point.y - bottom) < 0.01 && point.x >= left - 0.01 && point.x <= right + 0.01) ||
      ((Math.abs(point.x - left) < 0.01 || Math.abs(point.x - right) < 0.01) && point.y >= top - 0.01 && point.y <= bottom + 0.01))
  })
}

/** 验证家庭线段连成完整网络，亲子线真正到达每个子女的卡片顶部端口。 */
function expectConnectedFamily(layout, family) {
  const lines = segments(layout, 'family:' + family.id)
  expect(lines.length).toBeGreaterThan(0)
  const reached = new Set([0])
  let changed = true
  while (changed) {
    changed = false
    for (let i = 0; i < lines.length; i += 1) {
      if (reached.has(i)) continue
      if ([...reached].some(index => intersects(lines[index], lines[i]))) {
        reached.add(i)
        changed = true
      }
    }
  }
  expect(reached.size, family.id + ' has disconnected segments').toBe(lines.length)
  for (const parentId of family.parents) {
    const node = layout.nodes.find(item => item.id === parentId)
    expect(lines.some(line => touchesCard(line, node)), family.id + ' misses parent ' + parentId).toBe(true)
  }
  for (const child of family.children) {
    const node = layout.nodes.find(item => item.id === child.id)
    expect(lines.some(line => touchesCard(line, node, true)), family.id + ' misses child ' + child.id).toBe(true)
  }
}

/** 验证所有可视家谱线都是直角线段，并且不穿过人物卡片内部。 */
function expectClearOrthogonalLines(layout) {
  const cards = layout.nodes.filter(node => node.nodeType === 'person')
  expect(layout.nodes.every(node => Number.isFinite(node.x) && Number.isFinite(node.y))).toBe(true)
  const diagonals = []
  const crossings = []
  for (const line of segments(layout)) {
    const vertical = Math.abs(line.a.x - line.b.x) < 0.01
    const horizontal = Math.abs(line.a.y - line.b.y) < 0.01
    if (!vertical && !horizontal) diagonals.push(line.edge.id)
    for (const card of cards) {
      const left = card.x - card.size[0] / 2
      const right = card.x + card.size[0] / 2
      const top = card.y - card.size[1] / 2
      const bottom = card.y + card.size[1] / 2
      const throughCard = vertical
        ? line.a.x > left + 0.01 && line.a.x < right - 0.01 && Math.max(line.a.y, line.b.y) > top + 0.01 && Math.min(line.a.y, line.b.y) < bottom - 0.01
        : line.a.y > top + 0.01 && line.a.y < bottom - 0.01 && Math.max(line.a.x, line.b.x) > left + 0.01 && Math.min(line.a.x, line.b.x) < right - 0.01
      if (throughCard) crossings.push([line.edge.id, card.id])
    }
  }
  expect(diagonals).toEqual([])
  expect(crossings).toEqual([])
  expectExclusiveChannels(layout)
}

/** 验证不同家庭没有任何正长度的共线重合，单点正交交叉由元数据消歧。 */
function expectExclusiveChannels(layout) {
  const lines = segments(layout)
  const collisions = []
  for (let i = 0; i < lines.length; i += 1) {
    for (let j = i + 1; j < lines.length; j += 1) {
      const first = lines[i]
      const second = lines[j]
      if (first.edge.familyId === second.edge.familyId) continue
      const vertical = Math.abs(first.a.x - first.b.x) < 0.01
      if (vertical !== (Math.abs(second.a.x - second.b.x) < 0.01)) continue
      const axis = vertical ? 'x' : 'y'
      const distance = vertical ? 'y' : 'x'
      const overlap = Math.abs(first.a[axis] - second.a[axis]) < 0.01 &&
        Math.min(Math.max(first.a[distance], first.b[distance]), Math.max(second.a[distance], second.b[distance])) -
        Math.max(Math.min(first.a[distance], first.b[distance]), Math.min(second.a[distance], second.b[distance])) > 0.01
      if (overlap) collisions.push([first.edge.id, second.edge.id])
    }
  }
  expect(collisions).toEqual([])
}

/** 返回与输入顺序无关的人物坐标，方便验证稳定布局。 */
function coordinateSnapshot(layout) {
  return layout.nodes.filter(node => node.nodeType === 'person').map(({ id, x, y, generation }) => ({ id, x, y, generation })).sort((a, b) => a.id.localeCompare(b.id))
}

/** 保存实际通道与交叉描述，验证接口输入逆序不会改变关系走线。 */
function routingSnapshot(layout) {
  return {
    lines: segments(layout).map(({ edge, a, b }) => ({ id: edge.id, routeId: edge.routeId, familyId: edge.familyId, a: [a.x, a.y], b: [b.x, b.y] })).sort((a, b) => a.id.localeCompare(b.id)),
    crossings: layout.crossings
  }
}

// --- 已复现缺陷和复杂家庭回归 --- //

describe('family layout geometry and relationship regressions', () => {
  it('separates both grandparent families in the seven-person pedigree', async () => {
    const families = [unit('a', ['gf', 'gm'], ['father']), unit('b', ['mgf', 'mgm'], ['mother']), unit('c', ['father', 'mother'], ['center'])]
    const layout = await layoutGraph(makeGraph(families, { center: 'center' }))
    expect(layout.nodes.filter(node => node.nodeType === 'person')).toHaveLength(7)
    expectDistinctCards(layout)
    expectClearOrthogonalLines(layout)
    for (const family of families) expectConnectedFamily(layout, family)
  })

  it('connects an only child to both parents in the four-person inlaw view', async () => {
    const families = [unit('origin', ['father', 'mother'], ['spouse']), unit('marriage', ['center', 'spouse'], [])]
    const layout = await layoutGraph(makeGraph(families, { mode: 'inlaw', center: 'center', context: { center_person_id: 'center', spouse_id: 'spouse', family_unit_id: 'marriage' } }))
    expectConnectedFamily(layout, families[0])
    expectDistinctCards(layout)
    expectClearOrthogonalLines(layout)
  })

  it('retains all overview relations and packs actual connected components', async () => {
    const families = [unit('one', ['a', 'b'], ['c']), unit('two', ['c', 'd'], ['e'])]
    const layout = await layoutGraph(makeGraph(families, { mode: 'overview', extraPeople: ['isolated'] }))
    const people = layout.nodes.filter(node => node.nodeType === 'person')
    expect(people).toHaveLength(6)
    expect(layout.clusters).toHaveLength(2)
    expect(new Set(people.filter(node => node.id !== 'isolated').map(node => node.componentId)).size).toBe(1)
    expect(people.find(node => node.id === 'isolated').componentId).not.toBe(people.find(node => node.id === 'a').componentId)
    expectDistinctCards(layout)
    expectClearOrthogonalLines(layout)
    for (const family of families) expectConnectedFamily(layout, family)
  })

  it('keeps every marriage and child when a person has several spouses', async () => {
    const families = [unit('one', ['person', 'spouse-a'], ['child-a']), unit('two', ['person', 'spouse-b'], ['child-b']), unit('three', ['person', 'spouse-c'], ['child-c'])]
    const layout = await layoutGraph(makeGraph(families, { center: 'person' }))
    expect(layout.nodes.filter(node => node.nodeType === 'person')).toHaveLength(7)
    expectDistinctCards(layout)
    expectClearOrthogonalLines(layout)
    for (const family of families) expectConnectedFamily(layout, family)
  })

  it('keeps biological and adoptive families with distinct relationship styles', async () => {
    const biological = unit('birth', ['father', 'mother'], ['child'])
    const adoptive = { id: 'adoptive', parents: ['adoptive-father', 'adoptive-mother'], children: [{ id: 'child', kind: 'adoptive' }] }
    const layout = await layoutGraph(makeGraph([biological, adoptive], { center: 'child' }))
    expect(layout.nodes.filter(node => node.id === 'child')).toHaveLength(1)
    const adoptiveLines = layout.edges.filter(edge => edge.familyId === 'family:adoptive' && edge.relation === 'child')
    expect(adoptiveLines.length).toBeGreaterThan(0)
    expect(adoptiveLines.every(edge => edge.relationKind === 'adoptive' && edge.style.lineDash?.length)).toBe(true)
    expect(layout.edges.filter(edge => edge.familyId === 'family:birth').every(edge => !edge.style.lineDash)).toBe(true)
    expectConnectedFamily(layout, biological)
    expectConnectedFamily(layout, adoptive)
    expectDistinctCards(layout)
    expectClearOrthogonalLines(layout)
  })

  it('keeps biological, adoptive and step families on distinct child ports with their evidence', async () => {
    const families = [
      unit('birth', ['father', 'mother'], ['child']),
      { id: 'adoptive', parents: ['adoptive-parent'], children: [{ id: 'child', kind: 'adoptive' }], type: 'adoptive' },
      { id: 'step', parents: ['step-parent'], children: [{ id: 'child', kind: 'step' }], type: 'single_parent' }
    ]
    const graph = makeGraph(families, { center: 'child' })
    const layout = await layoutGraph(graph)
    const child = layout.nodes.find(node => node.id === 'child')
    const ports = new Set()
    for (const family of families) {
      const lines = segments(layout, 'family:' + family.id)
      const raw = graph.edges.find(edge => edge.source === 'family:' + family.id && edge.target === 'child')
      for (const line of lines) {
        expect(line.edge.routeOwnerId).toBe(line.edge.familyId)
        expect(line.edge.routeId).toBe(line.edge.id)
        if (line.edge.relation === 'child') expect(line.edge.raw).toEqual(raw)
        for (const point of [line.a, line.b]) {
          if (Math.abs(point.y - child.y + child.size[1] / 2) < 0.01 && Math.abs(point.x - child.x) < child.size[0] / 2) ports.add(point.x)
        }
      }
      expectConnectedFamily(layout, family)
    }
    expect(ports.size).toBe(3)
    expectDistinctCards(layout)
    expectClearOrthogonalLines(layout)
  })

  it('preserves both direct parents without inventing a marriage', async () => {
    const graph = {
      view_mode: 'mainline', center_person_id: 'child',
      nodes: ['father', 'mother', 'child'].map(id => ({ id, type: 'person', name: id })),
      edges: [
        { id: 'father-child', source: 'father', target: 'child', relation: 'father', style: 'solid' },
        { id: 'mother-child', source: 'mother', target: 'child', relation: 'mother', style: 'solid' }
      ]
    }
    const layout = await layoutGraph(graph)
    expect(layout.edges.some(edge => edge.familyId.includes('direct:father:child'))).toBe(true)
    expect(layout.edges.some(edge => edge.familyId.includes('direct:mother:child'))).toBe(true)
    expect(layout.edges.some(edge => edge.relation === 'spouse')).toBe(false)
    expectDistinctCards(layout)
    expectClearOrthogonalLines(layout)
  })

  it.each(['single_parent', 'unknown_parent', 'adoptive'])('does not invent a marriage between the co-parents in a %s family', async type => {
    const family = { ...unit(type, ['parent-a', 'parent-b'], ['child']), type }
    const layout = await layoutGraph(makeGraph([family]))
    expect(layout.edges.some(edge => edge.relation === 'spouse')).toBe(false)
    expect(layout.edges.some(edge => edge.relation === 'co-parent')).toBe(true)
    expectConnectedFamily(layout, family)
    expectDistinctCards(layout)
    expectClearOrthogonalLines(layout)
  })

  it('preserves an explicit marriage in addition to a shared adoptive family', async () => {
    const family = { ...unit('adoptive', ['parent-a', 'parent-b'], ['child']), type: 'adoptive' }
    const graph = makeGraph([family])
    graph.edges.push({ id: 'explicit-marriage', source: 'parent-a', target: 'parent-b', relation: 'spouse', style: 'spouse' })
    const layout = await layoutGraph(graph)
    expect(layout.edges.some(edge => edge.relation === 'spouse' && edge.personIds.includes('parent-a') && edge.personIds.includes('parent-b'))).toBe(true)
    expect(layout.edges.some(edge => edge.relation === 'co-parent' && edge.familyId === 'family:adoptive')).toBe(true)
    expectConnectedFamily(layout, family)
    expectDistinctCards(layout)
    expectClearOrthogonalLines(layout)
  })

  it('connects known siblings with unknown parents without creating visible family nodes', async () => {
    const family = { ...unit('unknown', [], ['a', 'b', 'c']), type: 'unknown_parent' }
    const layout = await layoutGraph(makeGraph([family], { center: 'a' }))
    expect(layout.nodes.filter(node => node.nodeType === 'person').map(node => node.id).sort()).toEqual(['a', 'b', 'c'])
    expect(layout.nodes.some(node => node.nodeType === 'familyUnit' || node.id === 'family:unknown')).toBe(false)
    expect(layout.edges.some(edge => edge.relation === 'spouse' || edge.segment === 'parent-stem')).toBe(false)
    expectConnectedFamily(layout, family)
    expectDistinctCards(layout)
    expectClearOrthogonalLines(layout)
  })

  it('retains a child-only family relation alongside known ancestry at a different generation', async () => {
    const families = [
      unit('known', ['parent'], ['a']),
      { ...unit('unknown', [], ['a', 'b']), type: 'unknown_parent' }
    ]
    const layout = await layoutGraph(makeGraph(families, { mode: 'overview' }))
    expect(layout.clusters).toHaveLength(1)
    for (const family of families) expectConnectedFamily(layout, family)
    expectDistinctCards(layout)
    expectClearOrthogonalLines(layout)
  })

  it('centers a child beneath every member of a shared caregiving family', async () => {
    const family = { ...unit('caregivers', ['a', 'b', 'c'], ['child']), type: 'adoptive' }
    const layout = await layoutGraph(makeGraph([family]))
    const people = new Map(layout.nodes.filter(node => node.nodeType === 'person').map(node => [node.id, node]))
    const parentCenter = family.parents.reduce((sum, id) => sum + people.get(id).x, 0) / family.parents.length
    expect(people.get('child').x).toBeCloseTo(parentCenter)
    expect(layout.edges.some(edge => edge.relation === 'spouse' || edge.segment === 'sibling-bus')).toBe(false)
    expectConnectedFamily(layout, family)
    expectDistinctCards(layout)
    expectClearOrthogonalLines(layout)
  })

  it('preserves individual biological and adoptive child styles within the same family', async () => {
    const family = { id: 'mixed', parents: ['a', 'b'], children: [{ id: 'biological', kind: 'biological' }, { id: 'adoptive', kind: 'adoptive' }] }
    const layout = await layoutGraph(makeGraph([family]))
    const biological = layout.edges.filter(edge => edge.childId === 'biological')
    const adoptive = layout.edges.filter(edge => edge.childId === 'adoptive')
    expect(biological.length).toBeGreaterThan(0)
    expect(adoptive.length).toBeGreaterThan(0)
    expect(biological.every(edge => edge.relationKind === 'biological' && !edge.style.lineDash)).toBe(true)
    expect(adoptive.every(edge => edge.relationKind === 'adoptive' && edge.style.lineDash?.length)).toBe(true)
    expectConnectedFamily(layout, family)
    expectDistinctCards(layout)
    expectClearOrthogonalLines(layout)
  })

  it('routes a long parent link around intermediate generations when birth and adoptive ages differ', async () => {
    const families = [
      unit('early-parents', ['early-father', 'early-mother'], ['child']),
      unit('generation-one', ['root'], ['middle']),
      unit('generation-two', ['middle'], ['late-parent']),
      { id: 'adoptive', parents: ['late-parent'], children: [{ id: 'child', kind: 'adoptive' }] }
    ]
    const layout = await layoutGraph(makeGraph(families, { center: 'child' }))
    expectDistinctCards(layout)
    expectClearOrthogonalLines(layout)
    for (const family of families) expectConnectedFamily(layout, family)
  })

  it('detours an aligned long birth link around the intermediate adoptive ancestry', async () => {
    const families = [
      unit('first-generation', ['birth-parent'], ['middle']),
      unit('second-generation', ['middle'], ['adoptive-parent']),
      unit('birth', ['birth-parent'], ['child']),
      { id: 'late-adoptive', parents: ['adoptive-parent'], children: [{ id: 'child', kind: 'adoptive' }] }
    ]
    const layout = await layoutGraph(makeGraph(families, { center: 'child' }))
    expect(layout.edges.some(edge => edge.familyId === 'family:birth' && edge.segment === 'parent-exit')).toBe(true)
    expect(layout.edges.some(edge => edge.segment === 'sibling-bus')).toBe(false)
    for (const family of families) expectConnectedFamily(layout, family)
    expectDistinctCards(layout)
    expectClearOrthogonalLines(layout)
  })

  it('uses an explicit spouse fact for the inlaw bridge when there is no marriage FamilyUnit', async () => {
    const family = unit('origin', ['father', 'mother'], ['spouse'])
    const graph = makeGraph([family], { mode: 'inlaw', center: 'center', extraPeople: ['center'], context: { center_person_id: 'center', spouse_id: 'spouse' } })
    graph.edges.push({ id: 'direct-spouse', source: 'center', target: 'spouse', relation: 'spouse', style: 'spouse' })
    const layout = await layoutGraph(graph)
    const people = new Map(layout.nodes.filter(node => node.nodeType === 'person').map(node => [node.id, node]))
    expect(people.size).toBe(4)
    expect(people.get('center').y).toBe(people.get('spouse').y)
    expect(people.get('father').y).toBeLessThan(people.get('spouse').y)
    expect(layout.edges.some(edge => edge.relation === 'spouse' && edge.personIds.includes('center') && edge.personIds.includes('spouse'))).toBe(true)
    expectConnectedFamily(layout, family)
    expectDistinctCards(layout)
    expectClearOrthogonalLines(layout)
  })

  it('shares common ancestors once and preserves both cousin lineages', async () => {
    const families = [
      unit('grandparents', ['grandfather', 'grandmother'], ['a', 'b']),
      unit('a-family', ['a', 'a-spouse'], ['c']),
      unit('b-family', ['b', 'b-spouse'], ['d']),
      unit('cousin-marriage', ['c', 'd'], ['e'])
    ]
    const layout = await layoutGraph(makeGraph(families, { center: 'e' }))
    expect(layout.nodes.filter(node => node.nodeType === 'person')).toHaveLength(9)
    expectDistinctCards(layout)
    expectClearOrthogonalLines(layout)
    for (const family of families) expectConnectedFamily(layout, family)
  })

  it('keeps cross-generation marriage without promoting a descendant into its ancestor layer', async () => {
    const families = [
      unit('first', ['a'], ['b']),
      unit('second', ['b'], ['c']),
      unit('cross-generation-marriage', ['a', 'c'], ['d'])
    ]
    const layout = await layoutGraph(makeGraph(families, { center: 'd' }))
    const people = new Map(layout.nodes.filter(node => node.nodeType === 'person').map(node => [node.id, node]))
    expect(people.get('b').generation).toBeGreaterThan(people.get('a').generation)
    expect(people.get('c').generation).toBeGreaterThan(people.get('b').generation)
    expect(people.get('d').generation).toBeGreaterThan(people.get('c').generation)
    expectDistinctCards(layout)
    expectClearOrthogonalLines(layout)
    for (const family of families) expectConnectedFamily(layout, family)
  })

  it('produces stable positions when DTO node and edge order is reversed', async () => {
    const graph = makeGraph([
      unit('a', ['gf', 'gm'], ['father']),
      unit('b', ['mgf', 'mgm'], ['mother']),
      unit('c', ['father', 'mother'], ['child-one', 'child-two'])
    ], { center: 'child-one' })
    const first = await layoutGraph(graph)
    const second = await layoutGraph({ ...graph, nodes: [...graph.nodes].reverse(), edges: [...graph.edges].reverse() })
    expect(coordinateSnapshot(second)).toEqual(coordinateSnapshot(first))
    expect(routingSnapshot(second)).toEqual(routingSnapshot(first))
  })

  it('keeps dense routing channels and crossing IDs stable when DTO order is reversed', async () => {
    const graph = makeGraph(denseFamilies(19, 28), { mode: 'overview' })
    const first = await layoutGraph(graph)
    const second = await layoutGraph({ ...graph, nodes: [...graph.nodes].reverse(), edges: [...graph.edges].reverse() })
    expect(first.crossings.length).toBeGreaterThan(0)
    expect(routingSnapshot(second)).toEqual(routingSnapshot(first))
  })

  it('uses the projection context center before a stale top-level center', async () => {
    const graph = makeGraph([unit('selected', ['selected-parent'], ['selected-child'])], {
      center: 'previous-center', extraPeople: ['previous-center'], context: { center_person_id: 'selected-child' }
    })
    const layout = await layoutGraph(graph)
    expect(layout.nodes.filter(node => node.nodeType === 'person').map(node => node.id)).toEqual(['selected-child', 'selected-parent'])
    const hidden = layout.nodes.find(node => node.nodeType === 'branchCapsule')
    expect(hidden.raw.person_count).toBe(1)
    expect(hidden.raw.preview_names).toEqual(['previous-center'])
  })

  it('handles a large sibling set without card overlap or diagonal lines', async () => {
    const children = Array.from({ length: 18 }, (_, index) => 'child-' + index)
    const family = unit('wide', ['father', 'mother'], children)
    const layout = await layoutGraph(makeGraph([family], { mode: 'branch' }))
    expectDistinctCards(layout)
    expectClearOrthogonalLines(layout)
    expectConnectedFamily(layout, family)
  })

  it('keeps dense acyclic pedigrees readable with conflicting marriage layers', async () => {
    for (const seed of [1, 2, 3, 7, 19, 41]) {
      const families = denseFamilies(seed, 28)
      const layout = await layoutGraph(makeGraph(families, { mode: 'overview' }))
      expectDistinctCards(layout)
      expectClearOrthogonalLines(layout)
      for (const family of families) expectConnectedFamily(layout, family)
    }
  })

  it.each([1, 19])('allocates enough routing space for a 300-person dense pedigree (seed %s)', async seed => {
    const families = denseFamilies(seed, 300)
    const layout = await layoutGraph(makeGraph(families, { mode: 'overview', extraPeople: ['p0', 'p1', 'p2', 'p3'] }))
    expect(layout.nodes.filter(node => node.nodeType === 'person')).toHaveLength(300)
    expect(new Set(layout.edges.map(edge => edge.familyId))).toEqual(new Set(families.map(family => 'family:' + family.id)))
    expectDistinctCards(layout)
    expectClearOrthogonalLines(layout)
    for (const family of families) expectConnectedFamily(layout, family)
    expect(layout.crossings.length).toBeGreaterThan(0)
    const lines = new Map(segments(layout).map(line => [line.edge.id, line]))
    for (const crossing of layout.crossings) {
      const over = lines.get(crossing.overEdgeId)
      const under = lines.get(crossing.underEdgeId)
      expect(over.edge.familyId).not.toBe(under.edge.familyId)
      expect(onSegment(crossing, over) && onSegment(crossing, under)).toBe(true)
    }
  })

  it('keeps an isolated selected person visible and supports an empty DTO', async () => {
    const isolated = await layoutGraph(makeGraph([], { center: 'isolated', extraPeople: ['isolated'] }))
    expect(isolated.nodes.filter(node => node.nodeType === 'person')).toHaveLength(1)
    expect(isolated.nodes[0].label).toBe('isolated')
    expect(isolated.edges).toHaveLength(0)
    const empty = await layoutGraph(makeGraph([]))
    expect(empty.nodes).toHaveLength(0)
    expect(empty.edges).toHaveLength(0)
  })

  it('terminates on invalid parent cycles and keeps their relationship evidence', async () => {
    const layout = await layoutGraph(makeGraph([unit('one', ['a'], ['b']), unit('two', ['b'], ['a'])], { mode: 'overview' }))
    expect(layout.nodes.filter(node => node.nodeType === 'person')).toHaveLength(2)
    expect(new Set(layout.edges.map(edge => edge.familyId))).toEqual(new Set(['family:one', 'family:two']))
    expect(layout.layoutWarnings.length).toBeGreaterThan(0)
    expectDistinctCards(layout)
    expectClearOrthogonalLines(layout)
  })
})
