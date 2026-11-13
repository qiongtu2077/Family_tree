import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as Vue from 'vue'
import { createRenderer, nextTick, ssrContextKey } from 'vue'
import { compileScript, compileTemplate, parse } from '@vue/compiler-sfc'
import FamilyDataManager from '../components/admin/FamilyDataManager.vue'
import managerSource from '../components/admin/FamilyDataManager.vue?raw'
import { getManagementFamilies, getManagementPeople, getManagementRelationships } from '../api/management'

vi.mock('../api/management', () => ({
  getManagementPeople: vi.fn(), getManagementFamilies: vi.fn(), getManagementRelationships: vi.fn(),
  deleteManagementFamily: vi.fn(), managementErrorMessage: error => error.message
}))
vi.mock('../api/persons', () => ({ deletePerson: vi.fn() }))
vi.mock('../components/admin/management/PersonEditor.vue', () => ({ default: { render: () => null } }))
vi.mock('../components/admin/management/FamilyEditor.vue', () => ({ default: { render: () => null } }))
vi.mock('../components/admin/management/RelationshipManager.vue', () => ({ default: { render: () => null } }))

// --- 无浏览器的真实 Vue 面板渲染 --- //

/** 提供 Vue 所需宿主节点，验证组件条件和交互，不模拟浏览器布局。 */
function createHostNode(type, text = '') {
  return { type, tagName: type.toUpperCase(), text, props: {}, children: [], parent: null, addEventListener() {}, focus() {} }
}

/** 将管理面板挂载到内存宿主，并保留 Teleport 的目标节点供断言。 */
function mountManager() {
  const body = createHostNode('body')
  const renderer = createRenderer({
    createElement: createHostNode,
    createText: text => createHostNode('#text', text),
    createComment: text => createHostNode('#comment', text),
    setText: (node, text) => { node.text = text },
    setElementText: (node, text) => { node.text = text; node.children = [] },
    patchProp: (node, key, previous, next) => { node.props[key] = next },
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
  const { descriptor } = parse(managerSource)
  const bindings = compileScript(descriptor, { id: 'management-test' }).bindings
  const template = compileTemplate({
    source: descriptor.template.content, id: 'management-test', filename: 'FamilyDataManager.vue',
    compilerOptions: { mode: 'function', bindingMetadata: bindings }
  })
  if (template.errors.length) throw new Error(template.errors.join('\n'))
  const render = new Function('Vue', template.code)(Vue)
  const app = renderer.createApp({ ...FamilyDataManager, render }, { open: true })
  app.provide(ssrContextKey, { modules: new Set() })
  app.mount(createHostNode('root'))
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
