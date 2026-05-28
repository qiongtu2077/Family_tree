<template>
  <header class="graph-toolbar">
    <div class="brand-area">
      <div class="brand-mark">谱</div>
      <div>
        <h1>族谱系统</h1>
        <p>主线、姻亲、路径与分支视图</p>
      </div>
    </div>

    <div class="search-area">
      <input
        :value="searchKeyword"
        type="search"
        placeholder="搜索人物姓名..."
        @input="$emit('update:searchKeyword', $event.target.value)"
        @keyup.enter="$emit('search')"
      />
      <button class="primary-btn" @click="$emit('search')">搜索</button>
    </div>

    <nav class="view-tabs" aria-label="族谱视图">
      <button
        v-for="view in views"
        :key="view.value"
        :class="{ active: modelValue === view.value }"
        @click="$emit('update:modelValue', view.value)"
      >
        {{ view.label }}
      </button>
    </nav>

    <div class="toolbar-actions">
      <button @click="$emit('openRelation')">关系路径</button>
      <button v-if="isAdmin" @click="$emit('openAdmin')">管理诊断</button>
      <button class="ghost-btn" @click="$emit('logout')">退出</button>
    </div>
  </header>
</template>

<script setup>
/**
 * 图谱顶部工具条。
 */
defineProps({
  modelValue: { type: String, required: true },
  searchKeyword: { type: String, default: '' },
  isAdmin: { type: Boolean, default: false }
})

defineEmits([
  'update:modelValue',
  'update:searchKeyword',
  'search',
  'openRelation',
  'openAdmin',
  'logout'
])

const views = [
  { value: 'mainline', label: '本家主线' },
  { value: 'inlaw', label: '姻亲谱系' },
  { value: 'bridge', label: '联姻桥接' },
  { value: 'branch', label: '后代分支' },
  { value: 'overview', label: '家族全景' }
]
</script>

<style scoped>
.graph-toolbar {
  display: grid;
  grid-template-columns: auto minmax(260px, 420px) 1fr auto;
  align-items: center;
  gap: 18px;
  padding: 16px 22px;
  background: rgba(255, 252, 240, 0.94);
  border-bottom: 1px solid rgba(84, 57, 23, 0.12);
  box-shadow: 0 12px 40px rgba(55, 43, 29, 0.08);
  backdrop-filter: blur(18px);
  animation: toolbarDrop 0.48s ease both;
}

.brand-area {
  display: flex;
  align-items: center;
  gap: 12px;
}

.brand-mark {
  width: 46px;
  height: 46px;
  border-radius: 18px;
  display: grid;
  place-items: center;
  color: #fff8df;
  background: linear-gradient(135deg, #6f4e37, #b36b34);
  font-size: 23px;
  font-weight: 800;
  box-shadow: 0 10px 22px rgba(111, 78, 55, 0.22);
}

h1 {
  margin: 0;
  color: #33261c;
  font-size: 20px;
  letter-spacing: 0.04em;
}

p {
  margin: 3px 0 0;
  color: #8a735f;
  font-size: 12px;
}

.search-area {
  display: flex;
  gap: 8px;
}

.search-area input {
  width: 100%;
  border: 1px solid #dac9b6;
  border-radius: 999px;
  padding: 11px 16px;
  color: #342719;
  background: #fffaf0;
}

.search-area input:focus {
  border-color: #a45f2c;
  outline: 3px solid rgba(164, 95, 44, 0.14);
}

.view-tabs {
  display: flex;
  gap: 8px;
  justify-content: center;
  overflow-x: auto;
}

.view-tabs button,
.toolbar-actions button,
.primary-btn {
  border: 0;
  border-radius: 999px;
  padding: 10px 15px;
  color: #624832;
  background: rgba(111, 78, 55, 0.1);
  cursor: pointer;
  white-space: nowrap;
}

.view-tabs button.active,
.primary-btn {
  color: #fff8df;
  background: linear-gradient(135deg, #8b5a2b, #c77935);
  box-shadow: 0 10px 20px rgba(139, 90, 43, 0.18);
}

.toolbar-actions {
  display: flex;
  gap: 8px;
}

.toolbar-actions .ghost-btn {
  color: #7d2f22;
  background: rgba(125, 47, 34, 0.09);
}

@media (max-width: 1120px) {
  .graph-toolbar {
    grid-template-columns: 1fr;
  }

  .view-tabs,
  .toolbar-actions {
    justify-content: flex-start;
  }
}

@keyframes toolbarDrop {
  from { opacity: 0; transform: translateY(-14px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
