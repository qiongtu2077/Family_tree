/**
 * 动态波纹背景
 * 复刻旧版登录页和主界面的黑金曲线动效。
 */
import { onBeforeUnmount, onMounted } from 'vue'

const WAVES = [
  { y: 0.1, amplitude: 35, frequency: 0.008, speed: 0.00015, color: '#fffa00', opacity: 0.85, width: 3.2 },
  { y: 0.24, amplitude: 28, frequency: 0.012, speed: 0.00032, color: '#fff700', opacity: 0.6, width: 2.2 },
  { y: 0.4, amplitude: 42, frequency: 0.006, speed: 0.00023, color: '#666666', opacity: 0.35, width: 1.8 },
  { y: 0.56, amplitude: 32, frequency: 0.01, speed: 0.00018, color: '#fffa00', opacity: 0.55, width: 2.8 },
  { y: 0.72, amplitude: 38, frequency: 0.007, speed: 0.00043, color: '#888888', opacity: 0.3, width: 1.5 },
  { y: 0.86, amplitude: 25, frequency: 0.014, speed: 0.00024, color: '#fff700', opacity: 0.65, width: 2.5 }
]

/**
 * 挂载全局 canvas 波纹背景。
 */
export function useWaveBackground() {
  let container = null
  let canvas = null
  let context = null
  let animationFrame = 0
  let width = 0
  let height = 0
  let mouseX = -1000
  let mouseY = -1000
  let time = getStoredWaveTime()
  let lastSaveTime = Date.now()

  /**
   * 初始化 DOM 和事件监听。
   */
  function mountBackground() {
    container = document.createElement('div')
    container.className = 'curved-lines-bg'

    canvas = document.createElement('canvas')
    canvas.className = 'curved-lines-canvas'
    container.appendChild(canvas)
    document.body.prepend(container)

    context = canvas.getContext('2d')
    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)
    document.addEventListener('mousemove', updateMousePosition)
    animationFrame = requestAnimationFrame(animate)
  }

  /**
   * 清理背景和事件监听。
   */
  function unmountBackground() {
    saveWaveTime()
    cancelAnimationFrame(animationFrame)
    window.removeEventListener('resize', resizeCanvas)
    document.removeEventListener('mousemove', updateMousePosition)
    container?.remove()
  }

  /**
   * 同步 canvas 物理像素尺寸。
   */
  function resizeCanvas() {
    if (!canvas || !context) return
    const dpr = window.devicePixelRatio || 1
    width = window.innerWidth
    height = window.innerHeight
    canvas.width = width * dpr
    canvas.height = height * dpr
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`
    context.setTransform(dpr, 0, 0, dpr, 0, 0)
  }

  /**
   * 记录鼠标位置，用于生成轻微交互扰动。
   */
  function updateMousePosition(event) {
    mouseX = event.clientX
    mouseY = event.clientY
  }

  /**
   * 绘制单条动态曲线。
   */
  function drawWave(wave, index) {
    if (!context) return
    const baseY = height * wave.y + Math.sin(time * 0.0005 + index * 1.7) * 12
    const phase = time * wave.speed + index * 2.1
    const lineWidth = wave.width * (1 + 0.18 * Math.sin(time * 0.001 + index * 0.8))
    const glow = 1 + 0.15 * Math.sin(time * 0.0008 + index * 1.2)

    context.beginPath()
    context.strokeStyle = wave.color
    context.lineWidth = lineWidth
    context.lineCap = 'round'
    context.lineJoin = 'round'
    context.globalAlpha = wave.opacity * glow

    for (let i = 0; i <= 150; i += 1) {
      const x = (i / 150) * (width + 200) - 100
      let y = baseY
      y += Math.sin(x * wave.frequency + phase) * wave.amplitude
      y += Math.sin(x * wave.frequency * 2.3 + phase * 1.5) * (wave.amplitude * 0.35)
      y += Math.sin(x * wave.frequency * 4.1 + phase * 2.2) * (wave.amplitude * 0.15)

      const dist = Math.hypot(x - mouseX, baseY - mouseY)
      if (dist < 200) {
        y += Math.sin(x * 0.02 + phase * 0.5) * (1 - dist / 200) * 25
      }

      if (i === 0) context.moveTo(x, y)
      else context.lineTo(x, y)
    }

    context.stroke()
    context.shadowColor = wave.color
    context.shadowBlur = (8 + Math.sin(time * 0.001 + index) * 4) * glow
    context.stroke()
    context.shadowBlur = 0
    context.globalAlpha = 1
  }

  /**
   * 推进动画帧并定期保存相位。
   */
  function animate() {
    if (!context) return
    context.clearRect(0, 0, width, height)
    WAVES.forEach(drawWave)
    time += 1
    if (Date.now() - lastSaveTime > 500) {
      saveWaveTime()
      lastSaveTime = Date.now()
    }
    animationFrame = requestAnimationFrame(animate)
  }

  /**
   * 从 sessionStorage 恢复波纹相位。
   */
  function getStoredWaveTime() {
    const value = Number.parseFloat(sessionStorage.getItem('waveTime') || '0')
    return Number.isFinite(value) ? value : 0
  }

  /**
   * 保存波纹相位，让页面刷新后动画保持连续。
   */
  function saveWaveTime() {
    sessionStorage.setItem('waveTime', String(time))
  }

  onMounted(mountBackground)
  onBeforeUnmount(unmountBackground)
}
