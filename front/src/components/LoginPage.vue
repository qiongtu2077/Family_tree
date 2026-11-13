<template>
  <div class="login-container">
    <div class="auth-layout">
      <aside class="auth-intro">
        <div class="brand-mark" aria-hidden="true">谱</div>
        <span class="eyebrow">FAMILY ARCHIVE</span>
        <h1>家有来处<br />谱有传承</h1>
        <p>从一个名字开始，连接家人的故事。<br />清晰梳理世代、家庭与亲缘关系。</p>
        <div class="intro-rule"></div>
        <small>族谱查询系统 · 家族档案</small>
      </aside>

      <section class="login-box">
        <header class="login-header">
          <span class="eyebrow">{{ isRegisterMode ? '加入家族档案' : '欢迎回来' }}</span>
          <h2>{{ isRegisterMode ? '申请新账号' : '登录族谱' }}</h2>
          <p>{{ isRegisterMode ? '填写真实信息，审核通过后即可访问。' : '登录后查看族谱，查找人物与亲缘关系。' }}</p>
        </header>

        <p v-if="authError" class="auth-error" role="alert">{{ authError }}</p>
        <p v-if="authNotice" class="auth-notice" role="status">{{ authNotice }}</p>

        <form v-if="!isRegisterMode" class="login-form" @submit.prevent="handleLogin">
          <label for="login-username">账号
            <input id="login-username" v-model.trim="loginForm.username" type="text" placeholder="请输入账号" autocomplete="username" required />
          </label>
          <label for="login-password">密码
            <div class="password-field">
              <input id="login-password" v-model="loginForm.password" :type="showPassword ? 'text' : 'password'" placeholder="请输入密码" autocomplete="current-password" required />
              <button type="button" :aria-label="showPassword ? '隐藏密码' : '显示密码'" @click="showPassword = !showPassword">{{ showPassword ? '隐藏' : '显示' }}</button>
            </div>
          </label>
          <button class="login-btn" type="submit" :disabled="isSubmittingAuth">{{ isSubmittingAuth ? '正在登录...' : '进入族谱' }}<span aria-hidden="true"> →</span></button>
          <p class="switch-mode">还没有账号？ <button class="link-btn" type="button" @click="switchAuthMode(true)">申请新账号</button></p>
        </form>

        <form v-else class="login-form register-form" @submit.prevent="handleRegister">
          <label for="register-username">用户名
            <input id="register-username" v-model.trim="registerForm.username" type="text" placeholder="设置登录用户名" autocomplete="username" required />
          </label>
          <label for="register-name">真实姓名
            <input id="register-name" v-model.trim="registerForm.real_name" type="text" placeholder="用于关联族谱人物" autocomplete="name" required />
          </label>
          <label for="register-email">邮箱
            <input id="register-email" v-model.trim="registerForm.email" type="email" placeholder="请输入邮箱" autocomplete="email" required />
          </label>
          <label for="register-password">密码
            <input id="register-password" v-model="registerForm.password" type="password" placeholder="至少 8 位密码" autocomplete="new-password" minlength="8" required />
          </label>
          <label for="register-confirm">确认密码
            <input id="register-confirm" v-model="registerForm.confirmPassword" type="password" placeholder="再次输入密码" autocomplete="new-password" required />
          </label>
          <button class="login-btn" type="submit" :disabled="isSubmittingAuth">{{ isSubmittingAuth ? '正在提交...' : '提交注册申请' }}</button>
          <p class="switch-mode">已有账号？ <button class="link-btn" type="button" @click="switchAuthMode(false)">返回登录</button></p>
        </form>
        <footer class="auth-footer">每一份记录，都是家族记忆的一部分。</footer>
      </section>
    </div>
  </div>
</template>

<script setup>
/** 登录及注册页面，使用现有认证接口提交表单。 */
import { ref } from 'vue'
import { useAuth } from '../composables/useAuth'

const showPassword = ref(false)
const { isRegisterMode, loginForm, registerForm, isSubmittingAuth, authError, authNotice, handleLogin, handleRegister } = useAuth()

/** 切换认证表单并清除上一表单的错误提示。 */
function switchAuthMode(registerMode) {
  isRegisterMode.value = registerMode
  authError.value = ''
  authNotice.value = ''
}
</script>

