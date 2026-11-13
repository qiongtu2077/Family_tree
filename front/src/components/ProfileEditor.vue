<template>
  <div v-if="open" class="profile-backdrop" @click.self="$emit('close')" @keydown.esc.prevent="$emit('close')">
    <section class="profile-panel" role="dialog" aria-modal="true" :aria-label="profileTitle">
      <header><div><span class="eyebrow">个人档案</span><h2>{{ profileTitle }}</h2><p>补充生活记录与家族记忆。</p></div><button class="close-btn" @click="$emit('close')">关闭 ×</button></header>
      <p v-if="!targetPersonId" class="empty-state">当前账号尚未关联族谱人物，请联系管理员核对真实姓名及人物记录。</p>
      <p v-else-if="loading" class="empty-state">正在读取个人资料...</p>
      <p v-if="errorMessage" class="error" role="alert">{{ errorMessage }}</p><p v-if="notice" class="notice" role="status">{{ notice }}</p>
      <form v-if="detail && !loading" @submit.prevent="saveProfile">
        <div class="profile-identity"><img v-if="detail.avatar" :src="detail.avatar" :alt="detail.name" /><span v-else class="avatar-placeholder">{{ detail.name.slice(0, 1) }}</span><div><h3>{{ detail.name }}</h3><label class="upload-label">{{ busy ? '正在处理...' : '更换头像' }}<input type="file" accept=".jpg,.jpeg,.png,.gif,.webp" :disabled="busy || !detail.can_edit" @change="uploadImage($event, 'avatar')" /></label></div></div>
        <div class="field-grid"><label>职业<input v-model="form.occupation" :disabled="busy || !detail.can_edit" placeholder="填写职业" /></label><label>居住地<input v-model="form.address" :disabled="busy || !detail.can_edit" placeholder="填写居住地" /></label></div>
        <label>个人名言<textarea v-model="form.motto" :disabled="busy || !detail.can_edit" rows="2" placeholder="留下一句想与家人分享的话" /></label>
        <label>成就与经历<textarea v-model="form.achievements" :disabled="busy || !detail.can_edit" rows="3" placeholder="记录重要经历" /></label>
        <label>生平简介<textarea v-model="form.biography" :disabled="busy || !detail.can_edit" rows="4" placeholder="记录您的故事" /></label>
        <div class="photo-heading"><h3>家庭照片</h3><label class="upload-label">添加照片<input type="file" accept=".jpg,.jpeg,.png,.gif,.webp" :disabled="busy || !detail.can_edit" @change="uploadImage($event, 'photo')" /></label></div>
        <div v-if="detail.photos.length" class="photo-grid"><a v-for="photo in detail.photos" :key="photo" :href="photo" target="_blank" rel="noreferrer"><img :src="photo" :alt="`${detail.name}的家庭照片`" /></a></div><p v-else class="photo-empty">暂未上传照片。</p>
        <footer><button type="button" @click="$emit('close')">取消</button><button type="submit" class="primary" :disabled="busy || !detail.can_edit">{{ busy ? '正在保存...' : '保存资料' }}</button></footer>
      </form>
    </section>
  </div>
</template>

<script setup>
/** 基于已认证账号绑定人物的个人资料、头像及照片编辑器。 */
import { computed, reactive, ref, watch } from 'vue'
import { getPersonDetail, updatePersonProfile, uploadAvatar, uploadPhoto } from '../api/genealogy'
const props = defineProps({ open: { type: Boolean, default: false }, currentUser: { type: Object, default: null }, personId: { type: String, default: null } })
const emit = defineEmits(['close', 'changed'])
const targetPersonId = computed(() => props.personId || props.currentUser?.person_id)
const profileTitle = computed(() => props.personId && props.personId !== props.currentUser?.person_id ? '编辑人物资料' : '我的资料')
const detail = ref(null)
const form = reactive({ occupation: '', address: '', motto: '', achievements: '', biography: '' })
const loading = ref(false)
const busy = ref(false)
const notice = ref('')
const errorMessage = ref('')
let loadSequence = 0

/** 加载已有详情 DTO 的五项可编辑字段及照片列表。 */
async function loadProfile() {
  const sequence = ++loadSequence
  detail.value = null
  notice.value = ''
  errorMessage.value = ''
  if (!targetPersonId.value) { loading.value = false; return }
  loading.value = true
  try {
    const response = await getPersonDetail(targetPersonId.value)
    // 快速切换人物时，仅允许最新一次请求填充当前编辑器。
    if (sequence !== loadSequence) return
    detail.value = response
    for (const field of Object.keys(form)) form[field] = detail.value[field] || ''
  } catch (error) { if (sequence === loadSequence) errorMessage.value = error.response?.data?.detail || '无法读取个人资料，请稍后重试。' }
  finally { if (sequence === loadSequence) loading.value = false }
}

