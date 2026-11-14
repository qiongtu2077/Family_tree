import { describe, expect, it } from 'vitest'
import { createGraphPresentation, orientLayout } from '../graph/graphPresentation'
import { createFamilyLayout } from '../graph/familyLayout'
import { buildOverviewBranches, projectOverviewBranches } from '../graph/overviewBranches'

// --- 真实家系与几何断言 --- //

/** 创建含家庭成员、子女归属及明确生养类型的 GraphViewDTO。 */
function graphOf(families = [], extraPeople = []) {
  const people = new Set(extraPeople)
  const nodes = []
  const edges = []
  for (const family of families) {
    const familyId = 'family:' + family.id
    nodes.push({ id: familyId, type: 'familyUnit', family_type: family.type || 'marriage' })
    for (const parent of family.parents) {
      people.add(parent)
      edges.push({ id: parent + '>' + familyId, source: parent, target: familyId, relation: 'partner', style: 'spouse', metadata: {} })
    }
    for (const child of family.children) {
      people.add(child.id)
      edges.push({ id: familyId + '>' + child.id, source: familyId, target: child.id, relation: child.kind, style: child.kind === 'biological' ? 'solid' : 'dashed', metadata: { relationKind: child.kind } })
    }
  }
  for (const id of people) nodes.push({ id, type: 'person', name: '家人' + id, gender: 'U' })
  return { view_mode: 'overview', center_person_id: null, view_context: {}, warnings: [], nodes, edges }
}

/** 创建默认亲生子女的家庭样本。 */
function unit(id, parents, children, type = 'marriage') {
  return { id, parents, children: children.map(child => ({ id: child, kind: 'biological' })), type }
}

/** 创建父母双方分别拥有原生家庭的跨支系婚姻样本。 */
function connectedPedigree() {
  return graphOf([
    unit('origin-a', ['agf', 'agm'], ['father', 'uncle']),
    unit('origin-b', ['bgf', 'bgm'], ['mother']),
    unit('marriage', ['father', 'mother'], ['child', 'sibling'])
  ])
}

/** 递归冻结样本，验证投影和方向转换没有修改原始数据。 */
function freeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value)
    for (const item of Object.values(value)) freeze(item)
  }
  return value
}

/** 验证全部可视线段正交，并且没有穿入人物或摘要卡片内部。 */
function expectClearGeometry(layout) {
  const nodes = new Map(layout.nodes.map(node => [node.id, node]))
  const cards = layout.nodes.filter(node => ['person', 'branchSummary'].includes(node.nodeType))
  for (const edge of layout.edges) {
    const a = nodes.get(edge.source)
    const b = nodes.get(edge.target)
    expect(a, edge.id + ' source must exist').toBeDefined()
    expect(b, edge.id + ' target must exist').toBeDefined()
    const horizontal = Math.abs(a.y - b.y) < 0.01
    const vertical = Math.abs(a.x - b.x) < 0.01
    expect(horizontal || vertical, edge.id + ' must remain orthogonal').toBe(true)
    for (const card of cards) {
      const left = card.x - card.size[0] / 2
      const right = card.x + card.size[0] / 2
      const top = card.y - card.size[1] / 2
      const bottom = card.y + card.size[1] / 2
      const throughCard = vertical
        ? a.x > left + 0.01 && a.x < right - 0.01 && Math.max(a.y, b.y) > top + 0.01 && Math.min(a.y, b.y) < bottom - 0.01
        : a.y > top + 0.01 && a.y < bottom - 0.01 && Math.max(a.x, b.x) > left + 0.01 && Math.min(a.x, b.x) < right - 0.01
      expect(throughCard, edge.id + ' must avoid ' + card.id).toBe(false)
    }
  }
}

/** 返回稳定的节点坐标快照，便于比较展开前后渲染的一致性。 */
function nodeSnapshot(layout) {
  return layout.nodes.map(({ id, x, y, size, nodeType, label }) => ({ id, x, y, size, nodeType, label })).sort((a, b) => a.id.localeCompare(b.id))
}

/** 返回稳定的关系线段快照，保留真实关系语义。 */
function edgeSnapshot(layout) {
  return layout.edges.map(({ id, source, target, relation, familyId, relationKind, segment }) => ({ id, source, target, relation, familyId, relationKind, segment })).sort((a, b) => a.id.localeCompare(b.id))
}

