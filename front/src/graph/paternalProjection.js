/**
 * 父系阅读的数据投影：只沿明确、已确认的生父事实追溯。
 * 图形横纵方向交给布局层；这里不改变坐标，不根据性别或家庭成员顺序猜父亲。
 */

// --- 对外投影 --- //

/** 从已加载 GraphViewDTO 提取父系主干、近亲资料入口和可控的父系旁支。 */
export function createPaternalProjection(graph, centerId, { sideBranchDepth = 0, maxAncestorDepth = Infinity } = {}) {
  const model = indexGraph(graph)
  if (!model.people.has(centerId)) throw new Error('父系阅读需要当前图内明确的中心人物')
  if (!Number.isInteger(sideBranchDepth) || sideBranchDepth < 0) throw new Error('父系旁支展开层数必须为非负整数')
  if (maxAncestorDepth !== Infinity && (!Number.isInteger(maxAncestorDepth) || maxAncestorDepth < 0)) throw new Error('父系上溯代数必须为非负整数或不限')

  const ancestry = collectPaternalAncestry(model, centerId, maxAncestorDepth)
  const selectedPeople = new Set(ancestry.people)
  const selectedFamilies = new Set()
  addPersonContext(model, ancestry.people, selectedPeople, selectedFamilies)

  // 默认只展示主干的近亲；展开旁支时仍依赖明确的生父事实，不依赖子女性别。
  let frontier = confirmedChildren(model, ancestry.people, ancestry.people)
  const expanded = new Set(ancestry.people)
  for (let depth = 0; depth < sideBranchDepth && frontier.size; depth += 1) {
    addPersonContext(model, frontier, selectedPeople, selectedFamilies)
    for (const id of frontier) expanded.add(id)
    frontier = confirmedChildren(model, frontier, expanded)
  }

  const omitted = new Set([...model.people.keys()].filter(id => !selectedPeople.has(id)))
  const navigation = projectionCapsules(model, selectedPeople, selectedFamilies, omitted, centerId)
  const sourceHiddenHint = Math.max(0, (graph.hidden_relation_count || 0) - navigation.resolvedHiddenHint)
  const selectedNodes = new Set([...selectedPeople, ...selectedFamilies])
  const nodes = graph.nodes.filter(node => node.type !== 'branchCapsule' && selectedNodes.has(node.id))
  const edges = graph.edges.filter(edge => selectedNodes.has(edge.source) && selectedNodes.has(edge.target))
  const warnings = [...(graph.warnings || []), ...ancestry.warnings]
  if (omitted.size) warnings.push('父系阅读已折叠当前载入范围内的 ' + omitted.size + ' 位旁支或其他谱系人物，可通过旁支入口查看。')

  return {
    ...graph,
    view_mode: 'mainline',
    center_person_id: centerId,
    view_context: {
      center_person_id: centerId, spouse_id: null, family_unit_id: null,
      root_type: 'person', root_id: centerId, projection_reason: 'paternal_reading'
    },
    nodes: [...nodes, ...navigation.capsules],
    edges,
    warnings: [...new Set(warnings)],
    hidden_relation_count: sourceHiddenHint + omitted.size,
    paternal_context: {
      core_person_ids: [...ancestry.people].sort(),
      confirmed_father_edge_ids: [...ancestry.edgeIds].sort(),
      ambiguous_fathers: ancestry.ambiguous,
      unconfirmed_fathers: ancestry.unconfirmed,
      other_father_relations: ancestry.otherFathers,
      omitted_person_count: omitted.size,
      side_branch_depth: sideBranchDepth,
      ancestor_depth: maxAncestorDepth === Infinity ? null : maxAncestorDepth,
      source_hidden_hint_count: sourceHiddenHint
    }
  }
}

// --- 已确认的 Graph DTO 索引 --- //

