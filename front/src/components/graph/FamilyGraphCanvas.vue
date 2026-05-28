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
      default: ['drag-canvas', 'zoom-canvas', 'drag-node', 'activate-relations']
    },
    defaultNode: {
      anchorPoints: [[0.5, 0], [0.5, 1], [0, 0.5], [1, 0.5]]
    },
    defaultEdge: {
      type: 'polyline'
    },
    nodeStateStyles: {
      selected: {
        stroke: '#d97706',
        lineWidth: 4,
        shadowColor: 'rgba(217, 119, 6, 0.35)',
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
  instance.data(data)
  instance.render()
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
    radial-gradient(circle at 20% 18%, rgba(199, 121, 53, 0.16), transparent 26%),
    radial-gradient(circle at 86% 10%, rgba(76, 104, 78, 0.12), transparent 28%),
    linear-gradient(135deg, #fff9ec 0%, #f3ead7 52%, #e8d7bd 100%);
  box-shadow: inset 0 0 0 1px rgba(111, 78, 55, 0.12), 0 24px 70px rgba(87, 61, 34, 0.15);
}

.graph-canvas {
  width: 100%;
  height: 100%;
  min-height: 620px;
}

.canvas-state {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  color: #6d543e;
  font-size: 16px;
  background: rgba(255, 250, 240, 0.66);
  pointer-events: none;
  animation: statePulse 1.6s ease-in-out infinite alternate;
}

@keyframes statePulse {
  from { opacity: 0.72; }
  to { opacity: 1; }
}
</style>
