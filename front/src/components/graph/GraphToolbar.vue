<template>
  <header class="graph-toolbar">
    <div class="brand-area">
      <div>
        <h1>族谱系统</h1>
        <p>主线、姻亲、桥接、分支与全景</p>
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
      <button class="center-btn" @click="$emit('openCenter')">
        中心人物：{{ centerPersonName || '未选择' }}
      </button>
      <button
        v-if="modelValue === 'overview' && centerPersonName"
        class="center-scope-btn"
        @click="$emit('showCenterScope')"
      >
        只看中心九族
      </button>
      <button class="relation-btn" @click="$emit('openRelation')">关系路径</button>
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
  isAdmin: { type: Boolean, default: false },
  centerPersonName: { type: String, default: '' }
})

defineEmits([
  'update:modelValue',
  'update:searchKeyword',
  'search',
  'openCenter',
  'showCenterScope',
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
  padding: 10px 20px;
  color: #f0f0f0;
  background: linear-gradient(135deg, rgba(26, 26, 26, 0.96) 0%, rgba(37, 37, 37, 0.96) 100%);
  border-bottom: 1px solid rgba(255, 250, 0, 0.18);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(12px);
  animation: toolbarDrop 0.48s ease both;
}

.brand-area {
  display: flex;
  align-items: center;
  gap: 12px;
}

h1 {
  margin: 0;
  color: #fffa00;
  font-size: 20px;
  font-weight: 600;
}

p {
  margin: 3px 0 0;
  color: #888;
  font-size: 12px;
}

.search-area {
  display: flex;
  gap: 8px;
}

.search-area input {
  width: 100%;
  border: 1px solid #333;
  border-radius: 999px;
  padding: 11px 16px;
  color: #f0f0f0;
  background: #1a1a1a;
}

.search-area input:focus {
  border-color: #fffa00;
  outline: 3px solid rgba(255, 250, 0, 0.1);
}

.search-area input::placeholder {
  color: #666;
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
  color: #d8d8d8;
  background: #252525;
  cursor: pointer;
  white-space: nowrap;
}

.view-tabs button.active,
.primary-btn {
  color: #101010;
  background: linear-gradient(135deg, #fffa00 0%, #d4af37 100%);
  box-shadow: 0 6px 18px rgba(255, 250, 0, 0.25);
}

.toolbar-actions {
  display: flex;
  gap: 8px;
}

.toolbar-actions .ghost-btn {
  color: #ff7b86;
  background: rgba(255, 71, 87, 0.1);
}

.toolbar-actions .relation-btn {
  color: #f5e7ad;
  border: 1px solid rgba(212, 175, 55, 0.22);
  background: rgba(212, 175, 55, 0.1);
}

.toolbar-actions .center-btn,
.toolbar-actions .center-scope-btn {
  color: #111;
  background: linear-gradient(135deg, #fffa00 0%, #d4af37 100%);
}

.toolbar-actions .center-scope-btn {
  color: #f7efd0;
  border: 1px solid rgba(255, 250, 0, 0.28);
  background: rgba(255, 250, 0, 0.1);
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
