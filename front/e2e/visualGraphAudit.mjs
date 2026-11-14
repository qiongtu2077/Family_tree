/** 使用真实页面巡检五图及维护面板；除登录会话外，默认只读取现有资料。 */
import { chromium, request } from 'playwright'
import { mkdir, writeFile } from 'node:fs/promises'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
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
let foreignOwnerCapsuleCount = 0
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
    await auditNameSearch(page)
    // 刷新后必须凭服务端 Cookie 恢复会话。
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.getByRole('heading', { name: '家族谱系', exact: true }).waitFor()
    await waitForGraphSettled(page, 'mainline')
    auditCases.push({ id: 'cookie-session-restore', status: 'passed' })
    await auditMainline(page)
    await auditSpouseViews(page)
    await auditForeignOwnerCapsule(page)
    await auditBranchViews(page)
    await auditOverviewViews(page)
    await auditRelationPath(page)
    await resetCenterToMainline(page)
    await auditDirectionAndPaternalReading(page)
    await auditDenseFitFixture(page)
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

/** 在现有数据上只读检查顶部、中心、管理、成员选择和路径筛选的首拼入口。 */
async function auditNameSearch(page) {
  const initials = centerPerson.name_initials
  assert(initials, '人物响应缺少首拼检索键')
  const query = initials.toUpperCase().split('').join(' ')
  for (const [id, keyword] of [['initials', query], ['full-pinyin', centerPerson.name_pinyin]]) {
    await page.getByRole('searchbox', { name: '搜索人物姓名', exact: true }).fill(keyword)
    const response = page.waitForResponse(result => new URL(result.url()).pathname === '/api/persons/search')
    await page.getByRole('search', { exact: true }).getByRole('button', { name: '搜索', exact: true }).click()
    assert((await (await response).json()).some(person => person.id === centerPerson.id), '顶部搜索未返回目标人物')
    await page.locator('.search-results').getByRole('button').filter({ hasText: centerPerson.name }).first().waitFor()
    auditCases.push({ id: `search-top-${id}`, status: 'passed' })
  }
  await takeScreenshot(page, 'search-top-initials')
  await page.getByRole('button', { name: '收起搜索结果', exact: true }).click()

  await page.locator('.center-btn').click()
  const centerModal = page.getByRole('dialog', { name: '选择中心人物', exact: true })
  await centerModal.getByPlaceholder('输入姓名搜索中心人物').fill(query)
  const candidates = page.waitForResponse(result => new URL(result.url()).pathname === '/api/graph/center-candidates')
  await centerModal.getByRole('button', { name: '搜索', exact: true }).click()
  assert((await (await candidates).json()).some(person => person.id === centerPerson.id), '中心候选未返回首拼匹配人物')
  await centerModal.locator(optionSelector(centerPerson.id)).waitFor()
  auditCases.push({ id: 'search-center-initials', status: 'passed' })
  await centerModal.getByRole('button', { name: '取消', exact: true }).click()

  await page.getByRole('button', { name: '关系路径', exact: true }).click()
  const pathPanel = page.getByRole('dialog', { name: '关系路径', exact: true })
  await pathPanel.getByRole('searchbox', { name: '搜索人物 A', exact: true }).fill(query)
  await pathPanel.locator('#relation-from').selectOption(centerPerson.id)
  const spouse = centerContext.available_spouses[0]?.person
  assert(spouse, '路径首拼验收需要具有配偶的中心人物')
  await pathPanel.getByRole('searchbox', { name: '搜索人物 B', exact: true }).fill(spouse.name_initials.toUpperCase())
  await pathPanel.locator('#relation-to').selectOption(spouse.id)
  await pathPanel.getByRole('searchbox', { name: '搜索人物 A', exact: true }).fill('no-such-person')
  assert.equal(await pathPanel.locator('#relation-from').inputValue(), centerPerson.id, '筛选不应改写已选人物')
  await pathPanel.getByRole('searchbox', { name: '搜索人物 A', exact: true }).fill('')
  await pathPanel.getByRole('searchbox', { name: '搜索人物 B', exact: true }).fill('')
  auditCases.push({ id: 'search-path-both-people', status: 'passed' })
  await pathPanel.getByRole('button', { name: '关闭' }).click()

  await page.getByRole('button', { name: '资料管理', exact: true }).click()
  const manager = page.getByRole('dialog', { name: '家族资料管理', exact: true })
  await page.waitForFunction(() => document.querySelector('.management-body')?.getAttribute('aria-busy') === 'false')
  await manager.getByRole('searchbox', { name: '搜索人物资料', exact: true }).fill(query)
  await manager.locator('.record-list').getByRole('button').filter({ hasText: centerPerson.name }).first().waitFor()
  auditCases.push({ id: 'search-management-people', status: 'passed' })
  await manager.getByRole('button', { name: /^家庭资料/ }).click()
  await manager.getByRole('searchbox', { name: '搜索家庭资料', exact: true }).fill(query)
  await manager.locator('.record-list').getByRole('button').filter({ hasText: centerPerson.name }).first().waitFor()
  auditCases.push({ id: 'search-management-families', status: 'passed' })
  await manager.getByRole('button', { name: /^亲缘关系/ }).click()
  await manager.getByRole('searchbox', { name: '搜索关系人物', exact: true }).fill(query)
  await manager.locator('.relation-row').filter({ hasText: centerPerson.name }).first().waitFor()
  auditCases.push({ id: 'search-management-relationships', status: 'passed' })
  await manager.getByRole('button', { name: '+ 录入关系', exact: true }).click()
  await manager.locator('#relationship-from').fill(query)
  await manager.getByRole('option').filter({ hasText: centerPerson.name }).first().waitFor()
  auditCases.push({ id: 'search-remote-person-lookup', status: 'passed' })
  await takeScreenshot(page, 'search-management-initials')
  await manager.getByRole('button', { name: '取消', exact: true }).click()
  await manager.getByRole('button', { name: '关闭资料管理', exact: true }).click()
}

