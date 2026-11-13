import { describe, expect, it, vi } from 'vitest'
import * as Vue from 'vue'
import { createRenderer, nextTick, ssrContextKey } from 'vue'
import { compileScript, compileTemplate, parse } from '@vue/compiler-sfc'
import RelationPathPanel from '../components/graph/RelationPathPanel.vue'
import panelSource from '../components/graph/RelationPathPanel.vue?raw'

const people = [
  { id: 'p:zhang/1', name: '张明远', name_pinyin: 'zhangmingyuan', name_initials: 'zmy' },
  { id: 'p:li/2', name: '李华', name_pinyin: 'lihua', name_initials: 'lh' },
  { id: 'p:wang/3', name: '王海', name_pinyin: 'wanghai', name_initials: 'wh' }
]

// --- 无浏览器的真实 Vue 模板与表单事件 --- //

/** 提供真实 v-model 指令所需的表单属性、事件和宿主节点。 */
function createHostNode(type, text = '') {
  const listeners = {}
  return {
    type, tagName: type.toUpperCase(), text, props: {}, children: [], parent: null,
    value: '', selected: false, multiple: false,
    /** 保存 Vue 表单指令注册的原生事件。 */
    addEventListener(event, listener) {
      ;(listeners[event] ||= []).push(listener)
    },
    /** 将用户输入传递给真实 v-model 监听器。 */
    dispatchEvent(event) {
      for (const listener of listeners[event.type] || []) listener({ ...event, target: this })
    },
    /** 暴露 select 内实际存在的选项，排除 Vue 片段锚点。 */
    get options() {
      return this.children.filter(child => child.type === 'option')
    },
    /** 读取当前单选项的位置。 */
    get selectedIndex() {
      return this.options.findIndex(option => option.selected)
    },
    /** 按浏览器单选规则切换选项供 v-model 同步使用。 */
    set selectedIndex(index) {
      this.options.forEach((option, optionIndex) => { option.selected = optionIndex === index })
    }
  }
}

/** 编译并挂载实际关系面板，不依赖 DOM 或额外测试库。 */
function mountPanel(queryRelation, initialPerson = null) {
  const renderer = createRenderer({
    createElement: createHostNode,
    createText: text => createHostNode('#text', text),
    createComment: text => createHostNode('#comment', text),
    setText: (node, text) => { node.text = text },
    setElementText: (node, text) => { node.text = text; node.children = [] },
    /** 保存模板属性，并为 option 暴露 v-model 读取的原始值。 */
    patchProp(node, key, previous, next) {
      node.props[key] = next
      if (key === 'value') node.value = next
    },
    parentNode: node => node.parent,
    nextSibling: node => node.parent?.children[node.parent.children.indexOf(node) + 1] || null,
    /** 按 Vue 锚点约定插入或移动实际渲染节点。 */
    insert(node, parent, anchor = null) {
      if (node.parent) node.parent.children.splice(node.parent.children.indexOf(node), 1)
      node.parent = parent
      const index = anchor ? parent.children.indexOf(anchor) : parent.children.length
      parent.children.splice(index, 0, node)
    },
    /** 移除过滤后不再显示的节点。 */
    remove(node) {
      if (node.parent) node.parent.children.splice(node.parent.children.indexOf(node), 1)
      node.parent = null
    }
  })
  const { descriptor } = parse(panelSource)
  const bindings = compileScript(descriptor, { id: 'relation-search-test' }).bindings
  const template = compileTemplate({
    source: descriptor.template.content, id: 'relation-search-test', filename: 'RelationPathPanel.vue',
    compilerOptions: { mode: 'function', bindingMetadata: bindings }
  })
  if (template.errors.length) throw new Error(template.errors.join('\n'))
  const render = new Function('Vue', template.code)(Vue)
  const root = createHostNode('root')
  const app = renderer.createApp({ ...RelationPathPanel, render }, { open: true, people, initialPerson, queryRelation })
  app.provide(ssrContextKey, { modules: new Set() })
  app.mount(root)
  return { root, unmount: () => app.unmount() }
}

