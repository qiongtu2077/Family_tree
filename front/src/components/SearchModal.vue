<!--
  @file SearchModal.vue
  @description 搜索结果选择弹窗组件
  
  功能说明：
  - 显示模糊搜索的匹配结果列表
  - 用户选择要定位的人物
  - 二次确认后执行定位
  
  Props:
  - show: 是否显示搜索结果弹窗
  - showConfirm: 是否显示确认弹窗
  - results: 搜索结果列表
  - selectedPerson: 当前选中的人物
  
  Events:
  - close: 关闭弹窗
  - select: 选择人物
  - confirm: 点击确认选择按钮
  - cancelConfirm: 取消确认
  - doConfirm: 执行确认定位
-->

<template>
  <!-- 搜索结果弹窗 -->
  <div v-if="show" class="search-modal-overlay" @click.self="$emit('close')">
    <div class="search-modal">
      <!-- 弹窗头部 -->
      <div class="search-modal-header">
        <div class="search-modal-icon">🔍</div>
        <h3>找到 {{ results.length }} 位相关人物</h3>
        <p class="search-modal-hint">请选择要查找的人物</p>
      </div>
      
      <!-- 搜索结果列表 -->
      <div class="search-modal-body">
        <div class="search-results-list">
          <div 
            v-for="person in results" 
            :key="person.id" 
            class="search-result-item"
            :class="{ selected: selectedPerson?.id === person.id }"
            @click="$emit('select', person)"
          >
            <!-- 头像 -->
            <div 
              class="result-avatar" 
              :class="{ male: person.gender === 'M', female: person.gender === 'F' }"
            >
              {{ person.name.charAt(0) }}
            </div>
            
            <!-- 人物信息 -->
            <div class="result-info">
              <div class="result-name">{{ person.name }}</div>
              <div class="result-meta">
                {{ person.gender === 'M' ? '男' : '女' }}
                <span v-if="person.birth_date"> · {{ person.birth_date }}</span>
              </div>
            </div>
            
            <!-- 选中标记 -->
            <div v-if="selectedPerson?.id === person.id" class="result-check">✓</div>
          </div>
        </div>
      </div>
      
      <!-- 弹窗底部按钮 -->
      <div class="search-modal-footer">
        <button class="modal-cancel-btn" @click="$emit('close')">取消</button>
        <button 
          class="modal-confirm-btn" 
          :disabled="!selectedPerson"
          @click="$emit('confirm')"
        >
          确认选择
        </button>
      </div>
    </div>
  </div>

  <!-- 二次确认弹窗 -->
  <div v-if="showConfirm" class="confirm-modal-overlay">
    <div class="confirm-modal">
      <div class="confirm-icon">📍</div>
      <h3>确认定位</h3>
      <p>确定要定位到 <strong>{{ selectedPerson?.name }}</strong> 吗？</p>
      <div class="confirm-actions">
        <button class="confirm-cancel" @click="$emit('cancelConfirm')">取消</button>
        <button class="confirm-ok" @click="$emit('doConfirm')">确定</button>
      </div>
    </div>
  </div>
</template>

<script setup>
/**
 * 组件属性
 */
defineProps({
  /** 是否显示搜索结果弹窗 */
  show: Boolean,
  /** 是否显示确认弹窗 */
  showConfirm: Boolean,
  /** 搜索结果列表 */
  results: Array,
  /** 当前选中的人物 */
  selectedPerson: Object
})

/**
 * 组件事件
 */
defineEmits([
  'close',          // 关闭弹窗
  'select',         // 选择人物
  'confirm',        // 点击确认选择
  'cancelConfirm',  // 取消确认
  'doConfirm'       // 执行确认定位
])
</script>

<style scoped>
/* ========== 搜索结果弹窗 ========== */

/* 遮罩层 */
.search-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  backdrop-filter: blur(4px);
}

/* 弹窗容器 */
.search-modal {
  background: #fff;
  border-radius: 24px;
  width: 420px;
  max-width: 95vw;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 25px 80px rgba(0, 0, 0, 0.3);
  animation: modalSlideIn 0.3s ease;
  overflow: hidden;
}

@keyframes modalSlideIn {
  from { opacity: 0; transform: translateY(-20px) scale(0.95); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

/* 弹窗头部 */
.search-modal-header {
  padding: 25px;
  text-align: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
}

.search-modal-icon {
  font-size: 40px;
  margin-bottom: 10px;
}

.search-modal-header h3 {
  margin: 0 0 5px 0;
  font-size: 20px;
}

.search-modal-hint {
  margin: 0;
  font-size: 14px;
  opacity: 0.9;
}

/* 弹窗内容 */
.search-modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 15px;
}

/* 结果列表 */
.search-results-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* 结果项 */
.search-result-item {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 15px;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
  border: 2px solid transparent;
  background: #f8f9fa;
}

.search-result-item:hover {
  background: #f0f4ff;
  border-color: #667eea;
}

.search-result-item.selected {
  background: linear-gradient(135deg, #e8ecff 0%, #f0f4ff 100%);
  border-color: #667eea;
}

/* 头像 */
.result-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  font-weight: 600;
  color: #fff;
}

.result-avatar.male {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
}

.result-avatar.female {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

/* 人物信息 */
.result-info {
  flex: 1;
}

.result-name {
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.result-meta {
  font-size: 13px;
  color: #888;
  margin-top: 4px;
}

/* 选中标记 */
.result-check {
  width: 28px;
  height: 28px;
  background: #667eea;
  color: #fff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: bold;
}

/* 弹窗底部 */
.search-modal-footer {
  padding: 15px 20px;
  border-top: 1px solid #eee;
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.modal-cancel-btn {
  padding: 10px 24px;
  background: #f5f5f5;
  color: #666;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.2s;
}

.modal-cancel-btn:hover {
  background: #e8e8e8;
}

.modal-confirm-btn {
  padding: 10px 24px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.modal-confirm-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
}

.modal-confirm-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ========== 确认弹窗 ========== */

.confirm-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2100;
}

.confirm-modal {
  background: #fff;
  border-radius: 20px;
  padding: 30px;
  text-align: center;
  width: 320px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  animation: modalSlideIn 0.2s ease;
}

.confirm-icon {
  font-size: 48px;
  margin-bottom: 15px;
}

.confirm-modal h3 {
  margin: 0 0 10px 0;
  font-size: 20px;
  color: #333;
}

.confirm-modal p {
  margin: 0 0 20px 0;
  color: #666;
  font-size: 15px;
}

.confirm-modal strong {
  color: #667eea;
}

.confirm-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.confirm-cancel {
  padding: 10px 24px;
  background: #f5f5f5;
  color: #666;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s;
}

.confirm-cancel:hover {
  background: #e8e8e8;
}

.confirm-ok {
  padding: 10px 24px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.confirm-ok:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}
</style>
