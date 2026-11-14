/** 全景支系的纯数据投影：按实际原生家庭归属，每人只占一个展开位置。 */
const PARENT_RELATIONS = new Set(['father', 'mother', 'parent'])
const KIND_ORDER = { biological: 0, adoptive: 1, step: 2, unknown: 3 }
const KIND_LABELS = { biological: '生育亲子', adoptive: '收养亲子', step: '继亲', unknown: '亲子待确认' }

// --- 对外契约 --- //

/** 返回顺序无关的支系摘要、跨支事实连接和唯一人物归属，不修改原始图谱。 */
export function buildOverviewBranches(graph) {
  const model = buildModel(graph)
  return publicBranches(model)
}

/** 展开指定支系，其余人物收进 branchSummary；所有原始家庭和关系仍可追溯。 */
export function projectOverviewBranches(graph, expandedBranchIds = []) {
  const model = buildModel(graph)
  const overview = publicBranches(model)
  const requested = new Set(expandedBranchIds)
  const expanded = new Set(overview.branches.filter(branch => requested.has(branch.id)).map(branch => branch.id))
  const expandedPeople = new Set(overview.branches.filter(branch => expanded.has(branch.id)).flatMap(branch => branch.personIds))
  const visibleFamilies = new Set([...model.families.values()].filter(family => {
    const members = [...family.partners.keys(), ...family.children.keys()]
    return !members.length || members.some(id => expandedPeople.has(id))
  }).map(family => family.id))
  const nodes = graph.nodes.filter(node => (
    node.type === 'person' ? expandedPeople.has(node.id) : node.type === 'familyUnit' ? visibleFamilies.has(node.id) : true
  ))
  for (const branch of overview.branches) {
    if (!expanded.has(branch.id)) nodes.push({ ...branch, type: 'branchSummary' })
  }
  const edges = []
  for (const edge of model.edges) {
    if ((model.families.has(edge.source) && !visibleFamilies.has(edge.source)) ||
        (model.families.has(edge.target) && !visibleFamilies.has(edge.target))) continue
    const source = projectedEndpoint(edge.source, model, expandedPeople)
    const target = projectedEndpoint(edge.target, model, expandedPeople)
    // 完全收起的独立事实由语义摘要连接统一表示，支内事实保存在摘要资料中。
    if (model.people.has(edge.source) && model.people.has(edge.target) &&
        !expandedPeople.has(edge.source) && !expandedPeople.has(edge.target)) continue
    if (source === target) continue
    edges.push(source === edge.source && target === edge.target ? edge : {
      ...edge, source, target,
      metadata: { ...edge.metadata, overview: { originalSource: edge.source, originalTarget: edge.target, relationships: [edge], families: familyEvidence(edge, model) } }
    })
  }
  for (const link of overview.links) {
    const facts = link.metadata.facts.filter(fact => fact.familyId
      ? !visibleFamilies.has(fact.familyId)
      : !expandedPeople.has(fact.sourcePersonId) && !expandedPeople.has(fact.targetPersonId))
    if (facts.length) edges.push(makeLink(facts, model))
  }
  const visiblePersonCount = expandedPeople.size
  return {
    ...graph,
    nodes: nodes.sort(compareId), edges: edges.sort(compareId),
    overview_branches: {
      ...overview, expandedBranchIds: [...expanded].sort(compareText), visiblePersonCount,
      collapsedPersonCount: overview.totalPersonCount - visiblePersonCount,
      originalFamilies: [...model.families.values()].map(family => family.raw),
      originalRelationships: model.edges
    }
  }
}

// --- 原始家庭与稳定归属 --- //

