<template>
  <div class="relationship-manager admin-form">
    <header class="relations-heading"><div><p class="eyebrow">独立亲缘事实</p><h3>亲子与配偶关系</h3><p class="muted">家庭之外的亲缘可在这里录入；来自家庭的关系请通过家庭成员纠错。</p></div><button type="button" class="primary" :disabled="busy" @click="startRelation()">+ 录入关系</button></header>
    <p v-if="error" class="notice error" role="alert">{{ error }}</p>
    <form v-if="adding" class="relation-form" @submit.prevent="saveRelation">
      <div class="section-heading"><h4>{{ editing ? '编辑关系属性' : '录入独立关系' }}</h4><button type="button" class="text-button" :disabled="busy" @click="adding = false">收起</button></div>
      <div class="field-grid">
        <label>关系类型<select v-model="form.relationship_type" :disabled="editing || busy"><option value="parent_child">亲子关系</option><option value="spouse">配偶关系</option></select></label>
        <label v-if="form.relationship_type === 'parent_child'">亲缘类型<select v-model="form.relation_kind" :disabled="editing || busy"><option v-for="(name, kind) in relationKindNames" :key="kind" :value="kind">{{ name }}</option></select></label>
        <PersonLookup v-model="form.person_id" :people="people" :exclude-ids="form.target_person_id ? [form.target_person_id] : []" :label="form.relationship_type === 'parent_child' ? '父母' : '人物一'" input-id="relationship-from" required :disabled="editing || busy" />
        <PersonLookup v-model="form.target_person_id" :people="people" :exclude-ids="form.person_id ? [form.person_id] : []" :label="form.relationship_type === 'parent_child' ? '子女' : '人物二'" input-id="relationship-to" required :disabled="editing || busy" />
        <template v-if="form.relationship_type === 'parent_child'">
          <label>父母身份<select v-model="form.side"><option value="parent">父母（未分父系母系）</option><option value="father">父亲</option><option value="mother">母亲</option></select></label>
          <label>可信度（0–100%）<input v-model.number="form.certaintyPercent" type="number" min="0" max="100" step="1" /></label>
        </template>
        <label v-else>显示顺序<input v-model.number="form.display_order" type="number" step="1" /></label>
      </div>
      <div class="form-actions"><button type="button" class="secondary" :disabled="busy" @click="adding = false">取消</button><button class="primary" :disabled="busy || !form.person_id || !form.target_person_id">{{ busy ? '保存中…' : '保存关系' }}</button></div>
    </form>

    <div class="relation-tools"><input v-model="keyword" type="search" placeholder="搜索人物姓名" aria-label="搜索关系人物" /><select v-model="filter" aria-label="筛选关系类型"><option value="all">全部关系</option><option value="parent_child">亲子关系</option><option value="spouse">配偶关系</option></select><span>{{ filteredRelations.length }} 条</span></div>
    <div v-if="!filteredRelations.length" class="empty-list">{{ keyword ? '没有匹配的关系。' : '尚无亲子或配偶关系。可先建立家庭，或录入独立亲缘事实。' }}</div>
    <div v-for="relation in filteredRelations" :key="relation.id" class="relation-row">
      <div class="relation-people"><strong>{{ personName(relation.person_id) }}</strong><span class="relation-tag">{{ relation.relationship_type === 'spouse' ? '配偶' : `${sideNames[relation.side || 'parent']} → ${relationKindNames[relation.relation_kind]}` }}</span><strong>{{ personName(relation.target_person_id) }}</strong></div>
      <div class="relation-meta"><span v-if="relation.derived_from_family" class="source-tag">家庭派生</span><span v-else class="source-tag independent">独立记录</span><small v-if="relation.relationship_type === 'parent_child'">可信度 {{ Math.round(relation.certainty * 100) }}%</small></div>
      <div class="relation-actions">
        <template v-if="relation.derived_from_family"><button v-for="familyId in relation.source_family_ids" :key="familyId" type="button" class="text-button" :disabled="busy" @click="$emit('select-family', familyId)">前往家庭</button></template>
        <template v-else><button type="button" class="text-button" :disabled="busy" @click="startRelation(relation)">编辑</button><button type="button" class="text-button danger-text" :disabled="busy" @click="removeTarget = relation">移除</button></template>
      </div>
    </div>
    <div v-if="removeTarget" class="relation-confirm-backdrop">
      <div class="confirm-card" role="alertdialog" aria-modal="true" aria-label="确认移除亲缘关系">
        <strong>移除 {{ personName(removeTarget.person_id) }} 与 {{ personName(removeTarget.target_person_id) }} 的{{ removeTarget.relationship_type === 'spouse' ? '配偶' : relationKindNames[removeTarget.relation_kind] + '亲子' }}关系？</strong>
        <p>仅移除此条亲缘事实，两人的人物资料均会保留。</p>
        <div class="form-actions"><button type="button" class="secondary" :disabled="busy" @click="removeTarget = null">取消</button><button type="button" class="danger-button" :disabled="busy" @click="removeRelation">确认移除关系</button></div>
      </div>
    </div>
  </div>
</template>

<script setup>
/** 浏览、编辑独立亲缘事实，并将家庭派生关系引导到原家庭纠错。 */
import { computed, reactive, ref } from 'vue'
import PersonLookup from './PersonLookup.vue'
import { createRelationship } from '../../../api/relationships'
import { deleteManagementRelationship, managementErrorMessage } from '../../../api/management'

