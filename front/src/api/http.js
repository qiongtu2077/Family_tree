/** HTTP 客户端，所有接口共用 Cookie 会话和失效通知。 */
import axios from 'axios'

export const SESSION_EXPIRED_EVENT = 'familytree:session-expired'
export const apiClient = axios.create({ baseURL: '/api', timeout: 10000, withCredentials: true })

// 登录失败属于当前表单；业务请求的 401 才通知应用结束旧会话。
apiClient.interceptors.response.use(response => response, error => {
  if (error.response?.status === 401 && error.config?.url !== '/auth/login' && typeof window !== 'undefined') {
    window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT))
  }
  return Promise.reject(error)
})

/** 读取响应体。 */
export function unwrap(response) {
  return response.data
}
