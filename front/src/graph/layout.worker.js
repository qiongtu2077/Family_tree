/** 在独立线程计算家谱坐标，保持大图加载期间的界面可操作。 */
import { createFamilyLayout } from './familyLayout.js'

/** 对已确认的 GraphViewDTO 返回布局结果或明确错误。 */
self.onmessage = event => {
  const { id, graph } = event.data
  try { self.postMessage({ id, layout: createFamilyLayout(graph) }) }
  catch (error) { self.postMessage({ id, error: error.message }) }
}
