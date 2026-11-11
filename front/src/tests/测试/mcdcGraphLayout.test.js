import { describe, expect, it } from 'vitest'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { layoutGraph } from '../../composables/useGraphLayout'

// --- 测试数据构建 --- //

/**
 * 创建测试人物节点。
 */
function person(id, name, birthDate = '') {
  return {
    id,
    type: 'person',
    name,
    gender: 'U',
    birth_date: birthDate
  }
}

/**
 * 创建测试家庭单元节点。
 */
function family(id) {
  return {
    id: `family:${id}`,
    type: 'familyUnit',
    family_type: 'marriage'
  }
}

/**
 * 创建测试图谱边。
 */
function edge(id, source, target, relation = 'biological') {
  return {
    id,
    source,
    target,
    relation,
    style: relation === 'partner' ? 'spouse' : 'solid'
  }
}

/**
 * 返回基础三口之家图谱。
 */
function baseFamilyGraph(viewMode = 'mainline') {
  return {
    view_mode: viewMode,
    center_person_id: 'child',
    nodes: [
      person('father', '父亲', '1970-01-01'),
      person('mother', '母亲', '1972-01-01'),
      person('child', '孩子', '2000-01-01'),
      family('core')
    ],
    edges: [
      edge('p1', 'father', 'family:core', 'partner'),
      edge('p2', 'mother', 'family:core', 'partner'),
      edge('c1', 'family:core', 'child', 'biological')
    ]
  }
}

/**
 * 生成可以直接查看的 SVG 预览 HTML。
 */
