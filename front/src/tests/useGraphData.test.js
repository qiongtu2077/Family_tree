import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useGraphData } from '../composables/useGraphData'
import { getFocusGraph, getGraphIssues, getRelationPath } from '../api/graph'
import { getPersons, searchPersons } from '../api/persons'

vi.mock('../api/graph', () => ({
  getFocusGraph: vi.fn(),
  getGraphIssues: vi.fn(),
  getRelationPath: vi.fn()
}))

vi.mock('../api/persons', () => ({
  getPersons: vi.fn(),
  searchPersons: vi.fn()
}))

describe('useGraphData', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('loads people and stores them', async () => {
    getPersons.mockResolvedValue([{ id: 'p1', name: '张三' }])
    const data = useGraphData()

    const people = await data.loadPeople()

    expect(people).toEqual([{ id: 'p1', name: '张三' }])
    expect(data.people.value).toHaveLength(1)
    expect(getPersons).toHaveBeenCalledWith(0, 1000)
  })

  it('does not search with an empty keyword', async () => {
    const data = useGraphData()

    const result = await data.searchPeople('   ')

    expect(result).toEqual([])
    expect(searchPersons).not.toHaveBeenCalled()
  })

  it('loads focus graph and updates derived state', async () => {
    getFocusGraph.mockResolvedValue({
      center_person_id: 'p1',
      nodes: [
        { id: 'p1', type: 'person', name: '张三' },
        { id: 'family:f1', type: 'familyUnit' }
      ],
      edges: [],
      warnings: []
    })
    const data = useGraphData()

    await data.loadFocusGraph('p1', 4)

    expect(data.centerPersonId.value).toBe('p1')
    expect(data.personNodes.value).toHaveLength(1)
    expect(data.familyUnitNodes.value).toHaveLength(1)
    expect(data.isLoading.value).toBe(false)
  })

  it('stores error message when focus graph fails', async () => {
    getFocusGraph.mockRejectedValue({
      response: { data: { detail: '人物不存在' } }
    })
    const data = useGraphData()

    await expect(data.loadFocusGraph('missing')).rejects.toBeTruthy()

    expect(data.errorMessage.value).toBe('人物不存在')
    expect(data.isLoading.value).toBe(false)
  })

  it('loads relation path and admin issues', async () => {
    getRelationPath.mockResolvedValue({ relation_text: '父亲' })
    getGraphIssues.mockResolvedValue([{ person_id: 'p1', issue_type: 'isolated' }])
    const data = useGraphData()

    const relation = await data.loadRelationPath('p1', 'p2')
    const issues = await data.loadIssues()

    expect(relation.relation_text).toBe('父亲')
    expect(issues).toHaveLength(1)
    expect(data.relationPath.value).toEqual(relation)
  })
})
