<template>
  <div v-if="open" class="requests-backdrop" @click.self="$emit('close')" @keydown.esc.prevent="$emit('close')">
    <section class="requests-panel" role="dialog" aria-modal="true" aria-label="账号审批">
      <header><div><span class="eyebrow">账号管理</span><h2>账号审批</h2><p>核对申请资料，批准后申请人即可登录。</p></div><button class="close-btn" @click="$emit('close')">关闭 ×</button></header>
      <div class="list-heading"><span>待审批 {{ requests.length }} 项</span><button :disabled="loading || processingId !== null" @click="loadRequests">刷新列表</button></div>
      <p v-if="notice" class="notice" role="status">{{ notice }}</p><p v-if="errorMessage" class="error" role="alert">{{ errorMessage }}</p>
      <p v-if="loading" class="empty-state">正在读取注册申请...</p><p v-else-if="!requests.length" class="empty-state">当前没有待审批的申请。</p>
      <article v-for="item in requests" :key="item.id" class="request-card">
        <div class="request-info"><h3>{{ item.real_name || item.username }}</h3><p>账号：{{ item.username }}</p><p>{{ item.email }}</p><small v-if="item.created_at">申请时间：{{ item.created_at.slice(0, 16).replace('T', ' ') }}</small></div>
        <div class="request-actions"><button :disabled="processingId !== null" @click="processRequest(item.id, false)">拒绝</button><button class="primary" :disabled="processingId !== null" @click="processRequest(item.id, true)">{{ processingId === item.id ? '处理中...' : '批准注册' }}</button></div>
      </article>
    </section>
  </div>
</template>

<script setup>
/** 管理员在应用内查看和处理真实注册申请。 */
import { ref, watch } from 'vue'
import { approveRegistration, getPendingRequests, rejectRegistration } from '../../api/auth'
const props = defineProps({ open: { type: Boolean, default: false } })
defineEmits(['close'])
const requests = ref([])
const loading = ref(false)
const processingId = ref(null)
const errorMessage = ref('')
const notice = ref('')

/** 从受管理员权限保护的接口读取待审批列表。 */
async function loadRequests() {
  loading.value = true
  errorMessage.value = ''
  try { requests.value = await getPendingRequests() }
  catch (error) { errorMessage.value = error.response?.data?.detail || '无法读取申请，请稍后重试。' }
  finally { loading.value = false }
}

/** 提交明确的审批决定，完成后重新读取服务端状态。 */
async function processRequest(requestId, approved) {
  processingId.value = requestId
  errorMessage.value = ''
  notice.value = ''
  try {
    const response = await (approved ? approveRegistration(requestId) : rejectRegistration(requestId))
    notice.value = response.message
    await loadRequests()
  } catch (error) { errorMessage.value = error.response?.data?.detail || '审批失败，请刷新后重试。' }
  finally { processingId.value = null }
}
watch(() => props.open, open => { if (open) { notice.value = ''; loadRequests() } }, { immediate: true })
</script>

<style scoped>
.requests-backdrop { position: fixed; inset: 0; z-index: 110; padding: 20px; display: grid; place-items: center; background: rgba(23,43,34,.3); backdrop-filter: blur(4px); }
.requests-panel { width: min(660px, 100%); max-height: calc(100dvh - 40px); overflow-y: auto; padding: 28px; border: 1px solid var(--line); border-radius: 18px; background: #fff; box-shadow: 0 24px 90px rgba(32,59,50,.15); }
header { display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; }
.eyebrow { color: var(--copper); font-size: 11px; letter-spacing: .08em; }
h2 { margin: 8px 0 0; font-size: 23px; font-weight: 600; }
p { margin: 8px 0 0; color: var(--muted); font-size: 12px; line-height: 1.7; overflow-wrap: anywhere; }
button { padding: 9px 13px; border: 1px solid var(--line); border-radius: 7px; color: var(--green); background: #fff; font-size: 12px; white-space: nowrap; }
button:disabled { opacity: .5; }
.close-btn { padding: 3px 0 3px 8px; border: 0; color: var(--muted); font-size: 11px; }
.list-heading { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin: 24px 0 16px; color: var(--muted); font-size: 12px; }
.request-card { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 18px 0; border-top: 1px solid var(--line); }
.request-info { min-width: 0; }
h3 { margin: 0; font-size: 14px; font-weight: 600; }
.request-info p { margin: 5px 0 0; }
.request-info small { display: block; margin-top: 9px; color: #8b968d; font-size: 10px; }
.request-actions { display: flex; flex-shrink: 0; gap: 7px; }
.primary { color: #fff; border-color: var(--green); background: var(--green); }
.notice, .error { margin: 12px 0; padding: 11px 13px; border-radius: 8px; }
.notice { color: var(--green); background: var(--green-soft); }
.error { color: var(--danger); background: #fbefed; }
.empty-state { padding: 30px 10px; text-align: center; }
@media (max-width: 600px) { .requests-backdrop { padding: 14px; } .requests-panel { max-height: calc(100dvh - 28px); padding: 22px 20px; } .request-card { align-items: flex-start; flex-direction: column; } .request-actions { align-self: flex-end; } }
</style>
