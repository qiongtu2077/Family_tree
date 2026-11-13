import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { responseUse } = vi.hoisted(() => ({ responseUse: vi.fn() }))

vi.mock('axios', () => ({
  default: {
    create: vi.fn(config => ({ config, interceptors: { response: { use: responseUse } } }))
  }
}))

describe('http api client', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  afterEach(() => vi.unstubAllGlobals())

  it('uses a request timeout so backend failures surface quickly', async () => {
    const { default: axios } = await import('axios')
    await import('../api/http')

    expect(axios.create).toHaveBeenCalledWith({
      baseURL: '/api',
      timeout: 10000,
      withCredentials: true
    })
  })

  it('notifies the app when an authenticated API request expires', async () => {
    const dispatchEvent = vi.fn()
    vi.stubGlobal('window', { dispatchEvent })
    const { SESSION_EXPIRED_EVENT } = await import('../api/http')
    const [onSuccess, onFailure] = responseUse.mock.calls[0]
    const response = { data: 'ok' }
    expect(onSuccess(response)).toBe(response)
    const error = { response: { status: 401 }, config: { url: '/persons' } }
    await expect(onFailure(error)).rejects.toBe(error)
    expect(dispatchEvent).toHaveBeenCalledTimes(1)
    expect(dispatchEvent.mock.calls[0][0].type).toBe(SESSION_EXPIRED_EVENT)
  })

  it.each([
    [401, '/auth/login'],
    [403, '/admin/graph-issues'],
    [503, '/persons']
  ])('keeps status %s on %s in the current form or feature', async (status, url) => {
    const dispatchEvent = vi.fn()
    vi.stubGlobal('window', { dispatchEvent })
    await import('../api/http')
    const onFailure = responseUse.mock.calls[0][1]
    const error = { response: { status }, config: { url } }
    await expect(onFailure(error)).rejects.toBe(error)
    expect(dispatchEvent).not.toHaveBeenCalled()
  })
})
