<template>
  <div class="family-graph-view">
    <GraphToolbar
      v-model="interactions.selectedView.value"
      v-model:search-keyword="interactions.searchKeyword.value"
      :is-admin="isAdmin"
      :center-person-name="centerPersonName"
      @search="handleSearch"
      @open-center="openCenterModal"
      @show-center-scope="showCenterScope"
      @open-relation="openRelationPanel"
      @open-admin="openAdminPanel"
      @logout="$emit('logout')"
    />

    <main class="workspace">
      <section class="left-rail">
        <div class="status-card">
          <span>当前视图</span>
          <strong>{{ currentViewLabel }}</strong>
          <p>{{ currentViewHint }}</p>
        </div>

        <div v-if="data.errorMessage.value" class="error-card">
          {{ data.errorMessage.value }}
        </div>

        <div v-if="interactions.searchResults.value.length" class="search-results">
          <h3>搜索结果</h3>
          <button
            v-for="person in interactions.searchResults.value"
            :key="person.id"
            @click="focusPerson(person.id)"
          >
            <span>{{ person.name }}</span>
            <small>{{ person.birth_date?.slice(0, 4) || '年份未知' }}</small>
          </button>
        </div>

        <div v-if="data.graph.value.warnings?.length" class="warning-card">
          <h3>视图提示</h3>
          <p v-for="warning in data.graph.value.warnings" :key="warning">{{ warning }}</p>
        </div>
      </section>

      <FamilyGraphCanvas
        class="canvas-area"
        :graph="visibleGraph"
        :is-loading="data.isLoading.value"
        :center-person-id="data.centerPersonId.value"
        @select-person="interactions.selectPerson"
      />

      <PersonDetailDrawer
        :person="interactions.selectedPerson.value"
        @close="interactions.clearSelection"
        @focus="focusPerson"
        @open-relation="openRelationPanel"
      />
    </main>

    <RelationPathPanel
      :open="interactions.isRelationPanelOpen.value"
      :people="data.people.value"
      :initial-person="interactions.selectedPerson.value"
      :query-relation="data.loadRelationPath"
      @close="interactions.isRelationPanelOpen.value = false"
    />

    <GraphIssuePanel
      :open="interactions.isAdminPanelOpen.value"
      :issues="data.issues.value"
      @close="interactions.isAdminPanelOpen.value = false"
      @refresh="data.loadIssues"
    />

    <CenterPersonModal
      v-model:keyword="centerKeyword"
      :open="centerModalOpen"
      mode="center"
      :options="centerOptions"
      :selected-id="selectedCenterCandidate?.id || ''"
      @search="searchCenterPeople"
      @select="selectedCenterCandidate = $event"
      @confirm="confirmCenterPerson"
      @cancel="cancelCenterSelection"
    />

    <CenterPersonModal
      :open="parameterModalOpen"
      :mode="parameterMode"
      :options="parameterOptions"
      :selected-id="selectedParameterId"
      @select="selectedParameterOption = $event"
      @confirm="confirmParameterSelection"
      @cancel="cancelParameterSelection"
    />
  </div>
</template>

<script setup>
/**
 * 族谱系统主视图。
 */
import { computed, onMounted, ref, watch } from 'vue'
import GraphIssuePanel from '../components/admin/GraphIssuePanel.vue'
import CenterPersonModal from '../components/graph/CenterPersonModal.vue'
import FamilyGraphCanvas from '../components/graph/FamilyGraphCanvas.vue'
import GraphToolbar from '../components/graph/GraphToolbar.vue'
import PersonDetailDrawer from '../components/graph/PersonDetailDrawer.vue'
import RelationPathPanel from '../components/graph/RelationPathPanel.vue'
import { useGraphData } from '../composables/useGraphData'
import { useGraphInteractions } from '../composables/useGraphInteractions'

const props = defineProps({
  currentUser: { type: Object, default: null },
  isAdmin: { type: Boolean, default: false }
})

defineEmits(['logout'])

