import { describe, expect, it } from 'vitest'
import { buildOverviewBranches, projectOverviewBranches } from '../graph/overviewBranches'
import { createGraphPresentation } from '../graph/graphPresentation'

// --- 真实DTO样本与数量、端点断言 --- //

/** 用显式家庭成员关系建立最小GraphViewDTO，不依赖布局或姓氏。 */
function graphOf(families = [], extraPeople = [], directEdges = []) {
  const people = new Set(extraPeople)
  const nodes = []
  const edges = []
  for (const family of families) {
    const familyId = 'family:' + family.id
    nodes.push({ id: familyId, type: 'familyUnit', family_type: family.type || 'marriage', display_order: family.order || 0 })
    for (const parent of family.parents) {
      people.add(parent)
      edges.push({ id: `${parent}>${familyId}`, source: parent, target: familyId, relation: 'partner', style: 'spouse', metadata: { displayOrder: 0 } })
    }
    for (const entry of family.children) {
      const child = typeof entry === 'string' ? { id: entry, kind: 'biological' } : entry
      people.add(child.id)
      edges.push({ id: `${familyId}>${child.id}`, source: familyId, target: child.id, relation: child.kind, style: child.kind === 'biological' ? 'solid' : 'dashed', metadata: { relationKind: child.kind, certainty: .8 } })
    }
  }
  for (const edge of directEdges) { people.add(edge.source); people.add(edge.target); edges.push(edge) }
  for (const id of people) nodes.push({ id, type: 'person', name: `家人${id}`, gender: 'U' })
  return { view_mode: 'overview', center_person_id: null, view_context: { projection_reason: 'all' }, warnings: [], hidden_relation_count: 0, nodes, edges }
}

/** 建立跨两侧原生家庭联姻的单一连通家系。 */
function connectedPedigree() {
  return graphOf([
    { id: 'origin-a', parents: ['agf', 'agm'], children: ['father', 'uncle'] },
    { id: 'origin-b', parents: ['bgf', 'bgm'], children: ['mother'] },
    { id: 'marriage', parents: ['father', 'mother'], children: ['child', 'sibling'] }
  ])
}

/** 验证真实人物与收起人数守恒、没有重复展开位置、全部可见边端点存在。 */
function expectConserved(graph, projected) {
  const ids = graph.nodes.filter(node => node.type === 'person').map(node => node.id).sort()
  const visible = projected.nodes.filter(node => node.type === 'person').map(node => node.id)
  const collapsed = projected.nodes.filter(node => node.type === 'branchSummary').flatMap(node => node.personIds)
  expect([...visible, ...collapsed].sort()).toEqual(ids)
  expect(new Set([...visible, ...collapsed]).size).toBe(ids.length)
  expect(visible.length + projected.nodes.filter(node => node.type === 'branchSummary').reduce((sum, node) => sum + node.personCount, 0)).toBe(ids.length)
  expect(projected.overview_branches.visiblePersonCount).toBe(visible.length)
  expect(projected.overview_branches.collapsedPersonCount).toBe(collapsed.length)
  const endpoints = new Set(projected.nodes.map(node => node.id))
  expect(endpoints.size).toBe(projected.nodes.length)
  for (const edge of projected.edges) {
    expect(endpoints.has(edge.source), edge.id).toBe(true)
    expect(endpoints.has(edge.target), edge.id).toBe(true)
  }
  expect(projected.overview_branches.originalRelationships).toEqual([...graph.edges].sort((left, right) => left.id < right.id ? -1 : left.id > right.id ? 1 : 0))
  const originalEdgeIds = new Set(graph.edges.map(edge => edge.id))
  const traceableEdges = new Set([
    ...projected.edges.filter(edge => originalEdgeIds.has(edge.id)).map(edge => edge.id),
    ...projected.edges.flatMap(edge => [...(edge.metadata?.relationships || []), ...(edge.metadata?.overview?.relationships || [])]).map(edge => edge.id),
    ...projected.nodes.filter(node => node.type === 'branchSummary').flatMap(node => node.relationships.map(edge => edge.id))
  ])
  expect([...traceableEdges].sort()).toEqual([...originalEdgeIds].sort())
  const familyIds = new Set([
    ...projected.nodes.filter(node => node.type === 'familyUnit').map(node => node.id),
    ...projected.nodes.filter(node => node.type === 'branchSummary').flatMap(node => node.familyIds),
    ...projected.edges.flatMap(edge => edge.metadata?.familyIds || [])
  ])
  expect([...familyIds].sort()).toEqual(graph.nodes.filter(node => node.type === 'familyUnit').map(node => node.id).sort())
}

