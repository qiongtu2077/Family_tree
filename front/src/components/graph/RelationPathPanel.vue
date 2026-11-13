<template>
  <div v-if="open" class="panel-backdrop" @click.self="$emit('close')" @keydown.esc.prevent="$emit('close')">
    <section class="relation-panel" role="dialog" aria-modal="true" aria-label="关系路径">
      <header>
        <div><span class="eyebrow">亲缘探索</span><h2>关系路径</h2><p>选择两个人，查看他们之间的亲缘联系。</p></div>
        <button class="close-button" @click="$emit('close')">关闭 <span aria-hidden="true">×</span></button>
      </header>
      <div class="selector-grid">
        <div class="person-selector">
          <label for="relation-from">人物 A</label>
          <input v-model="fromKeyword" type="search" aria-label="搜索人物 A" placeholder="姓名、拼音或首拼" :disabled="isQuerying" />
          <select id="relation-from" v-model="fromId" :disabled="isQuerying"><option value="">请选择</option><option v-for="person in fromPeople" :key="person.id" :value="person.id">{{ person.name }}</option></select>
        </div>
        <div class="person-selector">
          <label for="relation-to">人物 B</label>
          <input v-model="toKeyword" type="search" aria-label="搜索人物 B" placeholder="姓名、拼音或首拼" :disabled="isQuerying" />
          <select id="relation-to" v-model="toId" :disabled="isQuerying"><option value="">请选择</option><option v-for="person in toPeople" :key="person.id" :value="person.id">{{ person.name }}</option></select>
        </div>
      </div>
      <button class="query-btn" :disabled="!canQuery || isQuerying" @click="query">{{ isQuerying ? '正在查找亲缘路径...' : '查询关系' }}</button>
      <div v-if="result" class="result-card" aria-live="polite">
        <span class="result-label">查询结果</span><strong>{{ result.relation_text }}</strong>
        <p v-if="result.path_description">{{ result.path_description }}</p>
        <p v-else>{{ result.path.nodes.length }} 位人物 · {{ result.path.edges.length }} 段关系</p>
        <ol class="path-chain" aria-label="人物关系路径">
          <li v-for="(person, index) in result.path.nodes" :key="person.id">
            <div class="path-person"><span class="path-avatar">{{ person.name.slice(0, 1) }}</span><span>{{ person.name }}</span><small v-if="index === 0">起点</small><small v-else-if="index === result.path.nodes.length - 1">终点</small></div>
            <div v-if="index < result.path.edges.length" class="path-link"><span aria-hidden="true">↓</span>{{ stepLabel(result.path.edges[index], person.id) }}</div>
          </li>
        </ol>
        <details v-for="(candidate, index) in result.candidates" :key="index" class="alternative-path"><summary>其它路径：{{ candidate.relation_text }}</summary><p>{{ candidate.path_description }}</p><p>{{ candidate.path.nodes.map(person => person.name).join(' → ') }}</p></details>
      </div>
      <p v-if="errorMessage" class="error-text" role="alert">{{ errorMessage }}</p>
    </section>
  </div>
</template>

<script setup>
/** 展示两个人的关系解释及后端返回的实际人物路径。 */
import { computed, ref, watch } from 'vue'
import { matchesPersonSearch } from '../../utils/personSearch'
const props = defineProps({
  open: { type: Boolean, default: false },
  people: { type: Array, default: () => [] },
  initialPerson: { type: Object, default: null },
  queryRelation: { type: Function, required: true }
})
defineEmits(['close'])
const fromId = ref('')
const toId = ref('')
const fromKeyword = ref('')
const toKeyword = ref('')
const result = ref(null)
const errorMessage = ref('')
const isQuerying = ref(false)
const canQuery = computed(() => fromId.value && toId.value && fromId.value !== toId.value)
// 当前选项始终保留，收窄候选范围不会悄悄改写已选人物。
const fromPeople = computed(() => props.people.filter(person => person.id === fromId.value || matchesPersonSearch(person, fromKeyword.value)))
const toPeople = computed(() => props.people.filter(person => person.id === toId.value || matchesPersonSearch(person, toKeyword.value)))

/** 查询后端已确认的 RelationPathResponse，并控制提交状态。 */
async function query() {
  errorMessage.value = ''
  result.value = null
  isQuerying.value = true
  try {
    result.value = await props.queryRelation(fromId.value, toId.value)
  } catch (error) {
    errorMessage.value = error.response?.data?.detail || error.message
  } finally {
    isQuerying.value = false
  }
}

