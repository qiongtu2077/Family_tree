/** 使用真实页面巡检五图及维护面板；除登录会话外，默认只读取现有资料。 */
import { chromium, request } from 'playwright'
import { mkdir, writeFile } from 'node:fs/promises'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const FRONT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const REPORT_DIR = path.join(FRONT_ROOT, 'e2e', 'artifacts', 'visual-graph-audit')
const FRONTEND_URL = process.env.FAMILYTREE_E2E_URL || 'http://127.0.0.1:3000'
const API_URL = process.env.FAMILYTREE_API_URL || 'http://127.0.0.1:8000'
const USERNAME = process.env.FAMILYTREE_E2E_USERNAME || 'admin'
const PASSWORD = process.env.FAMILYTREE_E2E_PASSWORD || readPasswordFromLocalFile()
const CENTER_NAME = process.env.FAMILYTREE_E2E_CENTER_NAME || '张明远'
const CENTER_ID = process.env.FAMILYTREE_E2E_CENTER_ID || ''
const PREPARE_DATA = process.env.FAMILYTREE_E2E_PREPARE_DATA === '1'
const CHROME_EXECUTABLE = process.env.PLAYWRIGHT_CHROME_EXECUTABLE || findSystemChrome()
const VIEWS = {
  mainline: { mode: 'mainline', label: '本家主线', title: '本家主线图' },
  inlaw: { mode: 'inlaw', label: '姻亲谱系', title: '姻亲谱系图' },
  bridge: { mode: 'bridge', label: '联姻桥接', title: '联姻桥接图' },
  branch: { mode: 'branch', label: '后代分支', title: '后代分支图' },
  overview: { mode: 'overview', label: '家族全景', title: '家族全景图' }
}
const SCREEN_SIZES = [{ width: 390, height: 844 }, { width: 768, height: 1024 }, { width: 1024, height: 900 }, { width: 1280, height: 900 }]
const screenshots = []
const findings = []
const auditCases = []
const visitedCapsuleIds = new Set()
let api = null
let centerPerson = null
let centerContext = null

// --- 登录会话与只读运行边界 --- //

/** 登录 API 和实际页面，执行全部验收，中途失败时仍保存报告。 */
async function main() {
  await mkdir(REPORT_DIR, { recursive: true })
  let browser = null
  let page = null
  try {
    if (!PASSWORD) throw new Error('缺少本地巡检凭据：请设置 FAMILYTREE_E2E_PASSWORD 或配置未跟踪的账密文件')
    api = await request.newContext({ baseURL: API_URL })
    const user = (await apiJson('/api/auth/login', 'POST', { username: USERNAME, password: PASSWORD })).user
    if (!user?.is_admin) throw new Error('完整巡检需要现有管理员账号，以读取资料管理和账号审批面板')
    if (PREPARE_DATA) await prepareBackendData()
    centerPerson = await resolveCenterPerson()
    centerContext = await apiJson(`/api/graph/center-context/${encodeURIComponent(centerPerson.id)}`)
    browser = await chromium.launch({ headless: true, executablePath: CHROME_EXECUTABLE || undefined })
    page = await browser.newPage({ viewport: { width: 1440, height: 980 }, deviceScaleFactor: 1 })
    await protectReadOnlyBrowser(page)
    await page.goto(FRONTEND_URL, { waitUntil: 'domcontentloaded' })
    await loginThroughPage(page)
    await selectCenterPerson(page)
    // 刷新后必须凭服务端 Cookie 恢复会话。
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.getByRole('heading', { name: '家族谱系', exact: true }).waitFor()
    await waitForGraphSettled(page, 'mainline')
    auditCases.push({ id: 'cookie-session-restore', status: 'passed' })
    await auditMainline(page)
    await auditSpouseViews(page)
    await auditBranchViews(page)
    await auditOverviewViews(page)
    await auditRelationPath(page)
    await resetCenterToMainline(page)
    await auditZoomAndResponsiveViews(page)
  } catch (error) {
    findings.push({ severity: 'error', view: 'audit-runtime', message: error.message })
    if (page && !page.isClosed()) {
      try { await takeScreenshot(page, 'failure') } catch { /* 页面崩溃时保留原始错误。 */ }
    }
  } finally {
    await writeReport()
    await browser?.close()
    await api?.dispose()
  }
  console.log(JSON.stringify({ report: path.relative(FRONT_ROOT, path.join(REPORT_DIR, 'report.json')), auditCaseCount: auditCases.length, screenshotCount: screenshots.length, findings }, null, 2))
  if (findings.length) process.exitCode = 1
}