/** 建立人物、家庭与直接亲子事实索引，不从 FamilyUnit 成员推断父母身份。 */
function indexGraph(graph) {
  const people = new Map()
  const families = new Map()
  const capsules = []
  for (const node of graph.nodes) {
    if (node.type === 'person') people.set(node.id, node)
    if (node.type === 'familyUnit') families.set(node.id, { node, partners: new Set(), children: new Set() })
    if (node.type === 'branchCapsule') capsules.push(node)
  }
  const parentEdges = []
  const spouseEdges = []
  const fathersByChild = new Map()
  const confirmedChildrenByFather = new Map()
  for (const edge of graph.edges) {
    if (people.has(edge.source) && families.has(edge.target)) {
      families.get(edge.target).partners.add(edge.source)
    } else if (families.has(edge.source) && people.has(edge.target)) {
      families.get(edge.source).children.add(edge.target)
    } else if (people.has(edge.source) && people.has(edge.target)) {
      if (['father', 'mother', 'parent'].includes(edge.relation)) parentEdges.push(edge)
      if (edge.relation === 'spouse') spouseEdges.push(edge)
      if (edge.relation === 'father') {
        addIndexedEdge(fathersByChild, edge.target, edge)
        if (isConfirmedBiologicalFather(edge)) addIndexedEdge(confirmedChildrenByFather, edge.source, edge)
      }
    }
  }
  for (const list of fathersByChild.values()) list.sort((a, b) => a.source.localeCompare(b.source) || a.id.localeCompare(b.id))
  return { people, families, capsules, parentEdges, spouseEdges, fathersByChild, confirmedChildrenByFather }
}

/** 将直接关系归入人物索引桶。 */
function addIndexedEdge(index, id, edge) {
  if (!index.has(id)) index.set(id, [])
  index.get(id).push(edge)
}

/** 只有明确标为生父且置信度为确认值的直接关系能够延续父系主干。 */
function isConfirmedBiologicalFather(edge) {
  // ParentChild.to_dict 总是提供 relationKind；缺失时不能沿用普通布局的默认亲生假设。
  return edge.relation === 'father' && edge.metadata?.relationKind === 'biological' &&
    (edge.metadata.certainty ?? 1) === 1
}

/** 为警告和资料入口显示已记录的父亲类型，未知类型不改称生父。 */
function fatherKindLabel(kind) {
  return { biological: '生父', adoptive: '养父', step: '继父', unknown: '父亲类型未知' }[kind] || '父亲类型未记录'
}

// --- 明确父系主干 --- //

/** 沿所有已确认生父事实上溯；多生父保留分歧，循环停止追溯且发出警告。 */
function collectPaternalAncestry(model, centerId, maxDepth) {
  const result = { people: new Set(), edgeIds: new Set(), warnings: [], ambiguous: [], unconfirmed: [], otherFathers: [] }
  const depths = new Map([[centerId, 0]])
  const queue = [centerId]
  result.people.add(centerId)
  // 广度优先确保共同祖先或多个生父汇合时，按最短父系路径执行代数限制。
  while (queue.length) {
    const personId = queue.shift()
    const depth = depths.get(personId)
    if (depth >= maxDepth) continue
    const name = model.people.get(personId).name
    const records = model.fathersByChild.get(personId) || []
    const confirmed = new Map()
    for (const edge of records) {
      if (isConfirmedBiologicalFather(edge)) {
        if (!confirmed.has(edge.source)) confirmed.set(edge.source, [])
        confirmed.get(edge.source).push(edge)
      } else if (edge.metadata?.relationKind === 'biological' || !edge.metadata?.relationKind) {
        result.unconfirmed.push({ child_id: personId, father_id: edge.source, relation_kind: edge.metadata?.relationKind || null, certainty: edge.metadata?.certainty ?? 1 })
        result.warnings.push(name + '的父亲关系尚未确认生育事实，已保留资料入口，未继续按生父上溯。')
      } else {
        result.otherFathers.push({ child_id: personId, father_id: edge.source, relation_kind: edge.metadata.relationKind })
      }
    }
    if (confirmed.size > 1) {
      const fatherIds = [...confirmed.keys()].sort()
      result.ambiguous.push({ child_id: personId, father_ids: fatherIds })
      result.warnings.push(name + '记录了 ' + fatherIds.length + ' 位生父，父系阅读已全部保留；请核实关系，不自动择一。')
    }
    if (!confirmed.size && personId === centerId) {
      const labels = [...new Set(records.map(edge => fatherKindLabel(edge.metadata?.relationKind)))]
      result.warnings.push('当前载入范围没有' + name + '已确认的生父记录，父系主干暂止于本人。' + (labels.length ? '已保留' + labels.join('、') + '资料入口。' : '未根据性别或家庭成员顺序推断父亲。'))
    } else if (!confirmed.size) {
      const kinds = [...new Set(records.map(edge => edge.metadata?.relationKind).filter(kind => kind && kind !== 'biological'))]
      if (kinds.length) result.warnings.push(name + '的上代仅有' + kinds.map(fatherKindLabel).join('、') + '记录，未继续按生父上溯；相关人物资料仍可查看。')
      if (!records.length && model.parentEdges.some(edge => edge.target === personId && edge.relation === 'parent')) {
        result.warnings.push(name + '的上代父母身份尚未区分，未继续根据性别推断生父；相关人物资料仍可查看。')
      }
    }
    for (const [fatherId, edges] of confirmed) {
      for (const edge of edges) result.edgeIds.add(edge.id)
      result.people.add(fatherId)
      if (!depths.has(fatherId)) {
        depths.set(fatherId, depth + 1)
        queue.push(fatherId)
      }
    }
  }
  recordPaternalCycles(model, result)
  return result
}

