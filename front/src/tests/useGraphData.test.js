import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useGraphData } from '../composables/useGraphData'
import {
  getBranchGraph,
  getBranchGraphByRoot,
  getBridgeGraph,
  getFocusGraph,
  getGraphIssues,
  getInlawGraph,
  getMainlineGraph,
  getOverviewGraph,
  getRelationPath
} from '../api/graph'
import { getPersons, searchPersons } from '../api/persons'

vi.mock('../api/graph', () => ({
  getBranchGraph: vi.fn(),
  getBranchGraphByRoot: vi.fn(),
  getBridgeGraph: vi.fn(),
  getFocusGraph: vi.fn(),
  getGraphIssues: vi.fn(),
  getInlawGraph: vi.fn(),
  getMainlineGraph: vi.fn(),
  getOverviewGraph: vi.fn(),
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

  it('loads all five formal graph views with dedicated APIs', async () => {
    getMainlineGraph.mockResolvedValue({ view_mode: 'mainline', center_person_id: 'p1', nodes: [], edges: [] })
    getInlawGraph.mockResolvedValue({ view_mode: 'inlaw', center_person_id: 'p2', nodes: [], edges: [] })
    getBridgeGraph.mockResolvedValue({ view_mode: 'bridge', center_person_id: 'p1', nodes: [], edges: [] })
    getBranchGraph.mockResolvedValue({ view_mode: 'branch', nodes: [], edges: [] })
    getBranchGraphByRoot.mockResolvedValue({ view_mode: 'branch', center_person_id: 'p1', nodes: [], edges: [] })
    getOverviewGraph.mockResolvedValue({ view_mode: 'overview', nodes: [], edges: [] })
    const data = useGraphData()

    await data.loadMainlineGraph('p1', 2, 4)
    await data.loadInlawGraph('p1', 'p2', 3)
    await data.loadBridgeGraph('p1', 'p2', 2, 'f1')
    await data.loadBranchGraph('person', 'p1', 5)
    await data.loadBranchGraph('familyUnit', 'family:f1', 5)
    await data.loadOverviewGraph('all', 300)

    expect(getMainlineGraph).toHaveBeenCalledWith('p1', 2, 4)
    expect(getInlawGraph).toHaveBeenCalledWith('p1', 'p2', 3)
    expect(getBridgeGraph).toHaveBeenCalledWith('p1', 'p2', 2, 'f1')
    expect(getBranchGraphByRoot).toHaveBeenCalledWith('person', 'p1', 5)
    expect(getBranchGraph).toHaveBeenCalledWith('f1', 5)
    expect(getOverviewGraph).toHaveBeenCalledWith('all', 300)
    expect(data.graph.value.view_mode).toBe('overview')
  })

  it('stores error message when focus graph fails', async () => {
    getFocusGraph.mockRejectedValue({
      response: { data: { detail: '人物不存在' } }
    })
    const data = useGraphData()

    const graph = await data.loadFocusGraph('missing')

    expect(data.errorMessage.value).toBe('人物不存在')
    expect(data.isLoading.value).toBe(false)
    expect(graph.nodes.length).toBeGreaterThan(0)
    expect(graph.warnings[0]).toContain('Neo4j 暂不可用')
  })

  it('falls back when an API returns an empty graph', async () => {
    getMainlineGraph.mockResolvedValue({ view_mode: 'mainline', center_person_id: 'p1', nodes: [], edges: [] })
    const data = useGraphData()

    const graph = await data.loadMainlineGraph('p1')

    expect(data.errorMessage.value).toBe('接口返回空图谱，已显示本地演示数据')
    expect(graph.nodes.length).toBeGreaterThan(0)
    expect(graph.center_person_id).toBe('demo:child')
  })

  it('can warm up the graph with local demo data immediately', () => {
    const data = useGraphData()

    const graph = data.useFallbackGraph('mainline', 'demo:child')

    expect(graph.nodes.length).toBeGreaterThan(0)
    expect(data.graph.value.warnings[0]).toContain('Neo4j 暂不可用')
    expect(data.people.value.length).toBeGreaterThan(40)
  })

  it('falls back to local demo people when Neo4j is unavailable', async () => {
    getPersons.mockRejectedValue({
      response: { data: { detail: 'Neo4j 服务不可用' } }
    })
    const data = useGraphData()

    const people = await data.loadPeople()

    expect(people.length).toBeGreaterThan(40)
    expect(data.errorMessage.value).toBe('Neo4j 服务不可用')
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
