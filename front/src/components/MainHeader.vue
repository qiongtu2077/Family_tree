<!--
  @file MainHeader.vue
  @description 主界面顶部导航栏组件
  
  功能说明：
  - 左侧：菜单按钮、系统标题、用户信息、退出按钮
  - 右侧：缩放控制（放大、缩小、重置）、搜索框
  
  Props:
  - isAdmin: 是否为管理员
  - currentUser: 当前用户信息
  - scale: 当前缩放比例
  - searchName: 搜索关键词（v-model）
  
  Events:
  - openMenu: 打开侧边菜单
  - logout: 退出登录
  - zoomIn/zoomOut/resetView: 缩放控制
  - search: 执行搜索
  - searchFocus: 搜索框获得焦点
  - update:searchName: 更新搜索关键词
-->

<template>
  <header class="header">
    <!-- 左侧区域：菜单、标题、用户信息 -->
    <div class="header-left">
      <button class="menu-btn" @click="$emit('openMenu')" title="打开菜单">
        ☰
      </button>
      <h1>族谱查询系统</h1>
      <span class="user-info">
        {{ isAdmin ? '管理员' : (currentUser?.real_name || '用户') }} 
        <button class="logout-btn" @click="$emit('logout')">退出</button>
      </span>
    </div>
    
    <!-- 右侧区域：缩放控制、搜索框 -->
    <div class="header-right">
      <!-- 缩放控制 -->
      <div class="zoom-controls">
        <button @click="$emit('zoomIn')" class="zoom-btn" title="放大">+</button>
        <span class="zoom-level">{{ Math.round(scale * 100) }}%</span>
        <button @click="$emit('zoomOut')" class="zoom-btn" title="缩小">-</button>
        <button @click="$emit('resetView')" class="zoom-btn" title="重置视图">重置</button>
      </div>
      
      <!-- 搜索框 -->
      <div class="search-box">
        <input 
          :value="searchName"
          @input="$emit('update:searchName', $event.target.value)"
          @focus="$emit('searchFocus')"
          @keyup.enter="$emit('search')"
          type="text" 
          placeholder="搜索人物..." 
        />
        <button class="search-btn" @click="$emit('search')">搜索</button>
      </div>
    </div>
  </header>
</template>

<script setup>
/**
 * 组件属性定义
 */
defineProps({
  /** 是否为管理员 */
  isAdmin: Boolean,
  /** 当前用户信息 */
  currentUser: Object,
  /** 当前缩放比例 */
  scale: Number,
  /** 搜索关键词 */
  searchName: String
})

/**
 * 组件事件定义
 */
defineEmits([
  'openMenu',           // 打开菜单
  'logout',             // 退出登录
  'zoomIn',             // 放大
  'zoomOut',            // 缩小
  'resetView',          // 重置视图
  'search',             // 执行搜索
  'searchFocus',        // 搜索框获得焦点
  'update:searchName'   // 更新搜索关键词
])
</script>

<style scoped>
/* ========== 头部容器 ========== */
.header {
  padding: 10px 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  flex-shrink: 0;
  height: 56px;
  box-sizing: border-box;
}

/* ========== 左侧区域 ========== */
.header-left {
  display: flex;
  align-items: center;
  gap: 15px;
}

/* 菜单按钮 */
.menu-btn {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: #fff;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}

.menu-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

/* 标题 */
.header h1 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
}

/* 用户信息 */
.user-info {
  font-size: 13px;
  opacity: 0.9;
  display: flex;
  align-items: center;
  gap: 10px;
}

/* 退出按钮 */
.logout-btn {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: #fff;
  padding: 4px 10px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: background 0.2s;
}

.logout-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

/* ========== 右侧区域 ========== */
.header-right {
  display: flex;
  align-items: center;
  gap: 20px;
}

/* 缩放控制 */
.zoom-controls {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(255, 255, 255, 0.15);
  padding: 4px 10px;
  border-radius: 8px;
}

.zoom-btn {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: #fff;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}

.zoom-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

.zoom-level {
  font-size: 13px;
  min-width: 45px;
  text-align: center;
}

/* 搜索框 */
.search-box {
  display: flex;
  align-items: center;
  gap: 8px;
}

.search-box input {
  padding: 8px 14px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  width: 180px;
  background: rgba(255, 255, 255, 0.9);
  transition: background 0.2s;
}

.search-box input:focus {
  outline: none;
  background: #fff;
}

.search-btn {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: #fff;
  padding: 8px 16px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.2s;
}

.search-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}
</style>
