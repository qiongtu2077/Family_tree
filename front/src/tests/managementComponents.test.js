import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as Vue from 'vue'
import { createRenderer, nextTick, ssrContextKey } from 'vue'
import { compileScript, compileTemplate, parse } from '@vue/compiler-sfc'
import FamilyDataManager from '../components/admin/FamilyDataManager.vue'
import managerSource from '../components/admin/FamilyDataManager.vue?raw'
import relationshipSource from '../components/admin/management/RelationshipManager.vue?raw'
import { getManagementFamilies, getManagementPeople, getManagementRelationships } from '../api/management'

vi.mock('../api/management', () => ({
  getManagementPeople: vi.fn(), getManagementFamilies: vi.fn(), getManagementRelationships: vi.fn(),
  deleteManagementFamily: vi.fn(), managementErrorMessage: error => error.message
}))
vi.mock('../api/persons', () => ({ deletePerson: vi.fn(), searchPersons: vi.fn() }))
vi.mock('../components/admin/management/PersonEditor.vue', () => ({ default: { render: () => null } }))
vi.mock('../components/admin/management/FamilyEditor.vue', () => ({ default: { render: () => null } }))
vi.mock('../components/admin/management/RelationshipManager.vue', () => ({ default: { render: () => null } }))

// --- 无浏览器的真实 Vue 面板渲染 --- //

/** 提供 Vue 所需宿主节点，验证组件条件和交互，不模拟浏览器布局。 */
function createHostNode(type, text = '') {
  return {
    type, tagName: type.toUpperCase(), text, props: {}, children: [], parent: null, listeners: {},
    /** 保存真实 v-model 指令注册的输入事件，供用户输入回归调用。 */
    addEventListener(event, handler) { this.listeners[event] = handler },
    /** 内存宿主无需移动浏览器焦点。 */
    focus() {},
    /** 为真实 select 的 v-model 指令暴露选项集合。 */
    get options() { return this.children.filter(child => child.type === 'option') }
  }
}

/** 挂载真实管理模板，统一收集普通根节点和 Teleport 内容。 */
function mountManager(component = FamilyDataManager, source = managerSource, props = { open: true }) {
  const body = createHostNode('body')
  const renderer = createRenderer({
    createElement: createHostNode,
    createText: text => createHostNode('#text', text),
    createComment: text => createHostNode('#comment', text),
    setText: (node, text) => { node.text = text },
    setElementText: (node, text) => { node.text = text; node.children = [] },
    patchProp: (node, key, previous, next) => { node.props[key] = next; if (key === 'value') node.value = next },
    parentNode: node => node.parent,
    nextSibling: node => node.parent?.children[node.parent.children.indexOf(node) + 1] || null,
    querySelector: selector => selector === 'body' ? body : null,
    /** 按 Vue 的锚点约定插入或移动节点。 */
    insert(node, parent, anchor = null) {
      if (node.parent) node.parent.children.splice(node.parent.children.indexOf(node), 1)
      node.parent = parent
      const index = anchor ? parent.children.indexOf(anchor) : parent.children.length
      parent.children.splice(index, 0, node)
    },
    /** 从宿主树移除已卸载的节点。 */
    remove(node) {
      if (node.parent) node.parent.children.splice(node.parent.children.indexOf(node), 1)
      node.parent = null
    }
  })
  // Node 测试默认生成 SSR 模板；明确编译同一份真实模板供内存客户端渲染。
  const { descriptor } = parse(source)
  const bindings = compileScript(descriptor, { id: 'management-test' }).bindings
  const template = compileTemplate({
    source: descriptor.template.content, id: 'management-test', filename: 'FamilyDataManager.vue',
    compilerOptions: { mode: 'function', bindingMetadata: bindings }
  })
  if (template.errors.length) throw new Error(template.errors.join('\n'))
  const render = new Function('Vue', template.code)(Vue)
  const app = renderer.createApp({ ...component, render }, props)
  app.provide(ssrContextKey, { modules: new Set() })
  const root = createHostNode('root')
  root.parent = body
  body.children.push(root)
  app.mount(root)
  return { body, unmount: () => app.unmount() }
}

/** 递归汇总节点文字，便于按用户看到的按钮名称操作。 */
function textOf(node) {
  return node.text + node.children.map(textOf).join('')
}

/** 查找满足条件的首个真实渲染节点。 */
function findNode(node, predicate) {
  if (predicate(node)) return node
  for (const child of node.children) {
    const match = findNode(child, predicate)
    if (match) return match
  }
  return null
}

/** 完成管理数据请求和其后的 Vue 响应式刷新。 */
async function settlePanel() {
  for (let index = 0; index < 4; index += 1) { await Promise.resolve(); await nextTick() }
}

/** 通过真实输入事件修改搜索词，并等待 Vue 更新可见档案。 */
async function searchRecords(manager, label, value) {
  const input = findNode(manager.body, node => node.type === 'input' && node.props['aria-label'] === label)
  input.value = value
  input.listeners.input({ target: input })
  await nextTick()
}

beforeEach(() => {
  vi.resetAllMocks()
  getManagementPeople.mockResolvedValue([])
  getManagementFamilies.mockResolvedValue([])
  getManagementRelationships.mockResolvedValue([])
})

