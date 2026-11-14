<template>
  <div class="family-graph-view">
    <GraphToolbar :model-value="interactions.selectedView.value" v-model:search-keyword="interactions.searchKeyword.value" :is-admin="isAdmin" :center-person-name="centerPersonName"
      @update:model-value="requestView" @search="handleSearch" @open-center="openCenterModal" @show-center-scope="showCenterScope" @open-relation="openRelationPanel" @open-admin="openAdminPanel" @open-manage="manageOpen = true" @open-requests="requestsOpen = true" @open-profile="openOwnProfile" @logout="$emit('logout')" />

    <main class="workspace" :class="{ 'has-detail': interactions.selectedPerson.value }">
      <section class="left-rail" aria-label="家谱浏览设置">
        <div class="status-card">
          <span class="eyebrow">家族档案 / 当前视图</span>
          <strong>{{ readingMode === 'paternal' ? '父系阅读图' : currentViewLabel }}</strong>
          <p>{{ currentViewHint }}</p>
          <div v-if="centerPersonName" class="observer"><span class="observer-avatar">{{ centerPersonName.slice(0, 1) }}</span><div><small>正在以此人为中心</small><b>{{ centerPersonName }}</b></div><button @click="openCenterModal">更换</button></div>
          <div class="scope-summary"><span><b>{{ displayedPersonCount }}</b> 位人物</span><span v-if="displayGraph.hidden_relation_count">旁支范围约 {{ displayGraph.hidden_relation_count }} 位</span></div>
          <small class="context-hint">{{ currentContextHint }}</small>
        </div>

        <div v-if="data.errorMessage.value" class="error-card" role="alert"><span>{{ data.errorMessage.value }}</span><button aria-label="关闭错误提示" @click="data.errorMessage.value = ''">×</button></div>

        <div class="explore-card">
          <h3>阅读方式</h3>
          <div class="reading-switch" role="group" aria-label="家谱关系范围">
            <button type="button" :aria-pressed="readingMode === 'family'" :disabled="data.isLoading.value" @click="changeReadingMode('family')">完整家谱</button>
            <button type="button" :aria-pressed="readingMode === 'paternal'" :disabled="data.isLoading.value" @click="changeReadingMode('paternal')">父系阅读</button>
          </div>
          <div class="reading-switch direction-switch" role="group" aria-label="世代阅读方向">
            <button type="button" :aria-pressed="layoutDirection === 'vertical'" @click="changeDirection('vertical')">纵向 · 向下</button>
            <button type="button" :aria-pressed="layoutDirection === 'horizontal'" @click="changeDirection('horizontal')">横向 · 向右</button>
          </div>
          <p v-if="readingMode === 'paternal'" class="reading-note">沿已确认生父关系追溯，保留配偶及全部直接子女。绿色边框为父系主干。</p>
          <div v-if="readingMode === 'paternal'" class="depth-controls paternal-controls">
            <label>父系上溯范围<select v-model.number="paternalAncestorDepth" @change="refreshView"><option v-for="depth in [1,2,3,4,5]" :key="depth" :value="depth">{{ depth }} 代</option></select></label>
            <label>展开父系旁支<select v-model.number="paternalBranchDepth" @change="refreshView"><option v-for="depth in [0,1,2,3]" :key="depth" :value="depth">{{ depth ? depth + ' 层' : '只看近亲' }}</option></select></label>
          </div>
          <p v-if="displayGraph.paternal_context" class="reading-note">{{ displayGraph.paternal_context.core_person_ids.length }} 位主干人物 · {{ displayGraph.paternal_context.omitted_person_count }} 位暂收起。范围之外的祖先可增加上溯代数查看。</p>
          <h3 v-if="readingMode === 'family'">浏览范围</h3>
          <div v-if="interactions.selectedView.value === 'mainline' && readingMode === 'family'" class="depth-controls">
            <label>向上追溯<select v-model.number="ancestorDepth" @change="refreshView"><option v-for="depth in [1,2,3,4,5]" :key="depth" :value="depth">{{ depth }} 代祖先</option></select></label>
            <label>向下展开<select v-model.number="descendantDepth" @change="refreshView"><option v-for="depth in [1,2,3,4,5]" :key="depth" :value="depth">{{ depth }} 代后代</option></select></label>
          </div>
          <label v-else-if="interactions.selectedView.value !== 'overview' && readingMode === 'family'" class="single-depth">展示代数<select v-model.number="branchDepth" @change="refreshView"><option v-for="depth in [1,2,3,4,5,6]" :key="depth" :value="depth">{{ depth }} 代</option></select></label>
          <div v-else-if="interactions.selectedView.value === 'overview'" class="overview-scope"><p>{{ overviewScope === 'all' ? '浏览所有已录入家族及其连接。' : '只展示中心人物的亲缘范围。' }}</p><button v-if="overviewScope !== 'all'" @click="requestView('overview')">查看全部家族</button></div>
          <button v-if="spouseOptions.length" class="context-button" @click="openParameterModal('spouse', 'inlaw')">{{ selectedSpouseOption ? `配偶：${selectedSpouseOption.person.name}` : '选择配偶 / 伴侣' }}<span>↗</span></button>
          <button v-if="familyOptions.length" class="context-button" @click="openParameterModal('family', 'branch')">选择家庭分支<span>↗</span></button>
          <div class="navigation-actions"><button :disabled="centerHistory.length < 2" @click="goBackCenter">← 上一位</button><button :disabled="data.isLoading.value" @click="refreshView">刷新家谱</button></div>
        </div>

        <div v-if="overviewInfo" class="explore-card branch-browser">
          <h3>家族支系 · {{ overviewInfo.branches.length }}</h3>
          <p class="reading-note">按真实生养家庭归组，每位人物只归属一支。跨支关系保留连接，点击摘要可展开。</p>
          <div class="reading-switch" role="group" aria-label="全景支系展开范围"><button type="button" :aria-pressed="overviewInfo.expandedBranchIds.length === 0" @click="collapseAllBranches">收起全部</button><button type="button" :aria-pressed="overviewInfo.branches.length > 0 && overviewInfo.expandedBranchIds.length === overviewInfo.branches.length" @click="expandAllBranches">展开全部</button></div>
          <p class="branch-count">已展开 {{ overviewInfo.visiblePersonCount }} 位 · 收起 {{ overviewInfo.collapsedPersonCount }} 位</p>
          <div class="branch-options" aria-label="家族支系列表"><button v-for="branch in overviewInfo.branches" :key="branch.id" type="button" :data-branch-id="branch.id" :aria-expanded="overviewInfo.expandedBranchIds.includes(branch.id)" @click="toggleOverviewBranch(branch.id)"><strong>{{ branch.title }}</strong><span>{{ branch.personCount }} 位 · {{ overviewInfo.expandedBranchIds.includes(branch.id) ? '收起' : '展开' }}</span></button></div>
        </div>

        <div v-if="searchHasRun" class="search-results">
          <div class="section-heading"><h3>搜索结果 <small>{{ interactions.searchResults.value.length }}</small></h3><button aria-label="收起搜索结果" @click="searchHasRun = false">×</button></div>
          <p v-if="!interactions.searchResults.value.length">没有匹配人物，请尝试其他姓名。</p>
          <button v-for="person in interactions.searchResults.value" :key="person.id" @click="focusPerson(person.id)"><span>{{ person.name }}</span><small>{{ person.birth_date?.slice(0, 4) || '年份未知' }} →</small></button>
        </div>
        <div v-if="displayGraph.warnings.length" class="warning-card"><h3>视图提示</h3><p v-for="warning in displayGraph.warnings" :key="warning">{{ warning }}</p></div>
        <p class="archive-note">一代一代的名字，<br />连成属于我们的来处。</p>
      </section>

      <FamilyGraphCanvas ref="canvasRef" class="canvas-area" :graph="displayGraph" :direction="layoutDirection" :is-loading="data.isLoading.value" :center-person-id="data.centerPersonId.value" :selected-person-id="interactions.selectedPersonId.value" @select-person="selectPerson" @select-capsule="handleCapsuleClick" @toggle-branch="toggleOverviewBranch" />
      <PersonDetailDrawer :person="interactions.selectedPerson.value" @close="interactions.clearSelection" @focus="focusPerson" @open-relation="openRelationPanel" @edit="editPersonProfile" />
    </main>

    <RelationPathPanel :open="interactions.isRelationPanelOpen.value" :people="data.people.value" :initial-person="interactions.selectedPerson.value || data.centerContext.value?.person" :query-relation="data.loadRelationPath" @close="interactions.isRelationPanelOpen.value = false" />
    <GraphIssuePanel :open="interactions.isAdminPanelOpen.value" :issues="data.issues.value" @close="interactions.isAdminPanelOpen.value = false" @refresh="loadIssues" />
    <FamilyDataManager v-if="isAdmin" :open="manageOpen" @close="manageOpen = false" @changed="refreshAfterChanges" />
    <RegistrationRequests v-if="isAdmin" :open="requestsOpen" @close="requestsOpen = false" />
    <ProfileEditor :open="profileOpen" :current-user="currentUser" :person-id="profilePersonId" @close="profileOpen = false" @changed="refreshAfterChanges" />
    <CenterPersonModal v-model:keyword="centerKeyword" :open="centerModalOpen" mode="center" :options="centerCandidates" :selected-id="selectedCenterCandidate?.id || ''" @search="searchCenterPeople" @select="selectedCenterCandidate = $event" @confirm="confirmCenterPerson" @cancel="centerModalOpen = false" />
    <CenterPersonModal :open="parameterModalOpen" :mode="parameterMode" :options="parameterOptions" :selected-id="selectedParameterId" @select="selectedParameterOption = $event" @confirm="confirmParameterSelection" @cancel="parameterModalOpen = false" />
  </div>
