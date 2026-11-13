/** 认证与账号审批 API，凭据由 HttpOnly 会话 Cookie 自动携带。 */
import { apiClient, unwrap } from './http'

/** 验证登录并由服务端设置会话 Cookie。 */
export async function login(username, password) {
  return unwrap(await apiClient.post('/auth/login', { username, password }))
}

/** 根据服务端会话恢复当前用户，不接受用户编号。 */
export async function getCurrentUser() {
  return unwrap(await apiClient.get('/auth/me'))
}

/** 注销服务端会话并清除 Cookie。 */
export async function logout() {
  return unwrap(await apiClient.post('/auth/logout'))
}

/** 提交注册申请。 */
export async function register(username, password, email, realName) {
  return unwrap(await apiClient.post('/auth/register', { username, password, email, real_name: realName }))
}

/** 仅在系统无管理员时初始化管理员。 */
export async function initAdmin() {
  return unwrap(await apiClient.post('/auth/init-admin'))
}

/** 管理员显式初始化演示账号。 */
export async function initDemoUsers() {
  return unwrap(await apiClient.post('/auth/init-demo-users'))
}

/** 管理员读取待审批账号。 */
export async function getPendingRequests() {
  return unwrap(await apiClient.get('/auth/pending-requests'))
}

/** 管理员批准指定注册申请。 */
export async function approveRegistration(requestId) {
  return unwrap(await apiClient.post(`/auth/requests/${requestId}/approve`))
}

/** 管理员拒绝指定注册申请。 */
export async function rejectRegistration(requestId) {
  return unwrap(await apiClient.post(`/auth/requests/${requestId}/reject`))
}
