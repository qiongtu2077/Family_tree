<template>
  <div v-if="open" class="admin-panel">
    <header>
      <div>
        <h2>图谱诊断</h2>
        <p>优先处理孤立人物、多个生父/生母和祖先循环。</p>
      </div>
      <button @click="$emit('close')">关闭</button>
    </header>

    <button class="refresh-btn" @click="$emit('refresh')">刷新异常</button>

    <div v-if="issues.length === 0" class="empty-state">暂无异常，家族小宇宙暂时稳定。</div>
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
.admin-panel {
  position: fixed;
  top: 96px;
  right: 24px;
  z-index: 30;
  width: min(420px, calc(100vw - 48px));
  max-height: calc(100vh - 120px);
  padding: 22px;
  overflow-y: auto;
  border-radius: 24px;
  color: #f0f0f0;
  background: rgba(25, 25, 25, 0.98);
  border: 1px solid rgba(255, 250, 0, 0.22);
  box-shadow: 0 28px 80px rgba(0, 0, 0, 0.42);
}

header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
}

h2 {
  margin: 0;
}

p {
  color: #888;
  font-size: 13px;
}

button {
  border: 0;
  border-radius: 12px;
  padding: 10px 12px;
  color: #fffa00;
  background: #252525;
  cursor: pointer;
}

.refresh-btn {
  width: 100%;
  margin: 12px 0;
  color: #101010;
  background: linear-gradient(135deg, #fffa00 0%, #d4af37 100%);
}

.empty-state {
  padding: 20px;
  border-radius: 18px;
  color: #aaa;
  background: #252525;
}

ul {
  display: grid;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}

li {
  display: grid;
  gap: 5px;
  padding: 14px;
  border-radius: 16px;
  background: #252525;
}

span {
  color: #aaa;
  font-size: 13px;
}

code {
  color: #fffa00;
  font-size: 12px;
}
</style>