/** 选择 API 已确认的中心人物，使用稳定 ID 避免同名人物误选。 */
async function selectCenterPerson(page) {
  // 首次登录须等自动中心选择或初始画布出现，避免点到异步弹出的遮罩后方。
  await page.waitForFunction(() => document.querySelector('[role="dialog"][aria-label="选择中心人物"]') || document.querySelector('.graph-canvas canvas'))
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
  const source = await apiJson('/api/graph/overview?scope=all&max_nodes=1000')
  await resetCenterToMainline(page)
  await openView(page, VIEWS.overview)
  const initial = await auditOverviewState(page, 'overview-all-collapsed', source, [])
  assert(initial.summaryCount > 0, '默认全景必须显示真实支系摘要')
  const branches = await page.evaluate(() => window.__familyTreeGraphDebug.getLayout().nodes.filter(node => node.nodeType === 'branchSummary').map(node => ({ id: node.id, personIds: node.raw.personIds })))

  // 坐标句柄只用于定位；通过用户实际点击触发展开。
  await page.getByRole('button', { name: '适应视图', exact: true }).click()
  await waitForGraphSettled(page, 'overview')
  const target = await page.evaluate(() => {
    const debug = window.__familyTreeGraphDebug
    for (const node of debug.getLayout().nodes.filter(node => node.nodeType === 'branchSummary')) {
      const point = debug.getViewportPoint(node.id)
      if (document.elementFromPoint(point.x, point.y)?.tagName === 'CANVAS') return { id: node.id, point, personIds: node.raw.personIds }
    }
    return null
  })
  assert(target, '全景没有可真实点击的摘要卡片')
  await page.mouse.click(target.point.x, target.point.y)
  await waitForOverviewPeople(page, target.personIds)
  await auditOverviewState(page, 'overview-canvas-summary-click', source, target.personIds)

  await page.getByRole('button', { name: '收起全部', exact: true }).click()
  await waitForOverviewPeople(page, [])
  const expandedPeople = []
  for (const [index, branch] of branches.entries()) {
    await page.locator(`[data-branch-id="${escapeAttribute(branch.id)}"]`).click()
    expandedPeople.push(...branch.personIds)
    await waitForOverviewPeople(page, expandedPeople)
    await auditOverviewState(page, `overview-sidebar-expand-${index + 1}`, source, expandedPeople)
  }
  await page.getByRole('button', { name: '收起全部', exact: true }).click()
  await waitForOverviewPeople(page, [])
  await page.getByRole('button', { name: '展开全部', exact: true }).click()
  const allPeople = source.nodes.filter(node => node.type === 'person').map(node => node.id)
  await waitForOverviewPeople(page, allPeople)
  const full = await auditOverviewState(page, 'overview-expand-all', source, allPeople)
  assert.equal(full.summaryCount, 0, '全部展开后仍有支系摘要')
  await changeDirection(page, 'horizontal')
  await auditOverviewState(page, 'overview-expanded-horizontal', source, allPeople)
  await changeDirection(page, 'vertical')
  await page.getByRole('button', { name: '收起全部', exact: true }).click()
  await waitForOverviewPeople(page, [])
  await auditOverviewState(page, 'overview-collapse-all', source, [])

  const centerSource = await apiJson(`/api/graph/overview?scope=${encodeURIComponent('center:' + centerPerson.id)}&max_nodes=1000`)
  await page.getByRole('button', { name: '只看中心九族', exact: true }).click()
  await waitForGraphSettled(page, 'overview')
  await auditOverviewState(page, 'overview-center', centerSource, [])
}

/** 等待指定真实人物精确展开，避免同模式异步布局仍停在上一次摘要状态。 */
async function waitForOverviewPeople(page, expectedIds) {
  await page.waitForFunction(ids => {
    const debug = window.__familyTreeGraphDebug
    if (!debug || debug.getState().isAnimating || document.querySelector('.canvas-state')) return false
    const actual = debug.getLayout().nodes.filter(node => node.nodeType === 'person').map(node => node.id).sort()
    return JSON.stringify(actual) === JSON.stringify([...ids].sort())
  }, expectedIds, { timeout: 20000 })
}

