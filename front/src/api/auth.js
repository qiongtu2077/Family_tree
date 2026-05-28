/**
 * 认证 API
 * 负责登录、注册和管理员初始化。
 */
import { apiClient, unwrap } from './http'

/**
 * 用户登录。
 */
export async function login(username, password) {
  return unwrap(await apiClient.post('/auth/login', { username, password }))
}

/**
 * 检测本地保存的登录用户是否仍有效。
 */
export async function getCurrentUser(userId) {
  return unwrap(await apiClient.get('/auth/me', { params: { user_id: userId } }))
}

/**
 * 提交注册申请。
 */
export async function register(username, password, email, realName) {
  return unwrap(
    await apiClient.post('/auth/register', {
      username,
      password,
      email,
      real_name: realName
    })
  )
}

/**
 * 初始化管理员账号。
 */
export async function initAdmin() {
  return unwrap(await apiClient.post('/auth/init-admin'))
}

/**
 * 初始化管理员和测试用户。
 */
export async function initDemoUsers() {
  return unwrap(await apiClient.post('/auth/init-demo-users'))
}
