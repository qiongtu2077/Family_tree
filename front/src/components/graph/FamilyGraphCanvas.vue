<template>
  <section class="graph-canvas-shell" aria-label="家谱画布" tabindex="0" @keydown="handleKeydown">
    <div ref="containerRef" class="graph-canvas"></div>
    <div class="canvas-heading"><span class="canvas-label">FAMILY CONNECTIONS</span><span>{{ personCount }} 位家人 · {{ graph.view_mode === 'overview' ? '家族全景' : '世代关系' }}</span></div>
    <div class="canvas-tools" aria-label="图谱缩放工具">
      <button aria-label="缩小图谱" :disabled="!personCount" @click="zoomBy(1 / 1.2)">−</button>
      <button class="zoom-value" aria-label="恢复百分之百缩放" :disabled="!personCount" @click="setZoom(1)">{{ zoomPercent }}%</button>
      <button aria-label="放大图谱" :disabled="!personCount" @click="zoomBy(1.2)">+</button>
      <span class="tool-divider"></span><button :disabled="!personCount" @click="fitGraph">适应视图</button><button :disabled="!centerPersonId || !personCount" @click="focusCenter">回到中心</button>
    </div>
    <div v-if="isLoading || isLayingOut" class="canvas-state" role="status"><span class="loading-orbit"></span><strong>{{ isLoading ? '正在读取家族档案' : '正在整理家族脉络' }}</strong><span>让每一段关系，都有清晰的位置。</span></div>
    <div v-else-if="renderError" class="canvas-state" role="alert"><strong>暂时无法绘制家谱</strong><span>{{ renderError }}</span><button @click="renderGraph">重新绘制</button></div>
    <div v-else-if="!personCount" class="canvas-state empty-state"><span class="empty-tree" aria-hidden="true">谱</span><strong>从一位家人，开始探索</strong><span>选择中心人物，查看祖先、后代与家族之间的连接。</span></div>
    <div v-if="personCount && !isLoading" class="canvas-footnote"><span class="legend-line"></span>亲子关系<span class="legend-line spouse"></span>配偶 / 伴侣<span class="legend-line adoptive"></span>收养 / 继亲<span class="interaction-hint">拖动平移 · 滚轮缩放 · 点击人物查看详情</span></div>
    <button v-if="miniPeople.length > 8 && !isLoading" class="minimap-toggle" :aria-expanded="minimapOpen" @click="minimapOpen = !minimapOpen">{{ minimapOpen ? '收起导航' : '全图导航' }}</button>
    <div v-if="miniPeople.length > 8 && !isLoading && minimapOpen" class="minimap"><span>点击缩略图定位</span>
      <svg :viewBox="miniViewBox" preserveAspectRatio="none" role="img" aria-label="家谱缩略图，点击可定位" @pointerdown="navigateMiniMap">
        <line v-for="edge in miniEdges" :key="edge.id" :x1="edge.x1" :y1="edge.y1" :x2="edge.x2" :y2="edge.y2" />
        <rect v-for="person in miniPeople" :key="person.id" :x="person.x - 50" :y="person.y - 18" width="100" height="36" rx="7" />
        <rect class="mini-viewport" :x="viewportBox.x" :y="viewportBox.y" :width="viewportBox.width" :height="viewportBox.height" />
      </svg>
    </div>
    <div v-if="compactLabels && personCount" class="overview-hint">概览模式 · 放大可查看姓名</div>
  </section>
</template>

<script setup>
/** 单实例家谱画布，管理异步布局、可读缩放和导航。 */
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import { layoutGraph } from '../../composables/useGraphLayout'