/** 沿路径行进方向说明下一位人物与当前人物的关系。 */
function stepLabel(edge, currentPersonId) {
  if (edge.relation === 'parent_of') return edge.source === currentPersonId ? '子女' : '父母'
  if (edge.relation === 'spouse_of') return '配偶 / 伴侣'
  return edge.label || edge.relation
}

// 初始人物作为起点，修改查询对象后清除旧结果以免误读。
watch(() => props.initialPerson, person => { if (person) fromId.value = person.id }, { immediate: true })
watch([fromId, toId], () => { result.value = null; errorMessage.value = '' })
</script>

<style scoped>
.panel-backdrop { position: fixed; inset: 0; z-index: 100; display: grid; place-items: center; padding: 20px; overflow-y: auto; background: rgba(23, 43, 34, .3); backdrop-filter: blur(4px); }
.relation-panel { width: min(620px, 100%); max-height: calc(100vh - 40px); max-height: calc(100dvh - 40px); padding: 28px; overflow-y: auto; border: 1px solid var(--line); border-radius: 18px; color: var(--ink); background: #fff; box-shadow: 0 24px 90px rgba(32, 59, 50, .15); }
header { display: flex; align-items: flex-start; justify-content: space-between; gap: 18px; }
.eyebrow { color: var(--copper); font-size: 11px; letter-spacing: .08em; }
h2 { margin: 9px 0 0; font-size: 23px; font-weight: 600; }
p { margin: 10px 0 0; color: var(--muted); font-size: 13px; line-height: 1.7; overflow-wrap: anywhere; }
button { padding: 10px 14px; border: 1px solid var(--line); border-radius: 8px; color: var(--green); background: #fff; font-size: 12px; }
.close-button { flex-shrink: 0; padding: 4px 0 4px 10px; border: 0; color: var(--muted); font-size: 11px; }
.close-button span { margin-left: 4px; font-size: 18px; vertical-align: -1px; }
.selector-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; margin: 24px 0 18px; }
.person-selector { display: grid; min-width: 0; gap: 9px; }
label { color: var(--muted); font-size: 12px; }
input, select { width: 100%; min-width: 0; max-width: 100%; padding: 11px 10px; border: 1px solid var(--line); border-radius: 8px; color: var(--ink); background: #f9faf7; font-size: 13px; }
input:focus, select:focus { border-color: var(--green); }
.query-btn { width: 100%; padding: 12px; color: #fff; border-color: var(--green); background: var(--green); }
.query-btn:disabled { opacity: .45; }
.result-card { margin-top: 23px; padding: 20px; border: 1px solid var(--line); border-radius: 12px; background: #f7faf6; }
.result-label { display: block; color: var(--muted); font-size: 11px; }
.result-card > strong { display: block; margin-top: 8px; color: var(--green); font-size: 24px; font-weight: 600; overflow-wrap: anywhere; }
.path-chain { list-style: none; margin: 22px 0 0; padding: 0; }
.path-person { display: flex; align-items: center; gap: 10px; color: var(--ink); font-size: 13px; }
.path-avatar { width: 32px; height: 32px; display: grid; place-items: center; flex-shrink: 0; border: 1px solid #d1ded1; border-radius: 8px; color: var(--green); background: #fff; font-family: 'SimSun', serif; font-size: 16px; }
.path-person small { padding: 3px 6px; border-radius: 4px; color: var(--muted); background: #e9eee5; font-size: 10px; }
.path-link { display: flex; align-items: center; gap: 14px; min-height: 34px; padding-left: 12px; color: #8a9c89; font-size: 11px; }
.path-link span { color: #a3b49e; font-size: 18px; }
.alternative-path { margin-top: 16px; padding-top: 13px; border-top: 1px solid var(--line); color: var(--muted); font-size: 12px; }
.alternative-path summary { cursor: pointer; }
.error-text { padding: 12px 14px; border-radius: 8px; color: var(--danger); background: #fbefed; }
@media (max-width: 600px) { .panel-backdrop { padding: 14px; } .relation-panel { max-height: calc(100dvh - 28px); padding: 23px 20px; } .selector-grid { grid-template-columns: minmax(0, 1fr); } h2 { font-size: 21px; } .result-card { padding: 17px; } }
</style>
