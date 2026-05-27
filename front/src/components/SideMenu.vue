<!--
  @file SideMenu.vue
  @description 左侧滑出菜单组件
  
  功能说明：
  - 显示当前用户信息
  - 菜单项：关系查询、人员管理（仅管理员）、退出登录
  - 点击遮罩层关闭菜单
  - 滑入动画效果
  
  Props:
  - show: 是否显示菜单
  - isAdmin: 是否为管理员
  - currentUser: 当前用户信息
  
  Events:
  - close: 关闭菜单
  - openRelation: 打开关系查询
  - openManage: 打开人员管理（仅管理员）
  - logout: 退出登录
-->

<template>
  <!-- 遮罩层：点击关闭菜单 -->
  <div v-if="show" class="menu-overlay" @click.self="$emit('close')">
    <!-- 菜单面板 -->
    <div class="side-menu">
      <!-- 菜单头部 -->
      <div class="menu-header">
        <h3>菜单</h3>
        <button class="close-btn" @click="$emit('close')">✕</button>
      </div>
      
      <!-- 菜单内容 -->
      <div class="menu-content">
        <!-- 关系查询 -->
        <div class="menu-item" @click="$emit('close'); $emit('openRelation')">
          <span>关系查询</span>
        </div>
        
        <!-- 人员管理（仅管理员可见） -->
        <div 
          v-if="isAdmin" 
          class="menu-item" 
          @click="$emit('close'); $emit('openManage')"
        >
          <span>人员管理</span>
        </div>
        
        <!-- 退出登录 -->
        <div class="menu-item" @click="$emit('logout')">
          <span>退出登录</span>
        </div>
      </div>
      
      <!-- 菜单底部：用户信息 -->
      <div class="menu-footer">
        <p>当前用户：{{ currentUser?.real_name || currentUser?.username }}</p>
        <p>{{ isAdmin ? '管理员' : '普通用户' }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
/**
 * 组件属性定义
 */
defineProps({
  /** 是否显示菜单 */
  show: Boolean,
  /** 是否为管理员 */
  isAdmin: Boolean,
  /** 当前用户信息 */
  currentUser: Object
})

/**
 * 组件事件定义
 */
defineEmits([
  'close',          // 关闭菜单
  'openRelation',   // 打开关系查询
  'openManage',     // 打开人员管理
  'logout'          // 退出登录
])
</script>

<style scoped>
/* ========== 遮罩层 ========== */
.menu-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: 2000;
}

/* ========== 菜单面板 ========== */
.side-menu {
  position: absolute;
  top: 0;
  left: 0;
  width: 280px;
  height: 100%;
  background: #fff;
  box-shadow: 4px 0 20px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
  animation: menuSlideIn 0.3s ease;
}

/* 滑入动画 */
@keyframes menuSlideIn {
  from { transform: translateX(-100%); }
  to { transform: translateX(0); }
}

/* ========== 菜单头部 ========== */
.menu-header {
  padding: 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.menu-header h3 {
  margin: 0;
  font-size: 18px;
}

/* 关闭按钮 */
.close-btn {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: #fff;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.2s;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

/* ========== 菜单内容 ========== */
.menu-content {
  flex: 1;
  padding: 10px 0;
}

/* 菜单项 */
.menu-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  cursor: pointer;
  transition: background 0.2s;
}

.menu-item:hover {
  background: #f5f5f5;
}

.menu-item span:first-child {
  font-size: 15px;
}

/* ========== 菜单底部 ========== */
.menu-footer {
  padding: 20px;
  border-top: 1px solid #eee;
  background: #f9f9f9;
}

.menu-footer p {
  margin: 5px 0;
  font-size: 13px;
  color: #666;
}
</style>
