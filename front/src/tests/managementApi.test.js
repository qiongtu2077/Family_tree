import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '../api/http'
import { deleteManagementFamily, deleteManagementRelationship, getManagementFamilies, getManagementPeople, getManagementRelationships, managementErrorMessage, updateManagementFamily } from '../api/management'

vi.mock('../api/http', () => ({ apiClient: { get: vi.fn(), patch: vi.fn(), delete: vi.fn() }, unwrap: response => response.data }))

beforeEach(() => vi.clearAllMocks())

describe('资料维护真实API契约', () => {
  it('逐页读取完整人物，满页后继续读取下一页', async () => {
    const first = Array.from({ length: 1000 }, (_, index) => ({ id: String(index), name: `人物${index}` }))
    apiClient.get.mockResolvedValueOnce({ data: first }).mockResolvedValueOnce({ data: [{ id: 'last', name: '最后一位' }] })
    const people = await getManagementPeople()
    expect(people).toHaveLength(1001)
    expect(apiClient.get).toHaveBeenNthCalledWith(1, '/persons', { params: { skip: 0, limit: 1000 } })
    expect(apiClient.get).toHaveBeenNthCalledWith(2, '/persons', { params: { skip: 1000, limit: 1000 } })
  })

  it('从家庭和关系管理接口读取，不以图谱范围代替完整清单', async () => {
    apiClient.get.mockResolvedValueOnce({ data: [{ id: 'f:one', partners: [], children: [] }] }).mockResolvedValueOnce({ data: [{ id: 'SPOUSE_OF:a:b' }] })
    expect((await getManagementFamilies())[0].id).toBe('f:one')
    expect((await getManagementRelationships())[0].id).toBe('SPOUSE_OF:a:b')
    expect(apiClient.get).toHaveBeenNthCalledWith(1, '/family-units', { params: { skip: 0, limit: 1000 } })
    expect(apiClient.get).toHaveBeenNthCalledWith(2, '/relationships', { params: { skip: 0, limit: 1000 } })
  })

  it.each([
    ['/family-units', getManagementFamilies],
    ['/relationships', getManagementRelationships]
  ])('%s 满页后继续读取，空页结束且不截断一千条以上记录', async (path, readAll) => {
    const first = Array.from({ length: 1000 }, (_, index) => ({ id: String(index) }))
    apiClient.get.mockResolvedValueOnce({ data: first }).mockResolvedValueOnce({ data: [] })
    expect(await readAll()).toEqual(first)
    expect(apiClient.get).toHaveBeenNthCalledWith(2, path, { params: { skip: 1000, limit: 1000 } })
  })

  it('分页中途失败时保留接口错误，不把已读取片段当成完整资料', async () => {
    const failure = new Error('读取第二页失败')
    apiClient.get.mockResolvedValueOnce({ data: Array.from({ length: 1000 }, (_, index) => ({ id: String(index) })) }).mockRejectedValueOnce(failure)
    await expect(getManagementPeople()).rejects.toBe(failure)
  })

  it('更新家庭传递实际字段和显式null，路径编码原始家庭ID', async () => {
    const changes = { family_type: 'adoptive', start_date: null, display_order: 2 }
    apiClient.patch.mockResolvedValue({ data: { id: 'f:one', ...changes } })
    expect(await updateManagementFamily('f:one', changes)).toEqual({ id: 'f:one', ...changes })
    expect(apiClient.patch).toHaveBeenCalledWith('/family-units/f%3Aone', changes)
  })

  it('删除使用具体目标ID并再次编码复合关系中的端点百分号', async () => {
    await deleteManagementFamily('f:one')
    await deleteManagementRelationship('HAS_CHILD:f%3Aone:p%3Achild')
    expect(apiClient.delete).toHaveBeenNthCalledWith(1, '/family-units/f%3Aone')
    expect(apiClient.delete).toHaveBeenNthCalledWith(2, '/relationships/HAS_CHILD%3Af%253Aone%3Ap%253Achild')
  })

  it('保留FastAPI错误原文和字段路径', () => {
    expect(managementErrorMessage({ response: { data: { detail: '家庭单元不存在' } } })).toBe('家庭单元不存在')
    expect(managementErrorMessage({ response: { data: { detail: [{ loc: ['body', 'certainty'], msg: 'Input should be less than or equal to 1' }] } } })).toBe('body.certainty: Input should be less than or equal to 1')
    expect(managementErrorMessage(new Error('Network Error'))).toBe('Network Error')
  })
})
