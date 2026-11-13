<template>
  <div v-if="open" class="center-modal-backdrop" @click.self="$emit('cancel')" @keydown.esc.prevent="$emit('cancel')">
    <section class="center-modal" role="dialog" aria-modal="true" :aria-label="title">
      <header>
        <span>{{ eyebrow }}</span>
        <h2>{{ title }}</h2>
        <p>{{ description }}</p>
      </header>

      <div v-if="mode === 'center'" class="search-box">
        <input
          :value="keyword"
          type="search"
          placeholder="输入姓名搜索中心人物"
          @input="$emit('update:keyword', $event.target.value)"
          @keyup.enter="$emit('search')"
        />
        <button @click="$emit('search')">搜索</button>
      </div>

      <div class="option-list">
        <p v-if="!normalizedOptions.length" class="empty-options">{{ mode === 'center' ? '没有找到匹配人物，请调整姓名后搜索。' : '当前没有可用选项。' }}</p>
        <button
          v-for="option in normalizedOptions"
          :key="option.id"
          class="option-card"
          :class="{ selected: option.id === selectedId }"
          data-testid="graph-option-card"
          :data-option-id="option.id"
          :data-option-mode="mode"
          @click="$emit('select', option.raw)"
        >
          <span class="avatar">{{ option.name.slice(0, 1) }}</span>
          <span class="option-main">
            <strong>{{ option.name }}</strong>
            <small>{{ option.meta }}</small>
          </span>
          <span v-if="option.id === selectedId" class="check">已选</span>
        </button>
      </div>

      <footer>
        <button class="ghost" @click="$emit('cancel')">取消</button>
        <button class="primary" :disabled="!selectedId" @click="$emit('confirm')">
          确认
        </button>
      </footer>
    </section>
  </div>
</template>

<script setup>
/**
 * 中心人物和五图参数选择弹窗。
 */
import { computed } from 'vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  mode: { type: String, default: 'center' },
  keyword: { type: String, default: '' },
  options: { type: Array, default: () => [] },
  selectedId: { type: String, default: '' }
})

defineEmits([
  'update:keyword',
  'search',
  'select',
  'confirm',
  'cancel'
])

const eyebrow = computed(() => {
  const labels = {
    center: '先确定观察者',
    spouse: '选择联姻对象',
    family: '选择后代根'
  }
  return labels[props.mode] || '选择参数'
})

const title = computed(() => {
  const labels = {
    center: '选择中心人物',
    spouse: '选择配偶或伴侣',
    family: '选择要展开的家庭单元'
  }
  return labels[props.mode] || '选择图谱参数'
})

const description = computed(() => {
  const labels = {
    center: '中心人物决定本次图谱的九族范围和所有视图切片。',
    spouse: '姻亲谱系和联姻桥接必须基于明确的一段伴侣关系。',
    family: '后代分支必须从人物家庭单元或明确根节点向下展开。'
  }
  return labels[props.mode] || '请选择一个明确选项后再加载图谱。'
})

const normalizedOptions = computed(() => props.options.map(option => {
  if (props.mode === 'spouse') {
    return {
      id: option.person?.id || '',
      name: option.person?.name || '未命名配偶',
      meta: `家庭 ${option.family_unit_id || '未指定'} · 子女 ${option.child_count || 0} 人`,
      raw: option
    }
  }

  if (props.mode === 'family') {
    return {
      id: option.family_unit_id || '',
      name: option.label || '家庭单元',
      meta: `${(option.spouse_names || []).join('、') || '未录入伴侣'} · 子女 ${option.child_count || 0} 人`,
      raw: option
    }
  }

  return {
    id: option.id,
    name: option.name || '未命名人物',
    meta: option.birth_date ? `出生：${option.birth_date}` : '出生日期未知',
    raw: option
  }
}))
</script>

<style scoped>
.center-modal-backdrop { position: fixed; inset: 0; z-index: 2400; display: grid; place-items: center; padding: 20px; overflow-y: auto; background: rgba(23, 43, 34, .3); backdrop-filter: blur(4px); }
.center-modal { width: min(560px, 100%); max-height: calc(100vh - 40px); max-height: calc(100dvh - 40px); display: flex; flex-direction: column; gap: 20px; padding: 28px; border: 1px solid var(--line); border-radius: 18px; color: var(--ink); background: #fff; box-shadow: 0 24px 90px rgba(32, 59, 50, .15); overflow-y: auto; }
header, .search-box, footer { flex-shrink: 0; }
header span { color: var(--copper); font-size: 11px; letter-spacing: .08em; }
h2 { margin: 9px 0 0; font-size: 23px; font-weight: 600; }
p { margin: 10px 0 0; color: var(--muted); font-size: 13px; line-height: 1.7; }
.search-box { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 8px; }
input { min-width: 0; padding: 11px 13px; border: 1px solid var(--line); border-radius: 8px; color: var(--ink); background: #f9faf7; font-size: 13px; }
input:focus { border-color: var(--green); }
.option-list { min-height: 0; max-height: 340px; overflow-y: auto; display: grid; align-content: start; gap: 8px; padding: 2px; }
.option-card { display: grid; grid-template-columns: 38px minmax(0, 1fr) auto; align-items: center; gap: 12px; padding: 12px; border: 1px solid var(--line); border-radius: 10px; color: var(--ink); text-align: left; background: #fff; }
.option-card:hover { background: #f7faf6; border-color: #afc7b7; }
.option-card.selected { border-color: var(--green); background: var(--green-soft); }
.avatar { width: 38px; height: 38px; display: grid; place-items: center; border-radius: 10px; color: var(--green); background: #edf1e9; font-family: 'SimSun', serif; font-size: 19px; }
.option-main { display: grid; gap: 5px; min-width: 0; overflow-wrap: anywhere; }
.option-main strong { font-size: 14px; font-weight: 600; }
.option-main small { color: var(--muted); font-size: 11px; line-height: 1.5; }
.check { color: var(--green); font-size: 11px; }
footer { display: flex; justify-content: flex-end; gap: 10px; padding-top: 4px; }
button { padding: 10px 19px; border: 1px solid transparent; border-radius: 8px; font-size: 13px; }
.search-box button, .primary { color: #fff; background: var(--green); }
.primary:disabled { opacity: .45; }
.ghost { color: var(--muted); border-color: var(--line); background: #fff; }
.empty-options { padding: 20px 8px; text-align: center; }
@media (max-width: 600px) { .center-modal-backdrop { padding: 14px; } .center-modal { max-height: calc(100dvh - 28px); padding: 23px 20px; gap: 16px; } h2 { font-size: 21px; } .option-card { padding: 10px; gap: 9px; } }
</style>