/** 只有显式 PREPARE_DATA=1 才初始化演示账号、表和演示族谱。 */
async function prepareBackendData() {
  await apiJson('/api/auth/init-demo-users', 'POST')
  await apiJson('/api/admin/init-database', 'POST')
  await apiJson('/api/admin/seed-demo-family', 'POST')
}

/** 使用自动携带 Cookie 的 API 上下文；错误中不输出凭据或 Set-Cookie。 */
async function apiJson(pathname, method = 'GET', data) {
  const response = await api.fetch(pathname, { method, ...(data === undefined ? {} : { data }) })
  if (!response.ok()) throw new Error(`接口请求失败：${method} ${pathname}，HTTP ${response.status()}`)
  return response.status() === 204 ? null : response.json()
}

/** 阻止页面意外写入资料、审批、注册或发邮件，并记录浏览器异常。 */
async function protectReadOnlyBrowser(page) {
  await page.route('**/api/**', async route => {
    const operation = route.request()
    const pathname = new URL(operation.url()).pathname
    if (['GET', 'HEAD', 'OPTIONS'].includes(operation.method()) || (operation.method() === 'POST' && pathname === '/api/auth/login')) {
      await route.continue()
      return
    }
    findings.push({ severity: 'error', view: 'read-only-boundary', message: `已阻止页面写请求：${operation.method()} ${pathname}` })
    await route.abort('blockedbyclient')
  })
  page.on('pageerror', error => findings.push({ severity: 'error', view: 'browser-runtime', message: error.message }))
  page.on('response', response => {
    const pathname = new URL(response.url()).pathname
    // 未登录时 /me 的 401 属于正常会话探测。
    if (pathname.startsWith('/api/') && response.status() >= 400 && !(pathname === '/api/auth/me' && response.status() === 401)) findings.push({ severity: 'error', view: 'browser-api', message: `${response.request().method()} ${pathname} 返回 HTTP ${response.status()}` })
  })
}

/** 提交新版登录表单，检验浏览器会话建立。 */
async function loginThroughPage(page) {
  await page.getByRole('heading', { name: '登录族谱', exact: true }).waitFor({ timeout: 15000 })
  await page.getByLabel('账号', { exact: true }).fill(USERNAME)
  await page.getByPlaceholder('请输入密码', { exact: true }).fill(PASSWORD)
  const response = page.waitForResponse(result => new URL(result.url()).pathname === '/api/auth/login' && result.request().method() === 'POST')
  await page.getByRole('button', { name: '进入族谱' }).click()
  if (!(await response).ok()) throw new Error('页面登录失败，请核对前端代理目标与隔离服务账号')
  await page.getByRole('heading', { name: '家族谱系', exact: true }).waitFor({ timeout: 15000 })
}

/** 优先使用明确中心 ID，否则按姓名读取已认证的候选接口。 */
async function resolveCenterPerson() {
  if (CENTER_ID) return apiJson(`/api/persons/${encodeURIComponent(CENTER_ID)}`)
  const people = await apiJson(`/api/graph/center-candidates?keyword=${encodeURIComponent(CENTER_NAME)}&limit=20`)
  const person = people.find(candidate => candidate.name === CENTER_NAME)
  if (!person) throw new Error(`未找到中心人物：${CENTER_NAME}；请设置 FAMILYTREE_E2E_CENTER_ID 或 FAMILYTREE_E2E_CENTER_NAME`)
  return person
}

// --- 五图、参数与真实折叠入口 --- //

/** 选择 API 已确认的中心人物，使用稳定 ID 避免同名人物误选。 */
async function selectCenterPerson(page) {
  const modal = page.getByRole('dialog', { name: '选择中心人物', exact: true })
  if (!(await modal.isVisible())) await page.locator('.center-btn').click()
  await modal.getByPlaceholder('输入姓名搜索中心人物').fill(centerPerson.name)
  await modal.getByRole('button', { name: '搜索', exact: true }).click()
  await modal.locator(optionSelector(centerPerson.id)).click()
  await modal.getByRole('button', { name: '确认', exact: true }).click()
  await modal.waitFor({ state: 'hidden' })
  await waitForGraphSettled(page, 'mainline')
}

