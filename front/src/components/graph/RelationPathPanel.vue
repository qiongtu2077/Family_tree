<template>
  <div v-if="open" class="panel-backdrop" @click.self="$emit('close')">
    <section class="relation-panel">
      <header>
        <div>
          <h2>关系路径</h2>
          <p>选择两个人，系统会用后端图查询找出最短亲缘路径。</p>
        </div>
        <button @click="$emit('close')">关闭</button>
      </header>

      <div class="selector-grid">
        <label>
          人物 A
          <select v-model="fromId">
            <option value="">请选择</option>
            <option v-for="person in people" :key="person.id" :value="person.id">
              {{ person.name }}
            </option>
          </select>
        </label>
        <label>
          人物 B
          <select v-model="toId">
            <option value="">请选择</option>
            <option v-for="person in people" :key="person.id" :value="person.id">
              {{ person.name }}
            </option>
          </select>
        </label>
      </div>

      <button class="query-btn" :disabled="!canQuery" @click="query">查询关系</button>

      <div v-if="result" class="result-card">
        <span>查询结果</span>
        <strong>{{ result.relation_text }}</strong>
        <p>路径节点 {{ result.path.nodes.length }} 个，关系 {{ result.path.edges.length }} 条。</p>
      </div>

      <p v-if="errorMessage" class="error-text">{{ errorMessage }}</p>
    </section>
  </div>
</template>

<script setup>
/**
 * 关系路径查询面板。
 */
import { computed, ref, watch } from 'vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  people: { type: Array, default: () => [] },
  initialPerson: { type: Object, default: null },
  queryRelation: { type: Function, required: true }
})

defineEmits(['close'])

const fromId = ref('')
const toId = ref('')
const result = ref(null)
const errorMessage = ref('')

const canQuery = computed(() => fromId.value && toId.value && fromId.value !== toId.value)

/**
 * 查询两人关系路径。
 */
async function query() {
  errorMessage.value = ''
  result.value = null
  try {
    result.value = await props.queryRelation(fromId.value, toId.value)
  } catch (error) {
    errorMessage.value = error.response?.data?.detail || error.message
  }
}

watch(
  () => props.initialPerson,
  person => {
    if (person) fromId.value = person.id
  },
  { immediate: true }
)
</script>

<style scoped>
.panel-backdrop {
  position: fixed;
  inset: 0;
  z-index: 40;
  display: grid;
  place-items: center;
  background: rgba(39, 29, 20, 0.38);
  backdrop-filter: blur(8px);
}

.relation-panel {
  width: min(680px, calc(100vw - 34px));
  padding: 26px;
  border-radius: 28px;
  color: #342719;
  background: #fffaf0;
  box-shadow: 0 30px 90px rgba(55, 43, 29, 0.28);
}

header {
  display: flex;
  justify-content: space-between;
  gap: 20px;
}

h2 {
  margin: 0;
}

p {
  color: #846c56;
}

button {
  border: 0;
  border-radius: 14px;
  padding: 10px 14px;
  color: #6f4e37;
  background: rgba(111, 78, 55, 0.1);
  cursor: pointer;
}

.selector-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  margin: 24px 0;
}

label {
  display: grid;
  gap: 8px;
  color: #6d543e;
  font-size: 13px;
  font-weight: 700;
}

select {
  border: 1px solid #dac9b6;
  border-radius: 14px;
  padding: 12px;
  background: #fff5e2;
}

.query-btn {
  width: 100%;
  color: #fff8df;
  background: linear-gradient(135deg, #8b5a2b, #c77935);
}

.query-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.result-card {
  margin-top: 18px;
  padding: 18px;
  border-radius: 20px;
  background: #f4ead7;
}

.result-card span {
  display: block;
  color: #8a735f;
  font-size: 12px;
}

.result-card strong {
  display: block;
  margin-top: 6px;
  color: #7d3d16;
  font-size: 28px;
}

.error-text {
  color: #a8322a;
}

@media (max-width: 640px) {
  .selector-grid {
    grid-template-columns: 1fr;
  }
}
</style>