describe('资料管理空列表与删除目标', () => {
  it('有人物但没有家庭时，家庭页不显示不存在的家庭删除操作', async () => {
    getManagementPeople.mockResolvedValue([{ id: 'p:one', name: '家人', gender: 'U', is_alive: true }])
    const manager = mountManager()
    await settlePanel()
    const familiesTab = findNode(manager.body, node => node.type === 'button' && textOf(node).startsWith('家庭资料'))
    familiesTab.props.onClick()
    await nextTick()
    expect(findNode(manager.body, node => node.type === 'button' && textOf(node) === '删除此家庭')).toBeNull()
    expect(textOf(manager.body)).toContain('建立家庭后可添加成员')
    manager.unmount()
  })

  it('有空家庭但没有人物时，人物页不显示不存在的人物删除操作', async () => {
    getManagementFamilies.mockResolvedValue([{ id: 'f:empty', family_type: 'marriage', partners: [], children: [] }])
    const manager = mountManager()
    await settlePanel()
    expect(findNode(manager.body, node => node.type === 'button' && textOf(node) === '删除此人物')).toBeNull()
    const familiesTab = findNode(manager.body, node => node.type === 'button' && textOf(node).startsWith('家庭资料'))
    familiesTab.props.onClick()
    await nextTick()
    const deleteFamily = findNode(manager.body, node => node.type === 'button' && textOf(node) === '删除此家庭')
    expect(deleteFamily).not.toBeNull()
    deleteFamily.props.onClick()
    await nextTick()
    expect(textOf(manager.body)).toContain('删除 未录成员的家庭 · :empty？')
    manager.unmount()
  })
})

describe('资料管理姓名与首拼搜索', () => {
  const people = [
    { id: 'p:zhang', name: '张明远', name_pinyin: 'zhangmingyuan', name_initials: 'zmy', gender: 'M', is_alive: true, birth_date: '1970-01-02', occupation: '教师' },
    { id: 'p:li', name: '李华', name_pinyin: 'lihua', name_initials: 'lh', gender: 'F', is_alive: true, birth_date: '1980-05-06', occupation: '工程师' },
    { id: 'p:wang', name: '王芳', name_pinyin: 'wangfang', name_initials: 'wf', gender: 'F', is_alive: true }
  ]

  it('人物列表接受首拼、完整拼音和中文，并保留生年及职业搜索', async () => {
    getManagementPeople.mockResolvedValue(people)
    const manager = mountManager()
    await settlePanel()
    for (const keyword of [' Z M Y ', 'ZHANG MING YUAN', '明远', '1970', '教 师']) {
      await searchRecords(manager, '搜索人物资料', keyword)
      expect(textOf(manager.body)).toContain('张明远')
      expect(textOf(manager.body)).not.toContain('李华')
      expect(textOf(manager.body)).not.toContain('王芳')
    }
    await searchRecords(manager, '搜索人物资料', ' \t\n ')
    expect(textOf(manager.body)).toContain('张明远')
    expect(textOf(manager.body)).toContain('李华')
    expect(textOf(manager.body)).toContain('王芳')
    manager.unmount()
  })

  it('家庭列表按父母或子女的首拼命中，并保留家庭类型筛选', async () => {
    getManagementPeople.mockResolvedValue(people)
    getManagementFamilies.mockResolvedValue([
      { id: 'f:zhang', family_type: 'marriage', partners: [{ person_id: 'p:zhang' }], children: [{ person_id: 'p:li' }] },
      { id: 'f:wang', family_type: 'single_parent', partners: [{ person_id: 'p:wang' }], children: [] }
    ])
    const manager = mountManager()
    await settlePanel()
    findNode(manager.body, node => node.type === 'button' && textOf(node).startsWith('家庭资料')).props.onClick()
    await nextTick()
    for (const keyword of ['Z M Y', 'li hua']) {
      await searchRecords(manager, '搜索家庭资料', keyword)
      expect(textOf(manager.body)).toContain('张明远')
      expect(textOf(manager.body)).not.toContain('王芳')
    }
    await searchRecords(manager, '搜索家庭资料', '单亲')
    expect(textOf(manager.body)).toContain('王芳')
    expect(textOf(manager.body)).not.toContain('张明远')
    await searchRecords(manager, '搜索家庭资料', '不匹配')
    expect(textOf(manager.body)).toContain('未找到匹配家庭')
    manager.unmount()
  })

  it('关系列表匹配任一端点的首拼，并与原关系类型过滤共同生效', async () => {
    const { default: RelationshipManager } = await vi.importActual('../components/admin/management/RelationshipManager.vue')
    const relationships = [
      { id: 'r:parent', relationship_type: 'parent_child', person_id: 'p:zhang', target_person_id: 'p:li', relation_kind: 'biological', side: 'father', certainty: 1 },
      { id: 'r:spouse', relationship_type: 'spouse', person_id: 'p:wang', target_person_id: 'p:zhang' },
      { id: 'r:other', relationship_type: 'spouse', person_id: 'p:li', target_person_id: 'p:wang' }
    ]
    const manager = mountManager(RelationshipManager, relationshipSource, { people, relationships })
    await settlePanel()
    await searchRecords(manager, '搜索关系人物', ' Z M Y ')
    expect(textOf(manager.body)).toContain('2 条')
    expect(textOf(manager.body)).toContain('李华')
    expect(textOf(manager.body)).toContain('王芳')

    const typeSelect = findNode(manager.body, node => node.type === 'select' && node.props['aria-label'] === '筛选关系类型')
    for (const option of typeSelect.options) option.selected = option.value === 'spouse'
    typeSelect.listeners.change()
    await nextTick()
    expect(textOf(manager.body)).toContain('1 条')
    expect(textOf(manager.body)).toContain('王芳')
    expect(textOf(manager.body)).not.toContain('李华')

    await searchRecords(manager, '搜索关系人物', 'ZHANG MING YUAN')
    expect(textOf(manager.body)).toContain('1 条')
    await searchRecords(manager, '搜索关系人物', '无人匹配')
    expect(textOf(manager.body)).toContain('没有匹配的关系')
    manager.unmount()
  })
})