/** 对象递归冻结，保证构建摘要与反复展开不修改输入及其关系元数据。 */
function freeze(value) {
  if (value && typeof value === 'object') { Object.freeze(value); Object.values(value).forEach(freeze) }
  return value
}

// --- 支系划分与稳定归属 --- //

describe('overview branch partition', () => {
  it('将同一连通家系按原生家庭分为三支，并保留父母双方的原生归属', () => {
    const overview = buildOverviewBranches(connectedPedigree())
    expect(overview.branches).toHaveLength(3)
    const fatherBranch = overview.personBranchIds.father
    const motherBranch = overview.personBranchIds.mother
    const childBranch = overview.personBranchIds.child
    expect(new Set([fatherBranch, motherBranch, childBranch]).size).toBe(3)
    expect(overview.personBranchIds.agf).toBe(fatherBranch)
    expect(overview.personBranchIds.uncle).toBe(fatherBranch)
    expect(overview.personBranchIds.sibling).toBe(childBranch)
    expect(overview.branches.reduce((sum, branch) => sum + branch.personCount, 0)).toBe(9)
    expect(overview.links.some(link => link.relation === 'spouse' && [link.source, link.target].includes(fatherBranch) && [link.source, link.target].includes(motherBranch))).toBe(true)
    expect(overview.links.filter(link => link.relation === 'parent' && link.target === childBranch)).toHaveLength(2)
  })

  it('逆转节点和边顺序后归属、摘要、链接及投影保持完全一致', () => {
    const graph = connectedPedigree()
    const reversed = { ...graph, nodes: [...graph.nodes].reverse(), edges: [...graph.edges].reverse() }
    const overview = buildOverviewBranches(graph)
    expect(buildOverviewBranches(reversed)).toEqual(overview)
    const expanded = [overview.personBranchIds.father]
    expect(projectOverviewBranches(reversed, expanded)).toEqual(projectOverviewBranches(graph, expanded))
  })

  it('单亲、未知父母和孤立人物均有明确归属，不发明配偶或生育事实', () => {
    const graph = graphOf([
      { id: 'single', type: 'single_parent', parents: ['parent'], children: ['child'] },
      { id: 'unknown', type: 'unknown_parent', parents: [], children: [{ id: 'unknown-a', kind: 'unknown' }, { id: 'unknown-b', kind: 'unknown' }] }
    ], ['isolated'])
    const overview = buildOverviewBranches(graph)
    expect(overview.branches).toHaveLength(3)
    expect(overview.personBranchIds.parent).toBe(overview.personBranchIds.child)
    expect(overview.personBranchIds['unknown-a']).toBe(overview.personBranchIds['unknown-b'])
    expect(overview.branches.find(branch => branch.personIds.includes('isolated')).branchKind).toBe('person')
    expect(overview.links).toEqual([])
    expectConserved(graph, projectOverviewBranches(graph))
  })

  it('共享祖先与多段婚姻只保留一个人物归属，其他家庭仍列为跨支证据', () => {
    const graph = graphOf([
      { id: 'origin', parents: ['ancestor'], children: ['parent-a', 'parent-b'] },
      { id: 'union-a', parents: ['parent-a', 'partner-a'], children: ['cousin-a'] },
      { id: 'union-b', parents: ['parent-b', 'partner-b'], children: ['cousin-b'] },
      { id: 'remarriage', parents: ['parent-a', 'partner-c'], children: ['half-sibling'] },
      { id: 'shared-descendant', parents: ['cousin-a', 'cousin-b'], children: ['descendant'] }
    ])
    const overview = buildOverviewBranches(graph)
    expect(overview.branches.flatMap(branch => branch.personIds).filter(id => id === 'parent-a')).toHaveLength(1)
    const ancestor = overview.branches.find(branch => branch.personIds.includes('ancestor'))
    expect(ancestor.familyIds).toEqual(expect.arrayContaining(['family:origin', 'family:union-a', 'family:union-b', 'family:remarriage']))
    const evidence = overview.links.flatMap(link => link.metadata.families.map(family => family.id))
    expect(evidence).toContain('family:shared-descendant')
    expect(evidence).toContain('family:remarriage')
    expectConserved(graph, projectOverviewBranches(graph, [ancestor.id]))
  })

  it('生育与收养并存时选择明确生育来源，同时保留收养支系连接和类型', () => {
    const graph = graphOf([
      { id: 'birth', parents: ['birth-parent'], children: ['child'] },
      { id: 'adopt', type: 'adoptive', parents: ['adoptive-parent'], children: [{ id: 'child', kind: 'adoptive' }] }
    ])
    const overview = buildOverviewBranches(graph)
    expect(overview.personBranchIds.child).toBe(overview.personBranchIds['birth-parent'])
    expect(overview.personBranchIds.child).not.toBe(overview.personBranchIds['adoptive-parent'])
    const adoption = overview.links.find(link => link.metadata.relationKind === 'adoptive')
    expect(adoption.style).toBe('dashed')
    expect(adoption.metadata.families.map(family => family.id)).toEqual(['family:adopt'])
    expect(adoption.metadata.relationships.map(edge => edge.id)).toContain('family:adopt>child')
  })

  it('多个同类生养来源按家庭顺序和ID稳定裁决，不靠姓氏或输入顺序', () => {
    const graph = graphOf([
      { id: 'b', order: 2, parents: ['parent-b'], children: ['child'] },
      { id: 'a', order: 1, parents: ['parent-a'], children: ['child'] }
    ])
    const overview = buildOverviewBranches(graph)
    expect(overview.branches.find(branch => branch.personIds.includes('child')).rootFamilyId).toBe('family:a')
    const renamed = { ...graph, nodes: graph.nodes.map(node => node.type === 'person' ? { ...node, name: '完全同名' } : node) }
    expect(buildOverviewBranches(renamed).personBranchIds).toEqual(overview.personBranchIds)
  })

  it('收养家庭共同父母跨支时显示共同家庭，不能据此推断配偶', () => {
    const graph = graphOf([
      { id: 'origin-a', parents: ['ancestor-a'], children: ['adopt-a'] },
      { id: 'origin-b', parents: ['ancestor-b'], children: ['adopt-b'] },
      { id: 'adoption', type: 'adoptive', parents: ['adopt-a', 'adopt-b'], children: [{ id: 'child', kind: 'adoptive' }] }
    ])
    const overview = buildOverviewBranches(graph)
    expect(overview.links.some(link => link.relation === 'spouse')).toBe(false)
    const shared = overview.links.find(link => link.relation === 'family')
    expect(shared.label).toBe('共同家庭')
    expect(shared.metadata.familyIds).toEqual(['family:adoption'])
    expect(overview.links.filter(link => link.metadata.relationKind === 'adoptive')).toHaveLength(2)
    expectConserved(graph, projectOverviewBranches(graph))
  })

  it('只有独立亲子和配偶边时按真实父母组兜底，同胞不被拆成每边一支', () => {
    const graph = graphOf([], [], [
      { id: 'pc-a', source: 'parent', target: 'child-a', relation: 'parent', metadata: { relationKind: 'biological' } },
      { id: 'pc-b', source: 'parent', target: 'child-b', relation: 'father', metadata: { relationKind: 'biological' } },
      { id: 'marriage', source: 'child-a', target: 'spouse', relation: 'spouse', style: 'spouse' }
    ])
    const overview = buildOverviewBranches(graph)
    expect(overview.personBranchIds['child-a']).toBe(overview.personBranchIds['child-b'])
    expect(overview.personBranchIds['child-a']).not.toBe(overview.personBranchIds.spouse)
    expect(overview.links.find(link => link.relation === 'spouse').metadata.relationships.map(edge => edge.id)).toEqual(['marriage'])
    expectConserved(graph, projectOverviewBranches(graph))
  })

  it('独立父母双方和多个同胞共享真实父母组，不凭关系补造家庭节点', () => {
    const graph = graphOf([], [], [
      { id: 'father-a', source: 'father', target: 'child-a', relation: 'father', metadata: { relationKind: 'biological' } },
      { id: 'mother-a', source: 'mother', target: 'child-a', relation: 'mother', metadata: { relationKind: 'biological' } },
      { id: 'father-b', source: 'father', target: 'child-b', relation: 'father', metadata: { relationKind: 'biological' } },
      { id: 'mother-b', source: 'mother', target: 'child-b', relation: 'mother', metadata: { relationKind: 'biological' } }
    ])
    const overview = buildOverviewBranches(graph)
    expect(overview.branches).toHaveLength(1)
    expect(overview.branches[0].rootPersonIds).toEqual(['father', 'mother'])
    expect(overview.branches[0].personIds).toEqual(['child-a', 'child-b', 'father', 'mother'])
    expect(overview.branches[0].familyIds).toEqual([])
    const expanded = projectOverviewBranches(graph, [overview.branches[0].id])
    expect(expanded.nodes.every(node => node.type === 'person')).toBe(true)
    expect(expanded.edges).toHaveLength(4)
    expectConserved(graph, expanded)
  })

  it('独立生育来源优先于收养家庭，未注明类型的直接亲子事实维持待确认', () => {
    const graph = graphOf([{ id: 'adoptive', type: 'adoptive', parents: ['adoptive-parent'], children: [{ id: 'child', kind: 'adoptive' }] }], [], [
      { id: 'birth', source: 'birth-parent', target: 'child', relation: 'father', metadata: { relationKind: 'biological' } },
      { id: 'unconfirmed', source: 'unknown-parent', target: 'child', relation: 'mother' }
    ])
    const overview = buildOverviewBranches(graph)
    expect(overview.personBranchIds.child).toBe(overview.personBranchIds['birth-parent'])
    expect(overview.personBranchIds.child).not.toBe(overview.personBranchIds['adoptive-parent'])
    const uncertain = overview.links.find(link => link.metadata.relationshipIds.includes('unconfirmed'))
    expect(uncertain.metadata.relationKind).toBe('unknown')
    expect(uncertain.label).toBe('亲子待确认')
    expect(uncertain.style).toBe('dashed')
    expect(uncertain.metadata.relationships[0]).toEqual(graph.edges.find(edge => edge.id === 'unconfirmed'))
    expectConserved(graph, projectOverviewBranches(graph))
  })

  it('反向独立配偶事实只规范摘要连接方向，不反写原端点或补造传递婚姻', () => {
    const graph = graphOf([
      { id: 'a', parents: ['ancestor-a'], children: ['a'] },
      { id: 'z', parents: ['ancestor-z'], children: ['z'] }
    ], [], [
      { id: 'z-a', source: 'z', target: 'a', relation: 'spouse', style: 'spouse' },
      { id: 'a-other', source: 'a', target: 'other', relation: 'spouse', style: 'spouse' }
    ])
    const overview = buildOverviewBranches(graph)
    const reverse = overview.links.find(link => link.metadata.relationshipIds.includes('z-a'))
    expect(reverse.source).toBe(overview.personBranchIds.a)
    expect(reverse.target).toBe(overview.personBranchIds.z)
    expect(reverse.metadata.relationships[0].source).toBe('z')
    expect(reverse.metadata.relationships[0].target).toBe('a')
    expect(overview.links.flatMap(link => link.metadata.facts).some(fact => [fact.sourcePersonId, fact.targetPersonId].includes('z') && [fact.sourcePersonId, fact.targetPersonId].includes('other'))).toBe(false)
    expectConserved(graph, projectOverviewBranches(graph))
  })
})

