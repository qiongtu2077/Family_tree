/**
 * 关系与家庭单元 API
 * 管理 FamilyUnit 与人物之间的亲缘关系。
 */
import { apiClient, unwrap } from './http'

/**
 * 创建家庭单元。
 */
export async function createFamilyUnit(payload) {
  return unwrap(await apiClient.post('/family-units', payload))
}

/**
 * 创建族谱关系。
 */
export async function createRelationship(payload) {
  return unwrap(await apiClient.post('/relationships', payload))
}