/** 保存允许本人编辑的五项资料，空文本显式清空对应字段。 */
async function saveProfile() {
  busy.value = true
  errorMessage.value = ''
  notice.value = ''
  try {
    const payload = Object.fromEntries(Object.entries(form).map(([field, value]) => [field, value.trim() || null]))
    await updatePersonProfile(targetPersonId.value, payload)
    notice.value = '个人资料已保存。'
    emit('changed')
  } catch (error) { errorMessage.value = error.response?.data?.detail || '保存失败，请稍后重试。' }
  finally { busy.value = false }
}

/** 上传选中的头像或照片，刷新媒体列表时保留尚未保存的文本。 */
async function uploadImage(event, kind) {
  const file = event.target.files[0]
  if (!file) return
  busy.value = true
  errorMessage.value = ''
  notice.value = ''
  try {
    if (kind === 'avatar') await uploadAvatar(targetPersonId.value, file)
    else await uploadPhoto(targetPersonId.value, file)
    detail.value = await getPersonDetail(targetPersonId.value)
    notice.value = kind === 'avatar' ? '头像已更新。' : '照片已添加。'
    emit('changed')
  } catch (error) { errorMessage.value = error.response?.data?.detail || '上传失败，请检查图片格式后重试。' }
  finally { busy.value = false; event.target.value = '' }
}
watch(() => [props.open, targetPersonId.value], ([open]) => { if (open) loadProfile() }, { immediate: true })
</script>

<style scoped>
.profile-backdrop { position: fixed; inset: 0; z-index: 110; display: grid; place-items: center; padding: 20px; background: rgba(23,43,34,.3); backdrop-filter: blur(4px); }
.profile-panel { width: min(680px, 100%); max-height: calc(100dvh - 40px); padding: 28px; overflow-y: auto; border: 1px solid var(--line); border-radius: 18px; background: #fff; box-shadow: 0 24px 90px rgba(32,59,50,.15); }
header { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; }
.eyebrow { color: var(--copper); font-size: 11px; letter-spacing: .08em; }
h2 { margin: 8px 0 0; font-size: 23px; font-weight: 600; }
h3 { margin: 0; font-size: 14px; font-weight: 600; }
p { margin: 10px 0 0; color: var(--muted); font-size: 12px; line-height: 1.8; }
button { padding: 10px 14px; border: 1px solid var(--line); border-radius: 7px; color: var(--green); background: #fff; font-size: 12px; }
button:disabled { opacity: .5; }
.close-btn { padding: 3px 0 3px 8px; border: 0; color: var(--muted); font-size: 11px; white-space: nowrap; }
.profile-identity { display: flex; align-items: center; gap: 15px; margin: 25px 0; }
.profile-identity img, .avatar-placeholder { width: 64px; height: 70px; border-radius: 12px; object-fit: cover; }
.avatar-placeholder { display: grid; place-items: center; background: var(--green-soft); color: var(--green); font: 28px 'SimSun',serif; }
.upload-label { display: inline-block; margin-top: 10px; color: var(--green); cursor: pointer; font-size: 12px; }
.upload-label input { display: block; width: 100%; max-width: 240px; margin-top: 7px; padding: 0; border: 0; color: var(--muted); font-size: 11px; background: transparent; }
form > label, .field-grid > label { display: grid; gap: 8px; margin-bottom: 18px; color: var(--muted); font-size: 12px; }
.field-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
input, textarea { min-width: 0; width: 100%; padding: 11px 12px; border: 1px solid var(--line); border-radius: 8px; color: var(--ink); background: #fafbf8; font-size: 13px; }
textarea { resize: vertical; line-height: 1.7; }
.photo-heading { display: flex; justify-content: space-between; gap: 16px; margin: 24px 0 15px; align-items: flex-start; }
.photo-heading .upload-label { margin: 0; text-align: right; }
.photo-grid { display: grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap: 10px; }
.photo-grid img { width: 100%; height: 120px; border-radius: 8px; object-fit: cover; }
.photo-empty { padding: 20px; border: 1px dashed var(--line); border-radius: 8px; text-align: center; }
footer { display: flex; justify-content: flex-end; gap: 10px; margin-top: 26px; padding-top: 20px; border-top: 1px solid var(--line); }
.primary { color: #fff; border-color: var(--green); background: var(--green); }
.notice, .error { padding: 11px 13px; border-radius: 8px; overflow-wrap: anywhere; }
.notice { color: var(--green); background: var(--green-soft); }
.error { color: var(--danger); background: #fbefed; }
.empty-state { padding: 24px 0; }
@media (max-width: 600px) { .profile-backdrop { padding: 14px; } .profile-panel { max-height: calc(100dvh - 28px); padding: 22px 20px; } .field-grid { grid-template-columns: 1fr; gap: 0; } .photo-grid { grid-template-columns: repeat(2, minmax(0,1fr)); } .photo-heading { flex-wrap: wrap; } .photo-heading .upload-label { text-align: left; } }
</style>