</template>

<script setup>
/** 族谱工作区：组织五图、中心导航、查看范围和资料维护。 */
import { computed, onMounted, ref } from 'vue'
import GraphIssuePanel from '../components/admin/GraphIssuePanel.vue'
import FamilyDataManager from '../components/admin/FamilyDataManager.vue'
import RegistrationRequests from '../components/admin/RegistrationRequests.vue'
import ProfileEditor from '../components/ProfileEditor.vue'
import CenterPersonModal from '../components/graph/CenterPersonModal.vue'
import FamilyGraphCanvas from '../components/graph/FamilyGraphCanvas.vue'
import GraphToolbar from '../components/graph/GraphToolbar.vue'
import PersonDetailDrawer from '../components/graph/PersonDetailDrawer.vue'
import RelationPathPanel from '../components/graph/RelationPathPanel.vue'
import { useGraphData } from '../composables/useGraphData'
import { useGraphInteractions } from '../composables/useGraphInteractions'
import { getPersonDetail } from '../api/genealogy'
import { projectOverviewBranches } from '../graph/overviewBranches'
import { createPaternalProjection } from '../graph/paternalProjection'

const props = defineProps({ currentUser: { type: Object, default: null }, isAdmin: { type: Boolean, default: false } })
defineEmits(['logout'])
const data = useGraphData()
const interactions = useGraphInteractions(data)
const canvasRef = ref(null)
const ancestorDepth = ref(2)
const descendantDepth = ref(2)
const branchDepth = ref(3)
const overviewScope = ref('all')
const readingMode = ref('family')
const layoutDirection = ref(localStorage.getItem('familytree:layoutDirection') === 'horizontal' ? 'horizontal' : 'vertical')
const paternalAncestorDepth = ref(5)
const paternalBranchDepth = ref(0)
const depthSettings = [ancestorDepth, descendantDepth, branchDepth, paternalAncestorDepth, paternalBranchDepth]
let appliedDepths = depthSettings.map(setting => setting.value)
const expandedBranches = ref([])
const manageOpen = ref(false)
const requestsOpen = ref(false)
const profileOpen = ref(false)
const profilePersonId = ref(null)
const searchHasRun = ref(false)
const centerModalOpen = ref(false)
const centerKeyword = ref('')
const centerCandidates = ref([])
const selectedCenterCandidate = ref(null)
const centerHistory = ref([])
const parameterModalOpen = ref(false)
const parameterMode = ref('spouse')
const pendingView = ref('mainline')
const selectedParameterOption = ref(null)
const selectedSpouseOption = ref(null)
const selectedFamilyOption = ref(null)
let viewRequest = 0
let centerRequest = 0
let searchRequest = 0
let personRequest = 0
let hasOpenedPaternal = false

