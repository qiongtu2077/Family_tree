<template>
  <div class="family-editor admin-form">
    <div class="editor-heading"><p class="eyebrow">家庭与成员</p><h3>{{ family ? '编辑家庭资料' : '建立一个家庭' }}</h3></div>
    <p v-if="error" class="notice error" role="alert">{{ error }}</p>
    <form class="field-grid" @submit.prevent="saveFamily">
      <label>家庭类型<select v-model="form.family_type"><option v-for="(name, type) in familyTypeNames" :key="type" :value="type">{{ name }}</option></select></label>
      <label>显示顺序<input v-model.number="form.display_order" type="number" step="1" /></label>
      <label>开始日期<input v-model="form.start_date" type="date" :max="form.end_date || undefined" /></label>
      <label>结束日期<input v-model="form.end_date" type="date" :min="form.start_date || undefined" /></label>
      <div class="form-actions wide"><small>{{ family ? `家庭 ID · ${family.id}` : '先创建家庭，再添加父母 / 伴侣和子女。' }}</small><button class="primary" :disabled="busy">{{ busy ? '保存中…' : family ? '保存家庭资料' : '创建家庭' }}</button></div>
    </form>

    <template v-if="family">
      <section class="member-section">
        <div class="section-heading"><h4>父母 / 伴侣 <small>{{ family.partners.length }}</small></h4><button type="button" class="text-button" :disabled="busy" @click="startMember('partner')">+ 添加成员</button></div>
        <p v-if="!family.partners.length" class="muted">尚未录入父母或伴侣。</p>
        <div v-for="member in family.partners" :key="member.person_id" class="member-row">
          <span class="member-avatar">{{ personName(member.person_id).slice(0, 1) }}</span>
          <span class="member-info"><strong>{{ personName(member.person_id) }}</strong><small>显示顺序 {{ member.display_order }}</small></span>
          <button type="button" class="text-button" :disabled="busy" @click="startMember('partner', member)">编辑</button>
          <button type="button" class="text-button danger-text" :disabled="busy" @click="removeTarget = member">移除</button>
        </div>
      </section>
      <section class="member-section">
        <div class="section-heading"><h4>子女 <small>{{ family.children.length }}</small></h4><button type="button" class="text-button" :disabled="busy" @click="startMember('child')">+ 添加子女</button></div>
        <p v-if="!family.children.length" class="muted">尚未录入子女。</p>
        <div v-for="member in family.children" :key="member.person_id" class="member-row">
          <span class="member-avatar">{{ personName(member.person_id).slice(0, 1) }}</span>
          <span class="member-info"><strong>{{ personName(member.person_id) }}</strong><small>{{ relationKindNames[member.relation_kind] }} · 出生顺序 {{ member.birth_order }} · 可信度 {{ Math.round(member.certainty * 100) }}%</small></span>
          <button type="button" class="text-button" :disabled="busy" @click="startMember('child', member)">编辑</button>
          <button type="button" class="text-button danger-text" :disabled="busy" @click="removeTarget = member">移除</button>
        </div>
      </section>

      <div v-if="removeTarget" class="confirm-card" role="alertdialog" aria-label="确认移除家庭成员">
        <strong>将 {{ personName(removeTarget.person_id) }} 移出这个家庭？</strong>
        <p>人物资料保留。明确由此家庭派生的亲子 / 配偶关系会同步更新；历史亲子 / 配偶关系需在关系页另行移除。</p>
        <div class="form-actions"><button type="button" class="secondary" :disabled="busy" @click="removeTarget = null">取消</button><button type="button" class="danger-button" :disabled="busy" @click="removeMember">确认移除</button></div>
      </div>

      <form v-if="memberMode" class="member-form" @submit.prevent="saveMember">
        <div class="section-heading"><h4>{{ editingMember ? '编辑' : '添加' }}{{ memberMode === 'partner' ? '父母 / 伴侣' : '子女' }}</h4><button type="button" class="text-button" :disabled="busy" @click="memberMode = ''">收起</button></div>
        <PersonLookup v-model="memberForm.person_id" :people="people" :exclude-ids="oppositeMemberIds" :label="memberMode === 'partner' ? '父母 / 伴侣' : '子女'" input-id="family-member-lookup" required :disabled="busy || editingMember" />
        <div class="field-grid compact-grid">
          <label v-if="memberMode === 'partner'">显示顺序<input v-model.number="memberForm.display_order" type="number" step="1" /></label>
          <template v-else>
            <label>亲缘类型<select v-model="memberForm.relation_kind"><option v-for="(name, kind) in relationKindNames" :key="kind" :value="kind">{{ name }}</option></select></label>
            <label>出生顺序<input v-model.number="memberForm.birth_order" type="number" min="0" step="1" /></label>
            <label>可信度（0–100%）<input v-model.number="memberForm.certaintyPercent" type="number" min="0" max="100" step="1" /></label>
          </template>
        </div>
        <div class="form-actions"><button type="button" class="secondary" :disabled="busy" @click="memberMode = ''">取消</button><button class="primary" :disabled="busy || !memberForm.person_id">{{ busy ? '保存中…' : '保存家庭成员' }}</button></div>
      </form>
      <p class="family-note">婚姻和伴侣家庭会生成配偶关系；家庭中的父母与子女会生成对应类型的亲子关系。历史亲子 / 配偶关系需在关系页另行移除。</p>
    </template>
  </div>
</template>

<script setup>
/** 维护家庭属性、父母伴侣成员、子女顺序与亲缘类型。 */
import { computed, reactive, ref, watch } from 'vue'
import PersonLookup from './PersonLookup.vue'
import { createFamilyUnit, createRelationship } from '../../../api/relationships'
import { deleteManagementRelationship, managementErrorMessage, updateManagementFamily } from '../../../api/management'