function createPreviewHtml(layout) {
  const nodeRects = layout.nodes
    .filter(node => node.nodeType === 'person' || node.nodeType === 'branchCapsule')
    .map(node => {
      const [width, height] = node.size || [118, 46]
      const fill = node.nodeType === 'branchCapsule' ? 'rgba(212, 175, 55, 0.18)' : 'rgba(24, 24, 20, 0.94)'
      return `
        <g>
          <rect x="${node.x - width / 2}" y="${node.y - height / 2}" width="${width}" height="${height}" rx="7" fill="${fill}" stroke="rgba(255,238,137,0.72)" />
          <text x="${node.x}" y="${node.y + 5}" text-anchor="middle" fill="#fff8d6" font-size="14" font-weight="700">${node.label}</text>
        </g>`
    })
    .join('\n')
  const nodeMap = new Map(layout.nodes.map(node => [node.id, node]))
  const lines = layout.edges
    .map(item => {
      const source = nodeMap.get(item.source)
      const target = nodeMap.get(item.target)
      if (!source || !target) return ''
      return `<line x1="${source.x}" y1="${source.y}" x2="${target.x}" y2="${target.y}" stroke="rgba(224,211,157,0.72)" stroke-width="${item.relation === 'spouse' ? 2 : 1.8}" />`
    })
    .join('\n')

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <title>图谱布局测试预览</title>
  <style>
    body { margin: 0; background: #10100e; color: #fff8d6; font-family: Arial, "Microsoft YaHei", sans-serif; }
    header { padding: 16px 20px; border-bottom: 1px solid rgba(255,238,137,0.18); }
    svg { display: block; width: 100vw; height: calc(100vh - 58px); background-image: linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px); background-size: 28px 28px; }
  </style>
</head>
<body>
  <header>图谱布局测试预览：人物节点、配偶线、亲子线、折叠胶囊</header>
  <svg viewBox="-360 -80 900 520" role="img" aria-label="图谱布局测试预览">
    ${lines}
    ${nodeRects}
  </svg>
</body>
</html>`
}

/**
 * 把布局预览写入测试 artifacts 目录。
 */
function writePreviewArtifact(html) {
  const targetPath = fileURLToPath(new URL('./artifacts/graph-layout-preview.html', import.meta.url))
  mkdirSync(dirname(targetPath), { recursive: true })
  writeFileSync(targetPath, html, 'utf8')
  return targetPath
}

// --- MC/DC 布局测试 --- //

describe('MC/DC graph layout decisions', () => {
  it('D-L1 lets overview independently switch away from formal genealogy lines', async () => {
    const mainline = await layoutGraph(baseFamilyGraph('mainline'))
    const overview = await layoutGraph(baseFamilyGraph('overview'))

    expect(mainline.edges.some(item => item.relation === 'child')).toBe(true)
    expect(mainline.edges.some(item => item.type === 'polyline')).toBe(false)
    expect(overview.nodes.filter(node => node.nodeType === 'person')).toHaveLength(3)
    expect(overview.edges).toHaveLength(0)
  })

  it('D-L2 requires complete inlaw context before using spouse-origin layout', async () => {
    const complete = await layoutGraph({
      view_mode: 'inlaw',
      center_person_id: 'center',
      view_context: {
        center_person_id: 'center',
        spouse_id: 'spouse',
        family_unit_id: 'marriage'
      },
      nodes: [
        person('center', '本家人物'),
        person('spouse-father', '配偶父亲'),
        person('spouse', '配偶'),
        person('child', '共同子女'),
        family('origin'),
        family('marriage')
      ],
      edges: [
        edge('e1', 'spouse-father', 'family:origin', 'partner'),
        edge('e2', 'family:origin', 'spouse', 'biological'),
        edge('e3', 'center', 'family:marriage', 'partner'),
        edge('e4', 'spouse', 'family:marriage', 'partner'),
        edge('e5', 'family:marriage', 'child', 'biological')
      ]
    })
    const missingSpouse = await layoutGraph({
      view_mode: 'inlaw',
      center_person_id: 'center',
      view_context: { center_person_id: 'center' },
      nodes: [person('center', '本家人物')],
      edges: []
    })

    const center = complete.nodes.find(node => node.id === 'center')
    const spouse = complete.nodes.find(node => node.id === 'spouse')
    const spouseFather = complete.nodes.find(node => node.id === 'spouse-father')

    expect(center.y).toBe(spouse.y)
    expect(spouseFather.y).toBeLessThan(spouse.y)
    expect(missingSpouse.nodes.find(node => node.id === 'center')).toBeTruthy()
  })

  it('D-L3 lets bridge view_context family id choose the marriage bridge', async () => {
    const data = await layoutGraph({
      view_mode: 'bridge',
      center_person_id: 'husband',
      view_context: { family_unit_id: 'selected' },
      nodes: [
        person('husband', '丈夫'),
        person('wife', '妻子'),
        person('other', '其他人'),
        person('other-spouse', '其他配偶'),
        person('child', '孩子'),
        family('other'),
        family('selected')
      ],
      edges: [
        edge('e1', 'other', 'family:other', 'partner'),
        edge('e2', 'other-spouse', 'family:other', 'partner'),
        edge('e3', 'husband', 'family:selected', 'partner'),
        edge('e4', 'wife', 'family:selected', 'partner'),
        edge('e5', 'family:selected', 'child', 'biological')
      ]
    })

    const personIds = data.nodes.filter(node => node.nodeType === 'person').map(node => node.id)
    const husband = data.nodes.find(node => node.id === 'husband')
    const wife = data.nodes.find(node => node.id === 'wife')
    const child = data.nodes.find(node => node.id === 'child')

    expect(personIds).toContain('husband')
    expect(personIds).toContain('wife')
    expect(personIds).not.toContain('other')
    expect(husband.y).toBe(wife.y)
    expect(child.y).toBeGreaterThan(husband.y)
  })

  it('D-L4 creates direct-parent fallback only when no FamilyUnit owns the child', async () => {
    const directOnly = await layoutGraph({
      view_mode: 'mainline',
      nodes: [person('father', '父亲'), person('child', '孩子')],
      edges: [edge('direct', 'father', 'child', 'father')]
    })
    const explicitFamily = await layoutGraph({
      view_mode: 'mainline',
      nodes: [person('father', '父亲'), person('child', '孩子'), family('core')],
      edges: [
        edge('p1', 'father', 'family:core', 'partner'),
        edge('c1', 'family:core', 'child', 'biological'),
        edge('direct', 'father', 'child', 'father')
      ]
    })

    expect(directOnly.edges.some(item => item.id.includes('direct:father:child'))).toBe(true)
    expect(explicitFamily.edges.some(item => item.id.includes('direct:father:child'))).toBe(false)
    expect(explicitFamily.edges.filter(item => item.segment === 'parent-stem')).toHaveLength(1)
  })

  it('D-L5 makes sibling bus depend only on child count', async () => {
    const singleChild = await layoutGraph(baseFamilyGraph('branch'))
    const twoChildren = await layoutGraph({
      ...baseFamilyGraph('branch'),
      nodes: [
        ...baseFamilyGraph('branch').nodes,
        person('second-child', '二孩', '2002-01-01')
      ],
      edges: [
        ...baseFamilyGraph('branch').edges,
        edge('c2', 'family:core', 'second-child', 'biological')
      ]
    })

    expect(singleChild.edges.some(item => item.segment === 'sibling-bus')).toBe(false)
    expect(twoChildren.edges.some(item => item.segment === 'sibling-bus')).toBe(true)
  })

  it('D-L6 renders branch capsules as visible semantic entries and writes a graph preview', async () => {
    const layout = await layoutGraph({
      ...baseFamilyGraph('mainline'),
      nodes: [
        ...baseFamilyGraph('mainline').nodes,
        {
          id: 'capsule:remote',
          type: 'branchCapsule',
          title: '旁支家庭 · 6 人',
          target_view: 'branch',
          person_count: 6
        }
      ]
    })
    const capsule = layout.nodes.find(node => node.nodeType === 'branchCapsule')
    const previewPath = writePreviewArtifact(createPreviewHtml(layout))

    expect(capsule.label).toBe('旁支家庭 · 6 人')
    expect(layout.edges.every(item => item.source !== capsule.id && item.target !== capsule.id)).toBe(true)
    expect(previewPath.endsWith('graph-layout-preview.html')).toBe(true)
  })
})
