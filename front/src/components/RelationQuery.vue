<!--
  @file RelationQuery.vue
  @description 关系查询弹窗组件
  
  功能说明：
  - 选择两个人物（人物A和人物B）
  - 支持搜索选择或从族谱中点击选择
  - 查询并显示两人之间的家族关系
  
  Props:
  - show: 是否显示弹窗
  - personA: 选中的人物A
  - personB: 选中的人物B
  - result: 关系查询结果
  - personList: 人员列表（用于搜索）
  - selectMode: 从族谱选择模式 ('A' | 'B' | null)
  
  Events:
  - close: 关闭弹窗
  - query: 执行关系查询
  - startSelect: 开始从族谱选择 (target: 'A' | 'B')
  - selectA: 选择人物A
  - selectB: 选择人物B
  - clearA: 清除人物A
  - clearB: 清除人物B
-->

<template>
  <!-- 弹窗遮罩 -->
  <div v-if="show" class="relation-query-overlay" @click.self="$emit('close')">
    <div class="relation-query-modal">
      <!-- 弹窗头部 -->
      <div class="relation-query-header">
        <h3>关系查询</h3>
        <button class="close-btn" @click="$emit('close')">✕</button>
      </div>
      
      <!-- 弹窗内容 -->
      <div class="relation-query-body">
        <div class="relation-select-row">
          <!-- 人物A选择 -->
          <div class="relation-select-item">
            <div class="relation-item-header">
              <label>人物 A</label>
              <button 
                class="pick-from-tree-btn" 
                @click="$emit('startSelect', 'A')" 
                :disabled="selectMode !== null"
              >
                在族谱中选择
              </button>
            </div>
            
            <!-- 搜索输入框 -->
            <div class="relation-search-box">
              <input 
                v-model="searchA"
                type="text"
                placeholder="输入姓名搜索..."
                class="relation-search-input"
                @focus="showDropdownA = true"
                @input="showDropdownA = true"
              />
              <!-- 搜索结果下拉框 -->
              <div v-if="showDropdownA && filteredPersonsA.length > 0" class="relation-dropdown">
                <div 
                  v-for="person in filteredPersonsA" 
                  :key="person.id"
                  class="relation-dropdown-item"
                  @click="selectPersonA(person)"
                >
                  <span 
                    class="relation-item-avatar" 
                    :class="{ male: person.gender === 'M', female: person.gender === 'F' }"
                  >
                    {{ person.name.charAt(0) }}
                  </span>
                  <span class="relation-item-name">{{ person.name }}</span>
                </div>
              </div>
            </div>
            
            <!-- 已选中的人物卡片 -->
            <div v-if="personA" class="selected-person-card">
              <span 
                class="selected-avatar" 
                :class="{ male: personA.gender === 'M', female: personA.gender === 'F' }"
              >
                {{ personA.name.charAt(0) }}
              </span>
              <span class="selected-name">{{ personA.name }}</span>
              <button class="clear-selected" @click="clearPersonA">✕</button>
            </div>
          </div>
          
          <!-- 箭头 -->
          <div class="relation-arrow">→</div>
          
          <!-- 人物B选择 -->
          <div class="relation-select-item">
            <div class="relation-item-header">
              <label>人物 B</label>
              <button 
                class="pick-from-tree-btn" 
                @click="$emit('startSelect', 'B')" 
                :disabled="selectMode !== null"
              >
                在族谱中选择
              </button>
            </div>
            
            <!-- 搜索输入框 -->
            <div class="relation-search-box">
              <input 
                v-model="searchB"
                type="text"
                placeholder="输入姓名搜索..."
                class="relation-search-input"
                @focus="showDropdownB = true"
                @input="showDropdownB = true"
              />
              <!-- 搜索结果下拉框 -->
              <div v-if="showDropdownB && filteredPersonsB.length > 0" class="relation-dropdown">
                <div 
                  v-for="person in filteredPersonsB" 
                  :key="person.id"
                  class="relation-dropdown-item"
                  @click="selectPersonB(person)"
                >
                  <span 
                    class="relation-item-avatar" 
                    :class="{ male: person.gender === 'M', female: person.gender === 'F' }"
                  >
                    {{ person.name.charAt(0) }}
                  </span>
                  <span class="relation-item-name">{{ person.name }}</span>
                </div>
              </div>
            </div>
            
            <!-- 已选中的人物卡片 -->
            <div v-if="personB" class="selected-person-card">
              <span 
                class="selected-avatar" 
                :class="{ male: personB.gender === 'M', female: personB.gender === 'F' }"
              >
                {{ personB.name.charAt(0) }}
              </span>
              <span class="selected-name">{{ personB.name }}</span>
              <button class="clear-selected" @click="clearPersonB">✕</button>
            </div>
          </div>
        </div>
        
        <!-- 查询按钮 -->
        <button 
          class="query-relation-btn" 
          @click="$emit('query')" 
          :disabled="!personA || !personB"
        >
          查询关系
        </button>
        
        <!-- 查询结果 -->
        <div v-if="result" class="relation-result">
          <div class="relation-result-card">
            <div class="result-persons">
              <span class="result-person-name">{{ personA?.name }}</span>
              <span class="result-relation-text">是</span>
              <span class="result-person-name">{{ personB?.name }}</span>
              <span class="result-relation-text">的</span>
            </div>
            <div class="result-relation-name">{{ result }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

/**
 * 组件属性
 */
const props = defineProps({
  /** 是否显示弹窗 */
  show: Boolean,
  /** 选中的人物A */
  personA: Object,
  /** 选中的人物B */
  personB: Object,
  /** 关系查询结果 */
  result: String,
  /** 人员列表 */
  personList: Array,
  /** 从族谱选择模式 */
  selectMode: String
})

/**
 * 组件事件
 */
const emit = defineEmits([
  'close',        // 关闭弹窗
  'query',        // 执行查询
  'startSelect',  // 开始从族谱选择
  'selectA',      // 选择人物A
  'selectB',      // 选择人物B
  'clearA',       // 清除人物A
  'clearB'        // 清除人物B
])

// ========== 本地状态 ==========

/** 人物A搜索文本 */
const searchA = ref('')

/** 人物B搜索文本 */
const searchB = ref('')

/** 是否显示人物A下拉框 */
const showDropdownA = ref(false)

/** 是否显示人物B下拉框 */
const showDropdownB = ref(false)

// ========== 计算属性 ==========

/** 过滤后的人物A候选列表 */
const filteredPersonsA = computed(() => {
  const text = searchA.value.toLowerCase().trim()
  if (!text) return props.personList.slice(0, 10)
  return props.personList.filter(p => p.name.toLowerCase().includes(text)).slice(0, 10)
})

/** 过滤后的人物B候选列表 */
const filteredPersonsB = computed(() => {
  const text = searchB.value.toLowerCase().trim()
  if (!text) return props.personList.slice(0, 10)
  return props.personList.filter(p => p.name.toLowerCase().includes(text)).slice(0, 10)
})

// ========== 方法 ==========

/** 选择人物A */
const selectPersonA = (person) => {
  emit('selectA', person)
  searchA.value = ''
  showDropdownA.value = false
}

/** 选择人物B */
const selectPersonB = (person) => {
  emit('selectB', person)
  searchB.value = ''
  showDropdownB.value = false
}

/** 清除人物A */
const clearPersonA = () => {
  emit('clearA')
  searchA.value = ''
}

/** 清除人物B */
const clearPersonB = () => {
  emit('clearB')
  searchB.value = ''
}

// ========== 监听器 ==========

/** 弹窗显示时重置搜索状态 */
watch(() => props.show, (val) => {
  if (val) {
    searchA.value = ''
    searchB.value = ''
    showDropdownA.value = false
    showDropdownB.value = false
  }
})
</script>

<style scoped>
/* ========== 遮罩层 ========== */
.relation-query-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2500;
  backdrop-filter: blur(4px);
}

