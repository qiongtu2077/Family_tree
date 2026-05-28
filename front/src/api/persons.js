/**
 * 人物 API
 * 新接口优先使用 Neo4j /api/persons。
 */
import { apiClient, unwrap } from './http'

/**
 * 获取人物列表。
 */
export async function getPersons(skip = 0, limit = 100) {
  return unwrap(await apiClient.get('/persons', { params: { skip, limit } }))
}

/**
 * 搜索人物。
 */
export async function searchPersons(name) {
  return unwrap(await apiClient.get('/persons/search', { params: { name } }))
}

/**
 * 创建人物。
 */
export async function createPerson(payload) {
  return unwrap(await apiClient.post('/persons', payload))
}

/**
 * 更新人物。
 */
export async function updatePerson(personId, payload) {
  return unwrap(await apiClient.patch(`/persons/${personId}`, payload))
}

/**
 * 删除人物。
 */
export async function deletePerson(personId) {
  await apiClient.delete(`/persons/${personId}`)
}
