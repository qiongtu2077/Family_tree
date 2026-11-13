<template>
  <div v-if="isCheckingAuth" class="auth-loading">
    <div class="loading-card">
      <span></span>
      <strong>正在校验登录状态</strong>
      <p>正在恢复您的族谱工作区，请稍候。</p>
    </div>
  </div>
  <LoginPage v-else-if="!isLoggedIn" />
  <FamilyGraphView
    v-else
    :current-user="currentUser"
    :is-admin="isAdmin"
    @logout="handleLogout"
  />
</template>

<script setup>
/**
 * 前端应用入口。
 * 登录前显示认证页，登录后进入模块化族谱系统。
 */
import { onBeforeUnmount, onMounted } from 'vue'
import LoginPage from './components/LoginPage.vue'
import FamilyGraphView from './views/FamilyGraphView.vue'
import { useAuth } from './composables/useAuth'
import { SESSION_EXPIRED_EVENT } from './api/http'

const {
  isLoggedIn,
  currentUser,
  isAdmin,
  isCheckingAuth,
  handleLogout,
  checkLoginStatus,
  handleSessionExpired
} = useAuth()

onMounted(() => {
  window.addEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired)
  checkLoginStatus()
})
onBeforeUnmount(() => window.removeEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired))
</script>

<style scoped>
.auth-loading {
  min-height: 100vh;
  display: grid;
  place-items: center;
  background: var(--paper);
}

.loading-card {
  width: min(360px, calc(100vw - 40px));
  padding: 34px;
  border-radius: 28px;
  text-align: center;
  color: var(--ink);
  background: var(--panel);
  border: 1px solid var(--line);
  box-shadow: 0 18px 60px rgba(32, 59, 50, 0.06);
  animation: floatIn 0.5s ease both;
}

.loading-card span {
  width: 42px;
  height: 42px;
  margin: 0 auto 16px;
  display: block;
  border: 3px solid var(--green-soft);
  border-top-color: var(--green);
  border-radius: 50%;
  animation: spin 0.9s linear infinite;
}

.loading-card strong {
  display: block;
  font-size: 20px;
}

.loading-card p {
  margin-top: 8px;
  color: var(--muted);
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@keyframes floatIn {
  from { opacity: 0; transform: translateY(16px) scale(0.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
</style>