const labels = { mainline: '本家主线图', inlaw: '姻亲谱系图', bridge: '联姻桥接图', branch: '后代分支图', overview: '家族全景图' }
const hints = {
  mainline: '从中心人物出发，向上寻根，向下看见家族的延续。',
  inlaw: '沿着一段伴侣关系，走进另一边的原生家族。',
  bridge: '把两边家族放在一起，读懂联姻形成的连接。',
  branch: '从一位祖先或一个家庭，展开后代的分支。',
  overview: '在完整家族中寻找支系、人物与彼此的连接。'
}
const currentViewLabel = computed(() => labels[interactions.selectedView.value])
const currentViewHint = computed(() => readingMode.value === 'paternal' ? '沿明确记录的生父关系寻根，同时保留配偶、子女与旁支入口。' : hints[interactions.selectedView.value])
const centerPersonName = computed(() => data.centerContext.value?.person.name || '')
const spouseOptions = computed(() => data.centerContext.value?.available_spouses || [])
const familyOptions = computed(() => data.centerContext.value?.available_family_units || [])
const parameterOptions = computed(() => parameterMode.value === 'family' ? familyOptions.value : spouseOptions.value)
const displayGraph = computed(() => {
  const graph = data.graph.value
  if (data.isLoading.value) return graph
  if (graph.view_mode === 'overview') return projectOverviewBranches(graph, expandedBranches.value)
  if (readingMode.value === 'paternal' && graph.view_mode === 'mainline' && graph.nodes.some(node => node.id === data.centerPersonId.value)) {
    return createPaternalProjection(graph, data.centerPersonId.value, { sideBranchDepth: paternalBranchDepth.value, maxAncestorDepth: paternalAncestorDepth.value })
  }
  return graph
})
const overviewInfo = computed(() => displayGraph.value.overview_branches || null)
// 聚合图报告总人数，父系切片报告当前实际展示的人数。
const displayedPersonCount = computed(() => overviewInfo.value?.totalPersonCount ?? displayGraph.value.nodes.filter(node => node.type === 'person').length)
const selectedParameterId = computed(() => parameterMode.value === 'family' ? selectedParameterOption.value?.family_unit_id || '' : selectedParameterOption.value?.person.id || '')
const currentContextHint = computed(() => {
  if (interactions.selectedView.value === 'overview') return overviewScope.value === 'all' ? '完整家族关系' : '中心人物亲缘范围'
  if (interactions.selectedView.value === 'inlaw' || interactions.selectedView.value === 'bridge') return selectedSpouseOption.value ? `与 ${selectedSpouseOption.value.person.name} 的家庭连接` : ''
  return data.graph.value.hidden_relation_count ? '点击图中分支入口，继续探索旁支。' : '点击人物，阅读更多家族记忆。'
})

