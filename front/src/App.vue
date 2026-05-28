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

const {
  isLoggedIn,
  currentUser,
  isAdmin,
  isCheckingAuth,
  handleLogout,
  checkLoginStatus
} = useAuth()

onMounted(() => {
  checkLoginStatus()
})
</script>

<style scoped>
.auth-loading {
  min-height: 100vh;
  display: grid;
  place-items: center;
  background:
    radial-gradient(circle at 30% 20%, rgba(199, 121, 53, 0.18), transparent 30%),
    linear-gradient(135deg, #fff8e9, #ead9be);
}

.loading-card {
  width: min(360px, calc(100vw - 40px));
  padding: 34px;
  border-radius: 28px;
  text-align: center;
  color: #3d2d1f;
  background: rgba(255, 250, 240, 0.92);
  box-shadow: 0 30px 80px rgba(87, 61, 34, 0.18);
  animation: floatIn 0.5s ease both;
}

.loading-card span {
  width: 42px;
  height: 42px;
  margin: 0 auto 16px;
  display: block;
  border: 4px solid rgba(139, 90, 43, 0.18);
  border-top-color: #8b5a2b;
  border-radius: 50%;
  animation: spin 0.9s linear infinite;
}

.loading-card strong {
  display: block;
  font-size: 20px;
}

.loading-card p {
  margin-top: 8px;
  color: #7b634d;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@keyframes floatIn {
  from { opacity: 0; transform: translateY(16px) scale(0.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
</style>
