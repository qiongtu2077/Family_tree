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
    expect(data.edges.some(edge => edge.type === 'polyline')).toBe(false)
    expect(data.edges.some(edge => edge.style.stroke === '#00a6ff')).toBe(false)
  })
})