// --- 聚合、局部展开和事实往返 --- //

describe('overview branch projection', () => {
  it('全聚合只有真实支系摘要，跨支婚姻和亲子线具备原始证据', () => {
    const graph = connectedPedigree()
    const projected = projectOverviewBranches(graph)
    expect(projected.nodes.every(node => node.type === 'branchSummary')).toBe(true)
    expect(projected.nodes).toHaveLength(3)
    expect(projected.nodes.every(node => node.name === node.title && node.name.length > 0)).toBe(true)
    expect(projected.edges).toHaveLength(3)
    for (const edge of projected.edges) {
      expect(edge.metadata.branchLink).toBe(true)
      expect(edge.metadata.families).toHaveLength(1)
      expect(edge.metadata.relationships.length).toBeGreaterThanOrEqual(2)
      expect(edge.metadata.facts.length).toBeGreaterThan(0)
    }
    expectConserved(graph, projected)
  })

  it('局部展开只显示该支人物，跨支成员仍连接真实家庭且保留原始端点', () => {
    const graph = connectedPedigree()
    const overview = buildOverviewBranches(graph)
    const branchId = overview.personBranchIds.father
    const projected = projectOverviewBranches(graph, new Set([branchId]))
    expect(projected.nodes.filter(node => node.type === 'person').map(node => node.id).sort()).toEqual(['agf', 'agm', 'father', 'uncle'])
    expect(projected.nodes.filter(node => node.type === 'familyUnit').map(node => node.id)).toEqual(['family:marriage', 'family:origin-a'])
    const marriagePartner = projected.edges.find(edge => edge.id === 'mother>family:marriage')
    expect(marriagePartner.source).toBe(overview.personBranchIds.mother)
    expect(marriagePartner.relation).toBe('partner')
    expect(marriagePartner.metadata.overview.originalSource).toBe('mother')
    expect(marriagePartner.metadata.overview.relationships[0]).toEqual(graph.edges.find(edge => edge.id === marriagePartner.id))
    expectConserved(graph, projected)
  })

  it('局部展开时不同生养类型即使映射到同一摘要也保留独立成员边与原始端点', () => {
    const graph = graphOf([
      { id: 'origin-a', parents: ['ancestor-a'], children: ['father'] },
      { id: 'origin-b', parents: ['ancestor-b'], children: ['mother'] },
      { id: 'mixed', parents: ['father', 'mother'], children: [{ id: 'bio', kind: 'biological' }, { id: 'adopt', kind: 'adoptive' }] }
    ])
    const overview = buildOverviewBranches(graph)
    const projected = projectOverviewBranches(graph, [overview.personBranchIds.father])
    const childEdges = projected.edges.filter(edge => edge.source === 'family:mixed')
    expect(childEdges).toHaveLength(2)
    expect(new Set(childEdges.map(edge => edge.target)).size).toBe(1)
    expect(childEdges.map(edge => edge.relation).sort()).toEqual(['adoptive', 'biological'])
    expect(childEdges.map(edge => edge.metadata.overview.originalTarget).sort()).toEqual(['adopt', 'bio'])
    for (const edge of childEdges) expect(edge.metadata.overview.relationships).toEqual([graph.edges.find(original => original.id === edge.id)])
    expectConserved(graph, projected)
  })

  it('同一摘要代表家庭中不同角色时保留各自人物证据，不把摘要等同为一个真实人物', () => {
    const graph = graphOf([
      { id: 'origin', parents: ['ancestor'], children: ['father'] },
      { id: 'marriage', parents: ['father', 'mother'], children: ['child'] }
    ])
    const overview = buildOverviewBranches(graph)
    const projected = projectOverviewBranches(graph, [overview.personBranchIds.father])
    const summaryId = overview.personBranchIds.mother
    expect(summaryId).toBe(overview.personBranchIds.child)
    const motherEdge = projected.edges.find(edge => edge.id === 'mother>family:marriage')
    const childEdge = projected.edges.find(edge => edge.id === 'family:marriage>child')
    expect(motherEdge.source).toBe(summaryId)
    expect(childEdge.target).toBe(summaryId)
    expect(motherEdge.metadata.overview.originalSource).toBe('mother')
    expect(childEdge.metadata.overview.originalTarget).toBe('child')
    expect(projected.nodes.find(node => node.id === summaryId).type).toBe('branchSummary')
    expectConserved(graph, projected)
  })

  it('全部展开精确恢复全部原人物、家庭及每种原关系，不留下摘要或替代边', () => {
    const graph = connectedPedigree()
    const overview = buildOverviewBranches(graph)
    const projected = projectOverviewBranches(graph, overview.branches.map(branch => branch.id))
    expect(projected.nodes.filter(node => node.type === 'branchSummary')).toEqual([])
    expect([...projected.nodes].sort((a, b) => a.id.localeCompare(b.id))).toEqual([...graph.nodes].sort((a, b) => a.id.localeCompare(b.id)))
    expect([...projected.edges].sort((a, b) => a.id.localeCompare(b.id))).toEqual([...graph.edges].sort((a, b) => a.id.localeCompare(b.id)))
    expectConserved(graph, projected)
  })

  it('独立关系与同义家庭事实合并摘要显示，但全部原关系证据都保留', () => {
    const graph = connectedPedigree()
    graph.edges.push({ id: 'explicit-spouse', source: 'father', target: 'mother', relation: 'spouse', style: 'spouse', metadata: { _explicit: true } })
    const projected = projectOverviewBranches(graph)
    const spouse = projected.edges.filter(edge => edge.relation === 'spouse')
    expect(spouse).toHaveLength(1)
    expect(spouse[0].metadata.relationships.map(edge => edge.id)).toContain('explicit-spouse')
    expectConserved(graph, projected)
  })

  it('无人物空家庭、辅助胶囊和空图不产生虚构人物或悬空边', () => {
    const empty = graphOf([{ id: 'empty', parents: [], children: [] }])
    empty.nodes.push({ id: 'capsule', type: 'branchCapsule', title: '原始旁支', person_count: 7 })
    const projected = projectOverviewBranches(empty)
    expect(projected.nodes).toEqual([...empty.nodes].sort((a, b) => a.id < b.id ? -1 : 1))
    expect(projected.overview_branches.totalPersonCount).toBe(0)
    expectConserved(empty, projected)
    expect(buildOverviewBranches(graphOf())).toEqual({ branches: [], links: [], personBranchIds: {}, totalPersonCount: 0 })
  })

  it('反复展开收起保持输入不变，失效展开ID不会污染当前投影', () => {
    const graph = freeze(connectedPedigree())
    const before = JSON.stringify(graph)
    const overview = buildOverviewBranches(graph)
    const all = overview.branches.map(branch => branch.id)
    for (const expanded of [[], [all[0]], all, [], ['stale-branch']]) expectConserved(graph, projectOverviewBranches(graph, expanded))
    expect(JSON.stringify(graph)).toBe(before)
    expect(projectOverviewBranches(graph, ['stale-branch'])).toEqual(projectOverviewBranches(graph))
  })

  it('三支的全部八种展开组合都保持计数、可见端点和全部事实证据', () => {
    const graph = connectedPedigree()
    const branches = buildOverviewBranches(graph).branches
    for (let combination = 0; combination < 2 ** branches.length; combination += 1) {
      const expanded = branches.filter((branch, index) => combination & (1 << index)).map(branch => branch.id)
      const projected = projectOverviewBranches(graph, expanded)
      expectConserved(graph, projected)
      for (const edge of projected.edges.filter(edge => edge.metadata?.branchLink)) {
        const nodes = new Map(projected.nodes.map(node => [node.id, node]))
        expect(['person', 'branchSummary']).toContain(nodes.get(edge.source).type)
        expect(['person', 'branchSummary']).toContain(nodes.get(edge.target).type)
      }
    }
  })

  it('默认摘要和独立人物经过展示适配仍准确计数，点击摘要ID能从原DTO恢复完整人物资料', () => {
    const source = connectedPedigree()
    source.nodes.push({ id: 'isolated', type: 'person', name: '独立家人', gender: 'U', occupation: '教师', biography: '保留完整档案', name_pinyin: 'dulijiaren', name_initials: 'dljr' })
    const original = freeze(source)
    const overview = buildOverviewBranches(original)
    const expanded = []
    const collapsed = projectOverviewBranches(original)
    for (const direction of ['vertical', 'horizontal']) {
      const initialLayout = createGraphPresentation(collapsed, { direction })
      const summaries = initialLayout.nodes.filter(node => node.nodeType === 'branchSummary')
      expect(initialLayout.nodes.filter(node => node.nodeType === 'person')).toEqual([])
      expect(summaries.reduce((sum, node) => sum + node.raw.personCount, 0)).toBe(10)
      const isolated = summaries.find(node => node.raw.personIds.includes('isolated'))
      expect(isolated.raw.branchKind).toBe('person')
      const clickedId = isolated.id
      const clickedProjection = projectOverviewBranches(original, [clickedId])
      const clickedLayout = createGraphPresentation(clickedProjection, { direction })
      const restored = clickedLayout.nodes.find(node => node.id === 'isolated')
      expect(restored.nodeType).toBe('person')
      expect(restored.raw).toEqual(original.nodes.find(node => node.id === 'isolated'))
      expectConserved(original, clickedProjection)
    }
    // Canvas发送真实摘要ID；页面累积这些ID后始终重新投影原始DTO。
    for (const branch of overview.branches) {
      expanded.push(branch.id)
      const projected = projectOverviewBranches(original, expanded)
      for (const direction of ['vertical', 'horizontal']) {
        const result = createGraphPresentation(projected, { direction })
        const people = result.nodes.filter(node => node.nodeType === 'person')
        const summaries = result.nodes.filter(node => node.nodeType === 'branchSummary')
        expect(people.length + summaries.reduce((sum, node) => sum + node.raw.personCount, 0)).toBe(10)
        expect(new Set([...people.map(node => node.id), ...summaries.flatMap(node => node.raw.personIds)]).size).toBe(10)
      }
      expectConserved(original, projected)
    }
    expect(projectOverviewBranches(original).nodes).toEqual(collapsed.nodes)
  })

  it('摘要ID与原始人物ID碰撞时稳定避让且仍保持人物数量', () => {
    const graph = graphOf([{ id: 'one', parents: ['parent'], children: ['child'] }], ['overview-branch:family%3Afamily%3Aone'])
    const projected = projectOverviewBranches(graph)
    const familyBranch = projected.nodes.find(node => node.type === 'branchSummary' && node.rootFamilyId === 'family:one')
    expect(familyBranch.id).toBe('overview-branch:family%3Afamily%3Aone:1')
    expectConserved(graph, projected)
  })

  it('聚合链接ID与原始关系ID碰撞时避让，不覆盖真实关系证据', () => {
    const graph = connectedPedigree()
    const linkId = buildOverviewBranches(graph).links.find(link => link.relation === 'spouse').id
    graph.edges.push({ id: linkId, source: 'agf', target: 'father', relation: 'father', metadata: { relationKind: 'biological' } })
    const projected = projectOverviewBranches(graph)
    expect(projected.edges.find(edge => edge.relation === 'spouse').id).toBe(linkId + ':1')
    expect(new Set(projected.edges.map(edge => edge.id)).size).toBe(projected.edges.length)
    expectConserved(graph, projected)
  })
})