/** 与原API人物集合逐ID核对：摘要不是虚构人物，展开及收起的数量严格守恒。 */
async function auditOverviewState(page, id, source, expandedIds) {
  const metrics = await auditCurrentView(page, id, 'overview')
  const originals = source.nodes.filter(node => node.type === 'person')
  assert.deepEqual([...metrics.representedPersonIds].sort(), originals.map(node => node.id).sort(), `${id}：原图人物丢失、重复或被摘要代理冒充`)
  assert.deepEqual([...metrics.layoutPersonIds].sort(), [...expandedIds].sort(), `${id}：实际展开人物不匹配`)
  assert.equal(metrics.totalPersonCount, originals.length, `${id}：画布总人数错误`)
  const actualPeople = await page.evaluate(() => window.__familyTreeGraphDebug.getLayout().nodes.filter(node => node.nodeType === 'person').map(node => node.raw))
  const byId = new Map(originals.map(node => [node.id, node]))
  for (const person of actualPeople) assert.deepEqual(person, byId.get(person.id), `${id}：展开后人物DTO被截断或改写`)
  assert.equal((await page.locator('.branch-count').innerText()).replace(/\s+/g, ' '), `已展开 ${expandedIds.length} 位 · 收起 ${originals.length - expandedIds.length} 位`, `${id}：侧栏人数与画布不一致`)
  return metrics
}

/** 读取胶囊坐标后真实点击，不调用任何调试业务入口。 */
async function auditCapsules(page, sourceId, restoreSource) {
  const capsules = await page.evaluate(() => window.__familyTreeGraphDebug.getCapsules().map(node => ({ id: node.id, targetView: node.raw.target_view, ownerId: node.raw.owner_person_id })))
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
    const foreignOwner = capsule.targetView === 'inlaw' && !centerContext.available_spouses.some(option => option.person.id === capsule.ownerId)
    const view = VIEWS[foreignOwner ? 'branch' : capsule.targetView]
    if (!view) throw new Error(`胶囊具有未定义目标视图：${capsule.targetView}`)
    await page.mouse.click(point.x, point.y)
    await waitForGraphSettled(page, view.mode)
    await auditCurrentView(page, `capsule-${slug(capsule.id)}`, view.mode)
    if (foreignOwner) foreignOwnerCapsuleCount += 1
    await restoreSource()
  }
}

