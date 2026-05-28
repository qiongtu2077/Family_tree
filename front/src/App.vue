<template>
  <div v-if="isCheckingAuth" class="auth-loading">
    <div class="loading-card">
      <span></span>
      <strong>正在校验登录状态</strong>
      <p>族谱门房正在核对名册，请稍候。</p>
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
import { onMounted } from 'vue'
import LoginPage from './components/LoginPage.vue'
import FamilyGraphView from './views/FamilyGraphView.vue'
import { useAuth } from './composables/useAuth'
import { useWaveBackground } from './composables/useWaveBackground'

const {
  isLoggedIn,
  currentUser,
  isAdmin,
  isCheckingAuth,
  handleLogout,
  checkLoginStatus
} = useAuth()

useWaveBackground()

onMounted(() => {
  checkLoginStatus()
})
</script>

<style scoped>
.auth-loading {
  min-height: 100vh;
  display: grid;
  place-items: center;
  background: transparent;
}

.loading-card {
  width: min(360px, calc(100vw - 40px));
  padding: 34px;
  border-radius: 28px;
  text-align: center;
  color: #f0f0f0;
  background: rgba(25, 25, 25, 0.94);
  border: 1px solid rgba(255, 250, 0, 0.24);
  box-shadow: 0 24px 70px rgba(0, 0, 0, 0.45);
  animation: floatIn 0.5s ease both;
}

.loading-card span {
  width: 42px;
  height: 42px;
  margin: 0 auto 16px;
  display: block;
  border: 4px solid rgba(255, 250, 0, 0.18);
  border-top-color: #fffa00;
  border-radius: 50%;
  animation: spin 0.9s linear infinite;
}

.loading-card strong {
  display: block;
  font-size: 20px;
}

.loading-card p {
  margin-top: 8px;
  color: #888;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@keyframes floatIn {
  from { opacity: 0; transform: translateY(16px) scale(0.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
</style>
