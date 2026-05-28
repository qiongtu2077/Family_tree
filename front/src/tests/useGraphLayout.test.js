import { describe, expect, it, vi } from 'vitest'

vi.mock('elkjs/lib/elk.bundled.js', () => ({
  default: class FakeElk {
    async layout(graph) {
      return {
        ...graph,
        children: graph.children.map((node, index) => ({
          ...node,
          x: index * 100,
          y: index * 80
        }))
      }
    }
  }
}))

describe('useGraphLayout', () => {
  it('converts GraphViewDTO to G6 graph data', async () => {
    const { layoutGraph } = await import('../composables/useGraphLayout')
    const data = await layoutGraph({
      nodes: [
        { id: 'p1', type: 'person', name: '父亲', gender: 'M' },
        { id: 'family:f1', type: 'familyUnit', family_type: 'marriage' }
      ],
      edges: [
        {
          id: 'e1',
          source: 'p1',
          target: 'family:f1',
          relation: 'partner',
          label: '伴侣',
          style: 'spouse',
          metadata: {}
        }
      ]
    })

    expect(data.nodes).toHaveLength(2)
    expect(data.nodes[0].label).toContain('父亲')
    expect(data.nodes[1].nodeType).toBe('familyUnit')
    expect(data.edges[0].type).toBe('line')
  })

  it('maps edge styles and person metadata branches', async () => {
    const { layoutGraph } = await import('../composables/useGraphLayout')
    const data = await layoutGraph({
      nodes: [
        {
          id: 'p1',
          type: 'person',
          name: '母亲',
          gender: 'F',
          birth_date: '1950-01-01',
          death_date: '2020-01-01'
        },
        { id: 'p2', type: 'person', name: '孩子', gender: 'U' },
        { id: 'family:f1', type: 'familyUnit', family_type: 'adoptive' }
      ],
      edges: [
        {
          id: 'e-highlight',
          source: 'p1',
          target: 'p2',
          relation: 'mother',
          label: '母亲',
          style: 'highlight',
          metadata: {}
        },
        {
          id: 'e-dashed',
          source: 'family:f1',
          target: 'p2',
          relation: 'adoptive',
          label: '养子女',
          style: 'dashed',
          metadata: {}
        },
        {
          id: 'e-solid',
          source: 'p1',
          target: 'family:f1',
          relation: 'partner',
          label: '',
          style: 'solid',
          metadata: {}
        }
      ]
    })

    expect(data.nodes[0].label).toContain('1950-2020')
    expect(data.nodes[0].style.stroke).toBe('#c75b7a')
    expect(data.edges.find(edge => edge.id === 'e-highlight').style.lineWidth).toBe(4)
    expect(data.edges.find(edge => edge.id === 'e-dashed').style.lineDash).toEqual([6, 5])
    expect(data.edges.find(edge => edge.id === 'e-solid').style.endArrow).toBe(true)
  })
})
