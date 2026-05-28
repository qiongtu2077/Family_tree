/**
 * 图谱数据状态
 * 负责加载人物列表、中心图、关系路径和异常信息。
 */
import { computed, ref } from 'vue'
import { getFocusGraph, getGraphIssues, getRelationPath } from '../api/graph'
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
    people.value = await getPersons(0, 1000)
    return people.value
  }

  /**
   * 搜索人物候选。
   */
  async function searchPeople(keyword) {
    if (!keyword?.trim()) return []
    return searchPersons(keyword.trim())
  }

  /**
   * 加载中心人物图谱。
   */
  async function loadFocusGraph(personId, generations = 5) {
    isLoading.value = true
    errorMessage.value = ''
    try {
      const data = await getFocusGraph(personId, generations)
      graph.value = data
      centerPersonId.value = data.center_person_id || personId
      return data
    } catch (error) {
      errorMessage.value = error.response?.data?.detail || error.message
      throw error
    } finally {
      isLoading.value = false
    }
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
    loadRelationPath,
    loadIssues
  }
}