// --- 搜索与中心人物 --- //

/** 将关系范围与世代方向分开；父系首次进入时使用纵向阅读。 */
async function changeReadingMode(mode) {
  if (mode === readingMode.value) return
  const previous = readingMode.value
  const previousDirection = layoutDirection.value
  const hadOpenedPaternal = hasOpenedPaternal
  const request = viewRequest + 1
  readingMode.value = mode
  if (mode === 'paternal' && !hasOpenedPaternal) { changeDirection('vertical'); hasOpenedPaternal = true }
  const loaded = await requestView('mainline')
  if (!loaded && request === viewRequest && !centerModalOpen.value) {
    readingMode.value = previous
    hasOpenedPaternal = hadOpenedPaternal
    changeDirection(previousDirection)
  }
}

/** 保存阅读方向，横向布局仍保持姓名正向。 */
function changeDirection(direction) {
  layoutDirection.value = direction
  localStorage.setItem('familytree:layoutDirection', direction)
}

/** 每次都由原始全景投影展开或收起一个支系，不重复聚合已投影的数据。 */
function toggleOverviewBranch(branchId) {
  expandedBranches.value = expandedBranches.value.includes(branchId) ? expandedBranches.value.filter(id => id !== branchId) : [...expandedBranches.value, branchId]
  interactions.clearSelection()
}

/** 一次展开当前范围内所有人物及原始关系。 */
function expandAllBranches() { expandedBranches.value = overviewInfo.value.branches.map(branch => branch.id); interactions.clearSelection() }

/** 回到支系摘要地图，人物和家庭事实仍保存在原始图谱中。 */
function collapseAllBranches() { expandedBranches.value = []; interactions.clearSelection() }

/** 搜索人物并只保留最新关键词的结果。 */
async function handleSearch() {
  const request = ++searchRequest
  try {
    const results = await data.searchPeople(interactions.searchKeyword.value)
    if (request !== searchRequest) return
    interactions.searchResults.value = results
    searchHasRun.value = Boolean(interactions.searchKeyword.value.trim())
  } catch (error) { showError(error) }
}

/** 展示已有名册并预选当前中心人物。 */
function openCenterModal(view = 'mainline') {
  pendingView.value = view
  selectedCenterCandidate.value = data.centerContext.value?.person || null
  centerKeyword.value = ''
  centerCandidates.value = data.people.value.slice(0, 30)
  centerModalOpen.value = true
}

/** 按姓名搜索中心人物，空关键词恢复名册。 */
async function searchCenterPeople() {
  try { centerCandidates.value = centerKeyword.value.trim() ? await data.searchCenterCandidates(centerKeyword.value) : data.people.value.slice(0, 30) }
  catch (error) { showError(error) }
}

/** 确认人物后再关闭选择弹窗，保留接口失败时的可恢复入口。 */
async function confirmCenterPerson() {
  if (!selectedCenterCandidate.value) return
  const view = pendingView.value
  if (await applyCenterPerson(selectedCenterCandidate.value.id)) {
    centerModalOpen.value = false
    if (view !== 'mainline') await requestView(view)
  }
}

