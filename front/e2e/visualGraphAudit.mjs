import { chromium } from 'playwright'
import { mkdir, writeFile } from 'node:fs/promises'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const FRONT_ROOT = path.resolve(__dirname, '..')
const REPORT_DIR = path.join(FRONT_ROOT, 'e2e', 'artifacts', 'visual-graph-audit')
const FRONTEND_URL = process.env.FAMILYTREE_E2E_URL || 'http://127.0.0.1:3000'
const API_URL = process.env.FAMILYTREE_API_URL || 'http://127.0.0.1:8000'
const USERNAME = process.env.FAMILYTREE_E2E_USERNAME || 'admin'
const PASSWORD = process.env.FAMILYTREE_E2E_PASSWORD || readPasswordFromLocalFile()
const CENTER_NAME = process.env.FAMILYTREE_E2E_CENTER_NAME || '张明远'
const RELATION_FROM_ID = process.env.FAMILYTREE_E2E_RELATION_FROM || 'demo:child'
const RELATION_TO_ID = process.env.FAMILYTREE_E2E_RELATION_TO || 'demo:grandfather'
const CHROME_EXECUTABLE = process.env.PLAYWRIGHT_CHROME_EXECUTABLE || findSystemChrome()

const VIEWS = {
  mainline: { mode: 'mainline', label: '本家主线', title: '本家主线图' },
  inlaw: { mode: 'inlaw', label: '姻亲谱系', title: '姻亲谱系图' },
  bridge: { mode: 'bridge', label: '联姻桥接', title: '联姻桥接图' },
  branch: { mode: 'branch', label: '后代分支', title: '后代分支图' },
  overview: { mode: 'overview', label: '家族全景', title: '家族全景图' }
}

const screenshots = []
const findings = []
const auditCases = []
const visitedCapsuleIds = new Set()
let centerPerson = null
let centerContext = null

/**
 * 执行浏览器端到端视觉巡检。
 */
async function main() {
  await mkdir(REPORT_DIR, { recursive: true })
  if (process.env.FAMILYTREE_E2E_PREPARE_DATA !== '0') await prepareBackendData()
  centerPerson = await resolveCenterPerson()
  centerContext = await getJson(`/api/graph/center-context/${encodeURIComponent(centerPerson.id)}`)

  const browser = await chromium.launch({
    headless: true,
    executablePath: CHROME_EXECUTABLE || undefined
  })
  const page = await browser.newPage({ viewport: { width: 1440, height: 980 }, deviceScaleFactor: 1 })
  page.on('pageerror', error => {
    findings.push({ severity: 'error', view: 'browser-runtime', message: error.message })
  })

  try {
    await page.goto(FRONTEND_URL, { waitUntil: 'domcontentloaded' })
    await login(page)
    await selectCenterPerson(page)

    await auditMainline(page)
    await auditSpouseDrivenViews(page)
    await auditBranchViews(page)
    await auditOverviewViews(page)
    await auditRelationPath(page)
    await writeReport()
  } finally {
    await browser.close()
  }

  if (findings.some(item => item.severity === 'error')) {
    console.error(JSON.stringify({ findings, screenshots, auditCases }, null, 2))
    process.exit(1)
  }
}

/**
 * 初始化后端演示账号和 PostgreSQL 示例族谱。
 */
async function prepareBackendData() {
  await requireOk(`${API_URL}/health`, { method: 'GET' }, '后端健康检查失败')
  await fetchIgnore400(`${API_URL}/api/auth/init-demo-users`, { method: 'POST' })
  await fetchIgnore400(`${API_URL}/api/admin/init-database`, { method: 'POST' })
  await requireOk(`${API_URL}/api/admin/seed-demo-family`, { method: 'POST' }, '初始化 PostgreSQL 示例族谱失败')
}

/**
 * 根据当前数据库搜索中心人物。
 */
async function resolveCenterPerson() {
  const candidates = await getJson(`/api/graph/center-candidates?keyword=${encodeURIComponent(CENTER_NAME)}&limit=20`)
  const exact = candidates.find(person => person.name === CENTER_NAME) || candidates[0]
  if (!exact) throw new Error(`未找到中心人物候选: ${CENTER_NAME}`)
  return exact
}

