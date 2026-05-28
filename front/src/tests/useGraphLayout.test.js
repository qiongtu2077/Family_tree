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
    expect(anchorNodes).toHaveLength(1)
    expect(anchorNodes[0].style.opacity).toBe(0)
    expect(data.nodes.find(node => node.id === 'father').label).toBe('父亲')
    expect(data.nodes.find(node => node.id === 'father').label).not.toContain('1970')
    expect(data.edges.find(edge => edge.relation === 'spouse').type).toBe('line')
    expect(data.edges.find(edge => edge.relation === 'child').type).toBe('polyline')
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
    expect(childEdge.source).toContain('anchor:')
    expect(childEdge.style.stroke).toBe('#00a6ff')
    expect(childEdge.style.endArrow).toBe(false)
  })
})
