/**
 * 前端 HTTP 客户端
 * 统一 Axios 基础配置，供各业务 API 复用。
 */
import axios from 'axios'

export const apiClient = axios.create({
  baseURL: '/api',
  timeout: 30000
})

/**
 * 读取响应体数据。
 */
export function unwrap(response) {
  return response.data
}
