<template>
  <div class="login-container">
    <section class="login-box">
      <div class="login-header">
        <h1>族谱查询系统</h1>
        <p>{{ isRegisterMode ? '注册新账号' : '请登录以继续' }}</p>
      </div>

      <div class="demo-card" v-if="!isRegisterMode">
        <strong>账号提示</strong>
        <span>请使用本地未提交的账号信息登录。</span>
        <span>如需演示账号，请先运行系统初始化脚本。</span>
      </div>

      <p v-if="authError" class="auth-error">{{ authError }}</p>

      <div v-if="!isRegisterMode" class="login-form">
        <label>
          账号
          <input
            v-model.trim="loginForm.username"
            type="text"
            placeholder="请输入账号"
            autocomplete="username"
            @keyup.enter="handleLogin"
          />
        </label>

        <label>
          密码
          <div class="password-field">
            <input
              v-model="loginForm.password"
              :type="showPassword ? 'text' : 'password'"
              placeholder="请输入密码"
              autocomplete="current-password"
              @keyup.enter="handleLogin"
            />
            <button type="button" @click="showPassword = !showPassword">
              {{ showPassword ? '隐藏' : '显示' }}
            </button>
          </div>
        </label>

        <button class="login-btn" :disabled="isSubmittingAuth" @click="handleLogin">
          {{ isSubmittingAuth ? '正在登录...' : '进入族谱' }}
        </button>
        <button class="link-btn" @click="isRegisterMode = true">申请新账号</button>
      </div>

      <div v-else class="login-form">
        <label>
          用户名 *
          <input v-model.trim="registerForm.username" type="text" placeholder="请输入用户名" />
        </label>
        <label>
          真实姓名 *
          <input v-model.trim="registerForm.real_name" type="text" placeholder="用于关联族谱人物" />
        </label>
        <label>
          邮箱 *
          <input v-model.trim="registerForm.email" type="email" placeholder="请输入邮箱" />
        </label>
        <label>
          密码 *
          <input v-model="registerForm.password" type="password" placeholder="请输入密码" />
        </label>
        <label>
          确认密码 *
          <input v-model="registerForm.confirmPassword" type="password" placeholder="请再次输入密码" />
        </label>

        <button class="login-btn" :disabled="isSubmittingAuth" @click="handleRegister">
          {{ isSubmittingAuth ? '正在提交...' : '提交注册申请' }}
        </button>
        <button class="link-btn" @click="isRegisterMode = false">返回登录</button>
      </div>
    </section>
  </div>
</template>

<script setup>
/**
 * 登录/注册页面组件。
 */
import { ref } from 'vue'
import { useAuth } from '../composables/useAuth'

const showPassword = ref(false)

const {
  isRegisterMode,
  loginForm,
  registerForm,
  isSubmittingAuth,
  authError,
  handleLogin,
  handleRegister
} = useAuth()
</script>

<style scoped>
.login-container {
  width: 100%;
  min-height: 100vh;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 28px;
  overflow: hidden;
  background: transparent;
}

.login-box {
  width: min(380px, calc(100vw - 36px));
  position: relative;
  z-index: 1;
  padding: 40px;
  border: 1px solid rgba(255, 250, 0, 0.3);
  border-radius: 16px;
  background: rgba(25, 25, 25, 0.95);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(10px);
  animation: panelIn 0.58s cubic-bezier(.2,.8,.2,1) both;
}

.login-header {
  text-align: center;
  margin-bottom: 30px;
}

h1 {
  margin: 0 0 10px;
  color: #fffa00;
  font-size: 28px;
  letter-spacing: 0.04em;
}

.login-header p:last-child {
  color: #888;
}

.demo-card,
.auth-error {
  display: grid;
  gap: 5px;
  margin-bottom: 16px;
  padding: 13px 15px;
  border-radius: 18px;
}

.demo-card {
  color: #cfcfcf;
  border: 1px solid rgba(255, 250, 0, 0.16);
  background: rgba(255, 250, 0, 0.08);
}

.demo-card span {
  font-size: 13px;
}

.auth-error {
  color: #ff7b86;
  border: 1px solid rgba(255, 71, 87, 0.28);
  background: rgba(255, 71, 87, 0.1);
}

.login-form {
  display: grid;
  gap: 15px;
}

label {
  display: grid;
  gap: 8px;
  color: #888;
  font-size: 14px;
  font-weight: 500;
}

input {
  width: 100%;
  border: 1px solid #333;
  border-radius: 8px;
  padding: 12px 14px;
  color: #f0f0f0;
  background: #1a1a1a;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

input:focus {
  border-color: #fffa00;
  outline: none;
  box-shadow: 0 0 0 4px rgba(255, 250, 0, 0.1);
}

input::placeholder {
  color: #666;
}

.password-field {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 8px;
}

.password-field button,
.link-btn,
.login-btn {
  border: 0;
  border-radius: 8px;
  cursor: pointer;
}

.password-field button {
  padding: 0 13px;
  color: #fffa00;
  background: #252525;
}

.login-btn {
  margin-top: 8px;
  padding: 13px;
  color: #101010;
  background: linear-gradient(135deg, #fffa00 0%, #d4af37 100%);
  font-weight: 700;
  box-shadow: 0 8px 25px rgba(255, 250, 0, 0.3);
}

.login-btn:hover:not(:disabled) {
  box-shadow: 0 10px 30px rgba(255, 250, 0, 0.42);
}

.login-btn:disabled {
  opacity: 0.65;
  cursor: wait;
}

.link-btn {
  padding: 10px;
  color: #fffa00;
  background: transparent;
}

@keyframes panelIn {
  from { opacity: 0; transform: translateY(18px) scale(0.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

@media (max-width: 480px) {
  .login-box {
    padding: 30px 24px;
  }
}
</style>
