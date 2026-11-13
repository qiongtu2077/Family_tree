<template>
  <Teleport to="body">
    <div v-if="open" class="family-data-manager" @mousedown.self="closePanel">
      <section ref="dialog" class="management-dialog" role="dialog" aria-modal="true" aria-labelledby="management-title" tabindex="-1" @keydown="handleDialogKey">
        <header class="management-header">
          <div class="management-mark" aria-hidden="true">谱</div>
          <div class="management-title"><p>FAMILY ARCHIVE</p><h2 id="management-title">家族资料管理</h2><span>让每一段关系有据可循，让每一位家人被记住。</span></div>
          <button type="button" class="close-management" aria-label="关闭资料管理" :disabled="busy || loading" @click="closePanel">×</button>
        </header>
        <nav class="management-tabs" aria-label="资料类型">
          <button v-for="item in tabs" :key="item.id" type="button" :class="{ active: tab === item.id }" :aria-current="tab === item.id ? 'page' : undefined" :disabled="busy || loading" @click="changeTab(item.id)">{{ item.label }}<span>{{ item.id === 'people' ? personRecords.length : item.id === 'families' ? familyRecords.length : directRelationCount }}</span></button>
          <button type="button" class="refresh-management" :disabled="busy || loading" @click="loadData">{{ loading ? '正在读取…' : '刷新资料' }}</button>
        </nav>
        <p v-if="error" class="management-banner error" role="alert">{{ error }}<button type="button" :disabled="busy || loading" @click="loadData">重新加载</button></p>
        <p v-if="success" class="management-banner success" role="status">{{ success }}</p>
        <div v-if="loading && !loaded" class="management-loading"><span></span><p>正在整理家族档案…</p></div>
        <div v-else class="management-body" :class="{ 'relation-body': tab === 'relationships', 'is-loading': loading }" :aria-busy="loading">
          <template v-if="tab !== 'relationships'">
            <aside class="record-sidebar">
              <div class="record-search"><input v-model="keyword" type="search" :placeholder="tab === 'people' ? '搜索姓名、生年、职业' : '搜索家庭成员姓名'" :aria-label="tab === 'people' ? '搜索人物资料' : '搜索家庭资料'" /></div>
              <button type="button" class="add-record" :disabled="busy || loading" @click="newRecord">+ {{ tab === 'people' ? '添加人物' : '建立家庭' }}</button>
              <div class="record-list" :aria-label="tab === 'people' ? '人物列表' : '家庭列表'">
                <template v-if="tab === 'people'">
                  <button v-for="person in filteredPeople" :key="person.id" type="button" class="record-button" :class="{ selected: !creating && selectedPersonId === person.id }" :disabled="busy || loading" @click="selectPerson(person.id)"><span class="record-avatar" :class="{ deceased: !person.is_alive }">{{ person.name.slice(0, 1) }}</span><span><strong>{{ person.name }}</strong><small>{{ person.birth_date ? person.birth_date.slice(0, 4) + '年生' : '生年未录' }} · {{ genderNames[person.gender] }}</small></span><span class="record-arrow" aria-hidden="true">›</span></button>
                  <p v-if="!filteredPeople.length" class="sidebar-empty">{{ keyword ? '未找到匹配人物' : '从添加第一位家人开始' }}</p>
                </template>
                <template v-else>
                  <button v-for="family in filteredFamilies" :key="family.id" type="button" class="record-button family-record" :class="{ selected: !creating && selectedFamilyId === family.id }" :disabled="busy || loading" @click="selectFamily(family.id)"><span><strong>{{ familyName(family) }}</strong><small>{{ familyTypeNames[family.family_type] }} · {{ family.children.length }} 位子女</small></span><span class="record-arrow" aria-hidden="true">›</span></button>
                  <p v-if="!filteredFamilies.length" class="sidebar-empty">{{ keyword ? '未找到匹配家庭' : '建立家庭后可添加成员' }}</p>
                </template>
              </div>
              <footer class="sidebar-footer">{{ tab === 'people' ? filteredPeople.length + ' 位家族成员' : filteredFamilies.length + ' 个家庭单元' }}</footer>
            </aside>
            <main class="record-editor">
              <PersonEditor v-if="tab === 'people' && (creating || selectedPerson)" :person="creating ? null : selectedPerson" @saved="personSaved" @busy="busy = $event" />
              <FamilyEditor v-else-if="tab === 'families' && (creating || selectedFamily)" :family="creating ? null : selectedFamily" :people="personRecords" @saved="familySaved" @busy="busy = $event" />
              <div v-else class="empty-editor"><span>谱</span><h3>在左侧选择一份档案</h3><p>人物生平、家庭成员和亲缘关系都可以在这里维护。</p></div>
              <div v-if="!creating && (tab === 'people' ? selectedPerson : selectedFamily)" class="record-danger-zone"><p>{{ tab === 'people' ? '删除人物会移除其全部家庭身份和亲缘关系。' : '删除家庭将保留所有人物资料。' }}</p><button type="button" class="text-button danger-text" :disabled="busy || loading" @click="requestDelete">{{ tab === 'people' ? '删除此人物' : '删除此家庭' }}</button></div>
            </main>
          </template>
          <RelationshipManager v-else :people="personRecords" :relationships="relationshipRecords" @saved="relationSaved" @busy="busy = $event" @select-family="jumpToFamily" />
        </div>
        <div v-if="deleteTarget" class="delete-confirmation-backdrop">
          <div class="confirm-card" role="alertdialog" aria-modal="true" aria-labelledby="delete-target-title">
            <p class="eyebrow">请确认这项变更</p><h3 id="delete-target-title">删除 {{ deleteTarget.label }}？</h3>
            <p>{{ deleteTarget.type === 'people' ? '人物资料、家庭成员身份及与此人有关的亲缘关系将一并移除。其他人物会保留，此操作无法撤销。' : '此家庭和成员身份将被移除，所有人物保留。仅清除有明确家庭来源的派生亲缘；历史亲子 / 配偶关系需在关系页另行移除。' }}</p>
            <p v-if="deleteError" class="notice error" role="alert">{{ deleteError }}</p>
            <div class="form-actions"><button type="button" class="secondary" :disabled="busy" @click="deleteTarget = null">取消</button><button type="button" class="danger-button" :disabled="busy" @click="confirmDelete">{{ busy ? '删除中…' : '确认删除' }}</button></div>
          </div>
        </div>
      </section>
    </div>
  </Teleport>
