/** 把支系摘要和阅读方向转换为同一份可验证的二维渲染数据。 */
import { createFamilyLayout } from './familyLayout.js'

// --- 支系摘要的布局代理 --- //

/** 以明确的摘要顶点参与排布，输出时恢复摘要身份及其真实关系证据。 */
export function createGraphPresentation(graph, { direction = 'vertical' } = {}) {
  const summaries = new Map(graph.nodes.filter(node => node.type === 'branchSummary').map(node => [node.id, node]))
  const proxyRelations = new Map()
  const centerId = graph.view_context?.center_person_id || graph.center_person_id
  const centerSummary = [...summaries.values()].find(node => node.personIds.includes(centerId))
  const normalized = normalizeSummaryFamilies(graph, summaries)
  const nodes = normalized.nodes.map(node => node.type === 'branchSummary' ? { id: node.id, type: 'person', name: node.title, gender: 'U' } : node)
  const usedIds = new Set(graph.nodes.map(node => node.id))
  const edges = []
  for (const edge of normalized.edges) {
    if (!edge.metadata?.branchLink) { edges.push(edge); continue }
    let familyId = 'presentation:branch-link:' + edge.id
    while (usedIds.has(familyId)) familyId += ':proxy'
    usedIds.add(familyId)
    proxyRelations.set(familyId, edge)
    // 每类摘要事实独占一个布局代理家庭，避免同一端点的婚姻与共同育儿相互覆盖。
    nodes.push({ id: familyId, type: 'familyUnit', family_type: edge.relation === 'parent' ? 'single_parent' : edge.relation === 'spouse' ? 'marriage' : 'unknown_parent' })
    edges.push({ id: familyId + ':source', source: edge.source, target: familyId, relation: 'partner', metadata: edge.metadata })
    edges.push(edge.relation === 'parent'
      ? { id: familyId + ':target', source: familyId, target: edge.target, relation: edge.metadata.relationKind || 'unknown', style: edge.style, metadata: edge.metadata }
      : { id: familyId + ':target', source: edge.target, target: familyId, relation: 'partner', metadata: edge.metadata })
  }
  const prepared = {
    ...graph,
    center_person_id: centerSummary?.id || centerId,
    view_context: { ...graph.view_context, center_person_id: centerSummary?.id || centerId },
    nodes, edges
  }
  const layout = createFamilyLayout(prepared)
  layout.nodes = layout.nodes.map(node => {
    const summary = summaries.get(node.id)
    if (!summary) {
      if (!graph.paternal_context?.core_person_ids.includes(node.id)) return node
      return { ...node, isPaternalCore: true, style: { ...node.style, stroke: '#2d6a54', lineWidth: 2 } }
    }
    const title = summary.title.replace(/ · (家庭支系|独立档案)$/u, '')
    const characters = Array.from(title)
    return {
      ...node, nodeType: 'branchSummary', raw: summary,
      label: (characters.length > 10 ? characters.slice(0, 9).join('') + '…' : title) + '\n' + summary.personCount + ' 位 · 点击展开',
      style: { ...node.style, fill: '#edf3e9', stroke: node.isCenter ? '#2d6a54' : '#afc3b0', lineDash: [5, 3], radius: 10 },
      labelCfg: { style: { fill: '#294e3b', fontSize: 12, fontWeight: 500, lineHeight: 18 } }
    }
  })
  layout.edges = layout.edges.map(edge => {
    const original = proxyRelations.get(edge.familyId)
    if (!original) return edge
    return {
      ...edge, relation: 'branchLink', originalRelation: original.relation, raw: original,
      metadata: original.metadata,
      style: { ...edge.style, stroke: original.relation === 'spouse' ? '#b88753' : '#8b9e94', ...(original.relation === 'family' ? { lineDash: [3, 4] } : {}) }
    }
  })
  return orientLayout(layout, direction)
}

/** 对含摘要端点的家庭逐条保留真实成员事实，避免摘要被误当作同一个父母和子女。 */
function normalizeSummaryFamilies(graph, summaries) {
  if (!summaries.size) return graph
  const families = new Map(graph.nodes.filter(node => node.type === 'familyUnit').map(node => [node.id, { node, partners: [], children: [] }]))
  for (const edge of graph.edges) {
    if (families.has(edge.target)) families.get(edge.target).partners.push({ edge, visibleId: edge.source, personId: edge.metadata?.overview?.originalSource || edge.source, collapsed: summaries.has(edge.source) })
    if (families.has(edge.source)) families.get(edge.source).children.push({ edge, visibleId: edge.target, personId: edge.metadata?.overview?.originalTarget || edge.target, collapsed: summaries.has(edge.target) })
  }
  const partial = new Set([...families].filter(([, family]) => [...family.partners, ...family.children].some(member => summaries.has(member.visibleId))).map(([id]) => id))
  const nodes = graph.nodes.filter(node => !partial.has(node.id))
  const edges = graph.edges.filter(edge => !partial.has(edge.source) && !partial.has(edge.target)).map(mappedDirectFact)
  const usedEdgeIds = new Set(graph.edges.map(edge => edge.id))
  for (const id of [...partial].sort()) {
    const family = families.get(id)
    const relation = ['marriage', 'partner'].includes(family.node.family_type) ? 'spouse' : 'family'
    for (let index = 0; index < family.partners.length; index += 1) {
      const partner = family.partners[index]
      for (const other of family.partners.slice(index + 1)) {
        const fact = familyFact(family.node, partner, other, relation, usedEdgeIds)
        if (fact) edges.push(fact)
      }
      for (const child of family.children) {
        const fact = familyFact(family.node, partner, child, 'parent', usedEdgeIds)
        if (fact) edges.push(fact)
      }
    }
    if (!family.partners.length) {
      for (let index = 0; index < family.children.length; index += 1) {
        for (const other of family.children.slice(index + 1)) {
          const fact = familyFact(family.node, family.children[index], other, 'family', usedEdgeIds)
          if (fact) edges.push(fact)
        }
      }
    }
  }
  return { nodes, edges }
}

