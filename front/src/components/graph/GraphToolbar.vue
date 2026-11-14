<template>
  <header class="graph-toolbar">
    <div class="toolbar-top">
      <div class="brand-area">
        <span class="brand-mark" aria-hidden="true">谱</span>
        <div><h1>家族谱系</h1><p>FAMILY ARCHIVE</p></div>
      </div>
      <form class="search-area" role="search" @submit.prevent="$emit('search')">
        <span aria-hidden="true" class="search-symbol">⌕</span>
        <input :value="searchKeyword" type="search" aria-label="搜索人物姓名" placeholder="姓名、拼音或首拼..." @input="$emit('update:searchKeyword', $event.target.value)" />
        <button class="primary-btn" type="submit">搜索</button>
      </form>
      <div class="toolbar-actions">
        <button class="relation-btn" @click="$emit('openRelation')">关系路径</button>
        <button @click="$emit('openProfile')">我的资料</button>
        <button v-if="isAdmin" @click="$emit('openManage')">资料管理</button>
        <button v-if="isAdmin" @click="$emit('openRequests')">账号审批</button>
        <button v-if="isAdmin" @click="$emit('openAdmin')">管理诊断</button>
        <button v-if="authEnabled" class="ghost-btn" @click="$emit('logout')">退出</button>
      </div>
    </div>
    <div class="toolbar-bottom">
      <nav class="view-tabs" aria-label="族谱视图">
        <button v-for="view in views" :key="view.value" :class="{ active: modelValue === view.value }" :aria-pressed="modelValue === view.value" @click="$emit('update:modelValue', view.value)">
          {{ view.label }}
        </button>
      </nav>
      <div class="center-actions">
        <button class="center-btn" @click="$emit('openCenter')"><span class="center-dot" aria-hidden="true"></span>中心人物：<strong>{{ centerPersonName || '未选择' }}</strong><span class="change-center">更换</span></button>
        <button v-if="modelValue === 'overview' && centerPersonName" class="center-scope-btn" @click="$emit('showCenterScope')">只看中心九族</button>
      </div>
    </div>
  </header>
</template>

<script setup>
/** 图谱导航工具栏，管理视图切换、搜索及各业务面板入口。 */
defineProps({
  modelValue: { type: String, required: true },
  searchKeyword: { type: String, default: '' },
  isAdmin: { type: Boolean, default: false },
  authEnabled: { type: Boolean, default: true },
  centerPersonName: { type: String, default: '' }
})
defineEmits(['update:modelValue', 'update:searchKeyword', 'search', 'openCenter', 'showCenterScope', 'openRelation', 'openProfile', 'openManage', 'openRequests', 'openAdmin', 'logout'])
const views = [
  { value: 'mainline', label: '本家主线' },
  { value: 'inlaw', label: '姻亲谱系' },
  { value: 'bridge', label: '联姻桥接' },
  { value: 'branch', label: '后代分支' },
  { value: 'overview', label: '家族全景' }
]
</script>

<style scoped>
.graph-toolbar { position: relative; z-index: 10; background: var(--panel); border-bottom: 1px solid var(--line); }
.toolbar-top, .toolbar-bottom { display: flex; align-items: center; gap: 24px; padding: 16px 24px; }
.toolbar-top { flex-wrap: wrap; }
.toolbar-bottom { justify-content: space-between; padding-top: 0; padding-bottom: 10px; gap: 14px; }
.brand-area { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
.brand-mark { width: 34px; height: 38px; display: grid; place-items: center; border: 1px solid #9bb9a4; border-radius: 9px; color: var(--green); font: 23px 'SimSun', serif; }
h1 { margin: 0; font-size: 18px; font-weight: 650; letter-spacing: .08em; }
p { margin: 4px 0 0; color: #8b968d; font-size: 8px; letter-spacing: .14em; }
.search-area { display: flex; align-items: center; min-width: 200px; max-width: 400px; flex: 1; gap: 8px; padding: 4px 5px 4px 11px; border: 1px solid var(--line); border-radius: 9px; background: #f8faf6; }
.search-symbol { color: var(--muted); font-size: 22px; line-height: 1; }
.search-area input { width: 100%; min-width: 0; padding: 4px 0; border: 0; color: var(--ink); background: transparent; font-size: 12px; }
.search-area input:focus { outline: 0; }
.search-area:focus-within { border-color: var(--green); box-shadow: 0 0 0 3px rgba(45, 106, 84, .08); }
.search-area input::placeholder { color: #98a29a; }
button { padding: 8px 11px; border: 1px solid transparent; border-radius: 7px; color: var(--muted); background: transparent; font-size: 12px; white-space: nowrap; transition: background .15s, color .15s; }
button:hover { color: var(--green); background: var(--green-soft); }
.primary-btn { flex-shrink: 0; padding: 7px 13px; color: #fff; background: var(--green); }
.primary-btn:hover { color: #fff; background: #235640; }
.toolbar-actions { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 4px; margin-left: auto; }
.toolbar-actions .relation-btn { color: var(--green); background: var(--green-soft); }
.toolbar-actions .ghost-btn { color: #8c6e58; }
.view-tabs { display: flex; flex-wrap: wrap; align-items: center; gap: 5px; min-width: 0; }
.view-tabs button { padding: 10px 15px; font-weight: 550; }
.view-tabs button.active { color: #fff; background: var(--green); }
.center-actions { display: flex; flex-wrap: wrap; align-items: center; justify-content: flex-end; gap: 6px; min-width: 0; }
.center-btn { display: flex; align-items: center; min-width: 0; max-width: 100%; padding: 8px 10px; background: #f6f7f2; color: var(--muted); }
.center-btn strong { min-width: 0; color: var(--ink); font-weight: 600; overflow: hidden; text-overflow: ellipsis; }
.center-dot { width: 6px; height: 6px; margin-right: 8px; border-radius: 50%; background: var(--copper); flex-shrink: 0; }
.change-center { margin-left: 14px; color: var(--green); font-size: 11px; }
.center-scope-btn { color: var(--green); border-color: var(--line); }
@media (max-width: 1100px) {
  .toolbar-top, .toolbar-bottom { padding-right: 18px; padding-left: 18px; gap: 14px; }
  .toolbar-actions { gap: 0; }
  .toolbar-actions button { padding-right: 8px; padding-left: 8px; }
  .toolbar-bottom { flex-wrap: wrap; }
}
@media (max-width: 700px) {
  .toolbar-top { padding: 12px 14px 10px; gap: 10px 14px; }
  .brand-area { margin-right: auto; }
  h1 { font-size: 16px; }
  .brand-mark { width: 30px; height: 34px; }
  .search-area { order: 3; min-width: 0; max-width: none; flex-basis: 100%; }
  .toolbar-actions { margin: 0; gap: 0; }
  .toolbar-actions button { padding: 7px; font-size: 11px; }
  .toolbar-bottom { padding: 0 14px 12px; gap: 10px; }
  .view-tabs { width: 100%; display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 3px; }
  .view-tabs button { padding: 9px 2px; font-size: 11px; }
  .center-actions { width: 100%; justify-content: flex-start; }
  .center-btn { padding: 7px 8px; font-size: 11px; }
}
@media (max-width: 410px) { .toolbar-actions { width: 100%; justify-content: flex-start; } .toolbar-actions button { padding: 6px 10px; } .toolbar-top { gap: 9px; } }
</style>
