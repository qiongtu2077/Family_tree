<template>
  <form class="person-editor" @submit.prevent="save">
    <div class="editor-heading">
      <div><p class="eyebrow">人物档案</p><h3>{{ person ? `编辑 · ${person.name}` : '添加一位家人' }}</h3></div>
      <span v-if="person" class="record-status">{{ person.is_alive ? '在世' : '已故' }}</span>
    </div>
    <p v-if="error" class="error-message" role="alert">{{ error }}</p>
    <div class="field-grid">
      <label class="wide">姓名 <span>*</span><input v-model="form.name" required maxlength="100" autocomplete="name" placeholder="请输入真实姓名" /></label>
      <label>性别<select v-model="form.gender"><option value="U">未录</option><option value="M">男</option><option value="F">女</option></select></label>
      <label>生命状态<select v-model="form.is_alive"><option :value="true">在世</option><option :value="false">已故</option></select></label>
      <label>出生日期<input v-model="form.birth_date" type="date" :max="form.death_date || undefined" /></label>
      <label v-if="!form.is_alive">逝世日期<input v-model="form.death_date" type="date" :min="form.birth_date || undefined" /></label>
      <label>职业<input v-model="form.occupation" placeholder="如：教师、医生" /></label>
      <label class="wide">居住地<input v-model="form.address" placeholder="城市或详细地址" /></label>
      <label class="wide">头像地址<input v-model="form.avatar" placeholder="/uploads/avatars/… 或图片网址" /><small>可使用已上传头像的路径或图片网址。</small></label>
      <label class="wide">人物生平<textarea v-model="form.biography" rows="4" placeholder="记录值得传承的经历和故事" /></label>
      <label class="wide">家训 / 座右铭<textarea v-model="form.motto" rows="2" placeholder="留给后辈的话" /></label>
      <label class="wide">主要成就<textarea v-model="form.achievements" rows="2" placeholder="重要贡献、作品与荣誉" /></label>
    </div>
    <footer>
      <small v-if="person" class="record-id">ID · {{ person.id }}</small>
      <button type="submit" class="primary" :disabled="saving">{{ saving ? '保存中…' : person ? '保存人物资料' : '创建人物' }}</button>
    </footer>
  </form>
</template>

<script setup>
/** 创建和编辑 GraphPerson 契约中全部可写人物资料。 */
import { reactive, ref, watch } from 'vue'
import { createPerson, updatePerson } from '../../../api/persons'
import { managementErrorMessage } from '../../../api/management'

const props = defineProps({ person: { type: Object, default: null } })
const emit = defineEmits(['saved', 'busy'])
const form = reactive({})
const saving = ref(false)
const error = ref('')

/** 载入选中人物，空表单用于创建而不沿用上一人的字段。 */
function resetForm(person) {
  Object.assign(form, {
    name: person?.name || '', gender: person?.gender || 'U', is_alive: person?.is_alive ?? true,
    birth_date: person?.birth_date || '', death_date: person?.death_date || '',
    occupation: person?.occupation || '', address: person?.address || '', avatar: person?.avatar || '',
    biography: person?.biography || '', motto: person?.motto || '', achievements: person?.achievements || ''
  })
  error.value = ''
}

/** 按真实 API 字段提交，使用显式 null 清空已删除的可选资料。 */
async function save() {
  if (saving.value) return
  if (!form.name.trim()) { error.value = '姓名不能为空'; return }
  const payload = {
    name: form.name.trim(), gender: form.gender, is_alive: form.is_alive,
    birth_date: form.birth_date || null, death_date: form.is_alive ? null : form.death_date || null,
    occupation: form.occupation.trim() || null, address: form.address.trim() || null,
    avatar: form.avatar.trim() || null, biography: form.biography.trim() || null,
    motto: form.motto.trim() || null, achievements: form.achievements.trim() || null
  }
  saving.value = true
  emit('busy', true)
  error.value = ''
  try {
    const saved = props.person ? await updatePerson(props.person.id, payload) : await createPerson(payload)
    emit('saved', saved)
  } catch (failure) {
    error.value = managementErrorMessage(failure)
  } finally {
    saving.value = false
    emit('busy', false)
  }
}

watch(() => props.person, resetForm, { immediate: true })
</script>

<style scoped>
.person-editor { padding: 28px; }
.editor-heading { display: flex; justify-content: space-between; align-items: center; gap: 15px; margin-bottom: 24px; }
.eyebrow { margin: 0 0 6px; font-size: 10px; letter-spacing: 2px; color: #79887b; }
h3 { margin: 0; font-size: 23px; font-weight: 600; }
.record-status { padding: 5px 10px; border-radius: 5px; font-size: 11px; color: #446250; background: #eff4ed; }
.field-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 17px; }
label { display: flex; flex-direction: column; gap: 8px; color: #476050; font-size: 13px; }
label > span { color: #985a43; }
.wide { grid-column: 1 / -1; }
input, select, textarea { box-sizing: border-box; width: 100%; min-width: 0; padding: 11px 12px; border: 1px solid #d6ded7; border-radius: 9px; color: #203b32; background: #fff; font: inherit; font-size: 14px; }
textarea { resize: vertical; line-height: 1.7; }
input:focus, select:focus, textarea:focus { border-color: #2d6a54; outline: 3px solid #e9f0e9; }
small { color: #879083; font-size: 11px; }
footer { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px; border-top: 1px solid #e8ece5; margin-top: 26px; padding-top: 22px; }
.record-id { overflow-wrap: anywhere; max-width: 100%; }
button { margin-left: auto; padding: 12px 19px; border: 0; border-radius: 9px; color: #fff; background: #2d6a54; cursor: pointer; font: inherit; font-size: 13px; }
button:disabled { opacity: .5; cursor: wait; }
.error-message { padding: 12px; border: 1px solid #ead1c8; border-radius: 9px; color: #9a4a33; background: #fcf3ef; font-size: 13px; overflow-wrap: anywhere; }
@media (max-width: 600px) { .person-editor { padding: 20px; } .field-grid { grid-template-columns: minmax(0, 1fr); } h3 { font-size: 20px; } }
</style>