/** 重选原始中心，清除胶囊导航引入的中心、配偶和家庭参数。 */
async function resetCenterToMainline(page) {
  await closePersonDrawer(page)
  await selectCenterPerson(page)
}

/** 切换视图，多选项时明确选择目标，再等待异步视图提交。 */
async function openView(page, view, optionId = '') {
  await page.getByRole('navigation', { name: '族谱视图' }).getByRole('button', { name: view.label, exact: true }).click()
  if (optionId) {
    const available = view.mode === 'branch' ? centerContext.available_family_units : centerContext.available_spouses
    if (available.length > 1) {
      const modal = page.locator('.center-modal')
      await modal.waitFor()
      await modal.locator(optionSelector(optionId)).click()
      await modal.getByRole('button', { name: '确认', exact: true }).click()
      await modal.waitFor({ state: 'hidden' })
    }
  }
  await waitForGraphSettled(page, view.mode)
}

/** 巡检本家主线及其折叠分支。 */
async function auditMainline(page) {
  await auditCurrentView(page, 'mainline', 'mainline')
  await auditCapsules(page, 'mainline', () => resetCenterToMainline(page))
}

/** 对真实配偶逐个巡检姻亲与桥接，缺必要资料时明确报告未覆盖。 */
async function auditSpouseViews(page) {
  if (!centerContext.available_spouses.length) {
    findings.push({ severity: 'error', view: 'spouse-fixture', message: '当前中心没有配偶，无法覆盖姻亲谱系和联姻桥接；请选择具备完整家系的验收中心' })
    return
  }
  for (const option of centerContext.available_spouses) {
    const spouseId = option.person.id
    for (const view of [VIEWS.inlaw, VIEWS.bridge]) {
      await resetCenterToMainline(page)
      await openView(page, view, spouseId)
      const id = `${view.mode}-${slug(spouseId)}`
      await auditCurrentView(page, id, view.mode)
      await auditCapsules(page, id, async () => { await resetCenterToMainline(page); await openView(page, view, spouseId) })
    }
  }
}

/** 遍历家庭分支；无家庭选项时检验人物根分支。 */
async function auditBranchViews(page) {
  const options = centerContext.available_family_units
  if (!options.length) {
    await resetCenterToMainline(page)
    await openView(page, VIEWS.branch)
    await auditCurrentView(page, 'branch-person', 'branch')
  }
  for (const option of options) {
    await resetCenterToMainline(page)
    await openView(page, VIEWS.branch, option.family_unit_id)
    await auditCurrentView(page, `branch-${slug(option.family_unit_id)}`, 'branch')
  }
}

/** 检验全家族与中心九族；全景保留真实关系线。 */
async function auditOverviewViews(page) {
  await resetCenterToMainline(page)
  await openView(page, VIEWS.overview)
  await auditCurrentView(page, 'overview-all', 'overview')
  await page.getByRole('button', { name: '只看中心九族', exact: true }).click()
  await waitForGraphSettled(page, 'overview')
  await auditCurrentView(page, 'overview-center', 'overview')
}

/** 读取胶囊坐标后真实点击，不调用任何调试业务入口。 */
async function auditCapsules(page, sourceId, restoreSource) {
  const capsules = await page.evaluate(() => window.__familyTreeGraphDebug.getCapsules().map(node => ({ id: node.id, targetView: node.raw.target_view })))
  for (const capsule of capsules) {
    if (visitedCapsuleIds.has(capsule.id)) continue
    visitedCapsuleIds.add(capsule.id)
    await closePersonDrawer(page)
    await page.getByRole('button', { name: '适应视图', exact: true }).click()
    await waitForGraphSettled(page)
    await page.locator('.graph-canvas-shell').scrollIntoViewIfNeeded()
    const point = await page.evaluate(id => {
      const point = window.__familyTreeGraphDebug.getViewportPoint(id)
      return point && document.elementFromPoint(point.x, point.y)?.tagName === 'CANVAS' ? point : null
    }, capsule.id)
    if (!point) {
      findings.push({ severity: 'error', view: sourceId, message: `胶囊不在可真实点击的画布范围：${capsule.id}` })
      continue
    }
    const view = VIEWS[capsule.targetView]
    if (!view) throw new Error(`胶囊具有未定义目标视图：${capsule.targetView}`)
    await page.mouse.click(point.x, point.y)
    await waitForGraphSettled(page, view.mode)
    await auditCurrentView(page, `capsule-${slug(capsule.id)}`, view.mode)
    await restoreSource()
  }
}