/** 构造显式家庭、独立亲缘兜底组及原始证据索引。 */
function buildModel(graph) {
  const nodes = [...graph.nodes].sort(compareId)
  const edges = [...graph.edges].sort(compareId)
  const people = new Map(nodes.filter(node => node.type === 'person').map(person => [person.id, person]))
  const families = new Map(nodes.filter(node => node.type === 'familyUnit').map(raw => [raw.id, { id: raw.id, raw, partners: new Map(), children: new Map() }]))
  const model = { people, families, edges, groups: new Map(), assignments: new Map(), nodeIds: new Set(nodes.map(node => node.id)), edgeIds: new Set(edges.map(edge => edge.id)) }
  for (const edge of edges) {
    if (people.has(edge.source) && families.has(edge.target)) families.get(edge.target).partners.set(edge.source, edge)
    if (families.has(edge.source) && people.has(edge.target)) families.get(edge.source).children.set(edge.target, edge)
  }
  for (const family of families.values()) {
    model.groups.set('family:' + family.id, { key: 'family:' + family.id, kind: 'family', familyId: family.id, order: family.raw.display_order ?? 0, partners: [...family.partners.keys()], children: new Map([...family.children].map(([id, edge]) => [id, relationKind(edge)])) })
  }
  addIndependentGroups(model)
  assignPeople(model)
  model.facts = collectFacts(model)
  return model
}

/** 按明确生养类型解释家庭子女或直接亲子事实，不把未知类型猜为生育。 */
function relationKind(edge) {
  const kind = edge.metadata?.relationKind || edge.relation
  return Object.hasOwn(KIND_ORDER, kind) ? kind : 'unknown'
}

/** 为无家庭投影的独立亲子和配偶事实创建可解释的归属兜底。 */
function addIndependentGroups(model) {
  const incoming = new Map()
  for (const edge of model.edges) {
    if (!model.people.has(edge.source) || !model.people.has(edge.target)) continue
    if (PARENT_RELATIONS.has(edge.relation)) {
      const kind = relationKind(edge)
      const represented = [...model.families.values()].some(family => family.partners.has(edge.source) && family.children.has(edge.target) && relationKind(family.children.get(edge.target)) === kind)
      if (represented) continue
      const key = JSON.stringify([edge.target, kind])
      if (!incoming.has(key)) incoming.set(key, { child: edge.target, kind, parents: new Set() })
      incoming.get(key).parents.add(edge.source)
    } else if (edge.relation === 'spouse') {
      const partners = [edge.source, edge.target].sort(compareText)
      const represented = [...model.families.values()].some(family => ['marriage', 'partner'].includes(family.raw.family_type) && partners.every(id => family.partners.has(id)))
      if (represented) continue
      const key = 'spouse:' + JSON.stringify(partners)
      model.groups.set(key, { key, kind: 'relationship', familyId: null, order: 0, partners, children: new Map() })
    }
  }
  // 同一组明确父母、同一生养类型的兄弟姐妹共享关系组，避免按每条边拆支系。
  for (const item of incoming.values()) {
    const partners = [...item.parents].sort(compareText)
    const key = 'parents:' + JSON.stringify([item.kind, partners])
    if (!model.groups.has(key)) model.groups.set(key, { key, kind: 'relationship', familyId: null, order: 0, partners, children: new Map() })
    model.groups.get(key).children.set(item.child, item.kind)
  }
}

/** 优先生养来源，再选本人参与的家庭；冲突按明确类型、家庭顺序和稳定ID裁决。 */
function assignPeople(model) {
  for (const personId of model.people.keys()) {
    const candidates = []
    for (const group of model.groups.values()) {
      if (group.children.has(personId)) candidates.push({ group, rank: KIND_ORDER[group.children.get(personId)], reason: 'parentage' })
      else if (group.partners.includes(personId)) candidates.push({ group, rank: 4, reason: 'family-member' })
    }
    candidates.sort((left, right) => left.rank - right.rank || (left.group.kind === 'family' ? 0 : 1) - (right.group.kind === 'family' ? 0 : 1) || left.group.order - right.group.order || compareText(left.group.key, right.group.key))
    if (!candidates.length) {
      const key = 'person:' + personId
      const group = { key, kind: 'person', familyId: null, order: 0, partners: [personId], children: new Map() }
      model.groups.set(key, group)
      candidates.push({ group, reason: 'isolated' })
    }
    model.assignments.set(personId, { group: candidates[0].group, reason: candidates[0].reason })
  }
  const usedIds = new Set(model.nodeIds)
  for (const group of [...new Set([...model.assignments.values()].map(value => value.group))].sort((left, right) => compareText(left.key, right.key))) {
    const base = 'overview-branch:' + encodeURIComponent(group.key)
    group.id = uniqueId(base, usedIds)
  }
}

