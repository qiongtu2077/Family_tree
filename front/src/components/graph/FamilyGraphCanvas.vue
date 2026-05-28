<template>
  <section class="graph-canvas-shell">
    <div ref="containerRef" class="graph-canvas"></div>
    <div v-if="isLoading" class="canvas-state">正在铺开家族脉络...</div>
    <div v-else-if="!graph.nodes.length" class="canvas-state">暂无图谱数据</div>
  </section>
</template>

<script setup>
/**
 * G6 族谱画布。
 */
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { layoutGraph } from '../../composables/useGraphLayout'

const props = defineProps({
  graph: { type: Object, required: true },
  isLoading: { type: Boolean, default: false },
  centerPersonId: { type: String, default: null }
})

const emit = defineEmits(['selectPerson'])

const containerRef = ref(null)
let graphInstance = null
let g6Promise = null
let hoveredNodeId = null
let dragSample = null

/**
 * 初始化 G6 实例。
 */
async function ensureGraph() {
  if (graphInstance || !containerRef.value) return graphInstance
  const G6 = await loadG6()
  graphInstance = new G6.Graph({
    container: containerRef.value,
    width: containerRef.value.clientWidth,
    height: containerRef.value.clientHeight,
    fitView: true,
    fitViewPadding: 60,
    modes: {
      default: [
        { type: 'drag-canvas', allowDragOnItem: true, scalableRange: 1 },
        'zoom-canvas'
      ]
    },
    defaultNode: {
      anchorPoints: [[0.5, 0], [0.5, 1], [0, 0.5], [1, 0.5]]
    },
    defaultEdge: {
      type: 'line'
    },
    animate: true,
    animateCfg: {
      duration: 420,
      easing: 'easeCubic'
    },
    nodeStateStyles: {
      hover: {
        fill: 'rgba(24, 24, 20, 0.94)',
        stroke: 'rgba(255, 250, 186, 0.9)',
        lineWidth: 2.2,
        shadowColor: 'rgba(255, 250, 0, 0.14)',
        shadowBlur: 10
      },
      selected: {
        fill: 'rgba(24, 24, 20, 0.94)',
        stroke: '#fffa00',
        lineWidth: 2.8,
        shadowColor: 'rgba(255, 250, 0, 0.2)',
        shadowBlur: 12
      }
    }
  })

  graphInstance.on('node:click', event => {
    const model = event.item.getModel()
    if (model.nodeType === 'person') {
      emit('selectPerson', model.raw)
      setSelectedNode(model.id)
    }
  })

  graphInstance.on('canvas:click', () => {
    clearSelectedNodes()
  })

  graphInstance.on('node:mouseenter', event => {
    setHoveredNode(event.item)
  })

  graphInstance.on('node:mouseleave', () => {
    clearHoveredNode()
  })

  graphInstance.on('canvas:drag', event => {
    sampleCanvasDrag(event)
  })

  graphInstance.on('canvas:dragend', () => {
    animateCanvasDrift()
  })

  window.addEventListener('resize', resizeGraph)
  return graphInstance
}

/**
 * 渲染图谱数据。
 */
async function renderGraph() {
  await nextTick()
  const instance = await ensureGraph()
  if (!instance || props.isLoading) return

  const data = await layoutGraph(props.graph)
  instance.changeData(data)
  instance.fitView(60)

  if (props.centerPersonId) {
    setSelectedNode(props.centerPersonId)
  }
}

/**
 * 懒加载 G6，降低首屏 JavaScript 体积。
 */
async function loadG6() {
  if (!g6Promise) {
    g6Promise = import('@antv/g6').then(module => module.default || module)
  }
  return g6Promise
}

/**
 * 采样画布拖拽速度，用于松手后的轻微惯性。
 */
function sampleCanvasDrag(event) {
  const point = getEventPoint(event)
  const now = performance.now()
  if (!dragSample?.point) {
    dragSample = { point, time: now, velocity: { x: 0, y: 0 } }
    return
  }

  const dt = Math.max(now - dragSample.time, 16)
  dragSample = {
    point,
    time: now,
    velocity: {
      x: (point.x - dragSample.point.x) / dt,
      y: (point.y - dragSample.point.y) / dt
    }
  }
}

/**
 * 拖拽结束后补一小段阻尼位移，保留整体弹性手感。
 */
