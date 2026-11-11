import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useGraphData } from '../../composables/useGraphData'
import {
  getBranchGraph,
  getBranchGraphByRoot,
  getCenterCandidates,
  getInlawGraph,
  getMainlineGraph
} from '../../api/graph'
import { searchPersons } from '../../api/persons'

vi.mock('../../api/graph', () => ({
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

vi.mock('../../api/persons', () => ({
  getPersons: vi.fn(),
  searchPersons: vi.fn()
}))

// --- 测试数据构建 --- //

/**
 * 创建可渲染的单人物图谱响应。
 */
function graphResponse(viewMode, personId = 'p1', context = null) {
  return {
    view_mode: viewMode,
    center_person_id: personId,
    view_context: context,
    nodes: [{ id: personId, type: 'person', name: '张三' }],
    edges: [],
    warnings: []
  }
}

// --- MC/DC 数据测试 --- //

describe('MC/DC graph data decisions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('D-D1 only searches center candidates when keyword has non-space content', async () => {
    getCenterCandidates.mockResolvedValue([{ id: 'p1', name: '张三' }])
    const data = useGraphData()

    const emptyResult = await data.searchCenterCandidates('   ')
    const realResult = await data.searchCenterCandidates('张')

    expect(emptyResult).toEqual([])
    expect(realResult[0].id).toBe('p1')
    expect(getCenterCandidates).toHaveBeenCalledTimes(1)
    expect(getCenterCandidates).toHaveBeenCalledWith('张', 20)
  })

  it('D-D2 falls back to normal person search only when center candidate API fails', async () => {
    getCenterCandidates.mockRejectedValue(new Error('Neo4j down'))
    searchPersons.mockResolvedValue([{ id: 'legacy-p1', name: '张三' }])
    const data = useGraphData()

    const result = await data.searchCenterCandidates('张')

    expect(result[0].id).toBe('legacy-p1')
    expect(searchPersons).toHaveBeenCalledWith('张')
  })

  it('D-D3 routes branch loading by root type and strips family prefix only for FamilyUnit', async () => {
    getBranchGraph.mockResolvedValue(graphResponse('branch', 'p1'))
    getBranchGraphByRoot.mockResolvedValue(graphResponse('branch', 'p2'))
    const data = useGraphData()

    await data.loadBranchGraph('familyUnit', 'family:f1', 5)
    await data.loadBranchGraph('person', 'p2', 4)

    expect(getBranchGraph).toHaveBeenCalledWith('f1', 5)
    expect(getBranchGraphByRoot).toHaveBeenCalledWith('person', 'p2', 4)
  })

  it('D-D4 prioritizes view_context center over top-level center', async () => {
    getInlawGraph.mockResolvedValue(graphResponse('inlaw', 'wrong-center', {
      center_person_id: 'real-center',
      spouse_id: 'spouse'
    }))
    const data = useGraphData()

    await data.loadInlawGraph('real-center', 'spouse', 3)

    expect(data.centerPersonId.value).toBe('real-center')
    expect(data.graphContext.value.spouse_id).toBe('spouse')
  })

  it('D-D5 keeps empty graph state when response has no renderable nodes', async () => {
    getMainlineGraph.mockResolvedValue({
      view_mode: 'mainline',
      center_person_id: 'p1',
      edges: []
    })
    const data = useGraphData()

    const graph = await data.loadMainlineGraph('p1')

    expect(graph.nodes).toEqual([])
    expect(graph.center_person_id).toBe('p1')
    expect(data.errorMessage.value).toBe('接口返回空图谱，请先初始化 Neo4j 测试数据')
  })

  it('D-D6 extracts FastAPI detail before generic JavaScript error text', async () => {
    getMainlineGraph
      .mockRejectedValueOnce({ response: { data: { detail: '人物不存在' } } })
      .mockRejectedValueOnce(new Error('network failed'))
    const data = useGraphData()

    await data.loadMainlineGraph('missing')
    expect(data.errorMessage.value).toBe('人物不存在')

    await data.loadMainlineGraph('missing-again')
    expect(data.errorMessage.value).toBe('network failed')
  })
})
