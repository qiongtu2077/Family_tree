import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useGraphData } from '../composables/useGraphData'
import {
  getBranchGraph,
  getBranchGraphByRoot,
  getBridgeGraph,
  getCenterCandidates,
  getCenterContext,
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
  getCenterCandidates: vi.fn(),
  getCenterContext: vi.fn(),
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

  it('loads center candidates and center context', async () => {
    getCenterCandidates.mockResolvedValue([{ id: 'p1', name: '张三' }])
    getCenterContext.mockResolvedValue({
      person: { id: 'p1', type: 'person', name: '张三' },
      available_spouses: [{ person: { id: 'p2', name: '李四' }, family_unit_id: 'f1' }],
      available_family_units: [{ family_unit_id: 'f1', label: '婚姻家庭' }],
      nine_kinship_summary: { visible_person_count: 2 },
      warnings: []
    })
    const data = useGraphData()

    const candidates = await data.searchCenterCandidates('张')
    const context = await data.loadCenterContext('p1')

    expect(candidates[0].id).toBe('p1')
    expect(context.person.id).toBe('p1')
    expect(data.centerPersonId.value).toBe('p1')
    expect(data.centerContext.value.available_spouses[0].family_unit_id).toBe('f1')
  })

  it('keeps requested center id when center context fails', async () => {
    getCenterContext.mockRejectedValue({
      response: { data: { detail: 'Neo4j 服务不可用' } }
    })
    const data = useGraphData()

    const context = await data.loadCenterContext('p1')

    expect(context).toBeNull()
    expect(data.centerContext.value).toBeNull()
    expect(data.centerPersonId.value).toBe('p1')
    expect(data.errorMessage.value).toBe('Neo4j 服务不可用')
  })

  it('loads all five formal graph views with dedicated APIs', async () => {
    const personNode = { id: 'p1', type: 'person', name: '张三' }
    getMainlineGraph.mockResolvedValue({ view_mode: 'mainline', center_person_id: 'p1', nodes: [personNode], edges: [] })
    getInlawGraph.mockResolvedValue({ view_mode: 'inlaw', center_person_id: 'p1', view_context: { center_person_id: 'p1', spouse_id: 'p2' }, nodes: [personNode], edges: [] })
    getBridgeGraph.mockResolvedValue({ view_mode: 'bridge', center_person_id: 'p1', nodes: [personNode], edges: [] })
    getBranchGraph.mockResolvedValue({ view_mode: 'branch', nodes: [personNode], edges: [] })
    getBranchGraphByRoot.mockResolvedValue({ view_mode: 'branch', center_person_id: 'p1', nodes: [personNode], edges: [] })
    getOverviewGraph.mockResolvedValue({ view_mode: 'overview', nodes: [personNode], edges: [] })
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

  it('keeps original center when loading inlaw graph with spouse context', async () => {
    const personNode = { id: 'p2', type: 'person', name: '李四' }
    getInlawGraph.mockResolvedValue({
      view_mode: 'inlaw',
      center_person_id: 'p1',
      view_context: { center_person_id: 'p1', spouse_id: 'p2' },
      nodes: [personNode],
      edges: []
    })
    const data = useGraphData()

    await data.loadInlawGraph('p1', 'p2', 3)

    expect(data.centerPersonId.value).toBe('p1')
    expect(data.graphContext.value.spouse_id).toBe('p2')
  })

  it('stores error message and shows an empty graph when focus graph fails', async () => {
    getFocusGraph.mockRejectedValue({
      response: { data: { detail: '人物不存在' } }
    })
    const data = useGraphData()

    const graph = await data.loadFocusGraph('missing')

    expect(data.errorMessage.value).toBe('人物不存在')
    expect(data.isLoading.value).toBe(false)
    expect(graph.view_mode).toBe('mainline')
    expect(graph.center_person_id).toBe('missing')
    expect(graph.nodes).toEqual([])
  })

  it('keeps empty graph state when an API returns no renderable nodes', async () => {
    getMainlineGraph.mockResolvedValue({ view_mode: 'mainline', center_person_id: 'p1', nodes: [], edges: [] })
    const data = useGraphData()

    const graph = await data.loadMainlineGraph('p1')

    expect(data.errorMessage.value).toBe('当前范围没有可展示人物，请选择其他人物或在资料管理中添加成员')
    expect(graph.nodes).toEqual([])
    expect(graph.center_person_id).toBe('p1')
  })

  it('does not create local people when Neo4j is unavailable', async () => {
    getPersons.mockRejectedValue({
      response: { data: { detail: 'Neo4j 服务不可用' } }
    })
    const data = useGraphData()

    const people = await data.loadPeople()

    expect(people).toEqual([])
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

  it('loads complete person pages rather than silently dropping records after 1000', async () => {
    const first = Array.from({ length: 1000 }, (_, index) => ({ id: `p${index}`, name: `家人${index}` }))
    getPersons.mockResolvedValueOnce(first).mockResolvedValueOnce([{ id: 'p1000', name: '最后一人' }])
    const data = useGraphData()

    await data.loadPeople()

    expect(getPersons).toHaveBeenNthCalledWith(2, 1000, 1000)
    expect(data.people.value).toHaveLength(1001)
    expect(data.people.value.at(-1).id).toBe('p1000')
  })

  it('discards an older view response that finishes after the newest view', async () => {
    let completeOlder
    getMainlineGraph.mockImplementationOnce(() => new Promise(resolve => { completeOlder = resolve }))
    const latest = { view_mode: 'overview', nodes: [{ id: 'new', type: 'person', name: '新视图' }], edges: [] }
    getOverviewGraph.mockResolvedValueOnce(latest)
    const data = useGraphData()

    const older = data.loadMainlineGraph('old')
    await data.loadOverviewGraph()
    completeOlder({ view_mode: 'mainline', nodes: [{ id: 'old', type: 'person', name: '旧视图' }], edges: [] })
    await older

    expect(data.graph.value).toEqual(latest)
    expect(data.isLoading.value).toBe(false)
  })

  it('keeps the last readable graph when a following request fails', async () => {
    const readable = { view_mode: 'mainline', center_person_id: 'p1', nodes: [{ id: 'p1', type: 'person', name: '家人' }], edges: [] }
    getMainlineGraph.mockResolvedValueOnce(readable)
    getOverviewGraph.mockRejectedValueOnce(new Error('连接中断'))
    const data = useGraphData()

    await data.loadMainlineGraph('p1')
    await data.loadOverviewGraph()

    expect(data.graph.value).toEqual(readable)
    expect(data.errorMessage.value).toBe('连接中断')
    expect(data.isLoading.value).toBe(false)
  })

  it('ignores an outdated center context after a newer center was selected', async () => {
    let completeOlder
    getCenterContext.mockImplementationOnce(() => new Promise(resolve => { completeOlder = resolve }))
    getCenterContext.mockResolvedValueOnce({ person: { id: 'new', name: '新的中心' } })
    const data = useGraphData()

    const older = data.loadCenterContext('old')
    await data.loadCenterContext('new')
    completeOlder({ person: { id: 'old', name: '旧的中心' } })
    await older

    expect(data.centerPersonId.value).toBe('new')
    expect(data.centerContext.value.person.name).toBe('新的中心')
  })
})