const props = defineProps({
  graph: { type: Object, required: true },
  isLoading: { type: Boolean, default: false },
  centerPersonId: { type: String, default: null },
  selectedPersonId: { type: String, default: null }
})
const emit = defineEmits(['selectPerson', 'selectCapsule'])
const containerRef = ref(null)
const isLayingOut = ref(false)
const renderError = ref('')
const zoomPercent = ref(100)
const compactLabels = ref(false)
const minimapOpen = ref(false)
const lastLayoutData = shallowRef({ nodes: [], edges: [] })
const viewportBox = ref({ x: 0, y: 0, width: 1, height: 1 })
const personCount = computed(() => props.graph.nodes.filter(node => node.type === 'person').length)
const miniPeople = computed(() => lastLayoutData.value.nodes.filter(node => node.nodeType === 'person'))
const miniBounds = computed(() => {
  const nodes = miniPeople.value
  if (!nodes.length) return { x: 0, y: 0, width: 1, height: 1 }
  const x = Math.min(...nodes.map(node => node.x)) - 100
  const y = Math.min(...nodes.map(node => node.y)) - 70
  return { x, y, width: Math.max(...nodes.map(node => node.x)) - x + 100, height: Math.max(...nodes.map(node => node.y)) - y + 70 }
})
const miniViewBox = computed(() => {
  const { x, y, width, height } = miniBounds.value
  return `${x} ${y} ${width} ${height}`
})
const miniEdges = computed(() => {
  const positions = new Map(lastLayoutData.value.nodes.map(node => [node.id, node]))
  return lastLayoutData.value.edges.flatMap(edge => {
    const start = positions.get(edge.source)
    const end = positions.get(edge.target)
    return start && end ? [{ id: edge.id, x1: start.x, y1: start.y, x2: end.x, y2: end.y }] : []
  })
})
let graphInstance = null
let initialization = null
let resizeObserver = null
let disposed = false
let renderVersion = 0
let currentViewKey = ''
let hoveredNodeId = null
let labelMode = null
let layoutWorker = null
let cancelLayout = null

// --- 实例与绘制 --- //

/** 在动态导入开始前保存 Promise，使所有渲染共享同一次初始化。 */
async function ensureGraph() {
  if (graphInstance) return graphInstance
  if (initialization) return initialization
  initialization = import('@antv/g6').then(module => {
    if (disposed || !containerRef.value) return null
    const G6 = module.default
    graphInstance = new G6.Graph({
      container: containerRef.value,
      width: Math.max(containerRef.value.clientWidth, 1),
      height: Math.max(containerRef.value.clientHeight, 1),
      minZoom: 0.08,
      maxZoom: 2.5,
      animate: false,
      modes: { default: [{ type: 'drag-canvas', allowDragOnItem: false }, { type: 'zoom-canvas', sensitivity: 1.4 }] },
      defaultNode: { anchorPoints: [[0.5, 0], [0.5, 1], [0, 0.5], [1, 0.5]] },
      defaultEdge: { type: 'line' },
      // G6 会合并内置选中态，必须明确覆盖填充和阴影才能仅强调边框。
      nodeStateStyles: {
        hover: { fill: '#fffefa', stroke: '#2d6a54', lineWidth: 2, shadowBlur: 0, shadowColor: 'transparent' },
        selected: { fill: '#fffefa', stroke: '#2d6a54', lineWidth: 3, shadowBlur: 0, shadowColor: 'transparent', 'text-shape': { fontWeight: 600 } }
      }
    })
    bindGraphEvents()
    resizeObserver = new ResizeObserver(resizeGraph)
    resizeObserver.observe(containerRef.value)
    exposeGraphDebugState()
    return graphInstance
  }).catch(error => { initialization = null; throw error })
  return initialization
}

/** 将图事件转换为业务选择，并同步缩放与缩略图。 */
function bindGraphEvents() {
  graphInstance.on('node:click', event => {
    const model = event.item.getModel()
    if (model.nodeType === 'person') { emit('selectPerson', model.raw); selectNode(model.id) }
    else if (model.nodeType === 'branchCapsule') emit('selectCapsule', model.raw)
  })
  graphInstance.on('node:mouseenter', event => {
    if (event.item.getModel().nodeType !== 'person') return
    clearHover()
    hoveredNodeId = event.item.getID()
    graphInstance.setItemState(event.item, 'hover', true)
  })
  graphInstance.on('node:mouseleave', clearHover)
  graphInstance.on('viewportchange', updateViewport)
}

