<template>
  <div v-if="open" class="admin-panel" role="dialog" aria-label="图谱诊断" @keydown.esc.prevent="$emit('close')">
    <header>
      <div>
        <span class="eyebrow">数据质量</span>
        <h2>图谱诊断</h2>
        <p>优先处理孤立人物、多个生父/生母和祖先循环。</p>
      </div>
      <button @click="$emit('close')">关闭</button>
    </header>

    <button class="refresh-btn" @click="$emit('refresh')">刷新异常</button>

    <div v-if="issues.length === 0" class="empty-state">当前未发现图谱异常。</div>
    <ul v-else>
      <li v-for="issue in issues" :key="`${issue.issue_type}-${issue.person_id}`">
        <strong>{{ issue.person_name }}</strong>
        <span>{{ issue.message }}</span>
        <code>{{ issue.issue_type }}</code>
      </li>
    </ul>
  </div>
</template>

<script setup>
/**
 * 管理员图谱异常面板。
 */
defineProps({
  open: { type: Boolean, default: false },
  issues: { type: Array, default: () => [] }
})

defineEmits(['close', 'refresh'])
</script>

<style scoped>
.admin-panel { position: fixed; top: 16px; right: 16px; z-index: 80; width: min(420px, calc(100vw - 32px)); max-height: calc(100vh - 32px); max-height: calc(100dvh - 32px); padding: 25px; overflow-y: auto; border: 1px solid var(--line); border-radius: 16px; color: var(--ink); background: #fff; box-shadow: 0 15px 70px rgba(32, 59, 50, .18); }
header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
.eyebrow { color: var(--copper); font-size: 11px; letter-spacing: .08em; }
h2 { margin: 8px 0 0; font-size: 22px; font-weight: 600; }
p { margin: 10px 0 0; color: var(--muted); font-size: 12px; line-height: 1.7; }
button { padding: 9px 12px; border: 1px solid var(--line); border-radius: 7px; color: var(--green); background: #fff; font-size: 12px; white-space: nowrap; }
header button { border: 0; padding: 3px 0 3px 8px; color: var(--muted); font-size: 11px; }
.refresh-btn { width: 100%; margin: 22px 0 18px; color: #fff; border-color: var(--green); background: var(--green); }
.empty-state { padding: 28px 15px; border: 1px dashed var(--line); border-radius: 10px; color: var(--muted); text-align: center; font-size: 13px; }
ul { display: grid; gap: 10px; margin: 0; padding: 0; list-style: none; }
li { display: grid; gap: 8px; padding: 15px; border: 1px solid #eadfcd; border-radius: 10px; background: #fcfaf6; }
strong { font-size: 13px; font-weight: 600; }
li span { color: var(--muted); font-size: 12px; line-height: 1.7; overflow-wrap: anywhere; }
code { justify-self: start; padding: 3px 6px; border-radius: 4px; color: #97754b; background: #f1ebdf; font-size: 10px; overflow-wrap: anywhere; max-width: 100%; }
</style>