/**
 * 登录系统。
 */
async function login(page) {
  await page.waitForSelector('text=进入族谱', { timeout: 12000 })
  await page.getByPlaceholder('请输入账号').fill(USERNAME)
  await page.getByPlaceholder('请输入密码').fill(PASSWORD)
  await page.getByRole('button', { name: '进入族谱' }).click()
  await page.waitForSelector('text=族谱系统', { timeout: 15000 })
}

/**
 * 选择中心人物。
 */
async function selectCenterPerson(page) {
  await page.waitForSelector('text=选择中心人物', { timeout: 15000 })
  const modal = page.locator('.center-modal')
  const search = modal.getByPlaceholder('输入姓名搜索中心人物')
  if (await search.count()) {
    await search.fill(CENTER_NAME)
    await modal.getByRole('button', { name: '搜索' }).click()
  }
  await page.waitForSelector(`text=${CENTER_NAME}`, { timeout: 12000 })
  await modal.getByText(CENTER_NAME, { exact: true }).click()
  await modal.getByRole('button', { name: '确认' }).click()
  await page.waitForSelector(`text=${VIEWS.mainline.title}`, { timeout: 15000 })
  await waitForGraphSettled(page)
}

/**
 * 巡检本家主线和主线上的折叠入口。
 */
async function auditMainline(page) {
  await openView(page, VIEWS.mainline)
  await auditCurrentView(page, {
    id: 'mainline',
    expectedMode: 'mainline',
    label: '本家主线'
  })
  await auditCapsulesFromCurrentView(page, 'mainline', async () => {
    await resetCenterToMainline(page)
  })
}

/**
 * 巡检所有配偶驱动视图。
 */
async function auditSpouseDrivenViews(page) {
  const spouseOptions = centerContext.available_spouses || []
  if (!spouseOptions.length) {
    findings.push({ severity: 'error', view: 'spouse-options', message: '中心人物没有可测试的配偶/伴侣选项' })
    return
  }

  for (const spouseOption of spouseOptions) {
    const spouseId = spouseOption.person?.id
    if (!spouseId) continue
    const spouseSlug = slug(spouseId)

    await resetCenterToMainline(page)
    await openViewWithOption(page, VIEWS.inlaw, spouseId)
    await auditCurrentView(page, {
      id: `inlaw-${spouseSlug}`,
      expectedMode: 'inlaw',
      label: `姻亲谱系:${spouseId}`
    })
    await auditCapsulesFromCurrentView(page, `inlaw-${spouseSlug}`, async () => {
      await resetCenterToMainline(page)
      await openViewWithOption(page, VIEWS.inlaw, spouseId)
    })

    await openView(page, VIEWS.bridge)
    await auditCurrentView(page, {
      id: `bridge-${spouseSlug}`,
      expectedMode: 'bridge',
      label: `联姻桥接:${spouseId}`
    })
    await auditCapsulesFromCurrentView(page, `bridge-${spouseSlug}`, async () => {
      await resetCenterToMainline(page)
      await openViewWithOption(page, VIEWS.inlaw, spouseId)
      await openView(page, VIEWS.bridge)
    })
  }
}

/**
 * 巡检所有后代分支入口。
 */
async function auditBranchViews(page) {
  const familyOptions = centerContext.available_family_units || []
  if (!familyOptions.length) {
    await resetCenterToMainline(page)
    await openView(page, VIEWS.branch)
    await auditCurrentView(page, {
      id: `branch-person-${slug(centerPerson.id)}`,
      expectedMode: 'branch',
      label: `人物后代分支:${centerPerson.id}`
    })
    return
  }

  for (const familyOption of familyOptions) {
    const familyUnitId = familyOption.family_unit_id
    if (!familyUnitId) continue
    await resetCenterToMainline(page)
    await openViewWithOption(page, VIEWS.branch, familyUnitId)
    await auditCurrentView(page, {
      id: `branch-${slug(familyUnitId)}`,
      expectedMode: 'branch',
      label: `家庭后代分支:${familyUnitId}`
    })
  }
}

