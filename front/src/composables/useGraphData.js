/**
 * 图谱数据状态
 * 负责加载人物列表、中心图、关系路径和异常信息。
 */
import { computed, ref } from 'vue'
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

/**
 * 管理族谱数据读取状态。
 */
export function useGraphData() {
  const graph = ref({ nodes: [], edges: [], warnings: [], view_context: null })
  const people = ref([])
  const issues = ref([])
  const relationPath = ref(null)
  const centerPersonId = ref(null)
  const centerContext = ref(null)
  const isLoading = ref(false)
  const errorMessage = ref('')

  const personNodes = computed(() => graph.value.nodes.filter(node => node.type === 'person'))
  const familyUnitNodes = computed(() => graph.value.nodes.filter(node => node.type === 'familyUnit'))
  const graphContext = computed(() => graph.value.view_context || {})

  /**
   * 加载人物列表。
   */
  async function loadPeople() {
    try {
      people.value = await getPersons(0, 1000)
      return people.value
    } catch (error) {
      errorMessage.value = extractErrorMessage(error)
      people.value = []
      return people.value
    }
  }

  /**
   * 搜索人物候选。
   */
  async function searchPeople(keyword) {
    if (!keyword?.trim()) return []
    return searchPersons(keyword.trim())
  }

  /**
   * 搜索中心人物候选。
   */
  async function searchCenterCandidates(keyword) {
    if (!keyword?.trim()) return []
    try {
      return await getCenterCandidates(keyword.trim(), 20)
    } catch {
      return searchPeople(keyword)
    }
  }

  /**
   * 加载中心人物上下文。
   */
  async function loadCenterContext(personId) {
    if (!personId) return null
    try {
      centerContext.value = await getCenterContext(personId)
      centerPersonId.value = centerContext.value.person.id
      return centerContext.value
    } catch (error) {
      errorMessage.value = extractErrorMessage(error)
      centerContext.value = null
      centerPersonId.value = personId
      return centerContext.value
    }
  }

  /**
   * 统一执行图谱加载并维护 loading/error 状态。
   */
  async function loadGraph(
    loader,
    expectedCenterPersonId = null,
    emptyViewMode = 'mainline'
  ) {
    isLoading.value = true
    errorMessage.value = ''
    try {
      const data = await loader()
      if (!isRenderableGraph(data)) {
        errorMessage.value = '接口返回空图谱，请先初始化 Neo4j 测试数据'
        graph.value = emptyGraph(emptyViewMode, expectedCenterPersonId)
        centerPersonId.value = expectedCenterPersonId
        return graph.value
      }
      graph.value = data
      centerPersonId.value = data.view_context?.center_person_id || data.center_person_id || expectedCenterPersonId
      return data
    } catch (error) {
      errorMessage.value = extractErrorMessage(error)
      graph.value = emptyGraph(emptyViewMode, expectedCenterPersonId)
      centerPersonId.value = expectedCenterPersonId
      return graph.value
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 加载中心人物图谱。
   */
  async function loadFocusGraph(personId, generations = 5) {
    return loadGraph(() => getFocusGraph(personId, generations), personId, 'mainline')
  }

  /**
   * 加载本家主线图。
   */
  async function loadMainlineGraph(personId, ancestorDepth = 3, descendantDepth = 3) {
    return loadGraph(
      () => getMainlineGraph(personId, ancestorDepth, descendantDepth),
      personId,
      'mainline'
    )
  }

  /**
   * 加载姻亲谱系图。
   */
  async function loadInlawGraph(personId, spouseId, depth = 3) {
    return loadGraph(() => getInlawGraph(personId, spouseId, depth), personId, 'inlaw')
  }

  /**
   * 加载联姻桥接图。
   */
  async function loadBridgeGraph(personId, spouseId, depth = 2, familyUnitId = null) {
    return loadGraph(
      () => getBridgeGraph(personId, spouseId, depth, familyUnitId),
      personId,
      'bridge'
    )
  }

  /**
   * 加载后代分支图。
   */
  async function loadBranchGraph(rootType, rootId, depth = 5) {
    const loader = rootType === 'familyUnit'
      ? () => getBranchGraph(stripFamilyPrefix(rootId), depth)
      : () => getBranchGraphByRoot(rootType, rootId, depth)
    return loadGraph(
      loader,
      rootType === 'person' ? rootId : centerPersonId.value,
      'branch'
    )
  }

  /**
   * 加载家族全景图。
   */
  async function loadOverviewGraph(scope = 'all', maxNodes = 300) {
    return loadGraph(() => getOverviewGraph(scope, maxNodes), centerPersonId.value, 'overview')
  }

  /**
   * 查询两个人之间的关系路径。
   */
  async function loadRelationPath(fromPersonId, toPersonId) {
    relationPath.value = await getRelationPath(fromPersonId, toPersonId)
    return relationPath.value
  }

  /**
   * 加载管理员异常列表。
   */
  async function loadIssues() {
    issues.value = await getGraphIssues()
    return issues.value
  }

  return {
    graph,
    people,
    issues,
    relationPath,
    centerPersonId,
    centerContext,
    isLoading,
    errorMessage,
    personNodes,
    familyUnitNodes,
    graphContext,
    loadPeople,
    searchPeople,
    searchCenterCandidates,
    loadCenterContext,
    loadFocusGraph,
    loadMainlineGraph,
    loadInlawGraph,
    loadBridgeGraph,
    loadBranchGraph,
    loadOverviewGraph,
    loadRelationPath,
    loadIssues
  }
}

/**
 * 去掉前端 family: 前缀，供兼容旧分支接口使用。
 */
function stripFamilyPrefix(familyUnitId) {
  return String(familyUnitId || '').replace(/^family:/, '')
}

/**
 * 判断接口图谱是否足够渲染。
 */
function isRenderableGraph(data) {
  return Array.isArray(data?.nodes) && data.nodes.length > 0
}

/**
 * 返回空图谱错误态，不再使用本地临时族谱数据兜底。
 */
function emptyGraph(viewMode, centerPersonId) {
  return {
    view_mode: viewMode,
    center_person_id: centerPersonId,
    nodes: [],
    edges: [],
    warnings: [],
    view_context: null
  }
}

/**
 * 提取接口错误信息。
 */
function extractErrorMessage(error) {
  return error.response?.data?.detail || error.message || '接口请求失败'
}