/** 关闭可能遮挡真实点击的详情侧栏。 */
async function closePersonDrawer(page) {
  const close = page.getByRole('button', { name: '关闭人物详情', exact: true })
  if (await close.isVisible()) await close.click()
}

// --- 画布像素、布局几何与响应式视野 --- //

/** 等待开发诊断存在、布局稳定且模式正确，不把加载卡片当成成功。 */
async function waitForGraphSettled(page, mode = '') {
  await page.waitForFunction(expected => {
    const state = window.__familyTreeGraphDebug?.getState()
    return state && !state.isAnimating && state.layoutNodeCount > 0 && (!expected || state.viewMode === expected) && !document.querySelector('.canvas-state')
  }, mode, { timeout: 20000 })
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
}

/** 读取真实布局、DOM体积、浅色画布墨迹、卡片重叠和关系穿卡指标。 */
async function collectGraphMetrics(page) {
  return page.evaluate(() => {
    const debug = window.__familyTreeGraphDebug
    const state = debug.getState()
    const layout = debug.getLayout()
    const shell = document.querySelector('.graph-canvas-shell')
    const canvas = document.querySelector('.graph-canvas canvas')
    const bounds = shell.getBoundingClientRect()
    const canvasBounds = canvas.getBoundingClientRect()
    const positions = new Map(layout.nodes.map(node => [node.id, node]))
    const visibleNodes = layout.nodes.filter(node => ['person', 'branchCapsule'].includes(node.nodeType))
    const overlaps = []
    for (let index = 0; index < visibleNodes.length; index += 1) {
      const node = visibleNodes[index]
      for (const other of visibleNodes.slice(index + 1)) {
        if (Math.abs(node.x - other.x) < (node.size[0] + other.size[0]) / 2 - .1 && Math.abs(node.y - other.y) < (node.size[1] + other.size[1]) / 2 - .1) overlaps.push([node.id, other.id])
      }
    }
    const diagonalEdges = []
    const cardCrossings = []
    for (const edge of layout.edges) {
      const start = positions.get(edge.source)
      const end = positions.get(edge.target)
      if (!start || !end || edge.type !== 'line' || (Math.abs(start.x - end.x) > .01 && Math.abs(start.y - end.y) > .01)) {
        diagonalEdges.push(edge.id)
        continue
      }
      for (const node of visibleNodes) {
        const left = node.x - node.size[0] / 2 + .1
        const right = node.x + node.size[0] / 2 - .1
        const top = node.y - node.size[1] / 2 + .1
        const bottom = node.y + node.size[1] / 2 - .1
        const horizontal = Math.abs(start.y - end.y) < .01 && start.y > top && start.y < bottom && Math.max(start.x, end.x) > left && Math.min(start.x, end.x) < right
        const vertical = Math.abs(start.x - end.x) < .01 && start.x > left && start.x < right && Math.max(start.y, end.y) > top && Math.min(start.y, end.y) < bottom
        if (horizontal || vertical) cardCrossings.push([edge.id, node.id])
      }
    }
    const pixels = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data
    const step = Math.max(1, Math.floor(Math.sqrt(canvas.width * canvas.height / 24000)))
    let samples = 0
    let opaqueSamples = 0
    let inkSamples = 0
    for (let y = 0; y < canvas.height; y += step) {
      for (let x = 0; x < canvas.width; x += step) {
        const offset = (y * canvas.width + x) * 4
        const luminance = .2126 * pixels[offset] + .7152 * pixels[offset + 1] + .0722 * pixels[offset + 2]
        samples += 1
        if (pixels[offset + 3] >= 20) opaqueSamples += 1
        // 浅色填充和透明背景不计作文字、描边或关系线墨迹。
        if (pixels[offset + 3] >= 40 && luminance < 225) inkSamples += 1
      }
    }
    const visiblePeople = visibleNodes.filter(node => {
      const point = debug.getViewportPoint(node.id)
      return node.nodeType === 'person' && point.x > canvasBounds.left && point.x < canvasBounds.right && point.y > canvasBounds.top && point.y < canvasBounds.bottom
    }).length
    return {
      ...state, canvasCount: document.querySelectorAll('.graph-canvas canvas').length,
      shell: { width: bounds.width, height: bounds.height }, canvas: { width: canvasBounds.width, height: canvasBounds.height },
      viewport: { width: innerWidth, height: innerHeight }, documentWidth: document.documentElement.scrollWidth,
      errorText: document.querySelector('.error-card')?.textContent.trim() || '',
      inkSamples, opaqueSamples, samples, inkRatio: inkSamples / samples, visiblePeople,
      nonFiniteNodes: layout.nodes.filter(node => !Number.isFinite(node.x) || !Number.isFinite(node.y)).map(node => node.id),
      duplicateIds: layout.nodes.length - positions.size, renderedFamilyUnits: layout.nodes.filter(node => node.nodeType === 'familyUnit').length,
      overlaps: overlaps.slice(0, 12), overlapCount: overlaps.length,
      diagonalEdges: diagonalEdges.slice(0, 12), diagonalEdgeCount: diagonalEdges.length,
      cardCrossings: cardCrossings.slice(0, 12), cardCrossingCount: cardCrossings.length
    }
  })
}