/* ========== 弹窗容器 ========== */
.relation-query-modal {
  background: linear-gradient(145deg, #ffffff 0%, #f8fafc 100%);
  border-radius: 24px;
  width: 560px;
  max-width: 95vw;
  box-shadow: 0 25px 80px rgba(0, 0, 0, 0.25);
  animation: modalSlideIn 0.3s ease;
  overflow: hidden;
}

@keyframes modalSlideIn {
  from { opacity: 0; transform: translateY(-20px); }
  to { opacity: 1; transform: translateY(0); }
}

/* ========== 弹窗头部 ========== */
.relation-query-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px 25px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.relation-query-header h3 {
  margin: 0;
  color: #fff;
  font-size: 20px;
  font-weight: 600;
}

.close-btn {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: #fff;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.2s;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: rotate(90deg);
}

/* ========== 弹窗内容 ========== */
.relation-query-body {
  padding: 30px;
}

/* 选择区域布局 */
.relation-select-row {
  display: flex;
  align-items: flex-start;
  gap: 20px;
  margin-bottom: 25px;
}

.relation-select-item {
  flex: 1;
}

/* 选择项头部 */
.relation-item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.relation-item-header label {
  font-size: 14px;
  font-weight: 600;
  color: #555;
  margin: 0;
}

/* 从族谱选择按钮 */
.pick-from-tree-btn {
  padding: 5px 10px;
  background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%);
  color: #2e7d32;
  border: 1px solid #81c784;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.pick-from-tree-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #c8e6c9 0%, #a5d6a7 100%);
  transform: translateY(-1px);
}

