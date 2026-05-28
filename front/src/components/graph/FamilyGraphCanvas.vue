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
let behaviorRegistered = false

/**
 * 初始化 G6 实例。
 */
async function ensureGraph() {
  if (graphInstance || !containerRef.value) return graphInstance
  const G6 = await loadG6()
  registerElasticDragBehavior(G6)
  graphInstance = new G6.Graph({
    container: containerRef.value,
    width: containerRef.value.clientWidth,
    height: containerRef.value.clientHeight,
    fitView: true,
    fitViewPadding: 60,
    modes: {
      default: ['elastic-drag-canvas', 'zoom-canvas', 'activate-relations']
    },
    defaultNode: {
      anchorPoints: [[0.5, 0], [0.5, 1], [0, 0.5], [1, 0.5]]
    },
    defaultEdge: {
      type: 'polyline'
    },
    animate: true,
    animateCfg: {
      duration: 420,
      easing: 'easeCubic'
    },
    nodeStateStyles: {
      selected: {
        stroke: '#fffa00',
        lineWidth: 4,
        shadowColor: 'rgba(255, 250, 0, 0.38)',
        shadowBlur: 20
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
 * 注册带惯性反馈的整体画布拖拽行为。
 */
function registerElasticDragBehavior(G6) {
  if (behaviorRegistered) return
  behaviorRegistered = true

  G6.registerBehavior('elastic-drag-canvas', {
    getEvents() {
      return {
        mousedown: 'onDragStart',
        drag: 'onDrag',
        dragend: 'onDragEnd',
        mouseup: 'onDragEnd',
        touchstart: 'onDragStart',
        touchmove: 'onDrag',
        touchend: 'onDragEnd'
      }
    },

    /**
     * 记录拖拽起点和速度采样。
     */
    onDragStart(event) {
      if (event.originalEvent?.button && event.originalEvent.button !== 0) return
      this.dragging = true
      this.lastPoint = getEventPoint(event)
      this.velocity = { x: 0, y: 0 }
      this.lastTime = performance.now()
    },

    /**
     * 拖动画布整体位移，节点之间结构保持稳定。
     */
    onDrag(event) {
      if (!this.dragging || !this.lastPoint) return
      const now = performance.now()
      const point = getEventPoint(event)
      const dx = point.x - this.lastPoint.x
      const dy = point.y - this.lastPoint.y
      const dt = Math.max(now - this.lastTime, 16)

      this.graph.translate(dx, dy)
      this.velocity = {
        x: dx / dt,
        y: dy / dt
      }
      this.lastPoint = point
      this.lastTime = now
    },

    /**
     * 松手时补一小段惯性位移，形成图数据库式弹性手感。
     */
    onDragEnd() {
      if (!this.dragging) return
      this.dragging = false
      this.lastPoint = null

      const dx = Math.max(-80, Math.min(80, (this.velocity?.x || 0) * 260))
      const dy = Math.max(-80, Math.min(80, (this.velocity?.y || 0) * 260))
      if (Math.abs(dx) + Math.abs(dy) < 6) return

      this.animateElasticDrift(dx, dy)
    },

    /**
     * 使用阻尼曲线模拟整体拖拽后的弹性回馈。
     */
    animateElasticDrift(dx, dy) {
      const start = performance.now()
      const duration = 520
      let lastX = 0
      let lastY = 0

      const step = now => {
        const progress = Math.min((now - start) / duration, 1)
        const damping = Math.exp(-4.5 * progress)
        const spring = 1 - damping * Math.cos(progress * Math.PI * 3.2)
        const nextX = dx * spring
        const nextY = dy * spring

        this.graph.translate(nextX - lastX, nextY - lastY)
        lastX = nextX
        lastY = nextY

        if (progress < 1) requestAnimationFrame(step)
      }

      requestAnimationFrame(step)
    }
  })
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
