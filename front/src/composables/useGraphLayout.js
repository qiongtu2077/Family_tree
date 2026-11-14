/**
 * 将后端五图投影转换为人物唯一、家庭隐藏的 G6 渲染数据。
 */
import { createGraphPresentation } from '../graph/graphPresentation.js'

/** 按视图语义生成家谱布局，保留原有异步调用契约。 */
export async function layoutGraph(graph, options) {
  return createGraphPresentation(graph, options)
}