/** 使用稳定的可重现后缀避开原始人物/家庭ID，不假设数据库ID命名空间。 */
function uniqueId(base, usedIds) {
  let id = base
  let suffix = 1
  while (usedIds.has(id)) id = base + ':' + suffix++
  usedIds.add(id)
  return id
}

// --- 跨支事实与证据 --- //

/** 由真实成员身份派生家庭语义，并保留独立直接事实的原始证据。 */
function collectFacts(model) {
  const facts = []
  for (const family of model.families.values()) {
    const partners = [...family.partners.keys()]
    const children = [...family.children.keys()]
    for (let index = 0; index < partners.length; index += 1) {
      for (const other of partners.slice(index + 1)) {
        const relation = ['marriage', 'partner'].includes(family.raw.family_type) ? 'spouse' : 'family'
        facts.push({ relation, relationKind: null, sourcePersonId: partners[index], targetPersonId: other, familyId: family.id, relationshipIds: [family.partners.get(partners[index]).id, family.partners.get(other).id] })
      }
      for (const child of children) facts.push({ relation: 'parent', relationKind: relationKind(family.children.get(child)), sourcePersonId: partners[index], targetPersonId: child, familyId: family.id, relationshipIds: [family.partners.get(partners[index]).id, family.children.get(child).id] })
    }
    if (!partners.length) {
      for (let index = 0; index < children.length; index += 1) {
        for (const other of children.slice(index + 1)) facts.push({ relation: 'family', relationKind: null, sourcePersonId: children[index], targetPersonId: other, familyId: family.id, relationshipIds: [family.children.get(children[index]).id, family.children.get(other).id] })
      }
    }
  }
  for (const edge of model.edges) {
    if (!model.people.has(edge.source) || !model.people.has(edge.target)) continue
    facts.push({ relation: PARENT_RELATIONS.has(edge.relation) ? 'parent' : edge.relation, relationKind: PARENT_RELATIONS.has(edge.relation) ? relationKind(edge) : null, sourcePersonId: edge.source, targetPersonId: edge.target, familyId: null, relationshipIds: [edge.id] })
  }
  return facts
}

/** 聚合相同方向、语义和生养类型的跨支事实；婚姻和共同家庭使用无向端点。 */
function crossBranchLinks(model) {
  const groups = new Map()
  for (const fact of model.facts) {
    let source = model.assignments.get(fact.sourcePersonId).group.id
    let target = model.assignments.get(fact.targetPersonId).group.id
    if (source === target) continue
    if (['spouse', 'family'].includes(fact.relation) && compareText(source, target) > 0) [source, target] = [target, source]
    const key = JSON.stringify([source, target, fact.relation, fact.relationKind])
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(fact)
  }
  return [...groups.values()].map(facts => makeLink(facts, model)).sort(compareId)
}

