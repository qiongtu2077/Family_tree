/**
 * 图谱交互状态
 * 管理选中人物、搜索定位和视图切换。
 */
import { computed, ref } from 'vue'

/**
 * 管理图谱交互状态。
 */
export function useGraphInteractions(graphData) {
  const selectedPerson = ref(null)
  const searchKeyword = ref('')
  const searchResults = ref([])
  const selectedView = ref('mainline')
  const isAdminPanelOpen = ref(false)
  const isRelationPanelOpen = ref(false)

  const selectedPersonId = computed(() => selectedPerson.value?.id || null)

  /**
   * 选中人物节点。
   */
  function selectPerson(person) {
    selectedPerson.value = person
  }

  /**
   * 清空当前选中人物。
   */
  function clearSelection() {
    selectedPerson.value = null
  }

  /**
   * 执行姓名搜索。
   */
  async function runSearch() {
    searchResults.value = await graphData.searchPeople(searchKeyword.value)
    return searchResults.value
  }

  /**
   * 以指定人物为中心重新加载图谱。
   */
  async function focusPerson(personId) {
    selectedPerson.value = null
    await graphData.loadFocusGraph(personId)
  }

  return {
    selectedPerson,
    selectedPersonId,
    searchKeyword,
    searchResults,
    selectedView,
    isAdminPanelOpen,
    isRelationPanelOpen,
    selectPerson,
    clearSelection,
    runSearch,
    focusPerson
  }
}