const data = useGraphData()
const interactions = useGraphInteractions(data)
let isRevertingView = false
const centerModalOpen = ref(false)
const parameterModalOpen = ref(false)
const centerKeyword = ref('')
const centerCandidates = ref([])
const selectedCenterCandidate = ref(null)
const parameterMode = ref('spouse')
const pendingView = ref('mainline')
const selectedParameterOption = ref(null)
const selectedSpouseOption = ref(null)
const selectedFamilyOption = ref(null)

const viewLabels = {
  mainline: '本家主线图',
  inlaw: '姻亲谱系图',
  bridge: '联姻桥接图',
  branch: '后代分支图',
  overview: '家族全景图'
}

const viewHints = {
  mainline: '围绕中心人物展示祖先、后代、配偶和必要家庭单元。',
  inlaw: '以明确选中的配偶为中心，展示配偶原生家族。',
  bridge: '有限展示两边家族，通过婚姻桥接点解释联姻。',
  branch: '从某个祖先或家庭单元向下展开后代分支。',
  overview: '管理员排查孤立节点、重复人物和异常关系。'
}

const currentViewLabel = computed(() => viewLabels[interactions.selectedView.value] || '本家主线图')
const currentViewHint = computed(() => viewHints[interactions.selectedView.value] || viewHints.mainline)
const centerPersonName = computed(() => data.centerContext.value?.person?.name || '')
const requiresCenterPerson = computed(() => interactions.selectedView.value !== 'overview')
const visibleGraph = computed(() => {
  if (requiresCenterPerson.value && !data.centerPersonId.value) return emptyGraph()
  return data.graph.value
})
const centerOptions = computed(() => centerCandidates.value.length ? centerCandidates.value : data.people.value)
const parameterOptions = computed(() => {
  if (parameterMode.value === 'family') return data.centerContext.value?.available_family_units || []
  return data.centerContext.value?.available_spouses || []
})
const selectedParameterId = computed(() => {
  if (!selectedParameterOption.value) return ''
  if (parameterMode.value === 'family') return selectedParameterOption.value.family_unit_id || ''
  return selectedParameterOption.value.person?.id || ''
})

watch(
  () => interactions.selectedView.value,
  async (view, previousView) => {
    if (isRevertingView) {
      isRevertingView = false
      return
    }
    await switchGraphView(view, previousView)
  }
)

/**
 * 搜索人物并展示候选。
 */
async function handleSearch() {
  await interactions.runSearch()
}

/**
 * 聚焦到指定人物。
 */
async function focusPerson(personId) {
  await applyCenterPerson({ id: personId }, 'mainline')
  interactions.searchResults.value = []
}

/**
 * 打开中心人物选择弹窗。
 */
function openCenterModal() {
  selectedCenterCandidate.value = data.centerContext.value?.person || null
  centerCandidates.value = data.people.value.slice(0, 30)
  centerModalOpen.value = true
}

/**
 * 搜索中心人物候选。
 */
async function searchCenterPeople() {
  centerCandidates.value = await data.searchCenterCandidates(centerKeyword.value)
}

/**
 * 确认并应用中心人物。
 */
async function confirmCenterPerson() {
  if (!selectedCenterCandidate.value) return
  centerModalOpen.value = false
  await applyCenterPerson(selectedCenterCandidate.value, interactions.selectedView.value)
}

/**
 * 取消中心人物选择。
 */
function cancelCenterSelection() {
  centerModalOpen.value = false
  if (!data.centerPersonId.value) {
    data.graph.value = emptyGraph()
    data.errorMessage.value = '请选择中心人物后再加载族谱图'
  }
}

/**
 * 打开关系查询面板。
 */
async function openRelationPanel(person = null) {
  if (person) interactions.selectPerson(person)
  if (!data.people.value.length) await data.loadPeople()
  interactions.isRelationPanelOpen.value = true
}

/**
 * 打开管理员异常面板。
 */
async function openAdminPanel() {
  await data.loadIssues()
  interactions.isAdminPanelOpen.value = true
}