/**
 * 巡检全景图和中心九族范围。
 */
async function auditOverviewViews(page) {
  await openView(page, VIEWS.overview)
  await auditCurrentView(page, {
    id: 'overview-all',
    expectedMode: 'overview',
    label: '家族全景:全部'
  })

  const centerScope = page.getByRole('button', { name: '只看中心九族' })
  if (await centerScope.count()) {
    await centerScope.click()
    await page.waitForSelector(`text=${VIEWS.overview.title}`, { timeout: 15000 })
    await waitForGraphSettled(page)
    await auditCurrentView(page, {
      id: 'overview-center',
      expectedMode: 'overview',
      label: '家族全景:中心九族'
    })
  }
}

/**
 * 打开指定图谱视图。
 */
async function openView(page, view) {
  await page.getByRole('button', { name: view.label }).click()
  await page.waitForSelector(`text=${view.title}`, { timeout: 15000 })
  await settleParameterModal(page)
  await waitForGraphSettled(page)
}

/**
 * 打开带参数选择的图谱视图。
 */
async function openViewWithOption(page, view, optionId) {
  await page.getByRole('button', { name: view.label }).click()
  await page.waitForSelector(`text=${view.title}`, { timeout: 15000 })
  await chooseParameterOption(page, optionId)
  await waitForGraphSettled(page)
}

/**
 * 重置中心人物并回到本家主线，清空配偶和分支派生选择。
 */
async function resetCenterToMainline(page) {
  await page.getByRole('button', { name: VIEWS.mainline.label }).click()
  await page.waitForSelector(`text=${VIEWS.mainline.title}`, { timeout: 15000 })
  await waitForGraphSettled(page)

  await page.locator('.center-btn').click()
  await page.waitForSelector('text=选择中心人物', { timeout: 15000 })
  const modal = page.locator('.center-modal')
  const option = modal.locator(`[data-testid="graph-option-card"][data-option-id="${escapeAttribute(centerPerson.id)}"]`)
  if (await option.count()) await option.click()
  await modal.getByRole('button', { name: '确认' }).click()
  await page.waitForSelector(`text=${VIEWS.mainline.title}`, { timeout: 15000 })
  await waitForGraphSettled(page)
}

/**
 * 参数弹窗出现时选择指定选项。
 */
async function chooseParameterOption(page, optionId) {
  const modal = page.locator('.center-modal')
  const visible = await modal.count().then(count => count > 0).catch(() => false)
  if (!visible) return

  const option = modal.locator(`[data-testid="graph-option-card"][data-option-id="${escapeAttribute(optionId)}"]`)
  const optionCount = await option.count()
  if (optionCount !== 1) {
    findings.push({
      severity: 'error',
      view: 'parameter-modal',
      message: `参数弹窗未找到唯一选项: ${optionId}，实际匹配 ${optionCount} 个`
    })
    return
  }
  await option.click()
  await modal.getByRole('button', { name: '确认' }).click()
}

/**
 * 参数弹窗出现但测试未指定选项时选择第一项。
 */
async function settleParameterModal(page) {
  const modal = page.locator('.center-modal')
  const visible = await modal.count().then(count => count > 0).catch(() => false)
  if (!visible) return

  const optionCards = modal.locator('[data-testid="graph-option-card"]')
  const optionCount = await optionCards.count()
  if (optionCount > 0) {
    await optionCards.nth(0).click()
    await modal.getByRole('button', { name: '确认' }).click()
  }
}

/**
 * 巡检当前视图里真实渲染出的折叠分支入口。
 */
