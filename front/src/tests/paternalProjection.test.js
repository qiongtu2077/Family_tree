import { describe, expect, it } from 'vitest'
import { createPaternalProjection } from '../graph/paternalProjection'
import { layoutGraph } from '../composables/useGraphLayout'

// --- Graph DTO 样本 --- //

/** 创建明确给定性别的人物，缺省性别为未知而非父亲。 */
function person(id, gender = 'U') {
  return { id, type: 'person', name: id, gender }
}

/** 创建直接父母事实；关系类型与父母身份分别按真实 DTO 放置。 */
function parentEdge(parent, child, side, kind = 'biological', certainty = 1) {
  return {
    id: parent + '>' + child + ':' + side + ':' + kind,
    source: parent, target: child, relation: side,
    style: ['adoptive', 'step'].includes(kind) ? 'dashed' : 'solid',
    metadata: { side, relationKind: kind, certainty }
  }
}

/** 将家庭成员和子女归属关系加入样本，不额外推断直接父母身份。 */
function addFamily(graph, id, partners, children) {
  const familyId = 'family:' + id
  graph.nodes.push({ id: familyId, type: 'familyUnit', family_type: 'marriage' })
  for (const partner of partners) graph.edges.push({ id: partner + '>' + familyId, source: partner, target: familyId, relation: 'partner', style: 'spouse', metadata: {} })
  for (const child of children) graph.edges.push({ id: familyId + '>' + child, source: familyId, target: child, relation: 'biological', style: 'solid', metadata: { relationKind: 'biological' } })
}

/** 创建父系、母系、婚姻、女儿和叔父旁支同时存在的对照样本。 */
function fullPedigree() {
  const ids = ['center', 'father', 'grandfather', 'grandmother', 'mother', 'maternal-grandfather', 'maternal-grandmother', 'spouse', 'daughter', 'sister', 'uncle', 'uncle-spouse', 'cousin', 'cousin-spouse', 'cousin-child']
  const graph = { view_mode: 'overview', nodes: ids.map(id => person(id)), edges: [], warnings: ['来源范围提示'], hidden_relation_count: 3 }
  addFamily(graph, 'grandparents', ['grandfather', 'grandmother'], ['father', 'uncle'])
  addFamily(graph, 'parents', ['father', 'mother'], ['center', 'sister'])
  addFamily(graph, 'maternal', ['maternal-grandfather', 'maternal-grandmother'], ['mother'])
  addFamily(graph, 'center', ['center', 'spouse'], ['daughter'])
  addFamily(graph, 'uncle', ['uncle', 'uncle-spouse'], ['cousin'])
  addFamily(graph, 'cousin', ['cousin', 'cousin-spouse'], ['cousin-child'])
  graph.edges.push(
    parentEdge('grandfather', 'father', 'father'),
    parentEdge('grandmother', 'father', 'mother'),
    parentEdge('grandfather', 'uncle', 'father'),
    parentEdge('father', 'center', 'father'),
    parentEdge('mother', 'center', 'mother'),
    parentEdge('father', 'sister', 'father'),
    parentEdge('maternal-grandfather', 'mother', 'father'),
    parentEdge('maternal-grandmother', 'mother', 'mother'),
    parentEdge('center', 'daughter', 'father'),
    parentEdge('uncle', 'cousin', 'father'),
    parentEdge('cousin', 'cousin-child', 'father')
  )
  return graph
}

/** 返回投影中真实人物的 ID。 */
function peopleIn(graph) {
  return new Set(graph.nodes.filter(node => node.type === 'person').map(node => node.id))
}

/** 冻结输入对象及嵌套成员，用于发现投影对来源 DTO 的修改。 */
function freezeGraph(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value)
    for (const child of Object.values(value)) freezeGraph(child)
  }
  return value
}

// --- 明确事实与父系范围 --- //

