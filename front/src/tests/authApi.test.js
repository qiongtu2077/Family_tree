import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '../api/http'
import { approveRegistration, getCurrentUser, getPendingRequests, initDemoUsers, login, logout, rejectRegistration } from '../api/auth'

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

    const result = await login('admin', 'unit-test-password')

    expect(apiClient.post).toHaveBeenCalledWith('/auth/login', {
      username: 'admin',
      password: 'unit-test-password'
    })
    expect(result.user.id).toBe(1)
  })

  it('checks current user session', async () => {
    apiClient.get.mockResolvedValue({ data: { success: true, user: { id: 1 } } })

    await getCurrentUser()

    expect(apiClient.get).toHaveBeenCalledWith('/auth/me')
  })

  it('initializes demo users', async () => {
    apiClient.post.mockResolvedValue({ data: { success: true } })

    const result = await initDemoUsers()

    expect(apiClient.post).toHaveBeenCalledWith('/auth/init-demo-users')
    expect(result.success).toBe(true)
  })

  it('revokes the server session when logging out', async () => {
    apiClient.post.mockResolvedValue({ data: { success: true } })
    expect((await logout()).success).toBe(true)
    expect(apiClient.post).toHaveBeenCalledWith('/auth/logout')
  })

  it('uses authenticated request IDs for application approval instead of email tokens', async () => {
    apiClient.get.mockResolvedValue({ data: [{ id: 7, username: 'newcomer' }] })
    apiClient.post.mockResolvedValue({ data: { success: true } })
    expect(await getPendingRequests()).toEqual([{ id: 7, username: 'newcomer' }])
    await approveRegistration(7)
    await rejectRegistration(8)
    expect(apiClient.get).toHaveBeenCalledWith('/auth/pending-requests')
    expect(apiClient.post).toHaveBeenCalledWith('/auth/requests/7/approve')
    expect(apiClient.post).toHaveBeenCalledWith('/auth/requests/8/reject')
  })
})
