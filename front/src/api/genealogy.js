/**
 * 族谱相关 API 接口
 */
import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 30000  // 增加到 30 秒
})

/**
 * 搜索人员
 */
export const searchPersons = async (name) => {
  // 直接构造 URL，避免参数编码问题
  const encodedName = encodeURIComponent(name)
  const response = await api.get(`/genealogy/persons/search?name=${encodedName}`)
  return response.data
}

/**
 * 获取族谱树数据
 */
export const getFamilyTree = async (personId, generations = 3) => {
  const response = await api.get(`/genealogy/family-tree/${personId}`, {
    params: { generations }
  })
  return response.data
}

/**
 * 获取人员列表
 */
export const getPersons = async (skip = 0, limit = 100) => {
  const response = await api.get('/genealogy/persons', {
    params: { skip, limit }
  })
  return response.data
}

/**
 * 获取单个人员信息
 */
export const getPerson = async (personId) => {
  const response = await api.get(`/genealogy/persons/${personId}`)
  return response.data
}

/**
 * 创建人员
 */
export const createPerson = async (personData) => {
  const response = await api.post('/genealogy/persons', personData)
  return response.data
}

/**
 * 更新人员信息
 */
export const updatePerson = async (personId, personData) => {
  const response = await api.put(`/genealogy/persons/${personId}`, personData)
  return response.data
}

/**
 * 删除人员
 */
export const deletePerson = async (personId) => {
  await api.delete(`/genealogy/persons/${personId}`)
}

/**
 * 用户登录
 */
export const login = async (username, password) => {
  const response = await api.post('/auth/login', { username, password })
  return response.data
}

/**
 * 用户注册
 */
export const register = async (username, password, email, real_name) => {
  const response = await api.post('/auth/register', { username, password, email, real_name })
  return response.data
}

/**
 * 初始化管理员
 */
export const initAdmin = async () => {
  const response = await api.post('/auth/init-admin')
  return response.data
}

/**
 * 获取待审批的注册申请
 */
export const getPendingRequests = async () => {
  const response = await api.get('/auth/pending-requests')
  return response.data
}

/**
 * 获取人员详细信息
 */
export const getPersonDetail = async (personId, userId = null) => {
  const params = userId ? { user_id: userId } : {}
  const response = await api.get(`/genealogy/persons/${personId}/detail`, { params })
  return response.data
}

/**
 * 更新人员个人资料（名言和成就）
 */
export const updatePersonProfile = async (personId, data, userId) => {
  const response = await api.put(`/genealogy/persons/${personId}/profile?user_id=${userId}`, data)
  return response.data
}

/**
 * 上传人员头像
 */
export const uploadAvatar = async (personId, file, userId) => {
  const formData = new FormData()
  formData.append('file', file)
  const response = await api.post(`/genealogy/persons/${personId}/avatar?user_id=${userId}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
  return response.data
}

/**
 * 上传人员照片
 */
export const uploadPhoto = async (personId, file, userId) => {
  const formData = new FormData()
  formData.append('file', file)
  const response = await api.post(`/genealogy/persons/${personId}/photo?user_id=${userId}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
  return response.data
}