/** 将指定人物设为中心，并保留浏览历史。 */
async function applyCenterPerson(personId, targetView = 'mainline', recordHistory = true) {
  const request = ++centerRequest
  const previousContext = data.centerContext.value
  const previousId = data.centerPersonId.value
  const previousSpouse = selectedSpouseOption.value
  const previousFamily = selectedFamilyOption.value
  const previousParameter = selectedParameterOption.value
  const context = await data.loadCenterContext(personId)
  if (request !== centerRequest) return false
  if (!context) {
    data.centerContext.value = previousContext
    data.centerPersonId.value = previousId
    return false
  }
  selectedSpouseOption.value = null
  selectedFamilyOption.value = null
  selectedParameterOption.value = null
  interactions.clearSelection()
  const targetRequest = viewRequest + 1
  const loaded = await requestView(targetView)
  if (request !== centerRequest || targetRequest !== viewRequest) return false
  if (!loaded && !parameterModalOpen.value) {
    data.centerContext.value = previousContext
    data.centerPersonId.value = previousId
    selectedSpouseOption.value = previousSpouse
    selectedFamilyOption.value = previousFamily
    selectedParameterOption.value = previousParameter
    return false
  }
  localStorage.setItem('familytree:centerPersonId', personId)
  if (recordHistory && centerHistory.value.at(-1)?.id !== personId) centerHistory.value.push(context.person)
  return loaded || parameterModalOpen.value
}

/** 从搜索或人物详情开始新的中心浏览。 */
async function focusPerson(personId) {
  if (await applyCenterPerson(personId)) { interactions.searchResults.value = []; searchHasRun.value = false }
}

/** 回到上一位浏览过的中心人物。 */
async function goBackCenter() {
  if (centerHistory.value.length < 2) return
  const previous = centerHistory.value.at(-2)
  if (await applyCenterPerson(previous.id, 'mainline', false)) centerHistory.value.pop()
}

// --- 五图与参数 --- //

/** 确定参数后加载视图，失败保留原有图谱与可恢复提示。 */
async function requestView(view) {
  const request = ++viewRequest
  const centerId = data.centerPersonId.value
  if (view !== 'overview' && !centerId) { openCenterModal(view); return false }
  data.errorMessage.value = ''
  if ((view === 'inlaw' || view === 'bridge') && !selectedSpouseOption.value) {
    if (spouseOptions.value.length === 1) selectedSpouseOption.value = spouseOptions.value[0]
    else if (spouseOptions.value.length) { openParameterModal('spouse', view); return false }
    else { data.errorMessage.value = '这位人物尚未录入配偶或伴侣关系。'; return false }
  }
  if (view === 'branch' && !selectedFamilyOption.value) {
    if (familyOptions.value.length === 1) selectedFamilyOption.value = familyOptions.value[0]
    else if (familyOptions.value.length > 1) { openParameterModal('family', view); return false }
  }
  let graph = null
  if (view === 'mainline') graph = readingMode.value === 'paternal'
    ? await data.loadPaternalGraph(centerId, paternalAncestorDepth.value, paternalBranchDepth.value)
    : await data.loadMainlineGraph(centerId, ancestorDepth.value, descendantDepth.value)
  else if (view === 'inlaw') graph = await data.loadInlawGraph(centerId, selectedSpouseOption.value.person.id, branchDepth.value)
  else if (view === 'bridge') graph = await data.loadBridgeGraph(centerId, selectedSpouseOption.value.person.id, Math.min(branchDepth.value, 6), selectedSpouseOption.value.family_unit_id)
  else if (view === 'branch') graph = await data.loadBranchGraph(selectedFamilyOption.value ? 'familyUnit' : 'person', selectedFamilyOption.value?.family_unit_id || centerId, branchDepth.value)
  else if (view === 'overview') graph = await data.loadOverviewGraph('all', 1000)
  if (request !== viewRequest || !graph || data.errorMessage.value) return false
  if (view === 'overview') overviewScope.value = 'all'
  if (view !== 'mainline') readingMode.value = 'family'
  appliedDepths = depthSettings.map(setting => setting.value)
  interactions.selectedView.value = view
  interactions.clearSelection()
  return true
}

/** 在当前视图重新读取数据，保留已选的配偶及家庭参数。 */
async function refreshView() {
  const request = viewRequest + 1
  const loaded = interactions.selectedView.value === 'overview' && overviewScope.value !== 'all'
    ? await showCenterScope()
    : await requestView(interactions.selectedView.value)
  // 选择器先由 v-model 更新；读取失败时恢复已实际载入的范围，避免用新范围切旧源图。
  if (!loaded && request === viewRequest) depthSettings.forEach((setting, index) => { setting.value = appliedDepths[index] })
  return loaded
}

