/**
 * @file index.js
 * @description 组件统一导出入口
 * 
 * 使用方式：
 * import { LoginPage, MainHeader, SideMenu } from '@/components'
 * 
 * 或单独导入：
 * import LoginPage from '@/components/LoginPage.vue'
 */

// 页面级组件
export { default as LoginPage } from './LoginPage.vue'

// 布局组件
export { default as MainHeader } from './MainHeader.vue'
export { default as SideMenu } from './SideMenu.vue'

// 弹窗组件
export { default as RelationQuery } from './RelationQuery.vue'
export { default as DeleteConfirm } from './DeleteConfirm.vue'
export { default as SearchModal } from './SearchModal.vue'
