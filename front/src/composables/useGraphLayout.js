/**
 * 图谱布局
 * 使用 ELK layered layout 计算族谱节点坐标。
 */
const PERSON_SIZE = { width: 164, height: 74 }
const FAMILY_UNIT_SIZE = { width: 26, height: 26 }
let elkPromise = null

/**
 * 把后端 GraphViewDTO 转换为带坐标的 G6 数据。
 */
export async function layoutGraph(graph) {
  const elk = await getElk()
  const elkGraph = {
    id: 'family-graph',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': 'DOWN',
      'elk.layered.spacing.nodeNodeBetweenLayers': '96',
      'elk.spacing.nodeNode': '54',
      'elk.edgeRouting': 'ORTHOGONAL',
      'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP'
    },
    children: graph.nodes.map(toElkNode),
    edges: graph.edges.map(toElkEdge)
  }

  const layouted = await elk.layout(elkGraph)
  const positionMap = new Map((layouted.children || []).map(node => [node.id, node]))

  return {
    nodes: graph.nodes.map(node => toG6Node(node, positionMap.get(node.id))),
    edges: graph.edges.map(toG6Edge)
  }
}

/**
 * 懒加载 ELK，避免把布局引擎塞进首屏主包。
 */
async function getElk() {
  if (!elkPromise) {
    elkPromise = import('elkjs/lib/elk.bundled.js').then(module => {
      const ELK = module.default || module
      return new ELK()
    })
  }
  return elkPromise
}

/**
 * 把节点转换为 ELK 输入。
 */
function toElkNode(node) {
  const size = node.type === 'familyUnit' ? FAMILY_UNIT_SIZE : PERSON_SIZE
  return {
    id: node.id,
    width: size.width,
    height: size.height
  }
}

/**
 * 把连线转换为 ELK 输入。
 */
function toElkEdge(edge) {
  return {
    id: edge.id,
    sources: [edge.source],
    targets: [edge.target]
  }
}

/**
 * 把节点转换为 G6 渲染数据。
 */
function toG6Node(node, position = {}) {
  if (node.type === 'familyUnit') {
    return {
      id: node.id,
      x: position.x || 0,
      y: position.y || 0,
      type: 'circle',
      size: FAMILY_UNIT_SIZE.width,
      label: '',
      nodeType: 'familyUnit',
      raw: node,
      style: {
        fill: '#f7c948',
        stroke: '#5d4712',
        lineWidth: 2
      }
    }
  }

  return {
    id: node.id,
    x: position.x || 0,
    y: position.y || 0,
    type: 'rect',
    label: buildPersonLabel(node),
    nodeType: 'person',
    raw: node,
    size: [PERSON_SIZE.width, PERSON_SIZE.height],
    style: {
      radius: 16,
      fill: node.gender === 'F' ? '#fff1f5' : '#eef6ff',
      stroke: node.gender === 'F' ? '#c75b7a' : '#3b74b7',
      lineWidth: 2,
      shadowColor: 'rgba(20, 33, 61, 0.16)',
      shadowBlur: 12
    },
    labelCfg: {
      style: {
        fill: '#18202f',
        fontSize: 13,
        fontWeight: 700,
        lineHeight: 18
      }
    }
  }
}

/**
 * 生成节点主标签。
 */
function buildPersonLabel(person) {
  const years = [person.birth_date?.slice(0, 4), person.death_date?.slice(0, 4)]
    .filter(Boolean)
    .join('-')
  return years ? `${person.name}\n${years}` : person.name
}

/**
 * 把连线转换为 G6 渲染数据。
 */
function toG6Edge(edge) {
  return {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    label: edge.label || '',
    relation: edge.relation,
    raw: edge,
    type: edge.style === 'spouse' ? 'line' : 'polyline',
    style: {
      stroke: edge.style === 'highlight' ? '#d97706' : '#7b8794',
      lineWidth: edge.style === 'highlight' ? 4 : 2,
      lineDash: edge.style === 'dashed' ? [6, 5] : null,
      endArrow: edge.style === 'spouse' ? false : true
    },
    labelCfg: {
      autoRotate: true,
      style: {
        fill: '#5f6b7a',
        fontSize: 11,
        background: {
          fill: '#fffaf0',
          padding: [2, 4, 2, 4],
          radius: 4
        }
      }
    }
  }
}