// --- 世代方向与实际几何 --- //

describe('graph presentation direction', () => {
  it('keeps the ordinary vertical layout unchanged apart from its explicit direction', () => {
    const graph = connectedPedigree()
    const original = createFamilyLayout(graph)
    const presented = createGraphPresentation(graph, { direction: 'vertical' })
    expect(nodeSnapshot(presented)).toEqual(nodeSnapshot(original))
    expect(edgeSnapshot(presented)).toEqual(edgeSnapshot(original))
    expect(presented.direction).toBe('vertical')
  })

  it('keeps horizontal people at 140 by 52 and puts every parent to the left of the child', () => {
    const families = [unit('a', ['gf', 'gm'], ['father']), unit('b', ['mgf', 'mgm'], ['mother']), unit('c', ['father', 'mother'], ['child'])]
    const layout = createGraphPresentation(graphOf(families), { direction: 'horizontal' })
    const people = new Map(layout.nodes.filter(node => node.nodeType === 'person').map(node => [node.id, node]))
    for (const node of people.values()) {
      expect(node.size[0]).toBeCloseTo(140, 8)
      expect(node.size[1]).toBeCloseTo(52, 8)
      expect(node.labelCfg.style.fontSize).toBe(15)
    }
    for (const family of families) {
      for (const parent of family.parents) {
        for (const child of family.children) expect(people.get(parent).x).toBeLessThan(people.get(child.id).x)
      }
    }
    expectClearGeometry(layout)
  })

  it('transforms every hidden endpoint with the same affine mapping and meets the child card left boundary', () => {
    const graph = graphOf([unit('core', ['father', 'mother'], ['child'])])
    const vertical = createGraphPresentation(graph, { direction: 'vertical' })
    const horizontal = createGraphPresentation(graph, { direction: 'horizontal' })
    const nodes = new Map(horizontal.nodes.map(node => [node.id, node]))
    for (const original of vertical.nodes) {
      const transformed = nodes.get(original.id)
      expect(transformed.x).toBeCloseTo(original.y * 140 / 52, 8)
      expect(transformed.y).toBeCloseTo(original.x * 52 / 140, 8)
    }
    const child = nodes.get('child')
    const endpoints = horizontal.nodes.filter(node => node.nodeType === 'anchor')
    expect(endpoints.some(node => Math.abs(node.x - (child.x - child.size[0] / 2)) < 0.01 && Math.abs(node.y - child.y) < 0.01)).toBe(true)
    expectClearGeometry(horizontal)
  })

  it('keeps crossing coordinates and component rectangles consistent with transformed geometry', () => {
    const source = {
      nodes: [
        { id: 'a', x: 10, y: 20, nodeType: 'person', size: [140, 52] },
        { id: 'b', x: 100, y: 180, nodeType: 'anchor', size: 1 },
        { id: 'h1', x: 0, y: 70, nodeType: 'anchor', size: 1 },
        { id: 'h2', x: 100, y: 70, nodeType: 'anchor', size: 1 },
        { id: 'v1', x: 40, y: 0, nodeType: 'anchor', size: 1 },
        { id: 'v2', x: 40, y: 120, nodeType: 'anchor', size: 1 }
      ],
      edges: [{ id: 'over-edge', source: 'v1', target: 'v2' }, { id: 'under-edge', source: 'h1', target: 'h2' }],
      crossings: [{ id: 'crossing-one', x: 40, y: 70, overEdgeId: 'over-edge', underEdgeId: 'under-edge', overRouteId: 'over-route', underRouteId: 'under-route', overFamilyId: 'over-family', underFamilyId: 'under-family', gap: 8 }],
      clusters: [{ id: 'component', x: -60, y: -20, width: 300, height: 270, personIds: ['a'] }]
    }
    const result = orientLayout(source, 'horizontal')
    expect(result.crossings[0].x).toBeCloseTo(70 * 140 / 52)
    expect(result.crossings[0].y).toBeCloseTo(40 * 52 / 140)
    expect(result.crossings[0].overEdgeId).toBe('over-edge')
    expect(result.crossings[0].underEdgeId).toBe('under-edge')
    expect(result.crossings[0].gap).toBe(8)
    const points = new Map(result.nodes.map(node => [node.id, node]))
    for (const edge of result.edges) {
      const a = points.get(edge.source)
      const b = points.get(edge.target)
      const crossing = result.crossings[0]
      expect(crossing.x).toBeGreaterThanOrEqual(Math.min(a.x, b.x))
      expect(crossing.x).toBeLessThanOrEqual(Math.max(a.x, b.x))
      expect(crossing.y).toBeGreaterThanOrEqual(Math.min(a.y, b.y))
      expect(crossing.y).toBeLessThanOrEqual(Math.max(a.y, b.y))
    }
    const rectangle = result.clusters[0]
    expect(rectangle.x).toBeCloseTo(-20 * 140 / 52)
    expect(rectangle.y).toBeCloseTo(-60 * 52 / 140)
    expect(rectangle.width).toBeCloseTo(270 * 140 / 52)
    expect(rectangle.height).toBeCloseTo(300 * 52 / 140)
    expect(rectangle.personIds).toEqual(['a'])
  })

  it('keeps all overview people inside their transformed component rectangles', () => {
    const graph = graphOf([unit('core', ['father', 'mother'], ['child'])], ['isolated'])
    const layout = createGraphPresentation(graph, { direction: 'horizontal' })
    for (const person of layout.nodes.filter(node => node.nodeType === 'person')) {
      const cluster = layout.clusters.find(item => item.id === person.componentId)
      expect(person.x - person.size[0] / 2).toBeGreaterThanOrEqual(cluster.x - 0.01)
      expect(person.x + person.size[0] / 2).toBeLessThanOrEqual(cluster.x + cluster.width + 0.01)
      expect(person.y - person.size[1] / 2).toBeGreaterThanOrEqual(cluster.y - 0.01)
      expect(person.y + person.size[1] / 2).toBeLessThanOrEqual(cluster.y + cluster.height + 0.01)
    }
  })

  it('changes capsule dimensions consistently while retaining navigation and person count metadata', () => {
    const original = { id: 'capsule:one', x: 30, y: 80, nodeType: 'branchCapsule', label: '这是需要换行的旁支家族资料入口', size: [252, 44], raw: { person_count: 12, root_family_unit_id: 'unit-one', target_view: 'branch' } }
    const transformed = orientLayout({ nodes: [original], edges: [] }, 'horizontal').nodes[0]
    expect(transformed.size[0]).toBeCloseTo(44 * 140 / 52)
    expect(transformed.size[1]).toBeCloseTo(252 * 52 / 140)
    expect(transformed.raw).toEqual(original.raw)
    expect(transformed.label.replaceAll('\n', '')).toBe(original.label)
  })

  it('supports empty layouts and rejects unsupported direction values explicitly', () => {
    expect(createGraphPresentation(graphOf(), { direction: 'horizontal' }).nodes).toEqual([])
    expect(orientLayout({ nodes: [], edges: [] }, 'vertical').direction).toBe('vertical')
    expect(() => orientLayout({ nodes: [], edges: [] }, 'diagonal')).toThrow('不支持')
  })

  it('marks paternal core borders in either direction without changing card fills or geometry', () => {
    const graph = connectedPedigree()
    graph.center_person_id = 'child'
    graph.view_context.center_person_id = 'child'
    const coreIds = ['agf', 'father', 'child']
    const annotated = freeze({ ...graph, paternal_context: { core_person_ids: coreIds } })
    for (const direction of ['vertical', 'horizontal']) {
      const baseline = createGraphPresentation(graph, { direction })
      const result = createGraphPresentation(annotated, { direction })
      const originalPeople = new Map(baseline.nodes.filter(node => node.nodeType === 'person').map(node => [node.id, node]))
      for (const person of result.nodes.filter(node => node.nodeType === 'person')) {
        const original = originalPeople.get(person.id)
        expect(person.style.fill).toBe(original.style.fill)
        expect(person.size).toEqual(original.size)
        expect({ x: person.x, y: person.y, label: person.label }).toEqual({ x: original.x, y: original.y, label: original.label })
        if (coreIds.includes(person.id)) {
          expect(person.isPaternalCore).toBe(true)
          expect(person.style.stroke).toBe('#2d6a54')
          expect(person.style.lineWidth).toBe(2)
        } else {
          expect(person.isPaternalCore).not.toBe(true)
          expect(person.style.stroke).toBe(original.style.stroke)
        }
      }
      expect(edgeSnapshot(result)).toEqual(edgeSnapshot(baseline))
    }
  })
})

