<!--
  @file DeleteConfirm.vue
  @description 删除确认弹窗组件
  
  功能说明：
  - 显示删除警告信息
  - 确认/取消操作
  - 用于删除人物前的二次确认
  
  Props:
  - show: 是否显示弹窗
  - personName: 要删除的人物姓名
  
  Events:
  - cancel: 取消删除
  - confirm: 确认删除
-->

<template>
  <!-- 弹窗遮罩 -->
  <div v-if="show" class="delete-confirm-overlay">
    <div class="delete-confirm-modal">
      <!-- 警告图标 -->
      <div class="delete-confirm-icon">⚠</div>
      
      <!-- 标题 -->
      <h3>确认删除</h3>
      
      <!-- 警告信息 -->
      <p class="delete-warning">
        您确定要删除 <strong>{{ personName }}</strong> 吗？
      </p>
      
      <!-- 提示信息 -->
      <p class="delete-hint">
        此操作不可撤销，该人物的所有信息将被永久删除。
      </p>
      
      <!-- 操作按钮 -->
      <div class="delete-confirm-actions">
        <button class="delete-cancel-btn" @click="$emit('cancel')">
          取消
        </button>
        <button class="delete-confirm-btn" @click="$emit('confirm')">
          确认删除
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
/**
 * 组件属性
 */
defineProps({
  /** 是否显示弹窗 */
  show: Boolean,
  /** 要删除的人物姓名 */
  personName: String
})

/**
 * 组件事件
 */
defineEmits([
  'cancel',   // 取消删除
  'confirm'   // 确认删除
])
</script>

<style scoped>
/* ========== 遮罩层 ========== */
.delete-confirm-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 3000;
  backdrop-filter: blur(4px);
}

/* ========== 弹窗容器 ========== */
.delete-confirm-modal {
  background: #fff;
  border-radius: 20px;
  width: 380px;
  max-width: 90vw;
  padding: 30px;
  text-align: center;
  box-shadow: 0 25px 80px rgba(0, 0, 0, 0.3);
  animation: modalSlideIn 0.3s ease;
}

@keyframes modalSlideIn {
  from { opacity: 0; transform: translateY(-20px); }
  to { opacity: 1; transform: translateY(0); }
}

/* ========== 警告图标 ========== */
.delete-confirm-icon {
  font-size: 56px;
  margin-bottom: 15px;
}

/* ========== 标题 ========== */
.delete-confirm-modal h3 {
  margin: 0 0 15px 0;
  font-size: 22px;
  color: #333;
}

/* ========== 警告信息 ========== */
.delete-warning {
  font-size: 16px;
  color: #333;
  margin-bottom: 10px;
}

.delete-warning strong {
  color: #ff4757;
}

/* ========== 提示信息 ========== */
.delete-hint {
  font-size: 13px;
  color: #888;
  margin-bottom: 25px;
  line-height: 1.5;
}

/* ========== 操作按钮 ========== */
.delete-confirm-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}

/* 取消按钮 */
.delete-cancel-btn {
  padding: 12px 30px;
  background: #f5f5f5;
  color: #666;
  border: none;
  border-radius: 10px;
  font-size: 15px;
  cursor: pointer;
  transition: all 0.2s;
}

.delete-cancel-btn:hover {
  background: #e8e8e8;
}

/* 确认删除按钮 */
.delete-confirm-btn {
  padding: 12px 30px;
  background: #ff4757;
  color: #fff;
  border: none;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.delete-confirm-btn:hover {
  background: #ff3344;
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(255, 71, 87, 0.4);
}
</style>