/** 将跨可视顶点的家庭事实独立代理；同摘要内部事实已保存在摘要证据中，不制造外部自环。 */
function familyFact(family, start, end, relation, usedIds) {
  if (start.visibleId === end.visibleId && start.collapsed) return null
  const recordedKind = end.edge.metadata?.relationKind || end.edge.relation
  const relationKind = relation === 'parent' ? ['biological', 'adoptive', 'step', 'unknown'].includes(recordedKind) ? recordedKind : 'unknown' : null
  const records = new Map()
  for (const member of [start, end]) {
    for (const record of member.edge.metadata?.overview?.relationships || [member.edge]) records.set(record.id, record)
  }
  const relationships = [...records.values()]
  const base = 'presentation:family-fact:' + JSON.stringify([family.id, start.edge.id, end.edge.id, relation])
  let id = base
  while (usedIds.has(id)) id += ':fact'
  usedIds.add(id)
  return {
    id, source: start.visibleId, target: end.visibleId, relation,
    label: relation === 'parent' ? end.edge.label || '亲子' : relation === 'spouse' ? '配偶 / 伴侣' : '共同家庭',
    style: relation === 'parent' ? end.edge.style : relation === 'spouse' ? 'spouse' : 'solid',
    metadata: {
      branchLink: true, relationKind, familyIds: [family.id], families: [family], relationships,
      relationshipIds: relationships.map(record => record.id), personIds: [start.personId, end.personId],
      parentPersonIds: relation === 'parent' ? [start.personId] : [], childPersonIds: relation === 'parent' ? [end.personId] : [],
      facts: [{ relation, relationKind, sourcePersonId: start.personId, targetPersonId: end.personId, familyId: family.id, relationshipIds: relationships.map(record => record.id) }]
    }
  }
}

/** 保留映射到摘要的直接父母或配偶事实，避免被家庭代理按同一可视端点吞并。 */
function mappedDirectFact(edge) {
  if (edge.metadata?.branchLink || !edge.metadata?.overview || !['father', 'mother', 'parent', 'spouse'].includes(edge.relation)) return edge
  const evidence = edge.metadata.overview
  const relation = edge.relation === 'spouse' ? 'spouse' : 'parent'
  return {
    ...edge, relation,
    metadata: {
      ...edge.metadata, branchLink: true,
      relationKind: relation === 'parent' ? edge.metadata.relationKind || 'unknown' : null,
      relationships: evidence.relationships, relationshipIds: evidence.relationships.map(record => record.id),
      families: evidence.families, familyIds: evidence.families.map(family => family.id),
      personIds: [evidence.originalSource, evidence.originalTarget],
      parentPersonIds: relation === 'parent' ? [evidence.originalSource] : [],
      childPersonIds: relation === 'parent' ? [evidence.originalTarget] : []
    }
  }
}

// --- 世代方向变换 --- //

/** 交换世代轴并按卡片长宽比缩放，保持姓名正向、人物140×52和连线端点吻合。 */
export function orientLayout(layout, direction) {
  if (direction === 'vertical') return { ...layout, direction }
  if (direction !== 'horizontal') throw new Error('不支持的家谱阅读方向：' + direction)
  const scaleX = 140 / 52
  const scaleY = 52 / 140
  const point = ({ x, y }) => ({ x: y * scaleX, y: x * scaleY })
  return {
    ...layout, direction,
    nodes: layout.nodes.map(node => {
      const size = Array.isArray(node.size) ? node.size : [node.size || 1, node.size || 1]
      const result = { ...node, ...point(node), size: [size[1] * scaleX, size[0] * scaleY] }
      if (node.nodeType === 'branchCapsule') result.label = Array.from(node.label).reduce((text, character, index) => text + (index && index % 8 === 0 ? '\n' : '') + character, '')
      return result
    }),
    crossings: (layout.crossings || []).map(crossing => ({ ...crossing, ...point(crossing) })),
    clusters: (layout.clusters || []).map(cluster => ({ ...cluster, ...point(cluster), width: cluster.height * scaleX, height: cluster.width * scaleY }))
  }
}