/** 缺少真实样本时临时追加已有家庭的合法胶囊，验证非中心配偶按真实根分支导航。 */
async function auditForeignOwnerCapsule(page) {
  if (foreignOwnerCapsuleCount) return
  const source = await apiJson(`/api/graph/mainline/${encodeURIComponent(centerPerson.id)}?ancestor_depth=2&descendant_depth=2`)
  const families = new Set(source.nodes.filter(node => node.type === 'familyUnit').map(node => node.id))
  const excluded = new Set([centerPerson.id, ...centerContext.available_spouses.map(option => option.person.id)])
  const origin = source.edges.find(edge => families.has(edge.source) && !excluded.has(edge.target))
  assert(origin, '非中心配偶胶囊验收缺少已有原生家庭')
  const familyId = origin.source.slice('family:'.length)
  const capsuleId = 'capsule:e2e-foreign-owner'
  const fixture = { ...source, nodes: [...source.nodes, { id: capsuleId, type: 'branchCapsule', title: '验收用原生家庭入口', owner_person_id: origin.target, root_family_unit_id: familyId, relation_to_center: '其他家庭', person_count: 1, generation_count: 1, preview_names: [], target_view: 'inlaw' }] }
  const pattern = '**/api/graph/mainline/**'
  /** 只在浏览器提供胶囊导航上下文，原始家庭与人物均取自真实API。 */
  const handler = async route => {
    if (route.request().method() === 'GET') await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(fixture) })
    else await route.fallback()
  }
  const paths = []
  /** 只记录图谱请求路径，以证明没有向陌生owner发起错误姻亲查询。 */
  const observe = operation => { const pathname = new URL(operation.url()).pathname; if (pathname.startsWith('/api/graph/')) paths.push(decodeURIComponent(pathname)) }
  await page.route(pattern, handler)
  page.on('request', observe)
  try {
    await openView(page, VIEWS.mainline)
    await page.getByRole('button', { name: '适应视图', exact: true }).click()
    await waitForGraphSettled(page, 'mainline')
    const point = await page.evaluate(id => {
      const point = window.__familyTreeGraphDebug.getViewportPoint(id)
      return point && document.elementFromPoint(point.x, point.y)?.tagName === 'CANVAS' ? point : null
    }, capsuleId)
    assert(point, '非中心配偶胶囊未处于可真实点击的位置')
    paths.length = 0
    const response = page.waitForResponse(result => new URL(result.url()).pathname.startsWith('/api/graph/branch'))
    await page.mouse.click(point.x, point.y)
    await response
    await waitForGraphSettled(page, 'branch')
    assert(paths.includes('/api/graph/branch/' + familyId), '胶囊没有请求原始根家庭分支')
    assert(!paths.some(pathname => pathname.startsWith('/api/graph/inlaw/')), '非中心配偶被错误当作当前中心的姻亲对象')
    foreignOwnerCapsuleCount += 1
    auditCases.push({ id: 'browser-fixture-foreign-owner-capsule', fixture: true, ownerId: origin.target, familyId, paths })
    await auditCurrentView(page, 'foreign-owner-real-family-branch', 'branch')
  } finally {
    await page.unroute(pattern, handler)
    page.off('request', observe)
    await resetCenterToMainline(page)
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
    const visibleNodes = layout.nodes.filter(node => ['person', 'branchSummary', 'branchCapsule'].includes(node.nodeType))
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
    const visibleSummaries = visibleNodes.filter(node => {
      const point = debug.getViewportPoint(node.id)
      return node.nodeType === 'branchSummary' && point.x > canvasBounds.left && point.x < canvasBounds.right && point.y > canvasBounds.top && point.y < canvasBounds.bottom
    }).length
    const people = layout.nodes.filter(node => node.nodeType === 'person')
    const summaries = layout.nodes.filter(node => node.nodeType === 'branchSummary')
    const representedPersonIds = [...people.map(node => node.id), ...summaries.flatMap(node => node.raw.personIds)]
    const crossingMarks = [...document.querySelectorAll('.crossing-layer > g')]
    const anchor = layout.nodes[0]
    const other = layout.nodes.find(node => Math.abs(node.x - anchor.x) > .01 || Math.abs(node.y - anchor.y) > .01)
    const anchorPoint = debug.getViewportPoint(anchor.id)
    const otherPoint = other ? debug.getViewportPoint(other.id) : null
    const actualZoom = other ? Math.abs(other.x - anchor.x) > .01 ? (otherPoint.x - anchorPoint.x) / (other.x - anchor.x) : (otherPoint.y - anchorPoint.y) / (other.y - anchor.y) : state.zoom / 100
    const visibleCrossings = state.zoom < 40 ? [] : (layout.crossings || []).map(crossing => ({
      x: anchorPoint.x + (crossing.x - anchor.x) * actualZoom - canvasBounds.left,
      y: anchorPoint.y + (crossing.y - anchor.y) * actualZoom - canvasBounds.top
    })).filter(point => point.x >= -12 && point.x <= canvasBounds.width + 12 && point.y >= -12 && point.y <= canvasBounds.height + 12)
    const unmatchedCrossings = [...visibleCrossings]
    let unmatchedMarkers = 0
    for (const mark of crossingMarks) {
      const line = mark.querySelector('line')
      const x = (Number(line?.getAttribute('x1')) + Number(line?.getAttribute('x2'))) / 2
      const y = (Number(line?.getAttribute('y1')) + Number(line?.getAttribute('y2'))) / 2
      const index = unmatchedCrossings.findIndex(point => Math.abs(point.x - x) < .5 && Math.abs(point.y - y) < .5)
      if (index < 0) unmatchedMarkers += 1
      else unmatchedCrossings.splice(index, 1)
    }
    const invalidCrossingMarks = crossingMarks.filter(mark => {
      const lines = [...mark.querySelectorAll('line')]
      if (lines.length !== 2) return true
      const [gap, over] = lines
      const values = lines.flatMap(line => ['x1', 'x2', 'y1', 'y2'].map(name => Number(line.getAttribute(name))))
      return values.some(value => !Number.isFinite(value)) || gap.getAttribute('stroke') !== '#fbfcf9' || Number(gap.getAttribute('stroke-width')) <= Number(over.getAttribute('stroke-width'))
    }).length
    return {
      ...state, canvasCount: document.querySelectorAll('.graph-canvas canvas').length,
      shell: { width: bounds.width, height: bounds.height }, canvas: { width: canvasBounds.width, height: canvasBounds.height },
      viewport: { width: innerWidth, height: innerHeight }, documentWidth: document.documentElement.scrollWidth,
      errorText: document.querySelector('.error-card')?.textContent.trim() || '',
      inkSamples, opaqueSamples, samples, inkRatio: inkSamples / samples, visiblePeople, visibleSummaries,
      layoutPersonIds: people.map(node => node.id), representedPersonIds,
      representedPersonCount: representedPersonIds.length, uniqueRepresentedPersonCount: new Set(representedPersonIds).size,
      summaryPeopleCount: summaries.reduce((sum, node) => sum + node.raw.personCount, 0),
      invalidSummaries: summaries.filter(node => node.raw.type !== 'branchSummary' || node.raw.personCount !== node.raw.personIds.length).length,
      crossingMarkerCount: crossingMarks.length, invalidCrossingMarks,
      expectedVisibleCrossingCount: visibleCrossings.length, unmatchedCrossingMarkers: unmatchedMarkers + unmatchedCrossings.length,
      crossingLegend: Boolean(document.querySelector('.crossing-legend')),
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
    [metrics.rawNodeCount > 0 && metrics.layoutNodeCount > 0 && metrics.visiblePeople + metrics.visibleSummaries > 0, '当前视口没有真实人物或可展开的真实支系摘要'],
    [metrics.representedPersonCount === metrics.totalPersonCount && metrics.uniqueRepresentedPersonCount === metrics.totalPersonCount && !metrics.invalidSummaries, '真实人物与摘要人数不守恒或出现重复归属'],
    [metrics.inkSamples >= 8 && metrics.inkRatio > .0001, '浅色画布未检测到足够真实文字或关系线墨迹'],
    [!metrics.errorText, `页面显示接口错误：${metrics.errorText}`],
    [!metrics.nonFiniteNodes.length && !metrics.duplicateIds && !metrics.renderedFamilyUnits, '布局存在非法坐标、重复人物或可见家庭中间节点'],
    [metrics.overlapCount === 0, '人物或折叠入口卡片重叠'],
    [metrics.diagonalEdgeCount === 0, '关系线不是明确的水平或垂直线段'],
    [metrics.cardCrossingCount === 0, '关系线穿过人物或折叠入口卡片'],
    [metrics.documentWidth <= metrics.viewport.width + 2, '页面产生横向溢出']
  ]
  if (metrics.zoom >= 40 && metrics.crossingCount > 0) {
    checks.push([metrics.crossingMarkerCount === metrics.expectedVisibleCrossingCount && !metrics.unmatchedCrossingMarkers && !metrics.invalidCrossingMarks && metrics.crossingLegend, '当前可见交叉未显示坐标吻合的SVG断口及两线不相连说明'])
  }
  for (const [passed, message] of checks) if (!passed) findings.push({ severity: 'error', view: id, message })
  await takeScreenshot(page, id)
  await takeScreenshot(page, `${id}-canvas`, page.locator('.graph-canvas-shell'))
  return metrics
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

/** 操作独立的方向开关，并核对画布方向及持久化设置。 */
async function changeDirection(page, direction) {
  const previous = await page.evaluate(() => ({ direction: window.__familyTreeGraphDebug.getState().direction, cards: window.__familyTreeGraphDebug.getLayout().nodes.filter(node => ['person', 'branchSummary'].includes(node.nodeType)).map(node => ({ id: node.id, x: node.x, y: node.y })) }))
  await page.getByRole('group', { name: '世代阅读方向', exact: true }).getByRole('button', { name: direction === 'horizontal' ? '横向 · 向右' : '纵向 · 向下', exact: true }).click()
  await page.waitForFunction(expected => window.__familyTreeGraphDebug?.getState().direction === expected && !window.__familyTreeGraphDebug.getState().isAnimating && !document.querySelector('.canvas-state'), direction)
  await waitForGraphSettled(page)
  assert.equal(await page.evaluate(() => localStorage.getItem('familytree:layoutDirection')), direction, '方向未写入localStorage')
  if (previous.direction !== direction) {
    const current = await page.evaluate(() => window.__familyTreeGraphDebug.getLayout().nodes.filter(node => ['person', 'branchSummary'].includes(node.nodeType)).map(node => ({ id: node.id, x: node.x, y: node.y })))
    const byId = new Map(current.map(node => [node.id, node]))
    for (const before of previous.cards) {
      const after = byId.get(before.id)
      // 交换并按卡片长宽比缩放的变换自身也是逆变换。
      const x = before.y * 140 / 52
      const y = before.x * 52 / 140
      assert(after && Math.abs(after.x - x) < .01 && Math.abs(after.y - y) < .01, '方向开关未对实际卡片几何交换世代轴：' + before.id)
    }
  }
}

/** 只读取真实可视人物和父系主干，方向变化不得改变关系范围。 */
async function readPersonScope(page) {
  return page.evaluate(() => {
    const layout = window.__familyTreeGraphDebug.getLayout()
    return { people: layout.nodes.filter(node => node.nodeType === 'person').map(node => node.id).sort(), core: layout.nodes.filter(node => node.isPaternalCore).map(node => node.id).sort() }
  })
}

/** 基于原API的明确生父事实独立计算父系主干和逐层近亲范围，不根据性别推断。 */
function expectedPaternalScope(graph, sideDepth, maxAncestorDepth) {
  const people = new Set(graph.nodes.filter(node => node.type === 'person').map(node => node.id))
  const families = new Map(graph.nodes.filter(node => node.type === 'familyUnit').map(node => [node.id, new Set()]))
  for (const edge of graph.edges) {
    if (people.has(edge.source) && families.has(edge.target)) families.get(edge.target).add(edge.source)
    if (families.has(edge.source) && people.has(edge.target)) families.get(edge.source).add(edge.target)
  }
  const confirmed = graph.edges.filter(edge => people.has(edge.source) && people.has(edge.target) && edge.relation === 'father' && edge.metadata?.relationKind === 'biological' && (edge.metadata.certainty ?? 1) === 1)
  const core = new Set([centerPerson.id])
  const queue = [{ id: centerPerson.id, depth: 0 }]
  for (const child of queue) {
    if (child.depth >= maxAncestorDepth) continue
    for (const edge of confirmed.filter(record => record.target === child.id)) if (!core.has(edge.source)) { core.add(edge.source); queue.push({ id: edge.source, depth: child.depth + 1 }) }
  }
  const selected = new Set(core)
  let frontier = new Set(core)
  const expanded = new Set()
  for (let depth = 0; depth <= sideDepth; depth += 1) {
    for (const id of frontier) { selected.add(id); expanded.add(id) }
    for (const members of families.values()) if ([...frontier].some(id => members.has(id))) for (const id of members) selected.add(id)
    for (const edge of graph.edges) {
      if (people.has(edge.source) && people.has(edge.target) && ['father', 'mother', 'parent', 'spouse'].includes(edge.relation) && (frontier.has(edge.source) || frontier.has(edge.target))) {
        selected.add(edge.source); selected.add(edge.target)
      }
    }
    frontier = new Set(confirmed.filter(edge => frontier.has(edge.source) && !expanded.has(edge.target)).map(edge => edge.target))
  }
  return { people: [...selected].sort(), core: [...core].sort() }
}

/** 读取父系入口约定的浅层主线及各主干家庭分支，构建独立验收所需原始事实。 */
async function paternalSource(ancestorDepth, sideDepth) {
  const source = await apiJson(`/api/graph/mainline/${encodeURIComponent(centerPerson.id)}?ancestor_depth=${ancestorDepth}&descendant_depth=1`)
  if (!sideDepth) return source
  const core = new Set(expectedPaternalScope(source, 0, ancestorDepth).core)
  const familyIds = new Set(source.nodes.filter(node => node.type === 'familyUnit').map(node => node.id))
  const roots = new Set(source.edges.filter(edge => core.has(edge.source) && familyIds.has(edge.target)).map(edge => edge.target))
  const nodes = new Map(source.nodes.map(node => [node.id, node]))
  const edges = new Map(source.edges.map(edge => [edge.id, edge]))
  for (const root of [...roots].sort()) {
    const graph = await apiJson(`/api/graph/branch/${encodeURIComponent(root.slice('family:'.length))}?depth=${sideDepth + 1}`)
    for (const node of graph.nodes) nodes.set(node.id, node)
    for (const edge of graph.edges) edges.set(edge.id, edge)
  }
  return { ...source, nodes: [...nodes.values()], edges: [...edges.values()] }
}

/** 验证方向刷新恢复、父系首次纵向、方向独立以及按事实展开旁支的范围语义。 */
async function auditDirectionAndPaternalReading(page) {
  const familyScope = await readPersonScope(page)
  await changeDirection(page, 'horizontal')
  assert.deepEqual(await readPersonScope(page), familyScope, '横向开关改变了完整家谱关系范围')
  await auditCurrentView(page, 'mainline-horizontal', 'mainline')
  await page.reload({ waitUntil: 'domcontentloaded' })
  await waitForGraphSettled(page, 'mainline')
  assert.equal(await page.evaluate(() => window.__familyTreeGraphDebug.getState().direction), 'horizontal', '刷新后未恢复横向设置')
  assert.equal(await page.getByRole('group', { name: '家谱关系范围', exact: true }).getByRole('button', { name: '完整家谱', exact: true }).getAttribute('aria-pressed'), 'true')
  auditCases.push({ id: 'direction-local-storage-reload', status: 'passed' })

  const loaded = page.waitForResponse(response => new URL(response.url()).pathname === `/api/graph/mainline/${centerPerson.id}` && new URL(response.url()).searchParams.get('descendant_depth') === '1')
  await page.getByRole('button', { name: '父系阅读', exact: true }).click()
  await loaded
  await waitForGraphSettled(page, 'mainline')
  assert.equal(await page.evaluate(() => window.__familyTreeGraphDebug.getState().direction), 'vertical', '父系阅读首次进入没有使用纵向')
  const ancestorDepth = Number(await page.getByLabel('父系上溯范围').inputValue())
  assert.equal(await page.getByLabel('展开父系旁支').inputValue(), '0', '父系默认未收起远旁支')
  const initialExpected = expectedPaternalScope(await paternalSource(ancestorDepth, 0), 0, ancestorDepth)
  assert.deepEqual(await readPersonScope(page), initialExpected, '默认父系范围与已确认生父、配偶和全部直接子女事实不一致')
  await auditCurrentView(page, 'paternal-default-vertical', 'mainline')
  await changeDirection(page, 'horizontal')
  assert.deepEqual(await readPersonScope(page), initialExpected, '改变父系方向改变了关系范围')
  await auditCurrentView(page, 'paternal-horizontal-same-scope', 'mainline')
  await auditPaternalFailureRollback(page)
  await auditStaleReadingMode(page)

  let previous = initialExpected.people
  for (const sideDepth of [1, 2, 3]) {
    const source = await paternalSource(ancestorDepth, sideDepth)
    const expected = expectedPaternalScope(source, sideDepth, ancestorDepth)
    const response = page.waitForResponse(result => new URL(result.url()).pathname === `/api/graph/mainline/${centerPerson.id}`)
    await page.getByLabel('展开父系旁支').selectOption(String(sideDepth))
    await response
    await waitForGraphSettled(page, 'mainline')
    assert.deepEqual(await readPersonScope(page), expected, `父系旁支${sideDepth}层与原始关系不符`)
    assert(previous.every(id => expected.people.includes(id)), '增加父系旁支层数反而丢失已有近亲')
    assert.equal(await page.evaluate(() => window.__familyTreeGraphDebug.getState().direction), 'horizontal', '展开旁支重置了方向')
    await auditCurrentView(page, `paternal-side-depth-${sideDepth}`, 'mainline')
    previous = expected.people
  }
  const shallow = page.waitForResponse(result => new URL(result.url()).pathname === `/api/graph/mainline/${centerPerson.id}`)
  await page.getByLabel('展开父系旁支').selectOption('0')
  await shallow
  await waitForGraphSettled(page, 'mainline')
  assert.deepEqual(await readPersonScope(page), initialExpected, '收起父系旁支没有恢复默认近亲范围')
  const ancestry = page.waitForResponse(result => new URL(result.url()).pathname === `/api/graph/mainline/${centerPerson.id}` && new URL(result.url()).searchParams.get('ancestor_depth') === '1')
  await page.getByLabel('父系上溯范围').selectOption('1')
  await ancestry
  await waitForGraphSettled(page, 'mainline')
  const limited = expectedPaternalScope(await paternalSource(1, 0), 0, 1)
  assert.deepEqual(await readPersonScope(page), limited, '父系上溯一代没有区分主干与边界近亲')
  assert.equal(await page.evaluate(() => window.__familyTreeGraphDebug.getState().direction), 'horizontal', '调整父系上溯范围改变了方向')
  await auditCurrentView(page, 'paternal-one-generation-boundary', 'mainline')
  const complete = page.waitForResponse(result => new URL(result.url()).pathname === `/api/graph/mainline/${centerPerson.id}`)
  await page.getByRole('button', { name: '完整家谱', exact: true }).click()
  await complete
  await waitForGraphSettled(page, 'mainline')
  assert.deepEqual(await readPersonScope(page), familyScope, '返回完整家谱未恢复原人物范围')
  assert.equal(await page.evaluate(() => window.__familyTreeGraphDebug.getState().direction), 'horizontal', '切回完整家谱重置了方向')
  await changeDirection(page, 'vertical')
}

/** 用浏览器内200空图响应验证父系范围及真实胶囊导航失败时回滚，不写数据库。 */
async function auditPaternalFailureRollback(page) {
  for (const operation of ['side-depth', 'branch-capsule']) {
    const scope = await readPersonScope(page)
    const before = await page.evaluate(() => ({ direction: window.__familyTreeGraphDebug.getState().direction, view: window.__familyTreeGraphDebug.getState().viewMode, caption: document.querySelector('.status-card > strong').textContent.trim() }))
    const pattern = operation === 'side-depth' ? '**/api/graph/mainline/**' : '**/api/graph/branch**'
    const viewMode = operation === 'side-depth' ? 'mainline' : 'branch'
    /** 只为本项真实交互返回空图，HTTP200不污染接口错误检测。 */
    const handler = async route => {
      if (route.request().method() === 'GET') await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ view_mode: viewMode, center_person_id: centerPerson.id, view_context: {}, nodes: [], edges: [], warnings: [], hidden_relation_count: 0 }) })
      else await route.fallback()
    }
    await page.route(pattern, handler)
    try {
      if (operation === 'side-depth') {
        const response = page.waitForResponse(result => new URL(result.url()).pathname === `/api/graph/mainline/${centerPerson.id}`)
        await page.getByLabel('展开父系旁支').selectOption('1')
        await response
        await page.waitForFunction(() => {
          const select = [...document.querySelectorAll('.paternal-controls label')].find(label => label.textContent.includes('展开父系旁支'))?.querySelector('select')
          return select?.value === '0' && document.querySelector('.error-card') && !document.querySelector('.canvas-state')
        }, null, { timeout: 15000 })
        assert.equal(await page.getByLabel('展开父系旁支').inputValue(), '0', '空响应失败后旁支控件未回滚到0')
      } else {
        await page.getByRole('button', { name: '适应视图', exact: true }).click()
        await waitForGraphSettled(page, 'mainline')
        const capsule = await page.evaluate(() => {
          const debug = window.__familyTreeGraphDebug
          for (const node of debug.getCapsules().filter(item => item.raw.target_view === 'branch')) {
            const point = debug.getViewportPoint(node.id)
            if (document.elementFromPoint(point.x, point.y)?.tagName === 'CANVAS') return { id: node.id, point }
          }
          return null
        })
        assert(capsule, '父系失败验收没有可真实点击的后代分支胶囊')
        const response = page.waitForResponse(result => new URL(result.url()).pathname.startsWith('/api/graph/branch'))
        await page.mouse.click(capsule.point.x, capsule.point.y)
        await response
        await page.locator('.error-card').waitFor()
      }
      await waitForGraphSettled(page, 'mainline')
      assert((await page.locator('.error-card').innerText()).trim(), '空响应失败没有向用户显示可恢复错误')
      assert.deepEqual(await readPersonScope(page), scope, '空响应失败改变了原父系人物或主干')
      assert.equal(await page.getByRole('group', { name: '家谱关系范围', exact: true }).getByRole('button', { name: '父系阅读', exact: true }).getAttribute('aria-pressed'), 'true', '空响应失败后父系阅读选择被改写')
      const after = await page.evaluate(() => ({ direction: window.__familyTreeGraphDebug.getState().direction, view: window.__familyTreeGraphDebug.getState().viewMode, caption: document.querySelector('.status-card > strong').textContent.trim() }))
      assert.deepEqual(after, before, '空响应失败没有保留原视图、父系标题和方向')
      const id = `paternal-empty-${operation}-rollback`
      auditCases.push({ id, fixture: true, operation: 'empty-response-failure-rollback', personCount: scope.people.length, coreCount: scope.core.length, preserved: after })
      await takeScreenshot(page, id)
    } finally {
      await page.unroute(pattern, handler)
      const close = page.getByRole('button', { name: '关闭错误提示', exact: true })
      if (await close.isVisible()) await close.click()
    }
  }
}