/**
 * 在全景中切换为中心九族范围。
 */
async function showCenterScope() {
  if (!data.centerPersonId.value) {
    openCenterModal()
    return
  }
  await data.loadOverviewGraph(`center:${data.centerPersonId.value}`, 300)
}

/**
 * 进入页面时加载默认图谱。
 */
onMounted(async () => {
  if (!data.centerPersonId.value) {
    openCenterModal()
  }

  let people = []
  try {
    people = await data.loadPeople()
  } catch {
    people = []
  }
  centerCandidates.value = people.slice(0, 30)
  const defaultPersonId = normalizePersonId(props.currentUser?.person_id) || localStorage.getItem('familytree:centerPersonId') || ''
  if (defaultPersonId) {
    await applyCenterPerson({ id: defaultPersonId }, 'mainline')
    return
  }
  openCenterModal()
})

/**
 * 根据五图状态切换加载对应图谱。
 */
async function switchGraphView(view, previousView) {
  const centerId = data.centerPersonId.value
  if (view !== 'overview' && !centerId) {
    pendingView.value = view
    openCenterModal()
    return
  }

  try {
    if (view === 'mainline') {
      await data.loadMainlineGraph(centerId)
      return
    }
    if (view === 'overview') {
      await data.loadOverviewGraph('all', 300)
      return
    }
    if (view === 'branch') {
      await loadBranchView(previousView)
      return
    }
    if (view === 'inlaw' || view === 'bridge') {
      await loadSpouseDrivenView(view, previousView)
    }
  } catch {
    keepPreviousView(previousView || 'mainline', data.errorMessage.value)
  }
}

/**
 * 应用新的中心人物并清空派生参数。
 */
async function applyCenterPerson(person, targetView = 'mainline') {
  const personId = person?.id
  if (!personId) return

  localStorage.setItem('familytree:centerPersonId', personId)
  selectedSpouseOption.value = null
  selectedFamilyOption.value = null
  selectedParameterOption.value = null
  await data.loadCenterContext(personId)
  interactions.selectPerson(data.centerContext.value?.person || person)

  if (targetView !== interactions.selectedView.value) {
    isRevertingView = true
    interactions.selectedView.value = targetView
  }
  await switchGraphView(targetView, 'mainline')
}

/**
 * 加载依赖配偶的视图。
 */
async function loadSpouseDrivenView(view, previousView) {
  const spouseOptions = data.centerContext.value?.available_spouses || []
  if (!selectedSpouseOption.value && spouseOptions.length === 1) {
    selectedSpouseOption.value = spouseOptions[0]
  }
  if (!selectedSpouseOption.value) {
    if (!spouseOptions.length) {
      keepPreviousView(previousView, '当前中心人物暂无配偶/伴侣关系，无法打开该视图')
      return
    }
    openParameterModal('spouse', view)
    return
  }
  if (view === 'inlaw') {
    await data.loadInlawGraph(data.centerPersonId.value, selectedSpouseOption.value.person.id)
    return
  }
  await data.loadBridgeGraph(
    data.centerPersonId.value,
    selectedSpouseOption.value.person.id,
    2,
    selectedSpouseOption.value.family_unit_id
  )
}

/**
 * 加载后代分支视图。
 */
async function loadBranchView(previousView) {
  const familyOptions = data.centerContext.value?.available_family_units || []
  if (!selectedFamilyOption.value && familyOptions.length === 1) {
    selectedFamilyOption.value = familyOptions[0]
  }
  if (!selectedFamilyOption.value && familyOptions.length > 1) {
    openParameterModal('family', 'branch')
    return
  }
  if (selectedFamilyOption.value) {
    await data.loadBranchGraph('familyUnit', selectedFamilyOption.value.family_unit_id)
    return
  }
  if (data.centerPersonId.value) {
    await data.loadBranchGraph('person', data.centerPersonId.value)
    return
  }
  keepPreviousView(previousView, '请选择后代分支根节点')
}

/**
 * 打开五图参数选择弹窗。
 */