async function auditCapsulesFromCurrentView(page, sourceId, restoreSource) {
  const capsules = await readGraphCapsules(page)
  for (const capsule of capsules) {
    if (!capsule.id || visitedCapsuleIds.has(capsule.id)) continue
    visitedCapsuleIds.add(capsule.id)

    // 详情侧栏会盖住右侧画布，按正常用户操作先关闭再点击入口。
    const drawerClose = page.locator('.detail-drawer').getByRole('button', { name: '关闭', exact: true })
    if (await drawerClose.count() === 1) await drawerClose.click()
    await waitForGraphSettled(page)
    const point = await readCapsulePoint(page, capsule.id)
    if (!point) {
      findings.push({ severity: 'error', view: sourceId, message: `无法定位折叠胶囊: ${capsule.id}` })
      continue
    }

    const targetView = VIEWS[capsule.target_view] || VIEWS.branch
    await page.mouse.click(point.x, point.y)
    if (!(await waitForViewTitle(page, targetView.title, 5000))) {
      findings.push({ severity: 'error', view: sourceId, message: `真实点击折叠入口后未进入${targetView.title}: ${capsule.id}`, point })
    }
    await waitForGraphSettled(page)
    await auditCurrentView(page, {
      id: `capsule-${slug(capsule.id)}`,
      expectedMode: targetView.mode,
      label: `折叠入口:${capsule.title || capsule.id}`,
      source: sourceId
    })
    await restoreSource()
  }
}

/**
 * 等待真实点击后的目标标题出现，失败时记录而不使用调试入口绕过。
 */
async function waitForViewTitle(page, title, timeout) {
  try {
    await page.waitForSelector(`text=${title}`, { timeout })
    return true
  } catch {
    return false
  }
}

/**
 * 巡检当前视图。
 */
async function auditCurrentView(page, auditCase) {
  await waitForGraphSettled(page)
  const screenshotPath = await takeScreenshot(page, `${auditCase.id}.png`)
  const metrics = await collectGraphMetrics(page)
  const visual = await collectVisualMetrics(page)
  const canvasPath = await takeCanvasScreenshot(page, `${auditCase.id}-canvas.png`)

  screenshots.push({
    view: auditCase.id,
    label: auditCase.label,
    page: screenshotPath,
    canvas: canvasPath
  })
  auditCases.push({ ...auditCase, metrics, visual })
  auditGraphMetrics(auditCase, metrics, visual)
}

/**
 * 巡检关系路径面板。
 */
async function auditRelationPath(page) {
  await page.getByRole('button', { name: '关系路径' }).click()
  await page.waitForSelector('text=选择两个人', { timeout: 12000 })
  await page.locator('select').nth(0).selectOption(RELATION_FROM_ID)
  await page.locator('select').nth(1).selectOption(RELATION_TO_ID)
  await page.getByRole('button', { name: '查询关系' }).click()
  await page.waitForSelector('text=查询结果', { timeout: 12000 })
  const screenshotPath = await takeScreenshot(page, 'relation-path.png')
  screenshots.push({ view: 'relation-path', page: screenshotPath })

  const resultText = await page.locator('.result-card').innerText()
  if (!resultText.includes('路径节点')) {
    findings.push({
      severity: 'error',
      view: 'relation-path',
      message: '关系路径面板未显示路径节点统计'
    })
  }
  await page.getByRole('button', { name: '关闭' }).click()
}

/**
 * 读取当前画布中的折叠胶囊。
 */
async function readGraphCapsules(page) {
  return page.evaluate(() => {
    const debug = window.__familyTreeGraphDebug
    if (!debug?.getCapsules) return []
    return debug.getCapsules().map(node => ({
      id: node.id,
      title: node.raw?.title || node.label || '',
      target_view: node.raw?.target_view || 'branch',
      owner_person_id: node.raw?.owner_person_id || '',
      root_family_unit_id: node.raw?.root_family_unit_id || '',
      person_count: node.raw?.person_count || 0
    }))
  })
}

/**
 * 读取折叠胶囊在视口中的点击坐标。
 */
async function readCapsulePoint(page, capsuleId) {
  return page.evaluate(id => {
    const debug = window.__familyTreeGraphDebug
    return debug?.getViewportPoint?.(id) || null
  }, capsuleId)
}

/**
 * 收集 G6 画布的 DOM、几何和布局指标。
 */