function animateCanvasDrift() {
  if (!graphInstance || !dragSample?.velocity) return

  const dx = clamp(dragSample.velocity.x * 220, -64, 64)
  const dy = clamp(dragSample.velocity.y * 220, -64, 64)
  dragSample = null
  if (Math.abs(dx) + Math.abs(dy) < 5) return

  const start = performance.now()
  const duration = 420
  let lastX = 0
  let lastY = 0

  const step = now => {
    if (!graphInstance) return
    const progress = Math.min((now - start) / duration, 1)
    const damping = Math.exp(-4.2 * progress)
    const spring = 1 - damping * Math.cos(progress * Math.PI * 2.8)
    const nextX = dx * spring
    const nextY = dy * spring

    graphInstance.translate(nextX - lastX, nextY - lastY)
    lastX = nextX
    lastY = nextY

    if (progress < 1) requestAnimationFrame(step)
  }

  requestAnimationFrame(step)
}

/**
 * 读取鼠标或触摸事件坐标。
 */
function getEventPoint(event) {
  const touch = event.originalEvent?.touches?.[0] || event.originalEvent?.changedTouches?.[0]
  return {
    x: touch?.clientX ?? event.clientX ?? event.canvasX ?? 0,
    y: touch?.clientY ?? event.clientY ?? event.canvasY ?? 0
  }
}

/**
 * 将数值限制在指定范围内。
 */
function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

/**
 * 设置当前悬停人物的轻量状态。
 */
function setHoveredNode(item) {
  if (!graphInstance || !item) return
  const model = item.getModel()
  if (model.nodeType !== 'person') return

  clearHoveredNode()
  hoveredNodeId = model.id
  graphInstance.setItemState(item, 'hover', true)
}

/**
 * 清除当前悬停状态。
 */
function clearHoveredNode() {
  if (!graphInstance || !hoveredNodeId) return
  const item = graphInstance.findById(hoveredNodeId)
  if (item) graphInstance.setItemState(item, 'hover', false)
  hoveredNodeId = null
}

/**
 * 设置选中节点状态。
 */
function setSelectedNode(nodeId) {
  if (!graphInstance) return
  clearSelectedNodes()
  const item = graphInstance.findById(nodeId)
  if (item) {
    graphInstance.setItemState(item, 'selected', true)
    graphInstance.focusItem(item, true, { easing: 'easeCubic', duration: 450 })
  }
}

/**
 * 清除所有选中状态。
 */
function clearSelectedNodes() {
  if (!graphInstance) return
  graphInstance.findAllByState('node', 'selected').forEach(item => {
    graphInstance.setItemState(item, 'selected', false)
  })
}

/**
 * 画布尺寸变化时同步 G6。
 */
function resizeGraph() {
  if (!graphInstance || !containerRef.value) return
  graphInstance.changeSize(containerRef.value.clientWidth, containerRef.value.clientHeight)
  graphInstance.fitView(60)
}

watch(
  () => [props.graph, props.isLoading],
  () => {
    renderGraph()
  },
  { deep: true, immediate: true }
)

onBeforeUnmount(() => {
  window.removeEventListener('resize', resizeGraph)
  if (graphInstance) {
    graphInstance.destroy()
    graphInstance = null
  }
})
</script>

<style scoped>
.graph-canvas-shell {
  position: relative;
  min-height: 0;
  border-radius: 28px;
  overflow: hidden;
  background:
    linear-gradient(90deg, rgba(255, 255, 255, 0.04) 1px, transparent 1px),
    linear-gradient(180deg, rgba(255, 255, 255, 0.025) 1px, transparent 1px),
    #181a1b;
  background-size: 72px 72px;
  border: 1px solid rgba(255, 250, 0, 0.16);
  box-shadow: inset 0 0 0 1px rgba(255, 250, 0, 0.04), 0 24px 70px rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(6px);
}

.graph-canvas {
  width: 100%;
  height: 100%;
  min-height: 0;
}

.canvas-state {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  color: #fffa00;
  font-size: 16px;
  background: rgba(16, 16, 16, 0.62);
  pointer-events: none;
  animation: statePulse 1.6s ease-in-out infinite alternate;
}

@keyframes statePulse {
  from { opacity: 0.72; }
  to { opacity: 1; }
}
</style>
