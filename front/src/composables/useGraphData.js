/**
 * 图谱数据状态
 * 负责加载人物列表、中心图、关系路径和异常信息。
 */
import { computed, ref } from 'vue'
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
import { getFallbackGraph, getFallbackPeople } from '../api/demoGraphFallback'
import { getPersons, searchPersons } from '../api/persons'

/**
 * 管理族谱数据读取状态。
 */
export function useGraphData() {
  const graph = ref({ nodes: [], edges: [], warnings: [] })
  const people = ref([])
  const issues = ref([])
  const relationPath = ref(null)
  const centerPersonId = ref(null)
  const isLoading = ref(false)
  const errorMessage = ref('')

  const personNodes = computed(() => graph.value.nodes.filter(node => node.type === 'person'))
  const familyUnitNodes = computed(() => graph.value.nodes.filter(node => node.type === 'familyUnit'))

  /**
   * 加载人物列表。
   */
  async function loadPeople() {
    try {
      people.value = await getPersons(0, 1000)
      return people.value
    } catch (error) {
      errorMessage.value = extractErrorMessage(error)
      people.value = getFallbackPeople()
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
   * 统一执行图谱加载并维护 loading/error 状态。
   */
  async function loadGraph(loader, fallbackCenterPersonId = null, fallbackViewMode = 'mainline') {
    isLoading.value = true
    errorMessage.value = ''
    try {
      const data = await loader()
      if (!isRenderableGraph(data)) {
        errorMessage.value = '接口返回空图谱，已显示本地演示数据'
        return useFallbackGraph(fallbackViewMode, fallbackCenterPersonId || 'demo:child')
      }
      graph.value = data
      centerPersonId.value = data.center_person_id || fallbackCenterPersonId
      return data
    } catch (error) {
      errorMessage.value = extractErrorMessage(error)
      return useFallbackGraph(fallbackViewMode, fallbackCenterPersonId || 'demo:child')
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 立即切换到本地演示图谱，避免真实库不可用时画布空白。
   */
  function useFallbackGraph(viewMode = 'mainline', fallbackPersonId = 'demo:child') {
    const fallbackGraph = getFallbackGraph(viewMode, fallbackPersonId)
    graph.value = fallbackGraph
    centerPersonId.value = fallbackGraph.center_person_id || fallbackPersonId
    if (!people.value.length) people.value = getFallbackPeople()
    return fallbackGraph
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
    return loadGraph(() => getInlawGraph(personId, spouseId, depth), spouseId, 'inlaw')
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
    return loadGraph(loader, rootType === 'person' ? rootId : centerPersonId.value, 'branch')
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
    isLoading,
    errorMessage,
    personNodes,
    familyUnitNodes,
    loadPeople,
    searchPeople,
    loadFocusGraph,
    loadMainlineGraph,
    loadInlawGraph,
    loadBridgeGraph,
    loadBranchGraph,
    loadOverviewGraph,
    loadRelationPath,
    loadIssues,
    useFallbackGraph
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
 * 提取接口错误信息。
 */
function extractErrorMessage(error) {
  return error.response?.data?.detail || error.message || '接口请求失败'
}