/** 断言单画布、真实墨迹、正交关系和无重叠，并保存当前视图证据。 */
async function auditCurrentView(page, id, expectedMode) {
  await waitForGraphSettled(page, expectedMode)
  const metrics = await collectGraphMetrics(page)
  auditCases.push({ id, expectedMode, metrics })
  const checks = [
    [metrics.viewMode === expectedMode, '实际视图模式不匹配'],
    [metrics.canvasCount === 1, '页面必须只有一个图谱画布'],
    [metrics.canvas.width >= 280 && metrics.canvas.height >= 300, '画布体积不足'],
    [Math.abs(metrics.shell.width - metrics.canvas.width) <= 3 && Math.abs(metrics.shell.height - metrics.canvas.height) <= 3, '画布尺寸未跟随容器'],
    [metrics.rawNodeCount > 0 && metrics.layoutNodeCount > 0 && metrics.visiblePeople > 0, '接口、布局或当前视口没有真实人物'],
    [metrics.inkSamples >= 8 && metrics.inkRatio > .0001, '浅色画布未检测到足够真实文字或关系线墨迹'],
    [!metrics.errorText, `页面显示接口错误：${metrics.errorText}`],
    [!metrics.nonFiniteNodes.length && !metrics.duplicateIds && !metrics.renderedFamilyUnits, '布局存在非法坐标、重复人物或可见家庭中间节点'],
    [metrics.overlapCount === 0, '人物或折叠入口卡片重叠'],
    [metrics.diagonalEdgeCount === 0, '关系线不是明确的水平或垂直线段'],
    [metrics.cardCrossingCount === 0, '关系线穿过人物或折叠入口卡片'],
    [metrics.documentWidth <= metrics.viewport.width + 2, '页面产生横向溢出']
  ]
  for (const [passed, message] of checks) if (!passed) findings.push({ severity: 'error', view: id, message })
  await takeScreenshot(page, id)
  await takeScreenshot(page, `${id}-canvas`, page.locator('.graph-canvas-shell'))
}

/** 记录同一人物相对画布中心的像素偏移，检验 resize 未隐式适应全图。 */
async function viewportSnapshot(page) {
  return page.evaluate(centerId => {
    const debug = window.__familyTreeGraphDebug
    const node = debug.getLayout().nodes.find(item => item.id === centerId) || debug.getLayout().nodes.find(item => item.nodeType === 'person')
    const point = debug.getViewportPoint(node.id)
    const bounds = document.querySelector('.graph-canvas').getBoundingClientRect()
    return { nodeId: node.id, zoom: debug.getState().zoom, offsetX: point.x - bounds.left - bounds.width / 2, offsetY: point.y - bounds.top - bounds.height / 2 }
  }, centerPerson.id)
}