/** 按业务类型展示配偶或家庭选择器。 */
function openParameterModal(mode, view) {
  parameterMode.value = mode
  pendingView.value = view
  selectedParameterOption.value = mode === 'spouse' ? selectedSpouseOption.value : selectedFamilyOption.value
  parameterModalOpen.value = true
}

/** 应用已选参数并加载目标视图。 */
async function confirmParameterSelection() {
  if (!selectedParameterOption.value) return
  const previousSpouse = selectedSpouseOption.value
  const previousFamily = selectedFamilyOption.value
  const request = viewRequest + 1
  if (parameterMode.value === 'spouse') selectedSpouseOption.value = selectedParameterOption.value
  else selectedFamilyOption.value = selectedParameterOption.value
  parameterModalOpen.value = false
  const loaded = await requestView(pendingView.value)
  if (!loaded && request === viewRequest) {
    selectedSpouseOption.value = previousSpouse
    selectedFamilyOption.value = previousFamily
  }
}

/** 在全景中展示中心人物的亲缘范围。 */
async function showCenterScope() {
  if (!data.centerPersonId.value) { openCenterModal(); return false }
  const request = ++viewRequest
  const scope = `center:${data.centerPersonId.value}`
  const graph = await data.loadOverviewGraph(scope, 1000)
  if (request !== viewRequest || !graph || data.errorMessage.value) return false
  overviewScope.value = scope
  readingMode.value = 'family'
  interactions.selectedView.value = 'overview'
  interactions.clearSelection()
  return true
}

/** 按后端已定义的折叠入口继续探索对应分支。 */
async function handleCapsuleClick(capsule) {
  const previousMode = readingMode.value
  const previousSpouse = selectedSpouseOption.value
  const previousFamily = selectedFamilyOption.value
  const request = viewRequest + 1
  readingMode.value = 'family'
  let loaded = false
  if (capsule.target_view === 'branch' && capsule.root_family_unit_id) {
    selectedFamilyOption.value = { family_unit_id: capsule.root_family_unit_id }
    loaded = await requestView('branch')
  } else if (capsule.target_view === 'inlaw' && capsule.owner_person_id) {
    const spouse = spouseOptions.value.find(option => option.person.id === capsule.owner_person_id)
    if (spouse) {
      selectedSpouseOption.value = spouse
      loaded = await requestView('inlaw')
    } else if (capsule.root_family_unit_id) {
      // 祖先或子女的配偶并非中心人物的配偶；按胶囊明确给定的原生家庭浏览。
      selectedFamilyOption.value = { family_unit_id: capsule.root_family_unit_id }
      loaded = await requestView('branch')
    } else data.errorMessage.value = '该原生家庭缺少可浏览的家庭入口。'
  } else if (capsule.target_view === 'mainline' && capsule.owner_person_id) loaded = await applyCenterPerson(capsule.owner_person_id)
  else if (capsule.target_view === 'overview') loaded = await showCenterScope()
  else data.errorMessage.value = '该分支缺少可浏览的目标人物或家庭。'
  if (!loaded && viewRequest <= request) {
    readingMode.value = previousMode
    selectedSpouseOption.value = previousSpouse
    selectedFamilyOption.value = previousFamily
  }
}

// --- 工具面板与资料刷新 --- //

/** 先展示已读人物，再补齐照片与当前会话的编辑权限。 */
async function selectPerson(person) {
  const request = ++personRequest
  interactions.selectPerson(person)
  try {
    const detail = await getPersonDetail(person.id)
    if (request === personRequest && interactions.selectedPersonId.value === person.id) interactions.selectPerson({ ...person, ...detail })
  } catch (error) { if (request === personRequest) showError(error) }
}

/** 以已验证的本人或管理员权限打开人物资料编辑。 */
function editPersonProfile(person) { profilePersonId.value = person.id; profileOpen.value = true }

/** 从导航进入当前账号绑定的个人资料。 */
function openOwnProfile() { profilePersonId.value = null; profileOpen.value = true }

/** 保持当前人物作为关系查询的起点。 */
function openRelationPanel(person = null) {
  if (person?.id) interactions.selectPerson(person)
  interactions.isRelationPanelOpen.value = true
}

/** 读取诊断失败时在工作区展示可追踪的原因。 */
async function loadIssues() {
  try { await data.loadIssues() }
  catch (error) { showError(error) }
}