/** 只在已选主干人物之间检查真实生父环，不把共同祖先的汇合误报成循环。 */
function recordPaternalCycles(model, result) {
  const visiting = new Set()
  const visited = new Set()

  /** 沿主干范围内的已确认生父边检查回边，并保留其证据 ID。 */
  function visit(personId) {
    if (visited.has(personId)) return
    visiting.add(personId)
    for (const edge of model.fathersByChild.get(personId) || []) {
      if (!isConfirmedBiologicalFather(edge) || !result.people.has(edge.source)) continue
      result.edgeIds.add(edge.id)
      if (visiting.has(edge.source)) {
        result.warnings.push('父系关系存在循环：' + model.people.get(personId).name + ' → ' + model.people.get(edge.source).name + '，已停止重复追溯并保留原关系。')
      } else {
        visit(edge.source)
      }
    }
    visiting.delete(personId)
    visited.add(personId)
  }

  for (const id of result.people) visit(id)
}

// --- 近亲入口和旁支展开 --- //

/** 展示主干或已展开旁支的配偶、父母和全部直接子女，保留女儿及未知性别人物入口。 */
function addPersonContext(model, roots, selectedPeople, selectedFamilies) {
  for (const id of roots) selectedPeople.add(id)
  for (const [familyId, family] of model.families) {
    const touchesRoot = [...roots].some(id => family.partners.has(id) || family.children.has(id))
    if (!touchesRoot) continue
    selectedFamilies.add(familyId)
    for (const id of family.partners) selectedPeople.add(id)
    for (const id of family.children) selectedPeople.add(id)
  }
  for (const edge of model.parentEdges) {
    if (roots.has(edge.source) || roots.has(edge.target)) {
      selectedPeople.add(edge.source)
      selectedPeople.add(edge.target)
    }
  }
  for (const edge of model.spouseEdges) {
    if (roots.has(edge.source) || roots.has(edge.target)) {
      selectedPeople.add(edge.source)
      selectedPeople.add(edge.target)
    }
  }
}

/** 获取下一层明确生父的子女，任何性别均按关系事实处理。 */
function confirmedChildren(model, fathers, excluded) {
  const children = new Set()
  for (const fatherId of fathers) {
    for (const edge of model.confirmedChildrenByFather.get(fatherId) || []) {
      if (!excluded.has(edge.target)) children.add(edge.target)
    }
  }
  return children
}

/** 收集某个家庭向下可见的后代及其伴侣，计算旁支入口的范围。 */
function descendantsOfFamily(model, rootFamilyId) {
  const people = new Set()
  const visited = new Set()
  const queue = [rootFamilyId]
  while (queue.length) {
    const id = queue.shift()
    if (visited.has(id)) continue
    visited.add(id)
    const family = model.families.get(id)
    for (const personId of family.partners) people.add(personId)
    for (const childId of family.children) {
      people.add(childId)
      for (const [nextId, next] of model.families) {
        if (next.partners.has(childId) && !visited.has(nextId)) queue.push(nextId)
      }
    }
  }
  return people
}

