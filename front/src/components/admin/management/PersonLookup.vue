<template>
  <div class="person-lookup">
    <label :for="inputId">{{ label }} <span v-if="required" aria-hidden="true">*</span></label>
    <div v-if="selectedPerson" class="selected-person">
      <span><strong>{{ selectedPerson.name }}</strong><small>{{ selectedPerson.birth_date || '生年未录' }} · {{ genderText[selectedPerson.gender] }}</small></span>
      <button type="button" :aria-label="`重新选择${label}`" :disabled="disabled" @click="clearSelection">重选</button>
    </div>
    <template v-else>
      <input :id="inputId" v-model="keyword" type="search" placeholder="输入姓名、拼音或首拼" autocomplete="off" :disabled="disabled" @input="search" />
      <div v-if="keyword.trim()" class="lookup-results" role="listbox" :aria-label="`${label}搜索结果`">
        <p v-if="loading">正在查找…</p>
        <p v-else-if="error" role="alert">{{ error }}</p>
        <p v-else-if="!results.length">没有找到匹配的人物，请先在人物资料中添加。</p>
        <button v-for="person in results" :key="person.id" type="button" role="option" :aria-selected="false" :disabled="disabled" @click="selectPerson(person)">
          <span><strong>{{ person.name }}</strong><small>{{ person.birth_date || '生年未录' }} · {{ genderText[person.gender] }}</small></span>
          <small>{{ person.id }}</small>
        </button>
      </div>
    </template>
  </div>
</template>

<script setup>
/** 按真实姓名接口搜索并选择稳定人物 ID。 */
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { searchPersons } from '../../../api/persons'
import { managementErrorMessage } from '../../../api/management'

const props = defineProps({
  modelValue: { type: String, default: '' },
  people: { type: Array, default: () => [] },
  label: { type: String, required: true },
  inputId: { type: String, required: true },
  required: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  excludeIds: { type: Array, default: () => [] }
})
const emit = defineEmits(['update:modelValue'])
const genderText = { M: '男', F: '女', U: '未录' }
const keyword = ref('')
const results = ref([])
const loading = ref(false)
const error = ref('')
const chosen = ref(null)
let timer = null
let requestId = 0
const selectedPerson = computed(() => props.people.find(person => person.id === props.modelValue) || (chosen.value?.id === props.modelValue ? chosen.value : null))

/** 延时搜索，丢弃用户继续输入后返回的旧响应。 */
function search() {
  clearTimeout(timer)
  const currentRequest = ++requestId
  const query = keyword.value.trim()
  error.value = ''
  results.value = []
  loading.value = Boolean(query)
  if (!query) return
  timer = setTimeout(async () => {
    try {
      const people = await searchPersons(query)
      if (currentRequest === requestId) results.value = people.filter(person => !props.excludeIds.includes(person.id))
    } catch (failure) {
      if (currentRequest === requestId) error.value = managementErrorMessage(failure)
    } finally {
      if (currentRequest === requestId) loading.value = false
    }
  }, 240)
}

/** 记住所选人物并向表单传递 ID。 */
function selectPerson(person) {
  chosen.value = person
  keyword.value = ''
  emit('update:modelValue', person.id)
}

/** 清除选中值，重新打开姓名搜索。 */
function clearSelection() {
  chosen.value = null
  keyword.value = ''
  results.value = []
  emit('update:modelValue', '')
}

watch(() => props.modelValue, value => { if (!value) chosen.value = null })
onBeforeUnmount(() => { clearTimeout(timer); requestId += 1 })
</script>

<style scoped>
.person-lookup { position: relative; display: grid; align-content: start; gap: 8px; min-width: 0; }
label { font-size: 13px; font-weight: 600; color: #355247; }
label > span { color: #985a43; }
input { width: 100%; min-width: 0; box-sizing: border-box; padding: 11px 12px; border: 1px solid #d6ded7; border-radius: 9px; color: #203b32; background: #fff; font: inherit; font-size: 14px; }
input:focus { border-color: #2d6a54; outline: 3px solid #e9f0e9; }
.selected-person, .lookup-results button { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
.selected-person { padding: 9px 12px; border: 1px solid #c1d3c4; border-radius: 9px; background: #f0f5ef; min-height: 42px; }
.selected-person > span, .lookup-results button > span { display: grid; gap: 3px; }
small { color: #748378; font-size: 11px; overflow-wrap: anywhere; }
.selected-person button { border: 0; background: transparent; color: #2d6a54; cursor: pointer; white-space: nowrap; }
.lookup-results { border: 1px solid #dfe5de; border-radius: 10px; max-height: 220px; overflow-y: auto; background: #fff; }
.lookup-results p { margin: 0; padding: 14px; color: #708075; font-size: 12px; }
.lookup-results button { width: 100%; padding: 10px 12px; border: 0; border-bottom: 1px solid #edf0e9; background: transparent; text-align: left; color: #203b32; cursor: pointer; }
.lookup-results button:hover, .lookup-results button:focus-visible { background: #f0f5ef; }
.lookup-results button > small { max-width: 40%; }
</style>
