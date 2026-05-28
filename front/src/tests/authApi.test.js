import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '../api/http'
import { getCurrentUser, initDemoUsers, login } from '../api/auth'

vi.mock('../api/http', () => ({
  apiClient: {
    post: vi.fn(),
    get: vi.fn()
  },
  unwrap: response => response.data
}))

describe('auth api', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('logs in with username and password', async () => {
    apiClient.post.mockResolvedValue({ data: { success: true, user: { id: 1 } } })

    const result = await login('admin', '<ROTATED_ADMIN_PASSWORD>')

    expect(apiClient.post).toHaveBeenCalledWith('/auth/login', {
      username: 'admin',
      password: '<ROTATED_ADMIN_PASSWORD>'
    })
    expect(result.user.id).toBe(1)
  })

  it('checks current user session', async () => {
    apiClient.get.mockResolvedValue({ data: { success: true, user: { id: 1 } } })

    await getCurrentUser(1)

    expect(apiClient.get).toHaveBeenCalledWith('/auth/me', { params: { user_id: 1 } })
  })

  it('initializes demo users', async () => {
    apiClient.post.mockResolvedValue({ data: { success: true } })

    const result = await initDemoUsers()

    expect(apiClient.post).toHaveBeenCalledWith('/auth/init-demo-users')
    expect(result.success).toBe(true)
  })
})
