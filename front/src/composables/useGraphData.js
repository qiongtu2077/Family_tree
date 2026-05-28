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
      throw error
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
  async function loadGraph(loader, fallbackCenterPersonId = null) {
    isLoading.value = true
    errorMessage.value = ''
    try {
      const data = await loader()
      graph.value = data
      centerPersonId.value = data.center_person_id || fallbackCenterPersonId
      return data
    } catch (error) {
      errorMessage.value = extractErrorMessage(error)
      throw error
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 加载中心人物图谱。
   */
  async function loadFocusGraph(personId, generations = 5) {
    return loadGraph(() => getFocusGraph(personId, generations), personId)
  }

  /**
   * 加载本家主线图。
   */
  async function loadMainlineGraph(personId, ancestorDepth = 3, descendantDepth = 3) {
    return loadGraph(
      () => getMainlineGraph(personId, ancestorDepth, descendantDepth),
      personId
    )
  }

  /**
   * 加载姻亲谱系图。
   */
  async function loadInlawGraph(personId, spouseId, depth = 3) {
    return loadGraph(() => getInlawGraph(personId, spouseId, depth), spouseId)
  }

  /**
   * 加载联姻桥接图。
   */
  async function loadBridgeGraph(personId, spouseId, depth = 2, familyUnitId = null) {
    return loadGraph(
      () => getBridgeGraph(personId, spouseId, depth, familyUnitId),
      personId
    )
  }

  /**
   * 加载后代分支图。
   */
  async function loadBranchGraph(rootType, rootId, depth = 5) {
    const loader = rootType === 'familyUnit'
      ? () => getBranchGraph(stripFamilyPrefix(rootId), depth)
      : () => getBranchGraphByRoot(rootType, rootId, depth)
    return loadGraph(loader, rootType === 'person' ? rootId : centerPersonId.value)
  }

  /**
   * 加载家族全景图。
   */
  async function loadOverviewGraph(scope = 'all', maxNodes = 300) {
    return loadGraph(() => getOverviewGraph(scope, maxNodes), centerPersonId.value)
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
 * 提取接口错误信息。
 */
function extractErrorMessage(error) {
  return error.response?.data?.detail || error.message || '接口请求失败'
}
