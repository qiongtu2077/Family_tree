import { describe, expect, it } from 'vitest'
import {
  getFallbackCenterContext,
  getFallbackGraph,
  getFallbackPeople
} from '../api/demoGraphFallback'

describe('demoGraphFallback', () => {
  it('projects branch fallback from one family instead of returning the whole demo graph', () => {
    const graph = getFallbackGraph('branch', 'demo:paternal-great-grandfather', {
      rootType: 'familyUnit',
      rootId: 'demo:unit-paternal-great-grandparents',
      depth: 5
    })
    const personIds = graph.nodes
      .filter(node => node.type === 'person')
      .map(node => node.id)
    const familyIds = graph.nodes
      .filter(node => node.type === 'familyUnit')
      .map(node => node.id)

    expect(personIds.length).toBeLessThan(getFallbackPeople().length)
    expect(personIds).toContain('demo:paternal-great-grandfather')
    expect(personIds).toContain('demo:grandfather')
    expect(personIds).toContain('demo:father')
    expect(personIds).toContain('demo:child')
    expect(personIds).not.toContain('demo:maternal-li-great-grandfather')
    expect(personIds).not.toContain('demo:maternal-li-great-grandmother')
    expect(personIds).not.toContain('demo:wang-grandfather')
    expect(familyIds).toContain('family:demo:unit-paternal-great-grandparents')
    expect(familyIds).not.toContain('family:demo:unit-li-great-grandparents')
  })

  it('keeps spouse origin parents out of branch fallback', () => {
    const graph = getFallbackGraph('branch', 'demo:grandfather', {
      rootType: 'familyUnit',
      rootId: 'demo:unit-grandparents',
      depth: 5
    })
    const personIds = graph.nodes
      .filter(node => node.type === 'person')
      .map(node => node.id)

    expect(personIds).toContain('demo:grandmother')
    expect(personIds).toContain('demo:mother')
    expect(personIds).not.toContain('demo:maternal-li-great-grandfather')
    expect(personIds).not.toContain('demo:maternal-li-great-grandmother')
  })

  it('provides local family options for branch root selection', () => {
    const context = getFallbackCenterContext('demo:paternal-great-grandfather')
    const familyIds = context.available_family_units.map(item => item.family_unit_id)

    expect(context.person.id).toBe('demo:paternal-great-grandfather')
    expect(familyIds).toContain('demo:unit-paternal-great-grandparents')
    expect(context.available_family_units[0].child_count).toBeGreaterThan(0)
  })
})