async function collectGraphMetrics(page) {
  return page.evaluate(() => {
    const shell = document.querySelector('.graph-canvas-shell')
    const canvas = document.querySelector('.graph-canvas canvas')
    const errorText = document.querySelector('.error-card')?.textContent?.trim() || ''
    const stateText = document.querySelector('.canvas-state')?.textContent?.trim() || ''
    const status = document.querySelector('.status-card strong')?.textContent?.trim() || ''
    const container = document.querySelector('.graph-canvas')
    const bounds = shell?.getBoundingClientRect()
    const canvasBounds = canvas?.getBoundingClientRect()
    const debugState = window.__familyTreeGraphDebug?.getState?.() || {}

    return {
      status,
      errorText,
      stateText,
      hasShell: Boolean(shell),
      hasCanvas: Boolean(canvas),
      shellWidth: bounds?.width || 0,
      shellHeight: bounds?.height || 0,
      canvasWidth: canvasBounds?.width || 0,
      canvasHeight: canvasBounds?.height || 0,
      containerText: container?.textContent || '',
      devicePixelRatio: window.devicePixelRatio,
      viewMode: debugState.viewMode || '',
      rawNodeCount: debugState.rawNodeCount || 0,
      rawEdgeCount: debugState.rawEdgeCount || 0,
      layoutNodeCount: debugState.layoutNodeCount || 0,
      layoutEdgeCount: debugState.layoutEdgeCount || 0,
      capsuleCount: debugState.capsuleCount || 0
    }
  })
}

/**
 * 收集像素层面的画布指标。
 */
async function collectVisualMetrics(page) {
  return page.evaluate(() => {
    const canvas = document.querySelector('.graph-canvas canvas')
    if (!canvas) return { hasPixels: false, nonDarkRatio: 0, brightRatio: 0, width: 0, height: 0 }

    const ctx = canvas.getContext('2d')
    const width = canvas.width
    const height = canvas.height
    const step = Math.max(1, Math.floor(Math.sqrt((width * height) / 12000)))
    const data = ctx.getImageData(0, 0, width, height).data
    let sampled = 0
    let nonDark = 0
    let bright = 0
    for (let y = 0; y < height; y += step) {
      for (let x = 0; x < width; x += step) {
        const index = (y * width + x) * 4
        const r = data[index]
        const g = data[index + 1]
        const b = data[index + 2]
        const a = data[index + 3]
        if (a < 20) continue
        const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b
        sampled += 1
        if (luminance > 35) nonDark += 1
        if (r > 180 && g > 150 && b < 120) bright += 1
      }
    }
    return {
      hasPixels: sampled > 0,
      width,
      height,
      nonDarkRatio: sampled ? nonDark / sampled : 0,
      brightRatio: sampled ? bright / sampled : 0
    }
  })
}

/**
 * 根据指标判断当前图谱是否存在明显问题。
 */
function auditGraphMetrics(auditCase, metrics, visual) {
  if (metrics.errorText) {
    findings.push({ severity: 'error', view: auditCase.id, message: `页面错误提示: ${metrics.errorText}` })
  }
  if (metrics.stateText.includes('暂无图谱数据')) {
    findings.push({ severity: 'error', view: auditCase.id, message: '画布显示暂无图谱数据' })
  }
  if (auditCase.expectedMode && metrics.viewMode && metrics.viewMode !== auditCase.expectedMode) {
    findings.push({
      severity: 'error',
      view: auditCase.id,
      message: `当前图谱模式不匹配: 期望 ${auditCase.expectedMode}，实际 ${metrics.viewMode}`
    })
  }
  if (!metrics.hasCanvas || metrics.canvasWidth < 300 || metrics.canvasHeight < 300) {
    findings.push({ severity: 'error', view: auditCase.id, message: 'G6 canvas 未正确渲染或尺寸过小', metrics })
  }
  if (!metrics.layoutNodeCount || !metrics.rawNodeCount) {
    findings.push({ severity: 'error', view: auditCase.id, message: '图谱布局数据为空，无法证明画布来自接口数据', metrics })
  }
  if (!visual.hasPixels || visual.nonDarkRatio < 0.025) {
    findings.push({ severity: 'error', view: auditCase.id, message: '画布像素接近空白，未检测到足够图形内容', visual })
  }
  if (auditCase.expectedMode !== 'overview' && visual.brightRatio < 0.0008) {
    findings.push({ severity: 'warning', view: auditCase.id, message: '正式图金色节点/线条占比偏低，需要人工复核', visual })
  }
}