/** 保留相关旧胶囊，并为被折叠的旁支和其他谱系生成可导航入口。 */
function projectionCapsules(model, selectedPeople, selectedFamilies, omitted, centerId) {
  const capsules = new Map()
  const usedIds = new Set([...model.people.keys(), ...model.families.keys(), ...model.capsules.map(capsule => capsule.id)])
  const retainedBranchRoots = new Set()
  let resolvedHiddenHint = 0
  for (const capsule of model.capsules) {
    if (capsule.owner_person_id && !selectedPeople.has(capsule.owner_person_id)) continue
    const rootId = capsule.root_family_unit_id == null ? null : model.families.has(capsule.root_family_unit_id) ? capsule.root_family_unit_id : 'family:' + capsule.root_family_unit_id
    if (capsule.target_view === 'branch' && model.families.has(rootId)) {
      const loaded = loadedDescendantIds(model, rootId)
      // 后端 branch 胶囊只统计4层子女，不含配偶。证据覆盖计数且子女全部显示，才移除旧入口。
      if (capsule.person_count > 0 && loaded.size >= capsule.person_count && [...loaded].every(id => selectedPeople.has(id))) {
        resolvedHiddenHint += capsule.person_count
        continue
      }
      retainedBranchRoots.add(rootId)
    }
    capsules.set(capsule.id, capsule)
  }
  const covered = new Set()
  for (const [familyId, family] of [...model.families].sort(([a], [b]) => a.localeCompare(b))) {
    if (selectedFamilies.has(familyId)) continue
    const owners = [...family.partners].filter(id => selectedPeople.has(id)).sort()
    if (!owners.length) continue
    const hidden = [...descendantsOfFamily(model, familyId)].filter(id => omitted.has(id)).sort()
    if (!hidden.length) continue
    for (const id of hidden) covered.add(id)
    if (retainedBranchRoots.has(familyId)) continue
    const owner = model.people.get(owners[0])
    const rawFamilyId = familyId.startsWith('family:') ? familyId.slice(7) : familyId
    const id = allocateCapsuleId('capsule:paternal:branch:' + familyId, usedIds)
    capsules.set(id, {
      id, type: 'branchCapsule', title: owner.name + '的旁支 · ' + hidden.length + ' 人',
      owner_person_id: owner.id, root_family_unit_id: rawFamilyId,
      relation_to_center: '父系旁支', person_count: hidden.length, generation_count: 0,
      preview_names: hidden.slice(0, 3).map(personId => model.people.get(personId).name),
      target_view: 'branch'
    })
  }
  const remaining = [...omitted].filter(id => !covered.has(id)).sort()
  if (remaining.length) {
    const id = allocateCapsuleId('capsule:paternal:other:' + centerId, usedIds)
    capsules.set(id, {
      id, type: 'branchCapsule', title: '其他谱系资料 · ' + remaining.length + ' 人',
      owner_person_id: centerId, root_family_unit_id: null,
      relation_to_center: '已折叠谱系', person_count: remaining.length, generation_count: 0,
      preview_names: remaining.slice(0, 3).map(personId => model.people.get(personId).name),
      target_view: 'overview'
    })
  }
  return { capsules: [...capsules.values()].sort((a, b) => a.id.localeCompare(b.id)), resolvedHiddenHint }
}

/** 按后端胶囊的4层子女去重契约收集已载入后代，不把配偶算作子女。 */
function loadedDescendantIds(model, rootFamilyId) {
  const people = new Set()
  let frontier = new Set([rootFamilyId])
  for (let depth = 0; depth < 4 && frontier.size; depth += 1) {
    const children = new Set()
    for (const id of frontier) for (const child of model.families.get(id).children) if (!people.has(child)) children.add(child)
    if (!children.size) break
    for (const child of children) people.add(child)
    frontier = new Set([...model.families].filter(([, family]) => [...children].some(child => family.partners.has(child))).map(([id]) => id))
  }
  return people
}

/** 为导航入口分配稳定且不占用真实人物、家庭或已有入口的 ID。 */
function allocateCapsuleId(base, usedIds) {
  let id = base
  let suffix = 1
  while (usedIds.has(id)) id = base + ':' + suffix++
  usedIds.add(id)
  return id
}

