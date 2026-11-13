/** 资料管理 API：仅使用后端明确提供的字段和路由。 */
import { apiClient, unwrap } from './http'

/** 分页读取完整人物清单，不把接口单页上限当成族谱总人数。 */
export async function getManagementPeople() {
  const people = []
  const limit = 1000
  let page = []
  do {
    page = unwrap(await apiClient.get('/persons', { params: { skip: people.length, limit } }))
    people.push(...page)
  } while (page.length === limit)
  return people
}

/** 分页读取全部家庭及成员，不依赖图谱投影范围。 */
export async function getManagementFamilies() {
  const families = []
  const limit = 1000
  let page = []
  do {
    page = unwrap(await apiClient.get('/family-units', { params: { skip: families.length, limit } }))
    families.push(...page)
  } while (page.length === limit)
  return families
}

/** 分页读取可纠错的家庭成员和直接关系。 */
export async function getManagementRelationships() {
  const relationships = []
  const limit = 1000
  let page = []
  do {
    page = unwrap(await apiClient.get('/relationships', { params: { skip: relationships.length, limit } }))
    relationships.push(...page)
  } while (page.length === limit)
  return relationships
}

/** 修改家庭类型、日期和显示顺序；家庭 ID 使用列表返回的原始值。 */
export async function updateManagementFamily(familyId, payload) {
  return unwrap(await apiClient.patch(`/family-units/${encodeURIComponent(familyId)}`, payload))
}

/** 删除家庭与成员身份，人物资料和独立事实保留。 */
export async function deleteManagementFamily(familyId) {
  await apiClient.delete(`/family-units/${encodeURIComponent(familyId)}`)
}

/** 以完整稳定关系 ID 删除关系，编码其中的冒号和已编码端点。 */
export async function deleteManagementRelationship(relationshipId) {
  await apiClient.delete(`/relationships/${encodeURIComponent(relationshipId)}`)
}

/** 返回接口原文，保留 FastAPI 校验中的字段路径与具体信息。 */
export function managementErrorMessage(error) {
  const detail = error.response?.data?.detail
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) return detail.map(item => `${item.loc.join('.')}: ${item.msg}`).join('；')
  return error.message || '请求失败'
}