/** 暂挂完整家谱请求、成功切入全景后再返回旧空图，旧失败不得回滚最新阅读模式。 */
async function auditStaleReadingMode(page) {
  const scope = await readPersonScope(page)
  const direction = await page.evaluate(() => window.__familyTreeGraphDebug.getState().direction)
  let release
  let notifyIntercepted
  const gate = new Promise(resolve => { release = resolve })
  const intercepted = new Promise(resolve => { notifyIntercepted = resolve })
  const pattern = '**/api/graph/mainline/**'
  /** 延迟200空图响应以触发旧请求失败分支，完全局限于浏览器网络拦截。 */
  const handler = async route => {
    notifyIntercepted()
    await gate
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ view_mode: 'mainline', center_person_id: centerPerson.id, view_context: {}, nodes: [], edges: [], warnings: [], hidden_relation_count: 0 }) })
  }
  await page.route(pattern, handler)
  try {
    const lateResponse = page.waitForResponse(result => new URL(result.url()).pathname === `/api/graph/mainline/${centerPerson.id}`)
    await page.getByRole('button', { name: '完整家谱', exact: true }).click()
    await intercepted
    await openView(page, VIEWS.overview)
    release()
    await (await lateResponse).finished()
    await waitForGraphSettled(page, 'overview')
    assert.equal(await page.getByRole('group', { name: '家谱关系范围', exact: true }).getByRole('button', { name: '完整家谱', exact: true }).getAttribute('aria-pressed'), 'true', '旧失败请求回滚了最新完整家谱模式')
    assert.equal((await page.locator('.status-card > strong').innerText()).trim(), VIEWS.overview.title, '旧失败请求覆盖了全景标题')
    assert.equal(await page.locator('.error-card').count(), 0, '旧失败请求污染了最新视图的错误提示')
    const source = await apiJson('/api/graph/overview?scope=all&max_nodes=1000')
    await auditOverviewState(page, 'stale-reading-mode-response-ignored', source, [])
  } finally {
    release()
    await page.unroute(pattern, handler)
  }
  await resetCenterToMainline(page)
  const response = page.waitForResponse(result => new URL(result.url()).pathname === `/api/graph/mainline/${centerPerson.id}`)
  await page.getByRole('button', { name: '父系阅读', exact: true }).click()
  await response
  await waitForGraphSettled(page, 'mainline')
  assert.deepEqual(await readPersonScope(page), scope, '过期请求验收后恢复父系范围失败')
  assert.equal(await page.evaluate(() => window.__familyTreeGraphDebug.getState().direction), direction, '恢复父系阅读改变了既有方向')
}