/** 打开管理员图谱诊断面板。 */
async function openAdminPanel() { interactions.isAdminPanelOpen.value = true; await loadIssues() }

/** 更新资料后重建上下文，删除当前人物则回到选择入口。 */
async function refreshAfterChanges() {
  await data.loadPeople()
  const personId = data.centerPersonId.value
  if (!personId || !data.people.value.some(person => person.id === personId)) {
    data.centerPersonId.value = null
    data.centerContext.value = null
    data.graph.value = { nodes: [], edges: [], warnings: [], view_mode: 'mainline', view_context: null }
    interactions.clearSelection()
    openCenterModal()
    return
  }
  await data.loadCenterContext(personId)
  selectedSpouseOption.value = null
  selectedFamilyOption.value = null
  await refreshView()
}

/** 从已确认的接口错误结构提取可显示的错误信息。 */
function showError(error) { data.errorMessage.value = error.response?.data?.detail || error.message }

/** 加载真实名册并恢复有效中心人物，不在有绑定时弹出重复选择器。 */
onMounted(async () => {
  await data.loadPeople()
  const stored = localStorage.getItem('familytree:centerPersonId')
  const bound = props.currentUser?.person_id
  const candidate = [stored, bound].find(id => id && data.people.value.some(person => person.id === id))
  if (candidate) await applyCenterPerson(candidate)
  else openCenterModal()
})
</script>