/**
 * 等待图谱渲染稳定。
 */
async function waitForGraphSettled(page) {
  await page.waitForFunction(
    () => !document.querySelector('.canvas-state')?.textContent?.includes('正在铺开') &&
      !window.__familyTreeGraphDebug?.getState?.().isAnimating,
    null,
    { timeout: 15000 }
  )
  await page.waitForTimeout(900)
}

/**
 * 截取整页。
 */
async function takeScreenshot(page, name) {
  const target = path.join(REPORT_DIR, name)
  await page.screenshot({ path: target, fullPage: true })
  return path.relative(FRONT_ROOT, target)
}

/**
 * 截取画布区域。
 */
async function takeCanvasScreenshot(page, name) {
  const target = path.join(REPORT_DIR, name)
  const shell = page.locator('.graph-canvas-shell')
  await shell.screenshot({ path: target })
  return path.relative(FRONT_ROOT, target)
}

/**
 * 写巡检报告。
 */
async function writeReport() {
  const report = {
    generatedAt: new Date().toISOString(),
    frontendUrl: FRONTEND_URL,
    apiUrl: API_URL,
    centerName: CENTER_NAME,
    centerPersonId: centerPerson?.id || '',
    coverage: {
      spouseOptionCount: centerContext?.available_spouses?.length || 0,
      familyOptionCount: centerContext?.available_family_units?.length || 0,
      capsuleCount: visitedCapsuleIds.size,
      screenshotCount: screenshots.length,
      auditCaseCount: auditCases.length
    },
    screenshots,
    auditCases,
    findings
  }
  await writeFile(path.join(REPORT_DIR, 'report.json'), JSON.stringify(report, null, 2), 'utf8')
}

/**
 * 读取本地 API JSON。
 */
async function getJson(pathname) {
  const response = await requireOk(`${API_URL}${pathname}`, { method: 'GET' }, `接口读取失败: ${pathname}`)
  return response.json()
}

/**
 * 调用 API 并要求成功。
 */
async function requireOk(url, options, errorMessage) {
  const response = await fetch(url, options)
  if (!response.ok) {
    throw new Error(`${errorMessage}: ${response.status} ${await response.text()}`)
  }
  return response
}

/**
 * 初始化接口重复执行时可忽略 400。
 */
async function fetchIgnore400(url, options) {
  const response = await fetch(url, options)
  if (!response.ok && response.status !== 400) {
    throw new Error(`接口调用失败: ${url}: ${response.status} ${await response.text()}`)
  }
  return response
}

/**
 * 转换为安全文件名片段。
 */
function slug(value) {
  return String(value || 'unknown')
    .replace(/[^a-zA-Z0-9\u4e00-\u9fa5_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90)
}

/**
 * 转义 CSS 属性选择器中的特殊字符。
 */
function escapeAttribute(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

/**
 * 从本地账密文件读取管理员密码。
 */
function readPasswordFromLocalFile() {
  const credentialFile = path.resolve(FRONT_ROOT, '..', '账密.txt')
  if (!existsSync(credentialFile)) return ''
  const content = readFileSync(credentialFile, 'utf8')
  const match = content.match(/Family_tree 管理员密码[：:]\s*(.+)/)
  return match?.[1]?.trim() || ''
}

/**
 * 优先使用系统 Chrome，避免首次执行时必须下载 Playwright 浏览器。
 */
function findSystemChrome() {
  const candidates = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    path.join(process.env.LOCALAPPDATA || '', 'Google\\Chrome\\Application\\chrome.exe')
  ]
  return candidates.find(candidate => candidate && existsSync(candidate)) || ''
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