/** 操作真实缩放按钮和四种视口，检验视野保留、响应式体积及业务面板。 */
async function auditZoomAndResponsiveViews(page) {
  await page.getByRole('button', { name: '回到中心', exact: true }).click()
  const before = await viewportSnapshot(page)
  await page.getByRole('button', { name: '放大图谱', exact: true }).click()
  const enlarged = await viewportSnapshot(page)
  await page.getByRole('button', { name: '缩小图谱', exact: true }).click()
  const restored = await viewportSnapshot(page)
  if (enlarged.zoom <= before.zoom || Math.abs(restored.zoom - before.zoom) > 1) findings.push({ severity: 'error', view: 'zoom-controls', message: '放大或缩小按钮未按当前倍率缩放' })
  auditCases.push({ id: 'zoom-controls', before, enlarged, restored })
  for (const size of SCREEN_SIZES) {
    const previous = await viewportSnapshot(page)
    await page.setViewportSize(size)
    await page.waitForFunction(({ width, height }) => {
      const canvas = document.querySelector('.graph-canvas canvas')
      const container = document.querySelector('.graph-canvas')
      return innerWidth === width && innerHeight === height && Math.abs(canvas.getBoundingClientRect().width - container.clientWidth) <= 1 && Math.abs(canvas.getBoundingClientRect().height - container.clientHeight) <= 1
    }, size)
    await waitForGraphSettled(page, 'mainline')
    const current = await viewportSnapshot(page)
    if (current.nodeId !== previous.nodeId || current.zoom !== previous.zoom || Math.abs(current.offsetX - previous.offsetX) > 2 || Math.abs(current.offsetY - previous.offsetY) > 2) findings.push({ severity: 'error', view: `resize-${size.width}`, message: '窗口尺寸变化后倍率或观察的世界坐标被重置', previous, current })
    auditCases.push({ id: `resize-preserves-view-${size.width}`, previous, current })
    await auditCurrentView(page, `responsive-${size.width}`, 'mainline')
    await auditReadOnlyPanels(page, size.width)
  }
}

// --- 路径与维护面板：只读打开、检查和关闭 --- //

/** 使用明确配置或真实配偶查询路径，核对页面显示的实际人物链。 */
async function auditRelationPath(page) {
  const from = process.env.FAMILYTREE_E2E_RELATION_FROM || centerPerson.id
  const to = process.env.FAMILYTREE_E2E_RELATION_TO || centerContext.available_spouses[0]?.person.id
  if (!to || from === to) throw new Error('缺少两个不同的路径验收人物，请设置 FAMILYTREE_E2E_RELATION_FROM / FAMILYTREE_E2E_RELATION_TO')
  const expected = await apiJson(`/api/graph/relation-path?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`)
  if (expected.path.nodes.length < 2) throw new Error('验收路径未返回两位以上真实人物')
  await page.getByRole('button', { name: '关系路径', exact: true }).click()
  const panel = page.getByRole('dialog', { name: '关系路径', exact: true })
  await panel.locator('#relation-from').selectOption(from)
  await panel.locator('#relation-to').selectOption(to)
  await panel.getByRole('button', { name: '查询关系', exact: true }).click()
  await panel.locator('.result-card').waitFor()
  const names = await panel.locator('.path-chain .path-person > span:not(.path-avatar)').allTextContents()
  if (names.join('|') !== expected.path.nodes.map(node => node.name).join('|')) findings.push({ severity: 'error', view: 'relation-path', message: '页面人物链与实际接口路径不一致' })
  if ((await panel.locator('.result-card > strong').innerText()) !== expected.relation_text) findings.push({ severity: 'error', view: 'relation-path', message: '页面亲缘解释与接口不一致' })
  auditCases.push({ id: 'relation-path', personCount: names.length, edgeCount: expected.path.edges.length })
  await takeScreenshot(page, 'relation-path')
  await panel.getByRole('button', { name: '关闭' }).click()
  await panel.waitFor({ state: 'hidden' })
}

