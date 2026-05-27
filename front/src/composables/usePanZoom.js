/**
 * @file usePanZoom.js
 * @description 族谱画布的缩放和平移功能
 * 
 * 功能说明：
 * - 鼠标滚轮缩放（以鼠标位置为中心）
 * - 鼠标拖拽平移
 * - 缩放按钮控制（放大、缩小、重置）
 * - 缩放范围限制（0.1x - 5x）
 * 
 * 使用方式：
 * import { usePanZoom } from '@/composables/usePanZoom'
 * const { scale, panX, panY, zoomIn, zoomOut, startPan, onPan, endPan, onWheel } = usePanZoom()
 */

import { ref, computed } from 'vue'

export function usePanZoom() {
  // ========== 响应式状态 ==========
  
  /** 当前缩放比例 (1 = 100%) */
  const scale = ref(1)
  
  /** X轴平移量（像素） */
  const panX = ref(0)
  
  /** Y轴平移量（像素） */
  const panY = ref(0)
  
  /** 是否正在拖拽 */
  const isPanning = ref(false)
  
  /** 拖拽起始点X坐标 */
  const startX = ref(0)
  
  /** 拖拽起始点Y坐标 */
  const startY = ref(0)

  // ========== 计算属性 ==========
  
  /** SVG 容器的样式（拖拽时显示抓取光标） */
  const svgStyle = computed(() => ({
    cursor: isPanning.value ? 'grabbing' : 'grab'
  }))

  // ========== 缩放方法 ==========
  
  /** 放大（每次放大 20%，最大 5 倍） */
  const zoomIn = () => {
    scale.value = Math.min(scale.value * 1.2, 5)
  }

  /** 缩小（每次缩小 20%，最小 0.1 倍） */
  const zoomOut = () => {
    scale.value = Math.max(scale.value / 1.2, 0.1)
  }

  /** 重置视图（恢复到初始状态） */
  const resetView = () => {
    scale.value = 1
    panX.value = 0
    panY.value = 0
  }

  // ========== 拖拽方法 ==========
  
  /**
   * 开始拖拽
   * @param {MouseEvent} e - 鼠标事件
   */
  const startPan = (e) => {
    // 如果点击的是节点，不触发拖拽
    if (e.target.tagName === 'rect' || e.target.tagName === 'text') return
    
    isPanning.value = true
    startX.value = e.clientX - panX.value
    startY.value = e.clientY - panY.value
  }

  /**
   * 拖拽中
   * @param {MouseEvent} e - 鼠标事件
   */
  const onPan = (e) => {
    if (!isPanning.value) return
    panX.value = e.clientX - startX.value
    panY.value = e.clientY - startY.value
  }

  /** 结束拖拽 */
  const endPan = () => {
    isPanning.value = false
  }

  /**
   * 鼠标滚轮缩放
   * 以鼠标位置为中心进行缩放，保持鼠标指向的位置不变
   * @param {WheelEvent} e - 滚轮事件
   */
  const onWheel = (e) => {
    e.preventDefault()
    
    // 计算缩放方向和新的缩放比例
    const delta = e.deltaY > 0 ? 0.9 : 1.1  // 向下滚动缩小，向上滚动放大
    const newScale = Math.max(0.1, Math.min(5, scale.value * delta))
    
    // 获取鼠标相对于容器的位置
    const rect = e.currentTarget.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top
    
    // 计算缩放变化比例
    const scaleChange = newScale / scale.value
    
    // 调整平移量，使鼠标位置保持不变
    panX.value = mouseX - (mouseX - panX.value) * scaleChange
    panY.value = mouseY - (mouseY - panY.value) * scaleChange
    
    scale.value = newScale
  }

  // 返回所有需要暴露的状态和方法
  return {
    // 状态
    scale,
    panX,
    panY,
    isPanning,
    svgStyle,
    // 方法
    zoomIn,
    zoomOut,
    resetView,
    startPan,
    onPan,
    endPan,
    onWheel
  }
}
