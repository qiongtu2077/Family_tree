<template>
  <div class="login-container">
    <div class="login-orb orb-one"></div>
    <div class="login-orb orb-two"></div>

    <section class="login-box">
      <div class="login-header">
        <div class="seal">谱</div>
        <p class="eyebrow">Family Tree Atlas</p>
        <h1>族谱查询系统</h1>
        <p>{{ isRegisterMode ? '提交注册申请，等待管理员审批' : '登录后进入家族图谱' }}</p>
      </div>

      <div class="demo-card" v-if="!isRegisterMode">
        <strong>演示账号</strong>
        <span>管理员：admin / <ROTATED_ADMIN_PASSWORD></span>
        <span>测试用户：test / <ROTATED_TEST_PASSWORD></span>
      </div>

      <p v-if="authError" class="auth-error">{{ authError }}</p>

      <div v-if="!isRegisterMode" class="login-form">
        <label>
          账号
          <input
            v-model.trim="loginForm.username"
            type="text"
            placeholder="admin 或 test"
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
  min-height: 100vh;
  position: relative;
  display: grid;
  place-items: center;
  padding: 24px;
  overflow: hidden;
  background:
    radial-gradient(circle at 18% 16%, rgba(184, 111, 48, 0.25), transparent 28%),
    radial-gradient(circle at 86% 78%, rgba(57, 97, 71, 0.18), transparent 30%),
    linear-gradient(135deg, #fff8e9 0%, #ead8ba 58%, #d6b98b 100%);
}

.login-orb {
  position: absolute;
  border-radius: 999px;
  filter: blur(2px);
  opacity: 0.75;
  animation: drift 8s ease-in-out infinite alternate;
}

.orb-one {
  width: 220px;
  height: 220px;
  top: 9%;
  left: 7%;
  background: rgba(139, 90, 43, 0.16);
}

.orb-two {
  width: 300px;
  height: 300px;
  right: -80px;
  bottom: 12%;
  background: rgba(76, 104, 78, 0.16);
  animation-delay: 1.2s;
}

.login-box {
  width: min(460px, calc(100vw - 36px));
  position: relative;
  z-index: 1;
  padding: 36px;
  border: 1px solid rgba(111, 78, 55, 0.14);
  border-radius: 34px;
  background: rgba(255, 250, 240, 0.88);
  box-shadow: 0 34px 90px rgba(78, 53, 29, 0.2);
  backdrop-filter: blur(18px);
  animation: panelIn 0.58s cubic-bezier(.2,.8,.2,1) both;
}

.login-header {
  text-align: center;
  margin-bottom: 22px;
}

.seal {
  width: 58px;
  height: 58px;
  margin: 0 auto 12px;
  display: grid;
  place-items: center;
  border-radius: 22px;
  color: #fff8df;
  background: linear-gradient(135deg, #6f4e37, #b36b34);
  font-size: 30px;
  font-weight: 900;
  box-shadow: 0 14px 30px rgba(111, 78, 55, 0.25);
}

.eyebrow {
  color: #9a6a3f;
  font-size: 12px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

h1 {
  margin: 6px 0;
  color: #342719;
  font-size: 30px;
}

.login-header p:last-child {
  color: #7d6752;
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
  color: #60462e;
  background: rgba(139, 90, 43, 0.09);
}

.demo-card span {
  font-size: 13px;
}

.auth-error {
  color: #8d241f;
  background: #fff0ea;
}

.login-form {
  display: grid;
  gap: 15px;
}

label {
  display: grid;
  gap: 8px;
  color: #5e4631;
  font-size: 14px;
  font-weight: 700;
}

input {
  width: 100%;
  border: 1px solid #dac9b6;
  border-radius: 15px;
  padding: 12px 14px;
  color: #342719;
  background: #fffaf0;
}

input:focus {
  border-color: #a45f2c;
  outline: 4px solid rgba(164, 95, 44, 0.14);
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
  border-radius: 15px;
  cursor: pointer;
}

.password-field button {
  padding: 0 13px;
  color: #6f4e37;
  background: rgba(111, 78, 55, 0.1);
}

.login-btn {
  margin-top: 4px;
  padding: 14px;
  color: #fff8df;
  background: linear-gradient(135deg, #8b5a2b, #c77935);
  font-weight: 800;
  box-shadow: 0 14px 30px rgba(139, 90, 43, 0.24);
}

.login-btn:disabled {
  opacity: 0.65;
  cursor: wait;
}

.link-btn {
  padding: 10px;
  color: #6f4e37;
  background: transparent;
}

@keyframes panelIn {
  from { opacity: 0; transform: translateY(18px) scale(0.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

@keyframes drift {
  from { transform: translate3d(0, 0, 0); }
  to { transform: translate3d(18px, -16px, 0); }
}
</style>