/** 仅提交最后一次异步布局，防止快速切换时被旧视图覆盖。 */
async function renderGraph() {
  const version = ++renderVersion
  cancelLayout?.()
  if (props.isLoading) return
  await nextTick()
  if (disposed || !containerRef.value || version !== renderVersion) return
  renderError.value = ''
  if (!personCount.value) {
    graphInstance?.clear()
    lastLayoutData.value = { nodes: [], edges: [] }
    isLayingOut.value = false
    currentViewKey = ''
    return
  }
  isLayingOut.value = true
  try {
    const data = await calculateLayout(version)
    const instance = await ensureGraph()
    if (!instance || disposed || version !== renderVersion) return
    const context = props.graph.view_context || {}
    const key = [props.graph.view_mode, props.centerPersonId, context.spouse_id, context.root_id, context.family_unit_id].join(':')
    const anchorId = props.selectedPersonId || props.centerPersonId
    const oldAnchor = lastLayoutData.value.nodes.find(node => node.id === anchorId)
    const anchorPoint = oldAnchor ? instance.getCanvasByPoint(oldAnchor.x, oldAnchor.y) : null
    const sameView = key === currentViewKey
    lastLayoutData.value = data
    labelMode = null
    instance.changeData(data)
    currentViewKey = key
    if (!sameView) {
      fitGraph()
      // 大图首先保证中心人物可读，全图仍可由“适应视图”随时查看。
      if (instance.getZoom() < 0.55 && props.graph.view_mode !== 'overview') focusCenter()
    } else if (anchorPoint) {
      const node = data.nodes.find(item => item.id === anchorId)
      if (node) {
        const nextPoint = instance.getCanvasByPoint(node.x, node.y)
        instance.translate(anchorPoint.x - nextPoint.x, anchorPoint.y - nextPoint.y)
      }
    }
    selectNode(props.selectedPersonId)
    updateViewport()
  } catch (error) {
    if (version === renderVersion) renderError.value = error.message
  } finally {
    if (version === renderVersion) isLayingOut.value = false
  }
}

/** 把大图计算移到 Worker；切图和卸载立即结束旧任务。 */
async function calculateLayout(id) {
  if (props.graph.nodes.length <= 80) return layoutGraph(props.graph)
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('../../graph/layout.worker.js', import.meta.url), { type: 'module' })
    layoutWorker = worker
    /** 结束本任务并释放 Worker 与取消句柄。 */
    function finish() {
      worker.terminate()
      if (layoutWorker === worker) { layoutWorker = null; cancelLayout = null }
    }
    cancelLayout = () => { finish(); reject(new Error('图谱浏览任务已切换')) }
    worker.onmessage = event => {
      finish()
      if (event.data.error) reject(new Error(event.data.error))
      else resolve(event.data.layout)
    }
    worker.onerror = event => { finish(); reject(new Error(event.message || '家谱布局计算失败')) }
    worker.postMessage({ id, graph: JSON.parse(JSON.stringify(props.graph)) })
  })
}

// --- 视口与可读缩放 --- //

/** 保持观察的世界坐标居中，仅改变画布像素尺寸。 */
function resizeGraph() {
  if (!graphInstance || !containerRef.value || disposed) return
  const width = containerRef.value.clientWidth
  const height = containerRef.value.clientHeight
  if (!width || !height) return
  const oldWidth = graphInstance.get('width')
  const oldHeight = graphInstance.get('height')
  if (width === oldWidth && height === oldHeight) return
  const center = graphInstance.getPointByCanvas(oldWidth / 2, oldHeight / 2)
  graphInstance.changeSize(width, height)
  const point = graphInstance.getCanvasByPoint(center.x, center.y)
  graphInstance.translate(width / 2 - point.x, height / 2 - point.y)
  updateViewport()
}

/** 按当前容器缩放至全图，只有明确导航时才调用。 */
function fitGraph() {
  if (!graphInstance || !lastLayoutData.value.nodes.length) return
  graphInstance.fitView(containerRef.value.clientWidth < 600 ? [70, 28, 90, 28] : [80, 56, 90, 56])
  if (graphInstance.getZoom() > 1.15) setZoom(1.15)
  updateViewport()
}

/** 以画布中心为锚点设置有限的缩放比例。 */
function setZoom(ratio) {
  if (!graphInstance) return
  graphInstance.zoomTo(Math.max(0.08, Math.min(2.5, ratio)), { x: graphInstance.get('width') / 2, y: graphInstance.get('height') / 2 })
  updateViewport()
}

/** 在当前缩放基础上放大或缩小。 */
function zoomBy(factor) { if (graphInstance) setZoom(graphInstance.getZoom() * factor) }

/** 回到中心人物；若当前切片没有中心人物则适应当前图。 */
function focusCenter() {
  if (!graphInstance) return
  const item = graphInstance.findById(props.centerPersonId)
  if (!item) { fitGraph(); return }
  setZoom(0.95)
  graphInstance.focusItem(item, false)
  updateViewport()
}

