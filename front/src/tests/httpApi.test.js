import { describe, expect, it, vi } from 'vitest'

vi.mock('axios', () => ({
  default: {
    create: vi.fn(config => ({ config }))
  }
}))

describe('http api client', () => {
  it('uses a request timeout so backend failures surface quickly', async () => {
    const { default: axios } = await import('axios')
    await import('../api/http')

    expect(axios.create).toHaveBeenCalledWith({
      baseURL: '/api',
      timeout: 5000
    })
  })
})
