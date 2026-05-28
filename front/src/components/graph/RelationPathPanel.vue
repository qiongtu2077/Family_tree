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
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(8px);
}

.relation-panel {
  width: min(680px, calc(100vw - 34px));
  padding: 26px;
  border-radius: 28px;
  color: #f0f0f0;
  background: #191919;
  border: 1px solid rgba(255, 250, 0, 0.28);
  box-shadow: 0 30px 90px rgba(0, 0, 0, 0.55);
  animation: modalSlideIn 0.3s ease both;
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
  color: #888;
}

button {
  border: 0;
  border-radius: 14px;
  padding: 10px 14px;
  color: #fffa00;
  background: #252525;
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
  color: #888;
  font-size: 13px;
  font-weight: 700;
}

select {
  border: 1px solid #333;
  border-radius: 14px;
  padding: 12px;
  color: #f0f0f0;
  background: #252525;
}

select:focus {
  border-color: #fffa00;
  outline: none;
}

.query-btn {
  width: 100%;
  color: #101010;
  background: linear-gradient(135deg, #fffa00 0%, #d4af37 100%);
}

.query-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.result-card {
  margin-top: 18px;
  padding: 18px;
  border-radius: 20px;
  border: 1px solid rgba(255, 250, 0, 0.22);
  background: #252525;
}

.result-card span {
  display: block;
  color: #888;
  font-size: 12px;
}

.result-card strong {
  display: block;
  margin-top: 6px;
  color: #fffa00;
  font-size: 28px;
}

.error-text {
  color: #ff7b86;
}

@keyframes modalSlideIn {
  from { opacity: 0; transform: translateY(-24px) scale(0.96); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

@media (max-width: 640px) {
  .selector-grid {
    grid-template-columns: 1fr;
  }
}
</style>