</template>

<script setup>
/** 以完整管理接口维护人物、家庭和关系，并将资料变更通知图谱。 */
import { computed, nextTick, ref, watch } from 'vue'
import PersonEditor from './management/PersonEditor.vue'
import FamilyEditor from './management/FamilyEditor.vue'
import RelationshipManager from './management/RelationshipManager.vue'
import { deletePerson } from '../../api/persons'
import { deleteManagementFamily, getManagementFamilies, getManagementPeople, getManagementRelationships, managementErrorMessage } from '../../api/management'

const props = defineProps({ open: { type: Boolean, default: false }, people: { type: Array, default: () => [] } })
const emit = defineEmits(['close', 'changed'])
const tabs = [{ id: 'people', label: '人物档案' }, { id: 'families', label: '家庭资料' }, { id: 'relationships', label: '亲缘关系' }]
const genderNames = { M: '男', F: '女', U: '未录' }
const familyTypeNames = { marriage: '婚姻家庭', partner: '伴侣家庭', single_parent: '单亲家庭', unknown_parent: '未知父母', adoptive: '收养家庭' }
const dialog = ref(null)
const tab = ref('people')
const keyword = ref('')
const personRecords = ref([...props.people])
const familyRecords = ref([])
const relationshipRecords = ref([])
const selectedPersonId = ref('')
const selectedFamilyId = ref('')
const creating = ref(false)
const loading = ref(false)
const loaded = ref(false)
const busy = ref(false)
const error = ref('')
const success = ref('')
const deleteTarget = ref(null)
const deleteError = ref('')
const selectedPerson = computed(() => personRecords.value.find(person => person.id === selectedPersonId.value))
const selectedFamily = computed(() => familyRecords.value.find(family => family.id === selectedFamilyId.value))
const namesById = computed(() => new Map(personRecords.value.map(person => [person.id, person.name])))
const directRelationCount = computed(() => relationshipRecords.value.filter(relation => ['parent_child', 'spouse'].includes(relation.relationship_type)).length)
const filteredPeople = computed(() => {
  const query = keyword.value.trim().toLocaleLowerCase()
  return personRecords.value.filter(person => !query || [person.name, person.birth_date, person.occupation].some(value => value?.toLocaleLowerCase().includes(query)))
})
const filteredFamilies = computed(() => {
  const query = keyword.value.trim().toLocaleLowerCase()
  return familyRecords.value.filter(family => !query || [...family.partners, ...family.children].some(member => personName(member.person_id).toLocaleLowerCase().includes(query)) || familyTypeNames[family.family_type].includes(query))
})

// --- 完整资料读取与视图选择 --- //