const props = defineProps({ family: { type: Object, default: null }, people: { type: Array, default: () => [] } })
const emit = defineEmits(['saved', 'busy'])
const familyTypeNames = { marriage: '婚姻家庭', partner: '伴侣家庭', single_parent: '单亲家庭', unknown_parent: '未知父母', adoptive: '收养家庭' }
const relationKindNames = { biological: '生育', adoptive: '收养', step: '继亲', unknown: '待确认' }
const form = reactive({})
const memberForm = reactive({})
const memberMode = ref('')
const editingMember = ref(false)
const busy = ref(false)
const error = ref('')
const removeTarget = ref(null)
const oppositeMemberIds = computed(() => (memberMode.value === 'partner' ? props.family.children : props.family.partners).map(member => member.person_id))

// --- 家庭资料与请求状态 --- //

/** 从完整人物清单取得姓名，历史残缺端点显示其稳定 ID。 */
function personName(personId) {
  return props.people.find(person => person.id === personId)?.name || personId
}

/** 载入家庭属性，切换家庭时清除未提交的成员表单。 */
function resetForm(family) {
  Object.assign(form, { family_type: family?.family_type || 'marriage', start_date: family?.start_date || '', end_date: family?.end_date || '', display_order: family?.display_order ?? 0 })
  memberMode.value = ''
  removeTarget.value = null
  error.value = ''
}

/** 控制请求期间的表单和上层选项，避免编辑目标在请求途中变化。 */
function setBusy(value) {
  busy.value = value
  emit('busy', value)
}

/** 创建或更新家庭，创建返回图谱前缀时按明确契约移除一次。 */
async function saveFamily() {
  if (busy.value) return
  setBusy(true)
  error.value = ''
  const payload = { family_type: form.family_type, start_date: form.start_date || null, end_date: form.end_date || null, display_order: form.display_order }
  try {
    if (props.family) {
      const saved = await updateManagementFamily(props.family.id, payload)
      emit('saved', saved.id)
    } else {
      const saved = await createFamilyUnit(payload)
      emit('saved', saved.id.slice('family:'.length))
    }
  } catch (failure) {
    error.value = managementErrorMessage(failure)
  } finally {
    setBusy(false)
  }
}

// --- 成员录入与纠错 --- //

/** 打开成员录入，已有成员使用同一幂等接口修改排序和亲缘属性。 */
function startMember(mode, member = null) {
  memberMode.value = mode
  editingMember.value = Boolean(member)
  error.value = ''
  removeTarget.value = null
  Object.assign(memberForm, { person_id: member?.person_id || '', display_order: member?.display_order ?? props.family.partners.length, birth_order: member?.birth_order ?? props.family.children.length + 1, relation_kind: member?.relation_kind || (props.family.family_type === 'adoptive' ? 'adoptive' : 'biological'), certaintyPercent: Math.round((member?.certainty ?? 1) * 100) })
}

/** 按 partner/child 的不同必填字段写入家庭成员，并刷新派生关系。 */
async function saveMember() {
  if (busy.value || !memberForm.person_id) return
  setBusy(true)
  error.value = ''
  const payload = memberMode.value === 'partner'
    ? { relationship_type: 'partner', person_id: memberForm.person_id, family_unit_id: props.family.id, display_order: memberForm.display_order }
    : { relationship_type: 'child', target_person_id: memberForm.person_id, family_unit_id: props.family.id, birth_order: memberForm.birth_order, relation_kind: memberForm.relation_kind, certainty: memberForm.certaintyPercent / 100 }
  try {
    await createRelationship(payload)
    memberMode.value = ''
    emit('saved', props.family.id)
  } catch (failure) {
    error.value = managementErrorMessage(failure)
  } finally {
    setBusy(false)
  }
}

/** 用户明确确认后移除成员及只由该成员关系支持的派生事实。 */
async function removeMember() {
  if (busy.value || !removeTarget.value) return
  setBusy(true)
  error.value = ''
  try {
    await deleteManagementRelationship(removeTarget.value.relationship_id)
    removeTarget.value = null
    emit('saved', props.family.id)
  } catch (failure) {
    error.value = managementErrorMessage(failure)
  } finally {
    setBusy(false)
  }
}

watch(() => props.family, resetForm, { immediate: true })
</script>

<style scoped>
.family-editor { padding: 28px; }
.editor-heading { margin-bottom: 24px; }
.member-section { padding-top: 26px; margin-top: 25px; border-top: 1px solid #e5ebe2; }
.section-heading { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 14px; }
h4 { margin: 0; font-size: 14px; font-weight: 600; }
h4 small { margin-left: 8px; color: #94a08e; font-weight: 400; }
.member-row { display: flex; align-items: center; gap: 11px; border-top: 1px solid #edf0e9; padding: 13px 0; }
.member-avatar { width: 34px; height: 34px; display: grid; place-items: center; border-radius: 50%; background: #f0f3e9; color: #6c7b58; font-family: serif; font-size: 14px; flex-shrink: 0; }
.member-info { display: grid; gap: 5px; flex: 1; min-width: 0; }
.member-info strong { font-size: 14px; overflow-wrap: anywhere; }
.member-info small { color: #899482; font-size: 11px; }
.member-form { padding: 20px; margin-top: 24px; border-radius: 12px; border: 1px solid #d4dfd1; background: #f7f9f4; }
.compact-grid { margin-top: 18px; }
.family-note { margin: 24px 0 0; font-size: 11px; color: #839078; line-height: 1.9; }
@media (max-width: 600px) { .family-editor { padding: 20px; } .member-form { padding: 15px; } .member-row { gap: 8px; } }
</style>
