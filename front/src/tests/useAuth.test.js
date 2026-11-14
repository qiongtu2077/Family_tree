/** 校验真实会话恢复、认证反馈及失效处理，不将本地资料作为凭据。 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const api = vi.hoisted(() => ({ getCurrentUser: vi.fn(), login: vi.fn(), logout: vi.fn(), register: vi.fn() }))
vi.mock('../api/auth', () => api)

let auth

beforeEach(async () => {
  vi.resetModules()
  vi.clearAllMocks()
  vi.stubGlobal('localStorage', { removeItem: vi.fn() })
  auth = (await import('../composables/useAuth')).useAuth()
})

afterEach(() => vi.unstubAllGlobals())

describe('authenticated session state', () => {
  it('enters local testing without credentials and keeps test access after expiry events', async () => {
    api.getCurrentUser.mockResolvedValue({ auth_enabled: false, user: { id: 1, is_admin: true } })
    await auth.checkLoginStatus()
    expect(auth.authEnabled.value).toBe(false)
    expect(auth.isLoggedIn.value).toBe(true)
    expect(auth.isAdmin.value).toBe(true)
    expect(auth.loginForm.value).toEqual({ username: '', password: '' })
    expect(api.login).not.toHaveBeenCalled()
    auth.handleSessionExpired()
    expect(auth.isLoggedIn.value).toBe(true)
  })

  it('restores only the user returned by the server session', async () => {
    api.getCurrentUser.mockResolvedValue({ user: { id: 3, username: 'owner', is_admin: false } })
    await auth.checkLoginStatus()
    expect(api.getCurrentUser).toHaveBeenCalledWith()
    expect(localStorage.removeItem).toHaveBeenCalledWith('user')
    expect(auth.currentUser.value.username).toBe('owner')
    expect(auth.isLoggedIn.value).toBe(true)
    expect(auth.isAdmin.value).toBe(false)
    expect(auth.isCheckingAuth.value).toBe(false)
  })

  it('keeps anonymous startup quiet while showing connection failures', async () => {
    api.getCurrentUser.mockRejectedValueOnce({ response: { status: 401 } })
    await auth.checkLoginStatus()
    expect(auth.isLoggedIn.value).toBe(false)
    expect(auth.authError.value).toBe('')
    api.getCurrentUser.mockRejectedValueOnce(new Error('offline'))
    await auth.checkLoginStatus()
    expect(auth.authError.value).toContain('无法连接服务器')
    expect(auth.isCheckingAuth.value).toBe(false)
  })

  it('clears submitted passwords and invalidates the prior user when the session expires', async () => {
    api.login.mockResolvedValue({ user: { id: 1, is_admin: true } })
    auth.loginForm.value = { username: 'admin', password: 'test-password' }
    await auth.handleLogin()
    expect(auth.isAdmin.value).toBe(true)
    expect(auth.loginForm.value.password).toBe('')
    auth.handleSessionExpired()
    expect(auth.isLoggedIn.value).toBe(false)
    expect(auth.currentUser.value).toBeNull()
    expect(auth.isAdmin.value).toBe(false)
    expect(auth.authError.value).toContain('登录状态已过期')
  })

  it('shows authentication errors and resets the submission state', async () => {
    api.login.mockRejectedValue({ response: { data: { detail: '用户名或密码错误' } } })
    auth.loginForm.value = { username: 'owner', password: 'wrong-password' }
    await auth.handleLogin()
    expect(auth.authError.value).toBe('用户名或密码错误')
    expect(auth.isSubmittingAuth.value).toBe(false)
    expect(auth.isLoggedIn.value).toBe(false)
  })

  it('calls server logout and then removes the client user', async () => {
    api.getCurrentUser.mockResolvedValue({ user: { id: 3, is_admin: false } })
    await auth.checkLoginStatus()
    api.logout.mockResolvedValue({ success: true })
    await auth.handleLogout()
    expect(api.logout).toHaveBeenCalledTimes(1)
    expect(auth.currentUser.value).toBeNull()
    expect(auth.isLoggedIn.value).toBe(false)
  })
})

describe('registration form', () => {
  it('rejects a short or mismatched password before sending credentials', async () => {
    auth.registerForm.value = { username: 'new', email: 'new@example.com', real_name: '新成员', password: 'short', confirmPassword: 'short' }
    await auth.handleRegister()
    expect(auth.authError.value).toContain('至少需要 8 位')
    auth.registerForm.value.password = 'long-password'
    await auth.handleRegister()
    expect(auth.authError.value).toContain('密码不一致')
    expect(api.register).not.toHaveBeenCalled()
  })

  it('preserves the approval notice and clears all submitted passwords', async () => {
    auth.isRegisterMode.value = true
    auth.registerForm.value = { username: 'new', email: 'new@example.com', real_name: '新成员', password: 'test-password', confirmPassword: 'test-password' }
    api.register.mockResolvedValue({ message: '注册申请已提交，请等待管理员审批。' })
    await auth.handleRegister()
    expect(api.register).toHaveBeenCalledWith('new', 'test-password', 'new@example.com', '新成员')
    expect(auth.authNotice.value).toContain('等待管理员审批')
    expect(auth.isRegisterMode.value).toBe(false)
    expect(auth.isLoggedIn.value).toBe(false)
    expect(auth.loginForm.value.username).toBe('new')
    expect(auth.registerForm.value.password).toBe('')
    expect(auth.registerForm.value.confirmPassword).toBe('')
  })

  it('turns backend validation details into readable feedback', async () => {
    auth.registerForm.value = { username: 'new', email: 'invalid', real_name: '新成员', password: 'test-password', confirmPassword: 'test-password' }
    api.register.mockRejectedValue({ response: { data: { detail: [{ loc: ['body', 'email'], type: 'string_pattern_mismatch' }] } } })
    await auth.handleRegister()
    expect(auth.authError.value).toContain('信息格式不正确')
    expect(auth.isSubmittingAuth.value).toBe(false)
  })
})
