/**
 * 族谱图谱 API
 * 对应后端 Neo4j 图谱接口。
 */
import { apiClient, unwrap } from './http'

/**
 * 获取中心人物本家主线图。
 */
export async function getFocusGraph(personId, generations = 5) {
  return unwrap(
    await apiClient.get(`/graph/focus/${personId}`, {
      params: { generations }
    })
  )
}

/**
 * 获取家庭单元后代分支图。
 */
export async function getBranchGraph(familyUnitId, depth = 5) {
  return unwrap(
    await apiClient.get(`/graph/branch/${familyUnitId}`, {
      params: { depth }
    })
  )
}

/**
 * 查询两个人之间的关系路径。
 */
export async function getRelationPath(fromPersonId, toPersonId) {
  return unwrap(
    await apiClient.get('/graph/relation-path', {
      params: { from: fromPersonId, to: toPersonId }
    })
  )
}

/**
 * 获取图谱异常。
 */
export async function getGraphIssues() {
  return unwrap(await apiClient.get('/admin/graph-issues'))
}