const props = defineProps({ people: { type: Array, default: () => [] }, relationships: { type: Array, default: () => [] } })
const emit = defineEmits(['saved', 'busy', 'select-family'])
const relationKindNames = { biological: '生育', adoptive: '收养', step: '继亲', unknown: '待确认' }
const sideNames = { father: '父亲', mother: '母亲', parent: '父母' }
const keyword = ref('')
const filter = ref('all')
const adding = ref(false)
const editing = ref(false)
const busy = ref(false)
const error = ref('')
const removeTarget = ref(null)
const form = reactive({})
const namesById = computed(() => new Map(props.people.map(person => [person.id, person.name])))
const filteredRelations = computed(() => props.relationships.filter(relation => {
  if (!['parent_child', 'spouse'].includes(relation.relationship_type)) return false
  if (filter.value !== 'all' && relation.relationship_type !== filter.value) return false
  const query = keyword.value.trim().toLocaleLowerCase()
  return !query || [personName(relation.person_id), personName(relation.target_person_id)].some(name => name.toLocaleLowerCase().includes(query))
}))

// --- 清单显示与关系表单 --- //

/** 从完整人物清单解析端点姓名。 */
function personName(personId) {
  return namesById.value.get(personId) || personId
}

/** 初始化独立关系表单，已有关系保持稳定端点与亲缘类型。 */
function startRelation(relation = null) {
  adding.value = true
  editing.value = Boolean(relation)
  error.value = ''
  Object.assign(form, { relationship_type: relation?.relationship_type || 'parent_child', person_id: relation?.person_id || '', target_person_id: relation?.target_person_id || '', relation_kind: relation?.relation_kind || 'biological', side: relation?.side || 'parent', display_order: relation?.display_order ?? 0, certaintyPercent: Math.round((relation?.certainty ?? 1) * 100) })
}

/** 控制请求状态并通知父面板防止切换编辑目标。 */
function setBusy(value) {
  busy.value = value
  emit('busy', value)
}

// --- 关系写入与删除 --- //

/** 保存独立关系，亲子类型与端点组成事实身份，重复提交更新其属性。 */
async function saveRelation() {
  if (busy.value) return
  if (form.person_id === form.target_person_id) { error.value = '请选择两个不同的人物'; return }
  setBusy(true)
  error.value = ''
  const payload = { relationship_type: form.relationship_type, person_id: form.person_id, target_person_id: form.target_person_id }
  if (form.relationship_type === 'parent_child') Object.assign(payload, { side: form.side, relation_kind: form.relation_kind, certainty: form.certaintyPercent / 100 })
  else payload.display_order = form.display_order
  try {
    await createRelationship(payload)
    adding.value = false
    emit('saved')
  } catch (failure) {
    error.value = managementErrorMessage(failure)
  } finally {
    setBusy(false)
  }
}

/** 明确确认后删除独立关系，不影响人物档案。 */
async function removeRelation() {
  if (busy.value || !removeTarget.value) return
  setBusy(true)
  error.value = ''
  try {
    await deleteManagementRelationship(removeTarget.value.id)
    removeTarget.value = null
    emit('saved')
  } catch (failure) {
    error.value = managementErrorMessage(failure)
  } finally {
    setBusy(false)
  }
}
</script>

<style scoped>
.relationship-manager { padding: 28px; }
.relations-heading { display: flex; align-items: start; justify-content: space-between; gap: 24px; margin-bottom: 24px; }
.relations-heading .muted { max-width: 500px; margin-bottom: 0; }
.relations-heading > button { flex-shrink: 0; }
.relation-form { padding: 22px; background: #f7f9f4; border: 1px solid #d4dfd1; border-radius: 12px; margin-bottom: 24px; }
.section-heading { display: flex; align-items: center; justify-content: space-between; margin-bottom: 22px; }
h4 { margin: 0; font-size: 14px; }
.relation-tools { display: flex; align-items: center; gap: 10px; padding-bottom: 16px; border-bottom: 1px solid #e3e9df; }
.relation-tools input { max-width: 290px; }
.relation-tools select { width: auto; }
.relation-tools > span { margin-left: auto; color: #86917c; white-space: nowrap; font-size: 12px; }
.relation-row { padding: 18px 0; border-bottom: 1px solid #edf0e9; }
.relation-people { display: flex; align-items: center; flex-wrap: wrap; gap: 10px; font-size: 14px; }
.relation-tag { font-size: 11px; color: #85917b; }
.relation-meta { display: flex; align-items: center; gap: 12px; margin-top: 10px; }
.relation-meta small { color: #87937f; font-size: 11px; }
.source-tag { padding: 3px 6px; border: 1px solid #dde6d8; border-radius: 4px; color: #739064; font-size: 10px; }
.source-tag.independent { border-color: #e9e0d3; color: #9a886b; }
.relation-actions { display: flex; justify-content: flex-end; gap: 14px; }
.relation-confirm-backdrop { position: fixed; inset: 0; z-index: 2; display: grid; place-items: center; padding: 22px; background: #203b3244; }
.relation-confirm-backdrop .confirm-card { max-width: 430px; box-shadow: 0 20px 80px #203b3230; }
@media (max-width: 600px) { .relationship-manager { padding: 20px; } .relations-heading { flex-direction: column; gap: 14px; } .relation-form { padding: 15px; } .relation-tools { flex-wrap: wrap; } .relation-tools input { flex: 1; min-width: 140px; } }
</style>