<style scoped>
.login-container { min-height: 100vh; min-height: 100dvh; display: grid; place-items: center; padding: 40px 24px; background: radial-gradient(ellipse at 15% 20%, #e9eee5, transparent 55%), var(--paper); }
.auth-layout { width: min(920px, 100%); display: grid; grid-template-columns: 1fr 420px; align-items: center; gap: 76px; }
.auth-intro { padding: 32px 0; }
.brand-mark { width: 52px; height: 52px; margin-bottom: 40px; display: grid; place-items: center; color: var(--green); border: 1px solid var(--green); border-radius: 14px; font: 27px 'SimSun', serif; }
.eyebrow { color: var(--copper); font-size: 11px; font-weight: 700; letter-spacing: .16em; }
h1 { margin: 16px 0 22px; font-family: 'Noto Serif SC', 'Songti SC', 'SimSun', serif; font-size: clamp(36px, 4vw, 50px); font-weight: 600; line-height: 1.55; letter-spacing: .08em; }
.auth-intro p { color: var(--muted); font-size: 14px; line-height: 2; }
.intro-rule { width: 48px; margin: 32px 0 20px; border-top: 2px solid var(--copper); }
.auth-intro small { color: var(--muted); font-size: 11px; letter-spacing: .08em; }
.login-box { min-width: 0; padding: 36px; border: 1px solid var(--line); border-radius: 20px; background: var(--panel); box-shadow: 0 20px 70px rgba(32, 59, 50, .06); }
.login-header { margin-bottom: 28px; }
h2 { margin: 9px 0 10px; font-size: 26px; font-weight: 650; }
.login-header p { margin: 0; color: var(--muted); font-size: 13px; line-height: 1.7; }
.login-form { display: grid; gap: 20px; }
.register-form { gap: 15px; }
label { display: grid; gap: 8px; color: var(--ink); font-size: 13px; font-weight: 550; }
input { width: 100%; min-width: 0; padding: 12px 13px; border: 1px solid var(--line); border-radius: 8px; color: var(--ink); background: #fcfcfa; font-size: 14px; }
input:focus { border-color: var(--green); }
input::placeholder { color: #a0aaa2; }
.password-field { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 8px; }
.password-field button { padding: 0 11px; color: var(--green); border: 1px solid var(--line); border-radius: 8px; background: #fff; font-size: 12px; }
.login-btn { margin-top: 4px; padding: 13px 18px; border: 0; border-radius: 8px; color: #fff; background: var(--green); font-size: 14px; font-weight: 600; }
.login-btn:hover:not(:disabled) { background: #235640; }
.login-btn:disabled { opacity: .6; }
.switch-mode { margin: 0; color: var(--muted); text-align: center; font-size: 12px; }
.link-btn { padding: 3px 0; border: 0; color: var(--green); background: transparent; font-size: 12px; font-weight: 600; }
.auth-error { padding: 12px 14px; border-radius: 8px; color: var(--danger); background: #fbefed; font-size: 13px; line-height: 1.6; overflow-wrap: anywhere; }
.auth-notice { padding: 12px 14px; border-radius: 8px; color: var(--green); background: var(--green-soft); font-size: 13px; line-height: 1.6; }
.auth-footer { margin-top: 28px; padding-top: 20px; border-top: 1px solid #edf0e9; color: #8b968d; text-align: center; font-size: 11px; }
@media (max-width: 800px) {
  .login-container { padding: 28px 20px; }
  .auth-layout { max-width: 440px; grid-template-columns: minmax(0, 1fr); gap: 22px; }
  .auth-intro { padding: 0 4px; }
  .brand-mark { width: 38px; height: 38px; margin: 0 0 12px; border-radius: 10px; font-size: 22px; }
  .auth-intro h1 { margin: 5px 0 0; font-size: 24px; line-height: 1.5; }
  .auth-intro h1 br { display: none; }
  .auth-intro p, .intro-rule, .auth-intro small, .auth-intro .eyebrow { display: none; }
  .login-box { padding: 28px; }
}
@media (max-width: 400px) { .login-container { padding: 20px 14px; } .login-box { padding: 24px 22px; } }
</style>