/** 更新导航框；低倍率收起姓名，避免密集而不可读的微小文字。 */
function updateViewport() {
  if (!graphInstance || disposed) return
  const zoom = graphInstance.getZoom()
  zoomPercent.value = Math.round(zoom * 100)
  const compact = zoom < 0.45
  compactLabels.value = compact
  if (labelMode !== compact) {
    labelMode = compact
    lastLayoutData.value.nodes.forEach(node => {
      if (node.nodeType === 'person') graphInstance.updateItem(node.id, { label: compact ? '' : node.raw.name })
    })
  }
  const start = graphInstance.getPointByCanvas(0, 0)
  const end = graphInstance.getPointByCanvas(graphInstance.get('width'), graphInstance.get('height'))
  viewportBox.value = { x: start.x, y: start.y, width: end.x - start.x, height: end.y - start.y }
}

/** 将缩略图点击位置映射为主图的观察中心。 */
function navigateMiniMap(event) {
  if (!graphInstance) return
  const rect = event.currentTarget.getBoundingClientRect()
  const bounds = miniBounds.value
  const point = graphInstance.getCanvasByPoint(bounds.x + (event.clientX - rect.left) / rect.width * bounds.width, bounds.y + (event.clientY - rect.top) / rect.height * bounds.height)
  graphInstance.translate(graphInstance.get('width') / 2 - point.x, graphInstance.get('height') / 2 - point.y)
  updateViewport()
}

/** 为画布提供键盘缩放、适应和方向平移。 */
function handleKeydown(event) {
  if (event.target !== event.currentTarget || !graphInstance) return
  const translations = { ArrowLeft: [60, 0], ArrowRight: [-60, 0], ArrowUp: [0, 60], ArrowDown: [0, -60] }
  if (translations[event.key]) graphInstance.translate(...translations[event.key])
  else if (event.key === '+' || event.key === '=') zoomBy(1.2)
  else if (event.key === '-') zoomBy(1 / 1.2)
  else if (event.key === '0') fitGraph()
  else return
  event.preventDefault()
  updateViewport()
}

// --- 选择与生命周期 --- //

/** 仅改变人物边框，不移动用户正在阅读的视野。 */
function selectNode(nodeId) {
  if (!graphInstance) return
  graphInstance.findAllByState('node', 'selected').forEach(item => graphInstance.setItemState(item, 'selected', false))
  if (nodeId) {
    const item = graphInstance.findById(nodeId)
    if (item) graphInstance.setItemState(item, 'selected', true)
  }
}

/** 清除上一个人物的悬停边框。 */
function clearHover() {
  if (!graphInstance || !hoveredNodeId) return
  const item = graphInstance.findById(hoveredNodeId)
  if (item) graphInstance.setItemState(item, 'hover', false)
  hoveredNodeId = null
}

/** 暴露只读开发诊断，供视觉巡检核对实际图谱和点击坐标。 */
function exposeGraphDebugState() {
  if (!import.meta.env.DEV) return
  window.__familyTreeGraphDebug = {
    getLayout: () => lastLayoutData.value,
    getCapsules: () => lastLayoutData.value.nodes.filter(node => node.nodeType === 'branchCapsule'),
    getState: () => ({ isAnimating: isLayingOut.value, viewMode: props.graph.view_mode || '', rawNodeCount: props.graph.nodes.length, rawEdgeCount: props.graph.edges.length, layoutNodeCount: lastLayoutData.value.nodes.length, layoutEdgeCount: lastLayoutData.value.edges.length, capsuleCount: lastLayoutData.value.nodes.filter(node => node.nodeType === 'branchCapsule').length, zoom: zoomPercent.value, canvasCount: containerRef.value?.querySelectorAll('canvas').length || 0 }),
    getViewportPoint: nodeId => {
      const node = lastLayoutData.value.nodes.find(item => item.id === nodeId)
      if (!graphInstance || !node) return null
      const point = graphInstance.getCanvasByPoint(node.x, node.y)
      const rect = containerRef.value.getBoundingClientRect()
      return { x: rect.left + point.x, y: rect.top + point.y }
    }
  }
}

watch(() => [props.graph, props.isLoading], renderGraph, { flush: 'post' })
watch(() => props.selectedPersonId, selectNode)
onMounted(renderGraph)
onBeforeUnmount(() => {
  disposed = true
  renderVersion += 1
  cancelLayout?.()
  resizeObserver?.disconnect()
  graphInstance?.destroy()
  graphInstance = null
  if (import.meta.env.DEV) delete window.__familyTreeGraphDebug
})
defineExpose({ fitGraph, focusCenter })
</script>