// --- 支系摘要身份、数量及事实语义 --- //

describe('graph presentation overview summaries', () => {
  it('keeps collapsed summaries distinct from people and preserves real person counts and evidence', () => {
    const source = connectedPedigree()
    const projected = projectOverviewBranches(source)
    const result = createGraphPresentation(projected, { direction: 'horizontal' })
    const summaries = result.nodes.filter(node => node.nodeType === 'branchSummary')
    expect(summaries).toHaveLength(3)
    expect(result.nodes.filter(node => node.nodeType === 'person')).toHaveLength(0)
    expect(summaries.reduce((sum, node) => sum + node.raw.personCount, 0)).toBe(9)
    for (const summary of summaries) {
      const original = projected.nodes.find(node => node.id === summary.id)
      expect(summary.raw.type).toBe('branchSummary')
      expect(summary.raw.personIds).toEqual(original.personIds)
      expect(summary.raw.relationships).toEqual(original.relationships)
      expect(summary.label).toContain(String(original.personCount) + ' 位')
      expect(summary.raw.familyIds).toEqual(original.familyIds)
    }
    expectClearGeometry(result)
  })

  it('conserves the total people count when one branch is expanded and two remain summarized', () => {
    const source = connectedPedigree()
    const branches = buildOverviewBranches(source)
    const projected = projectOverviewBranches(source, [branches.personBranchIds.child])
    const result = createGraphPresentation(projected)
    const visible = result.nodes.filter(node => node.nodeType === 'person')
    const collapsed = result.nodes.filter(node => node.nodeType === 'branchSummary')
    expect(visible.length + collapsed.reduce((sum, node) => sum + node.raw.personCount, 0)).toBe(branches.totalPersonCount)
    expect(new Set([...visible.map(node => node.id), ...collapsed.flatMap(node => node.raw.personIds)]).size).toBe(branches.totalPersonCount)
    expectClearGeometry(result)
  })

  it('marks the summary containing the current center without fabricating a visible person for it', () => {
    const source = connectedPedigree()
    source.center_person_id = 'child'
    source.view_context.center_person_id = 'child'
    const result = createGraphPresentation(projectOverviewBranches(source))
    const selected = result.nodes.filter(node => node.isCenter)
    expect(selected).toHaveLength(1)
    expect(selected[0].nodeType).toBe('branchSummary')
    expect(selected[0].raw.personIds).toContain('child')
    expect(result.nodes.some(node => node.id === 'child')).toBe(false)
  })

  it('does not turn a co-parent summary connection into a spouse relationship', () => {
    const source = graphOf([
      unit('origin-a', ['agf', 'agm'], ['a']),
      unit('origin-b', ['bgf', 'bgm'], ['b']),
      unit('shared-adoptive-home', ['a', 'b'], ['child'], 'adoptive')
    ])
    const projected = projectOverviewBranches(source)
    const result = createGraphPresentation(projected)
    const coParentLinks = result.edges.filter(edge => edge.originalRelation === 'family')
    expect(coParentLinks.length).toBeGreaterThan(0)
    expect(coParentLinks.every(edge => edge.relation === 'branchLink' && edge.raw.relation === 'family' && edge.style.lineDash?.length)).toBe(true)
    expect(result.edges.some(edge => edge.relation === 'spouse' || edge.originalRelation === 'spouse')).toBe(false)
  })

  it('retains separate spouse and co-parent facts between the same two summary branches', () => {
    const source = graphOf([
      unit('origin-a', ['agf', 'agm'], ['a']),
      unit('origin-b', ['bgf', 'bgm'], ['b']),
      unit('married-home', ['a', 'b'], [], 'marriage'),
      unit('adoptive-home', ['a', 'b'], ['child'], 'adoptive')
    ])
    const projected = projectOverviewBranches(source)
    expect(projected.edges.filter(edge => ['family', 'spouse'].includes(edge.relation))).toHaveLength(2)
    const result = createGraphPresentation(projected)
    const restoredRelations = new Set(result.edges.filter(edge => edge.relation === 'branchLink').map(edge => edge.originalRelation))
    expect(restoredRelations.has('family')).toBe(true)
    expect(restoredRelations.has('spouse')).toBe(true)
    for (const original of projected.edges.filter(edge => edge.metadata?.branchLink)) {
      expect(result.edges.some(edge => edge.raw?.id === original.id), original.id + ' must retain a rendered evidence link').toBe(true)
    }
  })

  it('retains biological and adoptive evidence when two collapsed children share one summary endpoint', () => {
    const source = graphOf([
      unit('origin-a', ['agf', 'agm'], ['father']),
      unit('origin-b', ['bgf', 'bgm'], ['mother']),
      { id: 'mixed', parents: ['father', 'mother'], children: [{ id: 'bio', kind: 'biological' }, { id: 'adopt', kind: 'adoptive' }], type: 'marriage' }
    ])
    const branchId = buildOverviewBranches(source).personBranchIds.father
    const projected = projectOverviewBranches(source, [branchId])
    const result = createGraphPresentation(projected)
    for (const [child, kind] of [['bio', 'biological'], ['adopt', 'adoptive']]) {
      const relationshipId = 'family:mixed>' + child
      const lines = result.edges.filter(edge => edge.relation === 'branchLink' && edge.originalRelation === 'parent' && edge.metadata?.relationships?.some(record => record.id === relationshipId))
      expect(lines.length, relationshipId + ' must retain its own render evidence').toBeGreaterThan(0)
      expect(lines.every(edge => edge.relationKind === kind)).toBe(true)
      if (kind === 'adoptive') expect(lines.every(edge => edge.style.lineDash?.length)).toBe(true)
    }
    expectClearGeometry(result)
  })

  it('does not manufacture a parent cycle when one summary contains a family parent and child', () => {
    const source = graphOf([
      unit('origin-a', ['agf', 'agm'], ['father']),
      unit('mixed', ['father', 'mother'], ['child'])
    ])
    const branches = buildOverviewBranches(source)
    expect(branches.personBranchIds.mother).toBe(branches.personBranchIds.child)
    const projected = projectOverviewBranches(source, [branches.personBranchIds.father])
    const result = createGraphPresentation(projected)
    expect(result.layoutWarnings.some(warning => warning.includes('循环'))).toBe(false)
    expect(result.edges.some(edge => edge.originalRelation === 'parent' && edge.metadata?.relationships?.some(record => record.id === 'family:mixed>child'))).toBe(true)
    const summary = result.nodes.find(node => node.nodeType === 'branchSummary' && node.raw.personIds.includes('mother'))
    expect(summary.raw.relationships.some(edge => edge.id === 'family:mixed>child')).toBe(true)
    expectClearGeometry(result)
  })

  it('keeps direct biological, adoptive and spouse evidence independently when their endpoint is summarized', () => {
    const source = graphOf([
      unit('origin-a', ['agf', 'agm'], ['father']),
      unit('origin-b', ['bgf', 'bgm'], ['child'])
    ])
    for (const kind of ['biological', 'adoptive']) source.edges.push({ id: 'direct-' + kind, source: 'father', target: 'child', relation: 'father', style: kind === 'biological' ? 'solid' : 'dashed', metadata: { side: 'father', relationKind: kind, certainty: 1 } })
    source.edges.push({ id: 'direct-spouse', source: 'father', target: 'child', relation: 'spouse', style: 'spouse', metadata: {} })
    const branch = buildOverviewBranches(source).personBranchIds.father
    const projected = projectOverviewBranches(source, [branch])
    const result = createGraphPresentation(projected)
    for (const kind of ['biological', 'adoptive']) {
      const lines = result.edges.filter(edge => edge.raw?.id === 'direct-' + kind)
      expect(lines.length).toBeGreaterThan(0)
      expect(lines.every(edge => edge.originalRelation === 'parent' && edge.relationKind === kind && edge.metadata.relationships[0].metadata.side === 'father')).toBe(true)
    }
    expect(result.edges.some(edge => edge.raw?.id === 'direct-spouse' && edge.originalRelation === 'spouse')).toBe(true)
    expectClearGeometry(result)
  })

  it('preserves sibling evidence for partially summarized families with unknown parents without inventing marriage', () => {
    const source = graphOf([
      unit('a-origin', ['father', 'mother'], ['one']),
      unit('unknown', [], ['one', 'two'], 'unknown_parent')
    ])
    const branch = buildOverviewBranches(source).personBranchIds.one
    const result = createGraphPresentation(projectOverviewBranches(source, [branch]))
    const siblingLines = result.edges.filter(edge => edge.originalRelation === 'family' && edge.metadata.familyIds.includes('family:unknown'))
    expect(siblingLines.length).toBeGreaterThan(0)
    expect(siblingLines.every(edge => edge.metadata.relationshipIds.includes('family:unknown>one') && edge.metadata.relationshipIds.includes('family:unknown>two'))).toBe(true)
    expect(siblingLines.some(edge => edge.originalRelation === 'spouse')).toBe(false)
    expectClearGeometry(result)
  })

  it('preserves genuine visible parent cycles while removing only internal collapsed-summary loops', () => {
    const source = graphOf([
      unit('origin-other', ['gf', 'gm'], ['other']),
      unit('self-family', ['self', 'other'], ['self'])
    ])
    const branch = buildOverviewBranches(source).personBranchIds.self
    const result = createGraphPresentation(projectOverviewBranches(source, [branch]))
    expect(result.layoutWarnings.some(warning => warning.includes('循环'))).toBe(true)
    expect(result.edges.some(edge => edge.originalRelation === 'parent' && edge.metadata.facts?.some(fact => fact.sourcePersonId === 'self' && fact.targetPersonId === 'self'))).toBe(true)
  })

  it('keeps real node IDs that collide with a generated hidden branch-link family ID', () => {
    const projected = projectOverviewBranches(connectedPedigree())
    const original = projected.edges.find(edge => edge.metadata?.branchLink)
    const id = 'presentation:branch-link:' + original.id
    projected.nodes.push({ id, type: 'person', name: '真实人物', gender: 'U' })
    const result = createGraphPresentation(projected)
    expect(result.nodes.find(node => node.id === id).nodeType).toBe('person')
    expect(result.edges.some(edge => edge.raw?.id === original.id)).toBe(true)
    expect(new Set(result.nodes.map(node => node.id)).size).toBe(result.nodes.length)
  })

  it('matches the original complete layout after every overview branch is expanded', () => {
    const source = connectedPedigree()
    const expanded = projectOverviewBranches(source, buildOverviewBranches(source).branches.map(branch => branch.id))
    const originalVertical = createGraphPresentation(source, { direction: 'vertical' })
    const expandedVertical = createGraphPresentation(expanded, { direction: 'vertical' })
    expect(nodeSnapshot(expandedVertical)).toEqual(nodeSnapshot(originalVertical))
    expect(edgeSnapshot(expandedVertical)).toEqual(edgeSnapshot(originalVertical))
    const originalHorizontal = createGraphPresentation(source, { direction: 'horizontal' })
    const expandedHorizontal = createGraphPresentation(expanded, { direction: 'horizontal' })
    expect(nodeSnapshot(expandedHorizontal)).toEqual(nodeSnapshot(originalHorizontal))
    expect(edgeSnapshot(expandedHorizontal)).toEqual(edgeSnapshot(originalHorizontal))
  })

  it('does not change frozen source DTOs, summary metadata, or existing layout coordinates', () => {
    const source = freeze(connectedPedigree())
    const before = JSON.stringify(source)
    const projected = freeze(projectOverviewBranches(source))
    const projectedBefore = JSON.stringify(projected)
    const vertical = freeze(createGraphPresentation(projected, { direction: 'vertical' }))
    const verticalBefore = JSON.stringify(vertical)
    const horizontal = orientLayout(vertical, 'horizontal')
    expect(horizontal.direction).toBe('horizontal')
    expect(JSON.stringify(source)).toBe(before)
    expect(JSON.stringify(projected)).toBe(projectedBefore)
    expect(JSON.stringify(vertical)).toBe(verticalBefore)
  })
})