/** 仅在浏览器内构造300人宽大家庭，验收Worker与低于8%的动态适应倍率。 */
async function auditDenseFitFixture(page) {
  const familyId = 'family:e2e-dense-fixture'
  const nodes = [{ id: familyId, type: 'familyUnit', family_type: 'marriage', display_order: 0 }]
  const edges = []
  for (let index = 0; index < 300; index += 1) {
    const id = 'e2e-dense-person:' + index
    nodes.push({ id, type: 'person', name: '模拟人物' + index, gender: 'U', is_alive: true })
    edges.push(index < 2
      ? { id: 'dense-partner:' + index, source: id, target: familyId, relation: 'partner', style: 'spouse', metadata: {} }
      : { id: 'dense-child:' + index, source: familyId, target: id, relation: 'biological', style: 'solid', metadata: { relationKind: 'biological', certainty: 1 } })
  }
  const fixture = { view_mode: 'overview', center_person_id: null, view_context: {}, nodes, edges, warnings: [], hidden_relation_count: 0 }
  const pattern = '**/api/graph/overview**'
  /** 截取单个只读图谱请求，不向真实数据库写入模拟资料。 */
  const handler = async route => {
    if (route.request().method() === 'GET' && new URL(route.request().url()).pathname === '/api/graph/overview') await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(fixture) })
    else await route.fallback()
  }
  await page.route(pattern, handler)
  try {
    await openView(page, VIEWS.overview)
    await page.getByRole('button', { name: '展开全部', exact: true }).click()
    await waitForOverviewPeople(page, nodes.filter(node => node.type === 'person').map(node => node.id))
    await page.getByRole('button', { name: '适应视图', exact: true }).click()
    await waitForGraphSettled(page, 'overview')
    const metrics = await page.evaluate(() => {
      const debug = window.__familyTreeGraphDebug
      const state = debug.getState()
      const cards = debug.getLayout().nodes.filter(node => node.nodeType === 'person')
      const first = cards[0]
      const second = cards.find(node => Math.abs(node.x - first.x) > .01)
      const a = debug.getViewportPoint(first.id)
      const b = debug.getViewportPoint(second.id)
      const zoom = (b.x - a.x) / (second.x - first.x)
      const bounds = document.querySelector('.graph-canvas').getBoundingClientRect()
      const padding = bounds.width < 600 ? [70, 28, 90, 28] : [80, 56, 90, 56]
      const clipped = cards.filter(node => {
        const point = debug.getViewportPoint(node.id)
        const x = point.x - bounds.left
        const y = point.y - bounds.top
        return x - node.size[0] * zoom / 2 < padding[3] - 2 || x + node.size[0] * zoom / 2 > bounds.width - padding[1] + 2 || y - node.size[1] * zoom / 2 < padding[0] - 2 || y + node.size[1] * zoom / 2 > bounds.height - padding[2] + 2
      }).map(node => node.id)
      return { zoom, displayedZoom: state.zoom, personCount: cards.length, totalPersonCount: state.totalPersonCount, canvasCount: state.canvasCount, clipped }
    })
    assert.equal(metrics.personCount, 300, '密集图未完整经过Worker展开')
    assert.equal(metrics.totalPersonCount, 300)
    assert.equal(metrics.canvasCount, 1)
    assert(metrics.zoom > 0 && metrics.zoom < .08, '密集图适应倍率仍被固定8%下限截断')
    assert.deepEqual(metrics.clipped, [], '密集图适应视图后仍有卡片越出约定padding')
    auditCases.push({ id: 'browser-fixture-dense-300-fit', fixture: true, metrics })
    await takeScreenshot(page, 'browser-fixture-dense-300-fit')
  } finally {
    await page.unroute(pattern, handler)
    await openView(page, VIEWS.overview)
    await resetCenterToMainline(page)
  }
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

/** 转义支系列表data属性中的稳定ID，不使用文字猜测同名家庭。 */
function escapeAttribute(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"')
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
