<template>
  <div class="family-graph-view">
    <GraphToolbar
      v-model="interactions.selectedView.value"
      v-model:search-keyword="interactions.searchKeyword.value"
      :is-admin="isAdmin"
      @search="handleSearch"
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
        :graph="data.graph.value"
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
  </div>
</template>

<script setup>
/**
 * 族谱系统主视图。
 */
import { computed, onMounted } from 'vue'
import GraphIssuePanel from '../components/admin/GraphIssuePanel.vue'
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

const viewLabels = {
  mainline: '本家主线图',
  inlaw: '姻亲谱系图',
  bridge: '联姻桥接图',
  path: '关系路径图',
  branch: '后代分支图',
  overview: '家族全景图'
}

const viewHints = {
  mainline: '围绕中心人物展示祖先、后代、配偶和必要家庭单元。',
  inlaw: '点击配偶后可切换为配偶原生家族主线。',
  bridge: '有限展示两边家族，通过婚姻桥接点解释联姻。',
  path: '只展示两个人之间的关键关系路径。',
  branch: '从某个祖先或家庭单元向下展开后代分支。',
  overview: '管理员排查孤立节点、重复人物和异常关系。'
}

const currentViewLabel = computed(() => viewLabels[interactions.selectedView.value] || '本家主线图')
const currentViewHint = computed(() => viewHints[interactions.selectedView.value] || viewHints.mainline)

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
  await interactions.focusPerson(personId)
  interactions.searchResults.value = []
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
 * 进入页面时加载默认图谱。
 */
onMounted(async () => {
  const people = await data.loadPeople()
  const defaultPersonId = normalizePersonId(props.currentUser?.person_id) || people[0]?.id || ''
  if (!defaultPersonId) return

  try {
    await data.loadFocusGraph(defaultPersonId)
  } catch {
    if (people[0]?.id && people[0].id !== defaultPersonId) {
      await data.loadFocusGraph(people[0].id)
    }
  }
})

/**
 * 兼容旧账号绑定的 SQL 自增 ID。
 */
function normalizePersonId(personId) {
  if (!personId) return ''
  const value = String(personId)
  return /^\d+$/.test(value) ? `legacy:${value}` : value
}
</script>

<style scoped>
.family-graph-view {
  min-height: 100vh;
  display: grid;
  grid-template-rows: auto 1fr;
  background:
    linear-gradient(120deg, rgba(105, 70, 39, 0.09), transparent 34%),
    repeating-linear-gradient(90deg, rgba(111, 78, 55, 0.035) 0 1px, transparent 1px 52px),
    #f8f0e2;
}

.workspace {
  min-height: 0;
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr) auto;
  gap: 18px;
  padding: 18px;
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
  color: #342719;
  background: rgba(255, 250, 240, 0.9);
  box-shadow: 0 16px 40px rgba(87, 61, 34, 0.08);
  animation: cardRise 0.5s ease both;
}

.status-card span {
  color: #9a8068;
  font-size: 12px;
}

.status-card strong {
  display: block;
  margin-top: 5px;
  font-size: 20px;
}

.status-card p,
.warning-card p {
  color: #725940;
  line-height: 1.7;
}

.error-card {
  color: #9b2c2c;
  background: #fff0ec;
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
  border: 0;
  border-radius: 14px;
  padding: 11px 12px;
  color: #463422;
  background: #fff5e2;
  cursor: pointer;
}

.search-results small {
  color: #9a8068;
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
  }

  .left-rail {
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  }
}
</style>