.pick-from-tree-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 箭头 */
.relation-arrow {
  font-size: 28px;
  color: #667eea;
  margin-top: 45px;
  font-weight: bold;
}

/* ========== 搜索框 ========== */
.relation-search-box {
  position: relative;
}

.relation-search-input {
  width: 100%;
  padding: 12px 16px;
  border: 2px solid #e0e0e0;
  border-radius: 12px;
  font-size: 15px;
  transition: all 0.2s;
  box-sizing: border-box;
}

.relation-search-input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
}

/* 下拉框 */
.relation-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  margin-top: 4px;
  max-height: 200px;
  overflow-y: auto;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
  z-index: 100;
}

.relation-dropdown-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  cursor: pointer;
  transition: background 0.15s;
}

.relation-dropdown-item:hover {
  background: #f5f7ff;
}

/* 头像 */
.relation-item-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 600;
  color: #fff;
}

.relation-item-avatar.male {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
}

.relation-item-avatar.female {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.relation-item-name {
  font-size: 14px;
  color: #333;
}

/* ========== 已选中的人物卡片 ========== */
.selected-person-card {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 10px;
  padding: 12px 16px;
  background: linear-gradient(135deg, #f5f7ff 0%, #e8ecff 100%);
  border-radius: 12px;
  border: 2px solid #667eea;
}

.selected-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: 600;
  color: #fff;
}

.selected-avatar.male {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
}

.selected-avatar.female {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.selected-name {
  flex: 1;
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.clear-selected {
  background: none;
  border: none;
  color: #999;
  font-size: 16px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: all 0.2s;
}

.clear-selected:hover {
  background: rgba(0, 0, 0, 0.1);
  color: #666;
}

/* ========== 查询按钮 ========== */
.query-relation-btn {
  width: 100%;
  padding: 14px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  margin-bottom: 20px;
}

.query-relation-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4);
}

.query-relation-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ========== 查询结果 ========== */
.relation-result {
  margin-top: 10px;
}

.relation-result-card {
  background: linear-gradient(135deg, #fff9e6 0%, #fff3cd 100%);
  border: 2px solid #ffc107;
  border-radius: 16px;
  padding: 25px;
  text-align: center;
}

.result-persons {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 15px;
}

.result-person-name {
  font-size: 18px;
  font-weight: 700;
  color: #667eea;
  background: rgba(102, 126, 234, 0.1);
  padding: 4px 12px;
  border-radius: 8px;
}

.result-relation-text {
  font-size: 16px;
  color: #666;
}

.result-relation-name {
  font-size: 32px;
  font-weight: 800;
  color: #333;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
</style>
