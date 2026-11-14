/** Cookie 会话认证状态，浏览器本地用户资料不再作为登录凭据。 */
import { computed, ref } from 'vue'
import { getCurrentUser, login, logout, register } from '../api/auth'

const isLoggedIn = ref(false)
const authEnabled = ref(true)
const isRegisterMode = ref(false)
const currentUser = ref(null)
const isCheckingAuth = ref(true)
const isSubmittingAuth = ref(false)
const authError = ref('')
const authNotice = ref('')
const isAdmin = computed(() => currentUser.value?.is_admin === true)
const loginForm = ref({ username: '', password: '' })
const registerForm = ref({ username: '', email: '', password: '', confirmPassword: '', real_name: '' })

/** 把后端字段验证和网络失败转换为可读的认证反馈。 */
function errorText(error, fallback) {
  const detail = error.response?.data?.detail
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) return '信息格式不正确，请检查邮箱及密码长度（至少 8 位）。'
  return fallback
}

/** 清理客户端状态；实际凭据只能由服务端注销或到期。 */
function clearSession(message = '') {
  isLoggedIn.value = false
  currentUser.value = null
  loginForm.value = { username: '', password: '' }
  authError.value = message
  authNotice.value = ''
  localStorage.removeItem('user')
}

/** 仅在已有登录会话失效时展示重新登录提示。 */
function handleSessionExpired() {
  if (authEnabled.value && isLoggedIn.value) clearSession('登录状态已过期，请重新登录。')
}

/** 提交登录表单，成功后只在内存中保存安全用户资料。 */
async function handleLogin() {
  authError.value = ''
  authNotice.value = ''
  if (!loginForm.value.username || !loginForm.value.password) { authError.value = '请输入账号和密码'; return }
  isSubmittingAuth.value = true
  try {
    const response = await login(loginForm.value.username, loginForm.value.password)
    currentUser.value = response.user
    isLoggedIn.value = true
    loginForm.value.password = ''
  } catch (error) {
    authError.value = errorText(error, '无法连接服务器，请检查网络后重试。')
  } finally {
    isSubmittingAuth.value = false
  }
}

/** 提交注册并以页面状态提示待审批结果。 */
async function handleRegister() {
  authError.value = ''
  authNotice.value = ''
  const { username, email, password, confirmPassword, real_name } = registerForm.value
  if (!username || !email || !password || !real_name) { authError.value = '请填写所有必填项'; return }
  if (password.length < 8) { authError.value = '密码至少需要 8 位'; return }
  if (password !== confirmPassword) { authError.value = '两次输入的密码不一致'; return }
  isSubmittingAuth.value = true
  try {
    const response = await register(username, password, email, real_name)
    authNotice.value = response.message
    isRegisterMode.value = false
    loginForm.value.username = username
    registerForm.value = { username: '', email: '', password: '', confirmPassword: '', real_name: '' }
  } catch (error) {
    authError.value = errorText(error, '注册提交失败，请检查网络后重试。')
  } finally {
    isSubmittingAuth.value = false
  }
}

/** 请求服务端销毁会话后回到登录页。 */
async function handleLogout() {
  try {
    await logout()
    clearSession()
  } catch {
    clearSession('网络异常，无法确认服务端退出；请恢复网络后重新登录并退出。')
  }
}

/** 页面启动时向 /me 校验真实 Cookie 会话。 */
async function checkLoginStatus() {
  isCheckingAuth.value = true
  localStorage.removeItem('user')
  try {
    const response = await getCurrentUser()
    authEnabled.value = response.auth_enabled !== false
    currentUser.value = response.user
    isLoggedIn.value = true
  } catch (error) {
    clearSession(error.response?.status === 401 ? '' : '无法连接服务器，请检查网络后重试。')
  } finally {
    isCheckingAuth.value = false
  }
}

/** 返回页面共用的认证状态与操作。 */
export function useAuth() {
  return { isLoggedIn, authEnabled, isRegisterMode, currentUser, isCheckingAuth, isSubmittingAuth, authError, authNotice,
    isAdmin, loginForm, registerForm, handleLogin, handleRegister, handleLogout, checkLoginStatus, handleSessionExpired }
}