/** 生成携带原始家庭、关系与真实端点的摘要连接，不声称摘要是人物。 */
function makeLink(facts, model) {
  const first = facts[0]
  let source = model.assignments.get(first.sourcePersonId).group.id
  let target = model.assignments.get(first.targetPersonId).group.id
  if (['spouse', 'family'].includes(first.relation) && compareText(source, target) > 0) [source, target] = [target, source]
  const familyIds = new Set(facts.map(fact => fact.familyId).filter(Boolean))
  const relationshipIds = new Set(facts.flatMap(fact => fact.relationshipIds))
  return {
    id: uniqueId('overview-link:' + encodeURIComponent(JSON.stringify([source, target, first.relation, first.relationKind])), new Set(model.edgeIds)), source, target,
    relation: first.relation, label: first.relation === 'parent' ? KIND_LABELS[first.relationKind] : first.relation === 'spouse' ? '配偶 / 伴侣' : '共同家庭',
    style: first.relation === 'spouse' ? 'spouse' : ['adoptive', 'step', 'unknown'].includes(first.relationKind) ? 'dashed' : 'solid',
    metadata: {
      branchLink: true, relationKind: first.relationKind,
      familyIds: [...familyIds].sort(compareText), relationshipIds: [...relationshipIds].sort(compareText),
      parentPersonIds: first.relation === 'parent' ? [...new Set(facts.map(fact => fact.sourcePersonId))].sort(compareText) : [],
      childPersonIds: first.relation === 'parent' ? [...new Set(facts.map(fact => fact.targetPersonId))].sort(compareText) : [],
      families: [...model.families.values()].filter(family => familyIds.has(family.id)).map(family => family.raw),
      relationships: model.edges.filter(edge => relationshipIds.has(edge.id)), facts,
      personIds: [...new Set(facts.flatMap(fact => [fact.sourcePersonId, fact.targetPersonId]))].sort(compareText)
    }
  }
}

// --- 摘要DTO与投影端点 --- //

/** 生成供UI、布局及数量验收共同使用的可序列化支系摘要。 */
function publicBranches(model) {
  const branches = new Map()
  for (const [personId, assignment] of model.assignments) {
    const group = assignment.group
    if (!branches.has(group.id)) {
      const names = group.partners.map(id => model.people.get(id).name)
      const title = names.length ? names.slice(0, 2).join(' · ') + (names.length > 2 ? '等' : '') : group.children.size ? '父母未录的家庭' : '独立人物'
      const label = title + (group.kind === 'person' ? ' · 独立档案' : ' · 家庭支系')
      branches.set(group.id, { id: group.id, name: label, title: label, branchKind: group.kind, rootFamilyId: group.familyId, rootPersonIds: [...group.partners], personIds: [], personCount: 0, familyIds: [], assignments: [] })
    }
    const branch = branches.get(group.id)
    branch.personIds.push(personId)
    branch.assignments.push({ personId, reason: assignment.reason, relationKind: group.children.get(personId) || null })
  }
  for (const branch of branches.values()) {
    const people = new Set(branch.personIds)
    branch.personIds.sort(compareText)
    branch.personCount = branch.personIds.length
    branch.previewNames = branch.personIds.slice(0, 5).map(id => model.people.get(id).name)
    branch.familyIds = [...model.families.values()].filter(family => [...family.partners.keys(), ...family.children.keys()].some(id => people.has(id))).map(family => family.id)
    branch.families = branch.familyIds.map(id => model.families.get(id).raw)
    branch.relationships = model.edges.filter(edge => people.has(edge.source) || people.has(edge.target) || branch.familyIds.includes(edge.source) || branch.familyIds.includes(edge.target))
  }
  return { branches: [...branches.values()].sort(compareId), links: crossBranchLinks(model), personBranchIds: Object.fromEntries([...model.assignments].map(([id, assignment]) => [id, assignment.group.id])), totalPersonCount: model.people.size }
}

/** 把折叠人物端点替换为所属摘要，家庭及其他辅助节点保持真实身份。 */
function projectedEndpoint(id, model, expandedPeople) {
  return model.people.has(id) && !expandedPeople.has(id) ? model.assignments.get(id).group.id : id
}

/** 返回某条家庭成员边的真实家庭证据。 */
function familyEvidence(edge, model) {
  return [edge.source, edge.target].filter(id => model.families.has(id)).map(id => model.families.get(id).raw)
}

/** 使用二进制字符串顺序保证不同输入排列得到相同结果。 */
function compareText(left, right) {
  return left < right ? -1 : left > right ? 1 : 0
}

/** 按稳定ID排列节点、关系和支系。 */
function compareId(left, right) {
  return compareText(left.id, right.id)
}
