import { describe, expect, it } from 'vitest'
import { layoutGraph } from '../composables/useGraphLayout'

describe('useGraphLayout', () => {
  it('projects graph units into visible person-only genealogy nodes', async () => {
    const data = await layoutGraph({
      nodes: [
        { id: 'father', type: 'person', name: '父亲', gender: 'M', birth_date: '1970-01-01' },
        { id: 'mother', type: 'person', name: '母亲', gender: 'F', birth_date: '1972-01-01' },
        { id: 'child', type: 'person', name: '孩子', gender: 'U', birth_date: '2000-01-01' },
        { id: 'family:f1', type: 'familyUnit', family_type: 'marriage' }
      ],
      edges: [
        { id: 'e1', source: 'father', target: 'family:f1', relation: 'partner', style: 'spouse' },
        { id: 'e2', source: 'mother', target: 'family:f1', relation: 'partner', style: 'spouse' },
        { id: 'e3', source: 'family:f1', target: 'child', relation: 'biological', style: 'solid' }
      ]
    })

    const visibleNodes = data.nodes.filter(node => node.nodeType === 'person')
    const anchorNodes = data.nodes.filter(node => node.nodeType === 'anchor')

    expect(visibleNodes.map(node => node.id)).toEqual(['father', 'mother', 'child'])
    expect(anchorNodes.length).toBeGreaterThan(1)
    expect(anchorNodes.every(node => node.style.opacity === 0)).toBe(true)
    expect(data.nodes.find(node => node.id === 'father').label).toBe('父亲')
    expect(data.nodes.find(node => node.id === 'father').label).not.toContain('1970')
    expect(data.nodes.find(node => node.id === 'father').style.stroke).not.toBe('#ff3b42')
    expect(data.edges.find(edge => edge.relation === 'spouse').type).toBe('line')
    expect(data.edges.filter(edge => edge.relation === 'child').every(edge => edge.type === 'line')).toBe(true)
    expect(data.edges.some(edge => edge.type === 'polyline')).toBe(false)
    expect(data.edges.some(edge => edge.style.stroke === '#00a6ff')).toBe(false)
  })

  it('keeps descendants below parents and maps direct parent edges', async () => {
    const data = await layoutGraph({
      nodes: [
        { id: 'parent', type: 'person', name: '父辈', gender: 'M' },
        { id: 'child', type: 'person', name: '子女', gender: 'F' }
      ],
      edges: [
        { id: 'e-parent', source: 'parent', target: 'child', relation: 'father', style: 'solid' }
      ]
    })

    const parent = data.nodes.find(node => node.id === 'parent')
    const child = data.nodes.find(node => node.id === 'child')
    const childEdge = data.edges.find(edge => edge.relation === 'child')

    expect(data.nodes.filter(node => node.nodeType === 'person')).toHaveLength(2)
    expect(child.y).toBeGreaterThan(parent.y)
    expect(childEdge.segment).toBe('parent-stem')
    expect(childEdge.type).toBe('line')
    expect(childEdge.style.stroke).toBe('rgba(224, 211, 157, 0.72)')
    expect(childEdge.style.endArrow).toBe(false)
  })

  it('aligns a married child under the parent family line', async () => {
    const data = await layoutGraph({
      nodes: [
        { id: 'grandfather', type: 'person', name: '爷爷' },
        { id: 'grandmother', type: 'person', name: '奶奶' },
        { id: 'father', type: 'person', name: '父亲' },
        { id: 'mother', type: 'person', name: '母亲' },
        { id: 'child', type: 'person', name: '孩子' },
        { id: 'family:grandparents', type: 'familyUnit' },
        { id: 'family:parents', type: 'familyUnit' }
      ],
      edges: [
        { id: 'e1', source: 'grandfather', target: 'family:grandparents', relation: 'partner' },
        { id: 'e2', source: 'grandmother', target: 'family:grandparents', relation: 'partner' },
        { id: 'e3', source: 'family:grandparents', target: 'father', relation: 'biological' },
        { id: 'e4', source: 'father', target: 'family:parents', relation: 'partner' },
        { id: 'e5', source: 'mother', target: 'family:parents', relation: 'partner' },
        { id: 'e6', source: 'family:parents', target: 'child', relation: 'biological' }
      ]
    })

    const father = data.nodes.find(node => node.id === 'father')
    const parentStemEnd = data.nodes.find(node => node.id === 'child:family:grandparents:parent-stem:end')
    const childEdges = data.edges.filter(edge => edge.relation === 'child')

    expect(parentStemEnd.x).toBe(father.x)
    expect(childEdges.every(edge => edge.type === 'line')).toBe(true)
    expect(data.edges.some(edge => edge.type === 'polyline')).toBe(false)
  })

  it('uses independent overview layout and keeps every person visible', async () => {
    const personNodes = Array.from({ length: 44 }, (_, index) => ({
      id: `p${index + 1}`,
      type: 'person',
      name: `人物${index + 1}`,
      gender: 'U',
      birth_date: `19${String(index + 1).padStart(2, '0')}-01-01`
    }))
    const familyNodes = [
      { id: 'family:f1', type: 'familyUnit', family_type: 'marriage' },
      { id: 'family:f2', type: 'familyUnit', family_type: 'marriage' }
    ]
    const data = await layoutGraph({
      view_mode: 'overview',
      nodes: [...personNodes, ...familyNodes],
      edges: [
        { id: 'e1', source: 'p1', target: 'family:f1', relation: 'partner' },
        { id: 'e2', source: 'p2', target: 'family:f1', relation: 'partner' },
        { id: 'e3', source: 'family:f1', target: 'p3', relation: 'biological' },
        { id: 'e4', source: 'p3', target: 'family:f2', relation: 'partner' },
        { id: 'e5', source: 'p4', target: 'family:f2', relation: 'partner' },
        { id: 'e6', source: 'family:f2', target: 'p5', relation: 'biological' }
      ]
    })

    const visiblePersons = data.nodes.filter(node => node.nodeType === 'person')
    const familyUnitNodes = data.nodes.filter(node => node.nodeType === 'familyUnit')

    expect(visiblePersons).toHaveLength(44)
    expect(familyUnitNodes).toHaveLength(0)
    expect(visiblePersons.every(node => node.label.startsWith('人物'))).toBe(true)
    expect(data.edges).toHaveLength(0)
    expect(data.edges.some(edge => edge.type === 'polyline')).toBe(false)
    expect(data.edges.some(edge => edge.style.stroke === '#00a6ff')).toBe(false)
  })

  it('keeps a single child connection as one vertical line without a fake bus', async () => {
    const data = await layoutGraph({
      view_mode: 'branch',
      nodes: [
        { id: 'father', type: 'person', name: '父亲' },
        { id: 'mother', type: 'person', name: '母亲' },
        { id: 'child', type: 'person', name: '孩子' },
        { id: 'family:f1', type: 'familyUnit' }
      ],
      edges: [
        { id: 'e1', source: 'father', target: 'family:f1', relation: 'partner' },
        { id: 'e2', source: 'mother', target: 'family:f1', relation: 'partner' },
        { id: 'e3', source: 'family:f1', target: 'child', relation: 'biological' }
      ]
    })

    const childEdges = data.edges.filter(edge => edge.relation === 'child')

    expect(childEdges).toHaveLength(1)
    expect(childEdges[0].segment).toBe('parent-stem')
    expect(childEdges.some(edge => edge.segment === 'sibling-bus')).toBe(false)
    expect(childEdges.every(edge => edge.type === 'line')).toBe(true)

    const spouse = data.nodes.find(node => node.id === 'father')
    const parentStemStart = data.nodes.find(node => node.id === 'child:family:f1:parent-stem:start')
    expect(parentStemStart.y).toBe(spouse.y)
  })

  it('uses the center person as the bridge marriage anchor', async () => {
    const data = await layoutGraph({
      view_mode: 'bridge',
      center_person_id: 'husband',
      nodes: [
        { id: 'husband', type: 'person', name: '丈夫' },
        { id: 'wife', type: 'person', name: '妻子' },
        { id: 'child', type: 'person', name: '孩子' },
        { id: 'family:f1', type: 'familyUnit' }
      ],
      edges: [
        { id: 'e1', source: 'husband', target: 'family:f1', relation: 'partner' },
        { id: 'e2', source: 'wife', target: 'family:f1', relation: 'partner' },
        { id: 'e3', source: 'family:f1', target: 'child', relation: 'biological' }
      ]
    })

    const husband = data.nodes.find(node => node.id === 'husband')
    const wife = data.nodes.find(node => node.id === 'wife')
    const child = data.nodes.find(node => node.id === 'child')

    expect(husband.y).toBe(wife.y)
    expect(child.y).toBeGreaterThan(husband.y)
    expect(data.edges.some(edge => edge.type === 'polyline')).toBe(false)
  })

  it('keeps bridge view as a compact marriage bridge without ancestor spillover', async () => {
    const data = await layoutGraph({
      view_mode: 'bridge',
      center_person_id: 'husband',
      nodes: [
        { id: 'husband-grandfather', type: 'person', name: '夫祖父' },
        { id: 'husband-grandmother', type: 'person', name: '夫祖母' },
        { id: 'husband-father', type: 'person', name: '夫父' },
        { id: 'husband-mother', type: 'person', name: '夫母' },
        { id: 'husband', type: 'person', name: '丈夫' },
        { id: 'husband-sibling', type: 'person', name: '夫同胞' },
        { id: 'wife-father', type: 'person', name: '妻父' },
        { id: 'wife-mother', type: 'person', name: '妻母' },
        { id: 'wife', type: 'person', name: '妻子' },
        { id: 'wife-sibling', type: 'person', name: '妻同胞' },
        { id: 'child', type: 'person', name: '孩子' },
        { id: 'family:husband-grandparents', type: 'familyUnit' },
        { id: 'family:husband-origin', type: 'familyUnit' },
        { id: 'family:wife-origin', type: 'familyUnit' },
        { id: 'family:marriage', type: 'familyUnit' }
      ],
      edges: [
        { id: 'e1', source: 'husband-grandfather', target: 'family:husband-grandparents', relation: 'partner' },
        { id: 'e2', source: 'husband-grandmother', target: 'family:husband-grandparents', relation: 'partner' },
        { id: 'e3', source: 'family:husband-grandparents', target: 'husband-father', relation: 'biological' },
        { id: 'e4', source: 'husband-father', target: 'family:husband-origin', relation: 'partner' },
        { id: 'e5', source: 'husband-mother', target: 'family:husband-origin', relation: 'partner' },
        { id: 'e6', source: 'family:husband-origin', target: 'husband', relation: 'biological' },
        { id: 'e7', source: 'family:husband-origin', target: 'husband-sibling', relation: 'biological' },
        { id: 'e8', source: 'wife-father', target: 'family:wife-origin', relation: 'partner' },
        { id: 'e9', source: 'wife-mother', target: 'family:wife-origin', relation: 'partner' },
        { id: 'e10', source: 'family:wife-origin', target: 'wife', relation: 'biological' },
        { id: 'e11', source: 'family:wife-origin', target: 'wife-sibling', relation: 'biological' },
        { id: 'e12', source: 'husband', target: 'family:marriage', relation: 'partner' },
        { id: 'e13', source: 'wife', target: 'family:marriage', relation: 'partner' },
        { id: 'e14', source: 'family:marriage', target: 'child', relation: 'biological' }
      ]
    })

    const personIds = data.nodes
      .filter(node => node.nodeType === 'person')
      .map(node => node.id)
    const husband = data.nodes.find(node => node.id === 'husband')
    const wife = data.nodes.find(node => node.id === 'wife')
    const child = data.nodes.find(node => node.id === 'child')
    const husbandSibling = data.nodes.find(node => node.id === 'husband-sibling')
    const wifeSibling = data.nodes.find(node => node.id === 'wife-sibling')

    expect(personIds).not.toContain('husband-grandfather')
    expect(personIds).not.toContain('husband-grandmother')
    expect(husband.x).toBeLessThan(wife.x)
    expect(child.x).toBe((husband.x + wife.x) / 2)
    expect(child.y).toBeGreaterThan(husband.y)
    expect(husbandSibling.x).toBeLessThan(husband.x)
    expect(wifeSibling.x).toBeGreaterThan(wife.x)
    expect(data.edges.some(edge => edge.type === 'polyline')).toBe(false)
  })

  it('folds unrelated formal-view people into a branch capsule instead of drawing orphans', async () => {
    const data = await layoutGraph({
      view_mode: 'mainline',
      center_person_id: 'child',
      nodes: [
        { id: 'father', type: 'person', name: '父亲' },
        { id: 'mother', type: 'person', name: '母亲' },
        { id: 'child', type: 'person', name: '孩子' },
        { id: 'remote', type: 'person', name: '远房旁支' },
        { id: 'family:f1', type: 'familyUnit' }
      ],
      edges: [
        { id: 'e1', source: 'father', target: 'family:f1', relation: 'partner' },
        { id: 'e2', source: 'mother', target: 'family:f1', relation: 'partner' },
        { id: 'e3', source: 'family:f1', target: 'child', relation: 'biological' }
      ]
    })

    const personIds = data.nodes
      .filter(node => node.nodeType === 'person')
      .map(node => node.id)
    const capsule = data.nodes.find(node => node.nodeType === 'branchCapsule')

    expect(personIds).toEqual(['child', 'father', 'mother'])
    expect(personIds).not.toContain('remote')
    expect(capsule.label).toContain('已折叠旁支')
  })
})