/** 同时读取三类管理数据，任一请求失败时显示后端原文而不伪造档案。 */
async function loadData() {
  if (loading.value) return
  loading.value = true
  error.value = ''
  try {
    const [people, families, relationships] = await Promise.all([getManagementPeople(), getManagementFamilies(), getManagementRelationships()])
    personRecords.value = people
    familyRecords.value = families
    relationshipRecords.value = relationships
    if (!people.some(person => person.id === selectedPersonId.value)) selectedPersonId.value = people[0]?.id || ''
    if (!families.some(family => family.id === selectedFamilyId.value)) selectedFamilyId.value = families[0]?.id || ''
    loaded.value = true
  } catch (failure) {
    error.value = managementErrorMessage(failure)
  } finally {
    loading.value = false
  }
}

/** 从完整人物表解析姓名，成员缺失时保留稳定 ID 便于排查。 */
function personName(personId) {
  return namesById.value.get(personId) || personId
}

/** 用父母或伴侣姓名为家庭提供可辨认的名称，空家庭显示短 ID。 */
function familyName(family) {
  return family.partners.length ? family.partners.map(member => personName(member.person_id)).join(' · ') : `未录成员的家庭 · ${family.id.slice(-6)}`
}

/** 切换资料类别并清除上一页的搜索和提示。 */
function changeTab(nextTab) {
  tab.value = nextTab
  keyword.value = ''
  creating.value = false
  success.value = ''
}

/** 打开人物创建表单。 */
function newRecord() {
  creating.value = true
  success.value = ''
}

/** 选择现有人物。 */
function selectPerson(personId) {
  selectedPersonId.value = personId
  creating.value = false
  success.value = ''
}

/** 选择已有家庭。 */
function selectFamily(familyId) {
  selectedFamilyId.value = familyId
  creating.value = false
  success.value = ''
}

/** 从派生关系跳转至它的原始家庭成员资料。 */
function jumpToFamily(familyId) {
  changeTab('families')
  selectFamily(familyId)
}

// --- 保存与明确删除 --- //

/** 人物保存后刷新清单、保持当前人并通知主图更新。 */
async function personSaved(person) {
  emit('changed')
  selectedPersonId.value = person.id
  creating.value = false
  await loadData()
  success.value = `已保存 ${person.name} 的人物资料。`
}

/** 家庭和成员变更后保留家庭选中，重新读取派生关系。 */
async function familySaved(familyId) {
  emit('changed')
  selectedFamilyId.value = familyId
  creating.value = false
  await loadData()
  success.value = '家庭资料已保存，亲缘关系已同步。'
}

/** 独立关系变更后刷新完整事实列表与主图。 */
async function relationSaved() {
  emit('changed')
  await loadData()
  success.value = '亲缘关系已更新。'
}

/** 展示具体目标及删除影响，等待用户明确确认。 */
function requestDelete() {
  deleteError.value = ''
  deleteTarget.value = tab.value === 'people'
    ? { type: 'people', id: selectedPerson.value.id, label: selectedPerson.value.name }
    : { type: 'families', id: selectedFamily.value.id, label: familyName(selectedFamily.value) }
}

/** 执行已确认的删除，并保留接口错误供用户检查。 */
async function confirmDelete() {
  if (busy.value || !deleteTarget.value) return
  busy.value = true
  deleteError.value = ''
  try {
    if (deleteTarget.value.type === 'people') await deletePerson(deleteTarget.value.id)
    else await deleteManagementFamily(deleteTarget.value.id)
    deleteTarget.value = null
    emit('changed')
    await loadData()
    success.value = '已删除所选资料。'
  } catch (failure) {
    deleteError.value = managementErrorMessage(failure)
  } finally {
    busy.value = false
  }
}

// --- 对话框交互 --- //

/** 关闭面板，请求处理中保持对话框打开防止重复操作。 */
function closePanel() {
  if (!busy.value && !loading.value) emit('close')
}

/** 支持 Escape，并将键盘焦点限制在当前管理对话框内。 */
function handleDialogKey(event) {
  if (event.key === 'Escape') {
    event.stopPropagation()
    if (deleteTarget.value && !busy.value) deleteTarget.value = null
    else closePanel()
  }
  if (event.key !== 'Tab') return
  const focusable = [...dialog.value.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]')].filter(element => element.offsetParent !== null)
  const first = focusable[0]
  const last = focusable[focusable.length - 1]
  if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.value)) { event.preventDefault(); last?.focus() }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
}

watch(() => props.open, async open => {
  if (!open) return
  deleteTarget.value = null
  success.value = ''
  await nextTick()
  dialog.value?.focus()
  await loadData()
}, { immediate: true })
</script>

<style src="./management/management.css"></style>
