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
  color: #342719;
  background: rgba(255, 250, 240, 0.98);
  box-shadow: 0 28px 80px rgba(55, 43, 29, 0.2);
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
  color: #846c56;
  font-size: 13px;
}

button {
  border: 0;
  border-radius: 12px;
  padding: 10px 12px;
  color: #6f4e37;
  background: rgba(111, 78, 55, 0.1);
  cursor: pointer;
}

.refresh-btn {
  width: 100%;
  margin: 12px 0;
  color: #fff8df;
  background: linear-gradient(135deg, #8b5a2b, #c77935);
}

.empty-state {
  padding: 20px;
  border-radius: 18px;
  color: #6d543e;
  background: #f4ead7;
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
  background: #fff5e2;
}

span {
  color: #6d543e;
  font-size: 13px;
}

code {
  color: #8f4d1c;
  font-size: 12px;
}
</style>
