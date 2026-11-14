/** 在独立线程计算家谱坐标，保持大图加载期间的界面可操作。 */
import { createGraphPresentation } from './graphPresentation.js'

/** 对已确认的 GraphViewDTO 返回布局结果或明确错误。 */
self.onmessage = event => {
  const { id, graph, options } = event.data
  try { self.postMessage({ id, layout: createGraphPresentation(graph, options) }) }
  catch (error) { self.postMessage({ id, error: error.message }) }
}