describe('createPaternalProjection', () => {
  it('changes relationship scope instead of rotating the complete pedigree', () => {
    const source = fullPedigree()
    const result = createPaternalProjection(source, 'center')
    const people = peopleIn(result)
    expect(result.paternal_context.core_person_ids).toEqual(['center', 'father', 'grandfather'])
    expect(people.has('maternal-grandfather')).toBe(false)
    expect(people.has('maternal-grandmother')).toBe(false)
    expect(people.has('cousin')).toBe(false)
    for (const id of ['mother', 'grandmother', 'spouse', 'daughter', 'sister', 'uncle']) expect(people.has(id), id + ' must keep a profile entry').toBe(true)
    expect(result.view_mode).toBe('mainline')
    expect(result.view_context.projection_reason).toBe('paternal_reading')
    expect(result.warnings).toContain('来源范围提示')
  })

  it('limits the paternal core to the requested ancestor depth while keeping boundary profile context', () => {
    const source = fullPedigree()
    const first = createPaternalProjection(source, 'center', { maxAncestorDepth: 1 })
    const second = createPaternalProjection(source, 'center', { maxAncestorDepth: 2 })
    expect(first.paternal_context.core_person_ids).toEqual(['center', 'father'])
    expect(second.paternal_context.core_person_ids).toEqual(['center', 'father', 'grandfather'])
    expect(first.paternal_context.ancestor_depth).toBe(1)
    expect(second.paternal_context.ancestor_depth).toBe(2)
    expect(peopleIn(first).has('grandfather')).toBe(true)
    expect(createPaternalProjection(source, 'center', { maxAncestorDepth: 0 }).paternal_context.core_person_ids).toEqual(['center'])
    expect(createPaternalProjection(source, 'center').paternal_context.ancestor_depth).toBeNull()
  })

  it('uses the shortest paternal path when conflicting fathers converge on a shared ancestor', () => {
    const source = {
      view_mode: 'mainline', nodes: ['child', 'a', 'b', 'x', 'shared', 'top'].map(id => person(id)),
      edges: [parentEdge('a', 'child', 'father'), parentEdge('b', 'child', 'father'), parentEdge('x', 'a', 'father'), parentEdge('shared', 'x', 'father'), parentEdge('shared', 'b', 'father'), parentEdge('top', 'shared', 'father')]
    }
    const result = createPaternalProjection(source, 'child', { maxAncestorDepth: 3 })
    expect(result.paternal_context.core_person_ids).toEqual(['a', 'b', 'child', 'shared', 'top', 'x'])
    expect(result.warnings.some(text => text.includes('循环'))).toBe(false)
    expect(result.paternal_context.ambiguous_fathers[0].father_ids).toEqual(['a', 'b'])
  })

  it('uses an explicit father relationship even when the father gender is unknown', () => {
    const source = { view_mode: 'mainline', nodes: [person('child'), person('father', 'U'), person('grandfather')], edges: [parentEdge('father', 'child', 'father'), parentEdge('grandfather', 'father', 'father')] }
    const result = createPaternalProjection(source, 'child')
    expect(result.paternal_context.core_person_ids).toEqual(['child', 'father', 'grandfather'])
  })

  it('never infers father identity from male gender or family member order', () => {
    const source = { view_mode: 'mainline', nodes: [person('child'), person('male-parent', 'M'), person('grandfather', 'M')], edges: [parentEdge('male-parent', 'child', 'parent'), parentEdge('grandfather', 'male-parent', 'father')] }
    addFamily(source, 'parents', ['male-parent'], ['child'])
    const result = createPaternalProjection(source, 'child')
    expect(result.paternal_context.core_person_ids).toEqual(['child'])
    expect(peopleIn(result).has('male-parent')).toBe(true)
    expect(peopleIn(result).has('grandfather')).toBe(false)
    expect(result.warnings.some(text => text.includes('未根据性别'))).toBe(true)
  })

  it('separates biological and adoptive fathers while keeping both profile entries', () => {
    const source = {
      view_mode: 'mainline',
      nodes: ['child', 'biological-father', 'adoptive-father', 'adoptive-grandfather'].map(id => person(id)),
      edges: [parentEdge('biological-father', 'child', 'father'), parentEdge('adoptive-father', 'child', 'father', 'adoptive'), parentEdge('adoptive-grandfather', 'adoptive-father', 'father')]
    }
    const result = createPaternalProjection(source, 'child')
    expect(result.paternal_context.core_person_ids).toEqual(['biological-father', 'child'])
    expect(peopleIn(result).has('adoptive-father')).toBe(true)
    expect(peopleIn(result).has('adoptive-grandfather')).toBe(false)
    expect(result.paternal_context.other_father_relations).toEqual([{ child_id: 'child', father_id: 'adoptive-father', relation_kind: 'adoptive' }])
    expect(result.edges.find(edge => edge.source === 'adoptive-father').style).toBe('dashed')
  })

  it('keeps step and unknown father records without substituting either for a biological father', () => {
    const source = {
      view_mode: 'mainline', nodes: ['child', 'step-father', 'unknown-father'].map(id => person(id)),
      edges: [parentEdge('step-father', 'child', 'father', 'step'), parentEdge('unknown-father', 'child', 'father', 'unknown')]
    }
    const result = createPaternalProjection(source, 'child')
    expect(result.paternal_context.core_person_ids).toEqual(['child'])
    expect([...peopleIn(result)].sort()).toEqual(['child', 'step-father', 'unknown-father'])
    expect(result.paternal_context.other_father_relations.map(record => record.relation_kind).sort()).toEqual(['step', 'unknown'])
    expect(result.warnings.some(text => text.includes('继父') && text.includes('父亲类型未知'))).toBe(true)
  })

  it('explains an ancestor stop caused by adoptive or unknown father records', () => {
    for (const kind of ['adoptive', 'unknown']) {
      const source = {
        view_mode: 'mainline', nodes: ['child', 'father', 'other-father'].map(id => person(id)),
        edges: [parentEdge('father', 'child', 'father'), parentEdge('other-father', 'father', 'father', kind)]
      }
      const result = createPaternalProjection(source, 'child')
      expect(result.paternal_context.core_person_ids).toEqual(['child', 'father'])
      expect(peopleIn(result).has('other-father')).toBe(true)
      expect(result.warnings.some(text => text.includes('father') && text.includes('未继续') && text.includes(kind === 'adoptive' ? '养父' : '父亲类型未知'))).toBe(true)
    }
  })

  it('explains an ancestor stop when the next recorded parent identity is unassigned', () => {
    const source = {
      view_mode: 'mainline', nodes: ['child', 'father', 'parent'].map(id => person(id, 'M')),
      edges: [parentEdge('father', 'child', 'father'), parentEdge('parent', 'father', 'parent')]
    }
    const result = createPaternalProjection(source, 'child')
    expect(result.paternal_context.core_person_ids).toEqual(['child', 'father'])
    expect(result.warnings.some(text => text.includes('father') && text.includes('身份尚未区分') && text.includes('未继续'))).toBe(true)
  })

  it('avoids capsule ID collisions with real people and existing navigation entries', () => {
    const source = fullPedigree()
    const realPersonId = 'capsule:paternal:other:center'
    const existingCapsuleId = 'capsule:paternal:branch:family:uncle'
    source.nodes.push(person(realPersonId))
    source.edges.push({ id: 'extra-spouse', source: 'center', target: realPersonId, relation: 'spouse', style: 'spouse', metadata: {} })
    source.nodes.push({ id: existingCapsuleId, type: 'branchCapsule', title: '原有谱系入口', owner_person_id: 'mother', target_view: 'inlaw' })
    const result = createPaternalProjection(source, 'center')
    expect(new Set(result.nodes.map(node => node.id)).size).toBe(result.nodes.length)
    expect(result.nodes.find(node => node.id === realPersonId).type).toBe('person')
    expect(result.nodes.find(node => node.id === existingCapsuleId).title).toBe('原有谱系入口')
    expect(result.nodes.some(node => node.type === 'branchCapsule' && node.root_family_unit_id === 'uncle' && node.target_view === 'branch')).toBe(true)
  })

  it('keeps a direct spouse and children of every recorded gender without any FamilyUnit', () => {
    const source = {
      view_mode: 'mainline', nodes: [person('center'), person('spouse'), person('son', 'M'), person('daughter', 'F'), person('unspecified', 'U')],
      edges: [parentEdge('center', 'son', 'father'), parentEdge('center', 'daughter', 'father'), parentEdge('center', 'unspecified', 'father'), { id: 'spouse-only', source: 'center', target: 'spouse', relation: 'spouse', style: 'spouse', metadata: {} }]
    }
    expect([...peopleIn(createPaternalProjection(source, 'center'))].sort()).toEqual(['center', 'daughter', 'son', 'spouse', 'unspecified'])
  })

  it('does not default a father edge with missing relationship kind to biological', () => {
    const edge = parentEdge('father', 'child', 'father')
    delete edge.metadata.relationKind
    const source = { view_mode: 'mainline', nodes: [person('child'), person('father')], edges: [edge] }
    const result = createPaternalProjection(source, 'child')
    expect(result.paternal_context.core_person_ids).toEqual(['child'])
    expect(result.paternal_context.unconfirmed_fathers[0].relation_kind).toBeNull()
    expect(result.warnings.some(text => text.includes('尚未确认生育事实'))).toBe(true)
  })

  it('keeps uncertain biological father evidence but stops confirmed lineage traversal', () => {
    const source = {
      view_mode: 'mainline', nodes: ['child', 'father', 'grandfather'].map(id => person(id)),
      edges: [parentEdge('father', 'child', 'father', 'biological', 0.5), parentEdge('grandfather', 'father', 'father')]
    }
    const result = createPaternalProjection(source, 'child')
    expect(result.paternal_context.core_person_ids).toEqual(['child'])
    expect(peopleIn(result).has('father')).toBe(true)
    expect(peopleIn(result).has('grandfather')).toBe(false)
    expect(result.paternal_context.unconfirmed_fathers[0].certainty).toBe(0.5)
  })

  it('follows the established default certainty when the optional metadata value is absent', () => {
    const edge = parentEdge('father', 'child', 'father')
    delete edge.metadata.certainty
    const result = createPaternalProjection({ view_mode: 'mainline', nodes: [person('child'), person('father')], edges: [edge] }, 'child')
    expect(result.paternal_context.core_person_ids).toEqual(['child', 'father'])
  })

  it('retains every conflicting biological father and warns instead of silently choosing one', () => {
    const source = {
      view_mode: 'mainline', nodes: ['child', 'father-one', 'father-two', 'grandfather-one', 'grandfather-two'].map(id => person(id)),
      edges: [parentEdge('father-one', 'child', 'father'), parentEdge('father-two', 'child', 'father'), parentEdge('grandfather-one', 'father-one', 'father'), parentEdge('grandfather-two', 'father-two', 'father')]
    }
    const result = createPaternalProjection(source, 'child')
    expect(result.paternal_context.core_person_ids).toEqual(['child', 'father-one', 'father-two', 'grandfather-one', 'grandfather-two'])
    expect(result.paternal_context.ambiguous_fathers).toEqual([{ child_id: 'child', father_ids: ['father-one', 'father-two'] }])
    expect(result.warnings.some(text => text.includes('2 位生父') && text.includes('不自动择一'))).toBe(true)
    expect(result.paternal_context.confirmed_father_edge_ids).toHaveLength(4)
  })

  it('stops paternal cycles and retains the original contradictory evidence', () => {
    const source = { view_mode: 'mainline', nodes: [person('a'), person('b')], edges: [parentEdge('a', 'b', 'father'), parentEdge('b', 'a', 'father')] }
    const result = createPaternalProjection(source, 'a')
    expect(result.paternal_context.core_person_ids).toEqual(['a', 'b'])
    expect(result.edges).toHaveLength(2)
    expect(result.warnings.some(text => text.includes('父系关系存在循环'))).toBe(true)
    const bounded = createPaternalProjection(source, 'a', { maxAncestorDepth: 1 })
    expect(bounded.paternal_context.core_person_ids).toEqual(['a', 'b'])
    expect(bounded.warnings.some(text => text.includes('父系关系存在循环'))).toBe(true)
  })

  it('supports a female center without dropping her spouse or child information', () => {
    const source = { view_mode: 'mainline', nodes: [person('daughter', 'F'), person('father', 'M'), person('spouse'), person('child')], edges: [parentEdge('father', 'daughter', 'father'), parentEdge('daughter', 'child', 'mother')] }
    addFamily(source, 'own-family', ['daughter', 'spouse'], ['child'])
    const result = createPaternalProjection(source, 'daughter')
    expect(result.paternal_context.core_person_ids).toEqual(['daughter', 'father'])
    expect(peopleIn(result).has('spouse')).toBe(true)
    expect(peopleIn(result).has('child')).toBe(true)
  })

  it('expands side branches only to the requested paternal depth', () => {
    const source = fullPedigree()
    const collapsed = createPaternalProjection(source, 'center')
    const firstLevel = createPaternalProjection(source, 'center', { sideBranchDepth: 1 })
    const secondLevel = createPaternalProjection(source, 'center', { sideBranchDepth: 2 })
    expect(peopleIn(collapsed).has('cousin')).toBe(false)
    expect(peopleIn(firstLevel).has('cousin')).toBe(true)
    expect(peopleIn(firstLevel).has('uncle-spouse')).toBe(true)
    expect(peopleIn(firstLevel).has('cousin-child')).toBe(false)
    expect(peopleIn(secondLevel).has('cousin-child')).toBe(true)
    expect(peopleIn(secondLevel).has('maternal-grandfather')).toBe(false)
    expect(firstLevel.paternal_context.core_person_ids).toEqual(collapsed.paternal_context.core_person_ids)
  })

  it('keeps navigable branch capsules and a separate entry for other lineages', () => {
    const source = fullPedigree()
    source.nodes.push({ id: 'existing-capsule', type: 'branchCapsule', title: '已有入口', owner_person_id: 'mother', target_view: 'inlaw' })
    const result = createPaternalProjection(source, 'center')
    const capsules = result.nodes.filter(node => node.type === 'branchCapsule')
    const uncle = capsules.find(node => node.root_family_unit_id === 'uncle')
    expect(uncle.target_view).toBe('branch')
    expect(uncle.owner_person_id).toBe('uncle')
    expect(uncle.person_count).toBe(4)
    expect(capsules.some(node => node.id === 'existing-capsule')).toBe(true)
    expect(capsules.some(node => node.target_view === 'overview' && node.title.includes('其他谱系'))).toBe(true)
    expect(result.hidden_relation_count).toBe(3 + result.paternal_context.omitted_person_count)
  })

  it('removes a stale branch capsule only after its counted descendant facts are loaded and all displayed', () => {
    const source = fullPedigree()
    source.hidden_relation_count = 2
    source.nodes.push({ id: 'original-uncle-capsule', type: 'branchCapsule', title: '叔父后代 · 2 人', owner_person_id: 'uncle', root_family_unit_id: 'uncle', target_view: 'branch', person_count: 2, generation_count: 2 })
    const collapsed = createPaternalProjection(source, 'center')
    expect(collapsed.nodes.some(node => node.id === 'original-uncle-capsule')).toBe(true)
    expect(collapsed.nodes.filter(node => node.type === 'branchCapsule' && node.root_family_unit_id === 'uncle')).toHaveLength(1)
    const expanded = createPaternalProjection(source, 'center', { sideBranchDepth: 2 })
    expect(expanded.nodes.some(node => node.id === 'original-uncle-capsule')).toBe(false)
    expect(expanded.paternal_context.source_hidden_hint_count).toBe(0)
    expect(expanded.hidden_relation_count).toBe(expanded.paternal_context.omitted_person_count)
  })

  it('keeps a branch navigation hint when the source has not loaded all counted descendants', () => {
    const source = fullPedigree()
    source.nodes = source.nodes.filter(node => node.id !== 'cousin-child')
    source.edges = source.edges.filter(edge => edge.source !== 'cousin-child' && edge.target !== 'cousin-child')
    source.hidden_relation_count = 2
    source.nodes.push({ id: 'partial-uncle-capsule', type: 'branchCapsule', title: '叔父后代 · 2 人', owner_person_id: 'uncle', root_family_unit_id: 'uncle', target_view: 'branch', person_count: 2, generation_count: 2 })
    const result = createPaternalProjection(source, 'center', { sideBranchDepth: 2 })
    expect(result.nodes.find(node => node.id === 'partial-uncle-capsule').person_count).toBe(2)
    expect(result.paternal_context.source_hidden_hint_count).toBe(2)
    expect(result.hidden_relation_count).toBe(2 + result.paternal_context.omitted_person_count)
  })

  it('clears old spouse and family parameters and never mutates the original DTO', () => {
    const source = fullPedigree()
    source.view_context = { center_person_id: 'uncle', spouse_id: 'uncle-spouse', family_unit_id: 'uncle', root_type: 'familyUnit', root_id: 'uncle' }
    const before = JSON.stringify(source)
    freezeGraph(source)
    const result = createPaternalProjection(source, 'center')
    expect(JSON.stringify(source)).toBe(before)
    expect(result.view_context).toEqual({ center_person_id: 'center', spouse_id: null, family_unit_id: null, root_type: 'person', root_id: 'center', projection_reason: 'paternal_reading' })
    const ids = new Set(result.nodes.map(node => node.id))
    expect(result.edges.every(edge => ids.has(edge.source) && ids.has(edge.target))).toBe(true)
  })

  it('validates the explicit center and side-depth contract', () => {
    const source = fullPedigree()
    expect(() => createPaternalProjection(source, 'missing')).toThrow('中心人物')
    expect(() => createPaternalProjection(source, 'center', { sideBranchDepth: -1 })).toThrow('非负整数')
    expect(() => createPaternalProjection(source, 'center', { sideBranchDepth: 0.5 })).toThrow('非负整数')
    expect(() => createPaternalProjection(source, 'center', { maxAncestorDepth: -1 })).toThrow('上溯代数')
    expect(() => createPaternalProjection(source, 'center', { maxAncestorDepth: 0.5 })).toThrow('上溯代数')
  })

  it('preserves deterministic lineage selection when source order changes', () => {
    const source = fullPedigree()
    const forward = createPaternalProjection(source, 'center')
    const backward = createPaternalProjection({ ...source, nodes: [...source.nodes].reverse(), edges: [...source.edges].reverse() }, 'center')
    expect([...peopleIn(backward)].sort()).toEqual([...peopleIn(forward)].sort())
    expect(backward.paternal_context).toEqual(forward.paternal_context)
  })

  it('passes a full family plus redundant direct-parent DTO through the existing layout without reintroducing the maternal branch', async () => {
    const source = fullPedigree()
    const projected = createPaternalProjection(source, 'center')
    const layout = await layoutGraph(projected)
    const displayed = new Set(layout.nodes.filter(node => node.nodeType === 'person').map(node => node.id))
    expect(displayed).toEqual(peopleIn(projected))
    expect(displayed.has('maternal-grandfather')).toBe(false)
    expect(layout.nodes.filter(node => node.id === 'father')).toHaveLength(1)
    expect(layout.edges.some(edge => edge.familyId.includes('direct:father:center'))).toBe(false)
    expect(projected.edges.some(edge => edge.relation === 'father' && edge.source === 'father' && edge.target === 'center')).toBe(true)
    expect(projected.edges.some(edge => edge.source === 'family:parents' && edge.target === 'center')).toBe(true)
  })

  it('keeps ambiguous father evidence even when both fathers also occur in explicit family units', async () => {
    const source = {
      view_mode: 'overview', nodes: ['child', 'father-one', 'father-two', 'mother'].map(id => person(id)),
      edges: [parentEdge('father-one', 'child', 'father'), parentEdge('father-two', 'child', 'father'), parentEdge('mother', 'child', 'mother')]
    }
    addFamily(source, 'one', ['father-one', 'mother'], ['child'])
    addFamily(source, 'two', ['father-two', 'mother'], ['child'])
    const projected = createPaternalProjection(source, 'child')
    const layout = await layoutGraph(projected)
    expect(projected.paternal_context.ambiguous_fathers[0].father_ids).toEqual(['father-one', 'father-two'])
    expect(projected.edges.filter(edge => edge.relation === 'father')).toHaveLength(2)
    expect(layout.nodes.filter(node => node.nodeType === 'person')).toHaveLength(4)
    expect(new Set(layout.edges.filter(edge => edge.relation === 'child').map(edge => edge.familyId))).toEqual(new Set(['family:one', 'family:two']))
  })
})