/** 查找实际模板渲染出的首个目标节点。 */
function findNode(node, predicate) {
  if (predicate(node)) return node
  for (const child of node.children) {
    const match = findNode(child, predicate)
    if (match) return match
  }
  return null
}

/** 列出指定人物下拉框当前可见的非空选项 ID。 */
function optionIds(root, selectId) {
  return findNode(root, node => node.props.id === selectId).options.map(option => option.value).filter(Boolean)
}

/** 通过输入事件更新搜索框并等待 Vue 应用过滤。 */
async function search(root, label, keyword) {
  const input = findNode(root, node => node.type === 'input' && node.props['aria-label'] === label)
  expect(input, `应存在搜索框 ${label}`).not.toBeNull()
  input.value = keyword
  input.dispatchEvent({ type: 'input' })
  await nextTick()
}

/** 通过原生 change 事件选择人物，保留传给后端的原始 ID。 */
async function selectPerson(root, selectId, personId) {
  const select = findNode(root, node => node.props.id === selectId)
  select.selectedIndex = select.options.findIndex(option => option.value === personId)
  select.dispatchEvent({ type: 'change' })
  await nextTick()
}

describe('关系路径面板人物检索', () => {
  it('真实模板按首拼、中文、全拼过滤，A/B 搜索条件互不影响且不触发关系查询', async () => {
    const queryRelation = vi.fn().mockResolvedValue(null)
    const panel = mountPanel(queryRelation)
    try {
      expect(optionIds(panel.root, 'relation-from')).toEqual(people.map(person => person.id))
      expect(optionIds(panel.root, 'relation-to')).toEqual(people.map(person => person.id))

      await search(panel.root, '搜索人物 A', ' Z M Y ')
      expect(optionIds(panel.root, 'relation-from')).toEqual([people[0].id])
      expect(optionIds(panel.root, 'relation-to')).toEqual(people.map(person => person.id))

      await search(panel.root, '搜索人物 B', ' 李 华 ')
      expect(optionIds(panel.root, 'relation-to')).toEqual([people[1].id])
      expect(optionIds(panel.root, 'relation-from')).toEqual([people[0].id])

      await search(panel.root, '搜索人物 A', ' WANG HAI ')
      expect(optionIds(panel.root, 'relation-from')).toEqual([people[2].id])
      expect(optionIds(panel.root, 'relation-to')).toEqual([people[1].id])

      await search(panel.root, '搜索人物 A', '无人匹配')
      expect(optionIds(panel.root, 'relation-from')).toEqual([])
      await search(panel.root, '搜索人物 A', ' \t\u3000 ')
      expect(optionIds(panel.root, 'relation-from')).toEqual(people.map(person => person.id))
      expect(queryRelation).not.toHaveBeenCalled()
    } finally {
      panel.unmount()
    }
  })

  it('过滤后保留初始和手选人物，不改变选择，查询仍传递原始人物 ID', async () => {
    const queryRelation = vi.fn().mockResolvedValue(null)
    const panel = mountPanel(queryRelation, people[0])
    try {
      await search(panel.root, '搜索人物 B', ' L H ')
      await selectPerson(panel.root, 'relation-to', people[1].id)
      await search(panel.root, '搜索人物 A', ' WH ')
      await search(panel.root, '搜索人物 B', '无人匹配')

      expect(optionIds(panel.root, 'relation-from')).toEqual([people[0].id, people[2].id])
      expect(optionIds(panel.root, 'relation-to')).toEqual([people[1].id])
      const from = findNode(panel.root, node => node.props.id === 'relation-from')
      const to = findNode(panel.root, node => node.props.id === 'relation-to')
      expect(from.options[from.selectedIndex].value).toBe(people[0].id)
      expect(to.options[to.selectedIndex].value).toBe(people[1].id)
      expect(queryRelation).not.toHaveBeenCalled()

      const queryButton = findNode(panel.root, node => node.type === 'button' && node.props.class === 'query-btn')
      expect(queryButton.props.disabled).toBe(false)
      await queryButton.props.onClick()
      await nextTick()
      expect(queryRelation).toHaveBeenCalledExactlyOnceWith(people[0].id, people[1].id)
    } finally {
      panel.unmount()
    }
  })
})