<style scoped>
.graph-canvas-shell { position: relative; min-width: 0; min-height: 0; overflow: hidden; background: #fbfcf9; border: 1px solid var(--line, #dfe5de); border-radius: 18px; isolation: isolate; }
.graph-canvas-shell:focus-visible { outline: 2px solid var(--green, #2d6a54); outline-offset: -3px; }
.graph-canvas { position: absolute; inset: 0; background-image: radial-gradient(#d9e2d8 .8px, transparent .8px); background-size: 22px 22px; }
.graph-canvas :deep(canvas) { display: block; }
.canvas-heading { position: absolute; left: 24px; top: 22px; display: grid; gap: 5px; color: var(--muted, #6e7b73); font-size: 12px; pointer-events: none; }
.canvas-label { letter-spacing: 2px; font-size: 10px; font-weight: 600; color: #8c9c90; }
.canvas-tools { position: absolute; z-index: 2; bottom: 48px; left: 50%; transform: translateX(-50%); display: flex; align-items: center; padding: 5px; background: #fff; border: 1px solid #dfe5de; border-radius: 12px; box-shadow: 0 5px 20px #203b3210; white-space: nowrap; }
.canvas-tools button { min-height: 34px; padding: 5px 10px; border: 0; border-radius: 7px; color: #365345; background: transparent; cursor: pointer; font-size: 12px; }
.canvas-tools button:first-child, .canvas-tools button:nth-child(3) { font-size: 20px; min-width: 34px; }
.canvas-tools button:hover { background: #edf3ee; }
.canvas-tools button:disabled { opacity: .4; cursor: default; }
.zoom-value { width: 57px; font-variant-numeric: tabular-nums; }
.tool-divider { height: 20px; width: 1px; background: #dfe5de; margin: 0 4px; }
.canvas-state { position: absolute; inset: 0; z-index: 3; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; padding: 28px; text-align: center; color: #6e7b73; background: #fbfcf9ef; font-size: 13px; }
.canvas-state strong { color: #203b32; font-size: 18px; font-weight: 500; }
.canvas-state button { padding: 9px 18px; background: #2d6a54; border: 0; border-radius: 8px; color: #fff; cursor: pointer; }
.loading-orbit { width: 32px; height: 32px; border: 2px solid #dfe5de; border-top-color: #2d6a54; border-radius: 50%; animation: spin 1s linear infinite; }
.empty-tree { font-family: 'Noto Serif SC', 'SimSun', serif; font-size: 48px; color: #b88753; margin-bottom: 8px; }
.canvas-footnote { position: absolute; bottom: 15px; left: 22px; right: 22px; display: flex; align-items: center; justify-content: center; gap: 7px; color: #6e7b73; font-size: 10px; pointer-events: none; }
.legend-line { display: inline-block; width: 14px; border-top: 1.5px solid #8b9e94; margin-left: 8px; }
.legend-line.spouse { border-color: #b88753; }
.legend-line.adoptive { border-top-style: dashed; }
.interaction-hint { margin-left: auto; }
.minimap-toggle { position: absolute; right: 18px; top: 18px; border: 1px solid #dfe5de; background: #fff; color: var(--green); font-size: 11px; padding: 7px 10px; border-radius: 7px; cursor: pointer; }
.minimap { position: absolute; right: 18px; top: 57px; width: 142px; padding: 7px; background: #fffffff2; border: 1px solid #dfe5de; border-radius: 10px; color: #809084; font-size: 10px; }
.minimap > span { display: block; margin-bottom: 5px; }
.minimap svg { display: block; width: 100%; height: 78px; cursor: crosshair; overflow: hidden; }
.minimap line { stroke: #a2b1a7; stroke-width: 2; }
.minimap rect { fill: #cbd9cc; }
.minimap .mini-viewport { fill: #2d6a5410; stroke: #2d6a54; stroke-width: 5; }
.overview-hint { position: absolute; top: 75px; left: 24px; color: #6e7b73; font-size: 11px; pointer-events: none; }
@keyframes spin { to { transform: rotate(360deg); } }
@media (max-width: 700px) { .canvas-heading { left: 16px; top: 16px; } .minimap-toggle { top: 14px; right: 12px; font-size: 10px; } .minimap { right: 12px; top: 50px; } .canvas-tools { bottom: 47px; } .canvas-tools button { padding-inline: 7px; font-size: 11px; } .canvas-footnote { gap: 4px; left: 4px; right: 4px; font-size: 9px; } .interaction-hint { display: none; } .legend-line { margin-left: 3px; } }
@media (prefers-reduced-motion: reduce) { .loading-orbit { animation: none; } }
</style>
