/**
 * @file useAuth.js
 * @description 用户认证相关的组合式函数
 * 
 * 功能说明：
 * - 管理用户登录/注册状态
 * - 处理登录、注册、登出操作
 * - 检查并恢复登录状态（从 localStorage）
 * - 判断用户是否为管理员
 * 
 * 使用方式：
 * import { useAuth } from '@/composables/useAuth'
 * const { isLoggedIn, currentUser, isAdmin, handleLogin, handleLogout } = useAuth()
 */

import { ref, computed } from 'vue'
import { getCurrentUser, login, register } from '../api/auth'

// ========== 响应式状态（全局单例） ==========

/** 是否已登录 */
const isLoggedIn = ref(false)

/** 是否处于注册模式（显示注册表单） */
const isRegisterMode = ref(false)

/** 当前登录用户信息 */
const currentUser = ref(null)

/** 是否正在检测登录状态 */
const isCheckingAuth = ref(false)

/** 是否正在提交登录/注册 */
const isSubmittingAuth = ref(false)

/** 认证错误提示 */
const authError = ref('')

/** 是否为管理员（计算属性） */
const isAdmin = computed(() => currentUser.value?.is_admin === true)

/** 登录表单数据 */
const loginForm = ref({
  username: '',
  password: ''
})

/** 注册表单数据 */
const registerForm = ref({
  username: '',
  email: '',
  password: '',
  confirmPassword: '',
  real_name: ''
})

// ========== 导出的组合式函数 ==========

export function useAuth() {
  /**
   * 处理用户登录
   * 验证表单 -> 调用API -> 保存用户信息到 localStorage
   */
  const handleLogin = async () => {
    const { username, password } = loginForm.value
    authError.value = ''
    
    // 表单验证
    if (!username || !password) {
      authError.value = '请输入账号和密码'
      return
    }
    
    try {
      isSubmittingAuth.value = true
      const response = await login(username, password)
      if (response.success) {
        // 登录成功：保存用户信息
        currentUser.value = response.user
        isLoggedIn.value = true
        localStorage.setItem('user', JSON.stringify(response.user))
      } else {
        authError.value = response.message || '登录失败'
      }
    } catch (error) {
      console.error('登录错误:', error)
      authError.value = '登录失败: ' + (error.response?.data?.detail || error.message)
    } finally {
      isSubmittingAuth.value = false
    }
  }

  /**
   * 处理用户注册
   * 验证表单 -> 调用API -> 提示等待审批
   */
  const handleRegister = async () => {
    const { username, email, password, confirmPassword, real_name } = registerForm.value
    authError.value = ''
    
    // 表单验证
    if (!username || !email || !password || !real_name) {
      authError.value = '请填写所有必填项'
      return
    }
    
    if (password !== confirmPassword) {
      authError.value = '两次输入的密码不一致'
      return
    }
    
    try {
      isSubmittingAuth.value = true
      const response = await register(username, password, email, real_name)
      if (response.success) {
        alert('注册申请已提交，请等待管理员审批')
        // 注册成功后切换回登录模式
        isRegisterMode.value = false
        // 清空注册表单
        registerForm.value = { 
          username: '', 
          email: '', 
          password: '', 
          confirmPassword: '', 
          real_name: '' 
        }
      } else {
        authError.value = response.message || '注册失败'
      }
    } catch (error) {
      console.error('注册错误:', error)
      authError.value = '注册失败: ' + (error.response?.data?.detail || error.message)
    } finally {
      isSubmittingAuth.value = false
    }
  }

  /**
   * 处理用户登出
   * 清除状态 -> 清除 localStorage
   */
  const handleLogout = () => {
    isLoggedIn.value = false
    currentUser.value = null
    authError.value = ''
    localStorage.removeItem('user')
    loginForm.value = { username: '', password: '' }
  }

  /**
   * 检查登录状态
   * 从 localStorage 恢复用户信息（页面刷新后保持登录）
   */
  const checkLoginStatus = async () => {
    const savedUser = localStorage.getItem('user')
    if (!savedUser) return

    try {
      isCheckingAuth.value = true
      const parsedUser = JSON.parse(savedUser)
      const response = await getCurrentUser(parsedUser.id)
      currentUser.value = response.user
      isLoggedIn.value = true
      localStorage.setItem('user', JSON.stringify(response.user))
    } catch (e) {
      // 本地登录态失效时主动清除，避免前端误判已登录。
      handleLogout()
    } finally {
      isCheckingAuth.value = false
    }
  }

  // 返回所有需要暴露的状态和方法
  return {
    // 状态
    isLoggedIn,
    isRegisterMode,
    currentUser,
    isCheckingAuth,
    isSubmittingAuth,
    authError,
    isAdmin,
    loginForm,
    registerForm,
    // 方法
    handleLogin,
    handleRegister,
    handleLogout,
    checkLoginStatus
  }
}