function openParameterModal(mode, view) {
  parameterMode.value = mode
  pendingView.value = view
  selectedParameterOption.value = null
  parameterModalOpen.value = true
}

/**
 * 确认五图参数选择。
 */
async function confirmParameterSelection() {
  if (!selectedParameterOption.value) return
  parameterModalOpen.value = false
  if (parameterMode.value === 'spouse') {
    selectedSpouseOption.value = selectedParameterOption.value
  } else {
    selectedFamilyOption.value = selectedParameterOption.value
  }
  await switchGraphView(pendingView.value, interactions.selectedView.value)
}

/**
 * 取消五图参数选择。
 */
function cancelParameterSelection() {
  parameterModalOpen.value = false
  keepPreviousView('mainline', '已取消图谱参数选择')
}

/**
 * 切换失败时回退到原视图并提示原因。
 */
function keepPreviousView(previousView, message) {
  if (previousView && interactions.selectedView.value !== previousView) {
    isRevertingView = true
    interactions.selectedView.value = previousView
  }
  data.errorMessage.value = message || '当前视图暂不可切换'
}

/**
 * 兼容旧账号绑定的 SQL 自增 ID。
 */
function normalizePersonId(personId) {
  if (!personId) return ''
  const value = String(personId)
  return /^\d+$/.test(value) ? `legacy:${value}` : value
}

/**
 * 返回空图谱，避免中心人物缺失时继续显示旧 G6 数据。
 */
function emptyGraph() {
  return {
    view_mode: interactions.selectedView.value,
    center_person_id: null,
    nodes: [],
    edges: [],
    warnings: []
  }
}
</script>

<style scoped>
.family-graph-view {
  min-height: 100vh;
  display: grid;
  grid-template-rows: auto 1fr;
  background: transparent;
}

.workspace {
  min-height: 0;
  height: calc(100vh - 67px);
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr) auto;
  gap: 18px;
  padding: 18px;
  overflow: hidden;
}

.left-rail {
  display: grid;
  align-content: start;
  gap: 14px;
}

.status-card,
.warning-card,
.error-card,
.search-results {
  padding: 18px;
  border-radius: 22px;
  color: #f0f0f0;
  background: rgba(25, 25, 25, 0.92);
  border: 1px solid rgba(255, 250, 0, 0.14);
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.22);
  backdrop-filter: blur(10px);
  animation: cardRise 0.5s ease both;
}

.status-card span {
  color: #888;
  font-size: 12px;
}

.status-card strong {
  display: block;
  margin-top: 5px;
  font-size: 20px;
}

.status-card p,
.warning-card p {
  color: #aaa;
  line-height: 1.7;
}

.error-card {
  color: #ff7b86;
  border-color: rgba(255, 71, 87, 0.28);
  background: rgba(255, 71, 87, 0.1);
}

.search-results {
  display: grid;
  gap: 8px;
}

.search-results h3,
.warning-card h3 {
  margin: 0 0 8px;
  font-size: 15px;
}

.search-results button {
  display: flex;
  justify-content: space-between;
  border: 1px solid transparent;
  border-radius: 14px;
  padding: 11px 12px;
  color: #f0f0f0;
  background: #252525;
  cursor: pointer;
}

.search-results button:hover {
  border-color: rgba(255, 250, 0, 0.38);
  background: rgba(255, 250, 0, 0.1);
}

.search-results small {
  color: #888;
}

.canvas-area {
  min-width: 0;
  animation: canvasReveal 0.7s cubic-bezier(.2,.8,.2,1) both;
}

@keyframes cardRise {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes canvasReveal {
  from { opacity: 0; clip-path: inset(0 0 100% 0 round 28px); }
  to { opacity: 1; clip-path: inset(0 0 0 0 round 28px); }
}

@media (max-width: 1040px) {
  .workspace {
    grid-template-columns: 1fr;
    height: auto;
    min-height: calc(100vh - 67px);
    overflow: visible;
  }

  .left-rail {
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  }
}
</style>
