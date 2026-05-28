<template>
  <div v-if="open" class="center-modal-backdrop" @click.self="$emit('cancel')">
    <section class="center-modal">
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
        <button
          v-for="option in normalizedOptions"
          :key="option.id"
          class="option-card"
          :class="{ selected: option.id === selectedId }"
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
.center-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 2400;
  display: grid;
  place-items: center;
  padding: 24px;
  background: radial-gradient(circle at center, rgba(255, 250, 0, 0.12), rgba(0, 0, 0, 0.72) 48%, rgba(0, 0, 0, 0.86));
  backdrop-filter: blur(8px);
}

.center-modal {
  width: min(620px, calc(100vw - 32px));
  max-height: min(720px, calc(100vh - 48px));
  display: grid;
  gap: 18px;
  padding: 26px;
  border-radius: 30px;
  color: #f7efd0;
  background:
    linear-gradient(145deg, rgba(33, 31, 24, 0.98), rgba(18, 19, 18, 0.98)),
    #181a1b;
  border: 1px solid rgba(255, 238, 137, 0.32);
  box-shadow: 0 34px 120px rgba(0, 0, 0, 0.56), inset 0 0 0 1px rgba(255, 250, 0, 0.05);
  animation: modalRise 0.38s cubic-bezier(.2,.8,.2,1) both;
}

header span {
  color: #d4af37;
  font-size: 12px;
  letter-spacing: 0.18em;
}

h2 {
  margin: 8px 0 0;
  font-size: 28px;
}

p {
  margin: 8px 0 0;
  color: #b9ad84;
  line-height: 1.7;
}

.search-box {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 10px;
}

input {
  min-width: 0;
  border: 1px solid rgba(255, 238, 137, 0.2);
  border-radius: 999px;
  padding: 13px 16px;
  color: #fff8d6;
  background: rgba(8, 9, 9, 0.72);
}

input:focus {
  outline: 3px solid rgba(255, 250, 0, 0.12);
  border-color: rgba(255, 250, 0, 0.7);
}

.option-list {
  max-height: 360px;
  display: grid;
  gap: 10px;
  overflow: auto;
  padding-right: 4px;
}

.option-card {
  display: grid;
  grid-template-columns: 44px 1fr auto;
  align-items: center;
  gap: 12px;
  border: 1px solid rgba(255, 238, 137, 0.16);
  border-radius: 18px;
  padding: 12px;
  color: #f7efd0;
  text-align: left;
  background: rgba(255, 255, 255, 0.045);
  cursor: pointer;
  transition: transform 0.18s ease, border-color 0.18s ease, background 0.18s ease;
}

.option-card:hover,
.option-card.selected {
  transform: translateY(-1px);
  border-color: rgba(255, 250, 0, 0.5);
  background: rgba(255, 250, 0, 0.09);
}

.avatar {
  width: 44px;
  height: 44px;
  display: grid;
  place-items: center;
  border-radius: 14px;
  color: #141414;
  font-weight: 900;
  background: linear-gradient(135deg, #fffa00, #d4af37);
}

.option-main {
  display: grid;
  gap: 4px;
}

.option-main small {
  color: #a69d78;
}

.check {
  color: #fffa00;
  font-size: 12px;
}

footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

button {
  border: 0;
  border-radius: 999px;
  padding: 11px 18px;
  cursor: pointer;
}

.search-box button,
.primary {
  color: #101010;
  font-weight: 800;
  background: linear-gradient(135deg, #fffa00, #d4af37);
}

.primary:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.ghost {
  color: #f7efd0;
  border: 1px solid rgba(255, 238, 137, 0.18);
  background: rgba(255, 255, 255, 0.06);
}

@keyframes modalRise {
  from { opacity: 0; transform: translateY(18px) scale(0.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
</style>