/** 每个响应式尺寸只读打开面板，检查内容加载、边界和关闭。 */
async function auditReadOnlyPanels(page, width) {
  const panels = [
    { entry: '关系路径', dialog: '关系路径', close: '关闭' },
    { entry: '我的资料', dialog: '我的资料', close: '关闭 ×' },
    { entry: '资料管理', dialog: '家族资料管理', close: '关闭资料管理' },
    { entry: '账号审批', dialog: '账号审批', close: '关闭 ×' }
  ]
  for (const item of panels) {
    await page.locator('.toolbar-actions').getByRole('button', { name: item.entry, exact: true }).click()
    const panel = page.getByRole('dialog', { name: item.dialog, exact: true })
    await panel.waitFor()
    if (item.entry === '资料管理') {
      await panel.locator('.management-loading').waitFor({ state: 'hidden' })
      await page.waitForFunction(() => document.querySelector('.management-body')?.getAttribute('aria-busy') === 'false')
      for (const tab of ['家庭资料', '亲缘关系', '人物档案']) await panel.getByRole('button', { name: new RegExp(`^${tab}`) }).click()
    } else if (item.entry === '账号审批') await panel.getByText('正在读取注册申请...').waitFor({ state: 'hidden' })
    else if (item.entry === '我的资料') await panel.getByText('正在读取个人资料...').waitFor({ state: 'hidden' })
    const metrics = await panel.evaluate(element => {
      const bounds = element.getBoundingClientRect()
      return { left: bounds.left, top: bounds.top, right: bounds.right, bottom: bounds.bottom, width: bounds.width, height: bounds.height, clientWidth: element.clientWidth, scrollWidth: element.scrollWidth, viewportWidth: innerWidth, viewportHeight: innerHeight, documentWidth: document.documentElement.scrollWidth, errors: [...element.querySelectorAll('[role="alert"]')].map(alert => alert.textContent.trim()) }
    })
    const id = `panel-${slug(item.entry)}-${width}`
    if (metrics.left < -2 || metrics.top < -2 || metrics.right > metrics.viewportWidth + 2 || metrics.bottom > metrics.viewportHeight + 2 || metrics.scrollWidth > metrics.clientWidth + 2 || metrics.documentWidth > metrics.viewportWidth + 2) findings.push({ severity: 'error', view: id, message: '面板超出视口或出现横向溢出', metrics })
    if (metrics.errors.length) findings.push({ severity: 'error', view: id, message: metrics.errors.join('；') })
    auditCases.push({ id, metrics, operation: 'read-only-open-close' })
    await takeScreenshot(page, id)
    await panel.getByRole('button', { name: item.close, exact: item.entry !== '关系路径' }).click()
    await panel.waitFor({ state: 'hidden' })
  }
}

// --- 报告与本地配置 --- //

/** 保存整页或画布截图，报告只记录产物相对路径。 */
async function takeScreenshot(page, name, element = null) {
  const target = path.join(REPORT_DIR, `${slug(name)}.png`)
  if (element) await element.screenshot({ path: target })
  else await page.screenshot({ path: target, fullPage: true })
  const relative = path.relative(FRONT_ROOT, target)
  screenshots.push({ id: name, path: relative })
  return relative
}

/** 写实际执行结果，不记录账号、密码、Cookie或未执行的通过结论。 */
async function writeReport() {
  await writeFile(path.join(REPORT_DIR, 'report.json'), JSON.stringify({
    generatedAt: new Date().toISOString(), frontendUrl: FRONTEND_URL, apiUrl: API_URL,
    dataPreparation: PREPARE_DATA ? 'explicitly-enabled' : 'disabled', centerPersonId: centerPerson?.id || '',
    coverage: { spouseOptionCount: centerContext?.available_spouses.length || 0, familyOptionCount: centerContext?.available_family_units.length || 0, capsuleCount: visitedCapsuleIds.size, screenshotCount: screenshots.length, auditCaseCount: auditCases.length, responsiveWidths: SCREEN_SIZES.map(size => size.width) },
    screenshots, auditCases, findings
  }, null, 2), 'utf8')
}

/** 转义项目明确提供的 data-option-id 属性选择器。 */
function optionSelector(value) {
  return `[data-testid="graph-option-card"][data-option-id="${String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"]`
}

/** 转换为安全文件名片段，保留中文描述便于人工核对。 */
function slug(value) {
  return String(value).replace(/[^a-zA-Z0-9\u4e00-\u9fa5_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 140)
}

/** 仅读取被 Git 忽略的本地密码，不输出文件内容。 */
function readPasswordFromLocalFile() {
  const credentialFile = path.resolve(FRONT_ROOT, '..', '账密.txt')
  if (!existsSync(credentialFile)) return ''
  return readFileSync(credentialFile, 'utf8').match(/Family_tree 管理员密码[：:]\s*(.+)/)?.[1]?.trim() || ''
}

/** 优先使用系统 Chrome，否则使用 Playwright 管理的浏览器。 */
function findSystemChrome() {
  return ['C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe', path.join(process.env.LOCALAPPDATA || '', 'Google\\Chrome\\Application\\chrome.exe')].find(candidate => existsSync(candidate)) || ''
}

await main()
