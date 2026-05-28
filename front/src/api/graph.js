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
 * 获取本家主线图。
 */
export async function getMainlineGraph(personId, ancestorDepth = 3, descendantDepth = 3) {
  return unwrap(
    await apiClient.get(`/graph/mainline/${personId}`, {
      params: {
        ancestor_depth: ancestorDepth,
        descendant_depth: descendantDepth
      }
    })
  )
}

/**
 * 获取姻亲谱系图。
 */
export async function getInlawGraph(personId, spouseId, depth = 3) {
  return unwrap(
    await apiClient.get(`/graph/inlaw/${personId}/${spouseId}`, {
      params: { depth }
    })
  )
}

/**
 * 获取联姻桥接图。
 */
export async function getBridgeGraph(personId, spouseId, depth = 2, familyUnitId = null) {
  return unwrap(
    await apiClient.get('/graph/bridge', {
      params: {
        person_id: personId,
        spouse_id: spouseId,
        family_unit_id: familyUnitId || undefined,
        depth
      }
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
 * 按人物或家庭单元根节点获取后代分支图。
 */
export async function getBranchGraphByRoot(rootType, rootId, depth = 5) {
  return unwrap(
    await apiClient.get('/graph/branch', {
      params: {
        root_type: rootType,
        root_id: rootId,
        depth
      }
    })
  )
}

/**
 * 获取家族全景图。
 */
export async function getOverviewGraph(scope = 'all', maxNodes = 300) {
  return unwrap(
    await apiClient.get('/graph/overview', {
      params: {
        scope,
        max_nodes: maxNodes
      }
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