<style scoped>
.family-graph-view { height: 100vh; height: 100dvh; min-height: 0; display: grid; grid-template-rows: auto minmax(0, 1fr); background: var(--paper); }
.workspace { min-height: 0; display: grid; grid-template-columns: 220px minmax(0, 1fr); gap: 18px; padding: 22px; }
.workspace.has-detail { grid-template-columns: 220px minmax(0, 1fr) 312px; }
.left-rail { min-height: 0; display: flex; flex-direction: column; gap: 16px; overflow-y: auto; scrollbar-width: thin; padding-right: 2px; }
.status-card { padding: 5px 2px 16px; border-bottom: 1px solid var(--line); }
.eyebrow { color: var(--copper); font-size: 10px; letter-spacing: .08em; }
.status-card > strong { display: block; font-size: 24px; font-weight: 550; margin-top: 15px; letter-spacing: -.04em; }
.status-card > p { color: var(--muted); font-size: 12px; line-height: 1.8; margin: 10px 0 18px; }
.observer { display: flex; align-items: center; gap: 10px; }
.observer-avatar { flex-shrink: 0; display: grid; place-items: center; width: 38px; height: 42px; background: #e4ebe0; color: var(--green); border-radius: 9px; font: 22px 'SimSun', serif; }
.observer div { min-width: 0; }
.observer small { display: block; font-size: 9px; color: var(--muted); }
.observer b { display: block; margin-top: 4px; font-size: 14px; font-weight: 550; }
.observer button { margin-left: auto; padding: 5px; color: var(--green); font-size: 11px; border: 0; background: transparent; }
.scope-summary { display: flex; gap: 14px; margin-top: 20px; font-size: 11px; color: var(--muted); }
.scope-summary b { font-size: 18px; font-weight: 500; color: var(--ink); margin-right: 3px; }
.context-hint { display: block; margin-top: 9px; font-size: 10px; color: #879488; line-height: 1.6; }
.explore-card { padding: 16px; background: #ffffffae; border: 1px solid var(--line); border-radius: 12px; }
.reading-switch { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 4px; padding: 3px; border: 1px solid var(--line); border-radius: 9px; background: #f5f7f1; margin: 0 0 12px; }
.reading-switch button { min-width: 0; padding: 8px 3px; border: 0; border-radius: 6px; color: var(--muted); background: transparent; font: inherit; font-size: 11px; cursor: pointer; }
.reading-switch button[aria-pressed="true"] { color: #fff; background: var(--green); }
.reading-switch button:disabled { opacity: .5; cursor: wait; }
.reading-note { margin: 0 0 12px; color: var(--muted); font-size: 11px; line-height: 1.7; overflow-wrap: anywhere; }
.paternal-controls { margin-bottom: 12px; }
.branch-browser { flex-shrink: 0; }
.branch-count { margin: 0 0 10px; color: var(--muted); font-size: 11px; }
.branch-options { display: grid; gap: 5px; max-height: 280px; overflow-y: auto; }
.branch-options button { display: grid; gap: 5px; width: 100%; padding: 10px; border: 1px solid var(--line); border-radius: 7px; color: var(--ink); background: #fff; text-align: left; cursor: pointer; }
.branch-options button[aria-expanded="true"] { border-color: var(--green); background: var(--green-soft); }
.branch-options strong { font-size: 11px; font-weight: 550; overflow-wrap: anywhere; }
.branch-options span { color: var(--muted); font-size: 10px; }
h3 { margin: 0 0 14px; font-size: 12px; font-weight: 600; color: var(--ink); }
.depth-controls { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
label { display: grid; gap: 7px; color: var(--muted); font-size: 10px; }
select { min-width: 0; width: 100%; padding: 8px 3px; font-size: 11px; border: 1px solid var(--line); border-radius: 7px; background: #fff; color: var(--ink); }
.context-button { width: 100%; display: flex; justify-content: space-between; align-items: center; margin-top: 13px; padding: 11px 0; text-align: left; font-size: 11px; border: 0; border-top: 1px solid var(--line); background: transparent; color: var(--green); }
.navigation-actions { display: flex; justify-content: space-between; gap: 6px; margin-top: 10px; }
.navigation-actions button, .overview-scope button { border: 0; background: transparent; color: var(--green); font-size: 10px; padding: 5px 0; }
.navigation-actions button:disabled { color: #afb8af; cursor: default; }
.overview-scope p { color: var(--muted); font-size: 11px; line-height: 1.7; margin: 0; }
.error-card { padding: 12px; display: flex; align-items: flex-start; gap: 5px; color: #9a4b40; background: #fff2ed; border: 1px solid #efd9d1; border-radius: 10px; font-size: 11px; line-height: 1.7; overflow-wrap: anywhere; }
.error-card button { margin-left: auto; border: 0; background: transparent; color: #9a4b40; }
.search-results { display: grid; align-content: start; gap: 5px; }
.section-heading { display: flex; justify-content: space-between; }
.section-heading button { border: 0; background: transparent; color: var(--muted); }
.section-heading h3 { margin: 0 0 5px; }
.section-heading h3 small { margin-left: 6px; color: var(--muted); }
.search-results > button { display: flex; justify-content: space-between; gap: 8px; padding: 11px 10px; border: 1px solid var(--line); border-radius: 7px; color: var(--ink); background: #fff; font-size: 12px; text-align: left; }
.search-results > button:hover { background: var(--green-soft); border-color: #b4cbb9; }
.search-results small { color: var(--muted); font-size: 10px; }
.search-results p, .warning-card p { color: var(--muted); font-size: 11px; line-height: 1.7; }
.warning-card { padding: 14px; border: 1px solid #e7dfc9; background: #faf6e8; border-radius: 10px; }
.warning-card h3 { margin-bottom: 8px; }
.archive-note { margin: auto 0 0; padding: 24px 4px 8px; color: #a0a99e; line-height: 1.9; font: 12px/1.9 'SimSun', serif; }
.canvas-area { min-height: 0; width: 100%; height: 100%; }
@media (max-width: 1250px) { .workspace { padding: 16px; gap: 14px; grid-template-columns: 195px minmax(0, 1fr); } .workspace.has-detail { grid-template-columns: 180px minmax(0, 1fr) 312px; } }
@media (max-width: 1040px) { .workspace.has-detail { grid-template-columns: 195px minmax(0, 1fr); } }
@media (max-width: 900px) {
  .family-graph-view { height: auto; min-height: 100dvh; grid-template-rows: auto 1fr; }
  .workspace, .workspace.has-detail { grid-template-columns: minmax(0, 1fr); grid-template-rows: auto minmax(520px, 70dvh); padding: 14px; }
  .left-rail { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); align-items: start; overflow: visible; padding: 0; gap: 12px; }
  .status-card { padding: 0; border: 0; }
  .status-card > strong { font-size: 21px; margin-top: 8px; }
  .status-card > p { margin: 7px 0 9px; font-size: 11px; }
  .observer, .context-hint, .archive-note { display: none; }
  .scope-summary { margin-top: 8px; }
  .explore-card { padding: 11px; }
  .explore-card h3 { margin-bottom: 8px; }
  .context-button { margin-top: 7px; padding-block: 7px; }
  .search-results, .warning-card, .error-card { grid-column: 1 / -1; }
  .branch-browser { grid-column: 1 / -1; }
  .branch-options { grid-template-columns: repeat(2, minmax(0, 1fr)); max-height: 160px; }
  .search-results { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .section-heading, .search-results > p { grid-column: 1 / -1; }
}
@media (max-width: 430px) { .workspace, .workspace.has-detail { padding: 10px; gap: 12px; } .left-rail { grid-template-columns: minmax(0, 1fr); } .scope-summary { margin-top: 6px; } .status-card > p { margin-bottom: 3px; } }
</style>
