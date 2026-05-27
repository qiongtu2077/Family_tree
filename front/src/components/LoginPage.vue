<!--
  @file LoginPage.vue
  @description 登录/注册页面组件
  
  功能说明：
  - 用户登录表单（账号、密码）
  - 用户注册表单（用户名、真实姓名、邮箱、密码）
  - 登录/注册模式切换
  - 表单验证和提交
  
  使用方式：
  <LoginPage v-if="!isLoggedIn" />
-->

<template>
  <div class="login-container">
    <div class="login-box">
      <!-- 页面标题 -->
      <div class="login-header">
        <h1>族谱查询系统</h1>
        <p>{{ isRegisterMode ? '注册新账号' : '请登录以继续' }}</p>
      </div>
      
      <!-- 登录表单 -->
      <div v-if="!isRegisterMode" class="login-form">
        <div class="form-group">
          <label>账号</label>
          <input 
            v-model="loginForm.username" 
            type="text" 
            placeholder="请输入账号" 
            @keyup.enter="handleLogin" 
          />
        </div>
        <div class="form-group">
          <label>密码</label>
          <input 
            v-model="loginForm.password" 
            type="password" 
            placeholder="请输入密码" 
            @keyup.enter="handleLogin" 
          />
        </div>
        <button class="login-btn" @click="handleLogin">登 录</button>
        <div class="login-links">
          <span class="link" @click="isRegisterMode = true">注册新账号</span>
        </div>
      </div>
      
      <!-- 注册表单 -->
      <div v-else class="login-form">
        <div class="form-group">
          <label>用户名 *</label>
          <input 
            v-model="registerForm.username" 
            type="text" 
            placeholder="请输入用户名" 
          />
        </div>
        <div class="form-group">
          <label>真实姓名 *</label>
          <input 
            v-model="registerForm.real_name" 
            type="text" 
            placeholder="请输入真实姓名（用于关联族谱）" 
          />
        </div>
        <div class="form-group">
          <label>邮箱 *</label>
          <input 
            v-model="registerForm.email" 
            type="email" 
            placeholder="请输入邮箱" 
          />
        </div>
        <div class="form-group">
          <label>密码 *</label>
          <input 
            v-model="registerForm.password" 
            type="password" 
            placeholder="请输入密码" 
          />
        </div>
        <div class="form-group">
          <label>确认密码 *</label>
          <input 
            v-model="registerForm.confirmPassword" 
            type="password" 
            placeholder="请再次输入密码" 
          />
        </div>
        <button class="login-btn" @click="handleRegister">提交注册申请</button>
        <div class="login-links">
          <span class="link" @click="isRegisterMode = false">返回登录</span>
        </div>
        <p class="register-tip">
          注册需要管理员审批，真实姓名用于关联您在族谱中的身份
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
/**
 * 组件逻辑
 * 使用 useAuth 组合式函数处理认证相关逻辑
 */
import { useAuth } from '../composables/useAuth'

// 从 useAuth 获取需要的状态和方法
const {
  isRegisterMode,    // 是否为注册模式
  loginForm,         // 登录表单数据
  registerForm,      // 注册表单数据
  handleLogin,       // 登录处理函数
  handleRegister     // 注册处理函数
} = useAuth()
</script>

<style scoped>
/* ========== 容器样式 ========== */
.login-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

/* ========== 登录框样式 ========== */
.login-box {
  background: #fff;
  border-radius: 20px;
  padding: 40px;
  width: 100%;
  max-width: 420px;
  box-shadow: 0 25px 80px rgba(0, 0, 0, 0.3);
}

/* ========== 标题样式 ========== */
.login-header {
  text-align: center;
  margin-bottom: 30px;
}

.login-header h1 {
  margin: 0 0 10px 0;
  color: #333;
  font-size: 28px;
}

.login-header p {
  margin: 0;
  color: #666;
  font-size: 14px;
}

/* ========== 表单样式 ========== */
.login-form .form-group {
  margin-bottom: 20px;
}

.login-form label {
  display: block;
  margin-bottom: 8px;
  color: #555;
  font-size: 14px;
  font-weight: 500;
}

.login-form input {
  width: 100%;
  padding: 12px 16px;
  border: 2px solid #e0e0e0;
  border-radius: 10px;
  font-size: 15px;
  transition: border-color 0.2s, box-shadow 0.2s;
  box-sizing: border-box;
}

.login-form input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
}

/* ========== 按钮样式 ========== */
.login-btn {
  width: 100%;
  padding: 14px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  border: none;
  border-radius: 10px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.login-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4);
}

/* ========== 链接样式 ========== */
.login-links {
  text-align: center;
  margin-top: 20px;
}

.login-links .link {
  color: #667eea;
  cursor: pointer;
  font-size: 14px;
}

.login-links .link:hover {
  text-decoration: underline;
}

/* ========== 提示文字 ========== */
.register-tip {
  margin-top: 15px;
  font-size: 12px;
  color: #888;
  text-align: center;
  line-height: 1.5;
}
</style>
