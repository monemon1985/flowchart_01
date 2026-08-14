import dagre from '@dagrejs/dagre'
import {
  NODE_DIMENSIONS,
  LANE_HEADER,
  LANE_PADDING,
  LANE_GAP,
  GROUP_FRAME_MARGIN,
} from '../nodes/nodeDimensions'

const RANK_SEP = 90
const NODE_SEP = 50

function dimsOf(node) {
  return NODE_DIMENSIONS[node.type] ?? NODE_DIMENSIONS.action
}

function runDagre(contentNodes, edges, direction) {
  const g = new dagre.graphlib.Graph()
  g.setGraph({ rankdir: direction, ranksep: RANK_SEP, nodesep: NODE_SEP })
  g.setDefaultEdgeLabel(() => ({}))

  const ids = new Set(contentNodes.map((n) => n.id))
  contentNodes.forEach((n) => {
    const { width, height } = dimsOf(n)
    g.setNode(n.id, { width, height })
  })
  edges.forEach((e) => {
    if (ids.has(e.source) && ids.has(e.target)) {
      g.setEdge(e.source, e.target)
    }
  })

  dagre.layout(g)
  return g
}

/** レーン矩形群から、各グループのメンバーレーンを包む枠ノードを合成する */
function buildGroupFrameNodes(laneRects, groups) {
  return groups
    .map((group) => {
      const rects = group.actorIds.map((id) => laneRects[id]).filter(Boolean)
      if (rects.length === 0) return null
      const minX = Math.min(...rects.map((r) => r.x)) - GROUP_FRAME_MARGIN
      const minY = Math.min(...rects.map((r) => r.y)) - GROUP_FRAME_MARGIN
      const maxX = Math.max(...rects.map((r) => r.x + r.width)) + GROUP_FRAME_MARGIN
      const maxY = Math.max(...rects.map((r) => r.y + r.height)) + GROUP_FRAME_MARGIN
      return {
        id: `group-${group.id}`,
        type: 'groupFrame',
        position: { x: minX, y: minY },
        style: { width: maxX - minX, height: maxY - minY },
        data: { name: group.name },
        draggable: false,
        selectable: false,
        zIndex: -2,
      }
    })
    .filter(Boolean)
}

/**
 * スイムレーン対応の自動整列。
 * 1) 全ノード・全エッジで dagre を走らせ「流れ方向」の座標(rank)を得る
 * 2) レーンごとに、そのレーン内のノード＋エッジだけで dagre を走らせ「レーン内での並び(直交方向)」を得る
 * 3) レーン(帯)は actor の並び順で直交方向に積み、フロー方向の長さは全レーン共通にする
 * 4) グループが指定されていれば、そのメンバーレーンを包む枠ノード(groupFrame)を合成する
 */
export function autoLayout({ nodes, edges, actors, direction, groups = [] }) {
  const laneNodes = nodes.filter((n) => n.type === 'lane')
  // groupFrame は毎回このレイアウト計算から作り直す合成ノードなので、
  // 通常のコンテンツノードとして dagre 配置対象に混ぜてはいけない。
  const contentNodes = nodes.filter((n) => n.type !== 'lane' && n.type !== 'groupFrame')
  const isLR = direction === 'LR'

  if (contentNodes.length === 0) {
    return { nodes: layoutEmptyLanes(laneNodes, actors, direction, groups), edges }
  }

  const globalGraph = runDagre(contentNodes, edges, direction)

  const flowCoordById = {}
  contentNodes.forEach((n) => {
    const gn = globalGraph.node(n.id)
    flowCoordById[n.id] = isLR ? gn.x : gn.y
  })

  const crossCoordById = {}
  const crossSizeByActor = {}
  actors.forEach((actor) => {
    const laneContentNodes = contentNodes.filter((n) => n.data?.actorId === actor.id)
    if (laneContentNodes.length === 0) {
      crossSizeByActor[actor.id] = 0
      return
    }
    const laneIds = new Set(laneContentNodes.map((n) => n.id))
    const intraEdges = edges.filter((e) => laneIds.has(e.source) && laneIds.has(e.target))
    const laneGraph = runDagre(laneContentNodes, intraEdges, direction)

    let maxCross = 0
    laneContentNodes.forEach((n) => {
      const gn = laneGraph.node(n.id)
      const cross = isLR ? gn.y : gn.x
      crossCoordById[n.id] = cross
      const { width, height } = dimsOf(n)
      const crossExtent = cross + (isLR ? height : width) / 2
      if (crossExtent > maxCross) maxCross = crossExtent
    })
    crossSizeByActor[actor.id] = maxCross
  })

  // フロー方向の全体サイズ（全レーン共通の帯の長さにする）
  let maxFlowExtent = 0
  contentNodes.forEach((n) => {
    const { width, height } = dimsOf(n)
    const extent = flowCoordById[n.id] + (isLR ? width : height) / 2
    if (extent > maxFlowExtent) maxFlowExtent = extent
  })
  const laneFlowLength = maxFlowExtent + LANE_PADDING * 2

  // 各レーンが「中身が必要とする最小の交差軸長さ」を先に計算する（下限として使う）。
  // 起動時のデフォルトは全レーンで一律の幅にする（その中の最大値を採用）。
  // actor.laneSize が手動リサイズで設定されていればそちらを優先しつつ、
  // 中身が入りきらないほど小さくはできないよう下限でガードする。
  const minLaneCrossLengthByActor = {}
  actors.forEach((actor) => {
    const contentCrossSize = crossSizeByActor[actor.id] || NODE_DIMENSIONS.action.height
    const laneCrossSize = Math.max(contentCrossSize + LANE_PADDING * 2, LANE_HEADER + NODE_DIMENSIONS.action.height + LANE_PADDING)
    minLaneCrossLengthByActor[actor.id] = laneCrossSize + LANE_HEADER
  })
  const uniformCrossLength = Math.max(
    LANE_HEADER + NODE_DIMENSIONS.action.height + LANE_PADDING,
    ...actors.map((a) => minLaneCrossLengthByActor[a.id]),
  )

  // レーン(帯)を直交方向に積んでいく
  let crossCursor = 0
  const laneRects = {}
  actors.forEach((actor) => {
    const laneCrossLength = Math.max(actor.laneSize ?? uniformCrossLength, minLaneCrossLengthByActor[actor.id])

    laneRects[actor.id] = isLR
      ? { x: 0, y: crossCursor, width: laneFlowLength, height: laneCrossLength }
      : { x: crossCursor, y: 0, width: laneCrossLength, height: laneFlowLength }

    crossCursor += laneCrossLength + LANE_GAP
  })

  const newLaneNodes = actors.map((actor) => {
    const existing = laneNodes.find((n) => n.data?.actorId === actor.id)
    const rect = laneRects[actor.id]
    return {
      id: existing?.id ?? `lane-${actor.id}`,
      type: 'lane',
      position: { x: rect.x, y: rect.y },
      style: { width: rect.width, height: rect.height },
      data: { actorId: actor.id },
      draggable: false,
      selectable: false,
      zIndex: -1,
    }
  })

  const newContentNodes = contentNodes.map((n) => {
    const { width, height } = dimsOf(n)
    const cross = crossCoordById[n.id] ?? 0

    // 帯の原点からの相対座標（親ノード内座標）
    const relX = isLR ? flowCoordById[n.id] - width / 2 + LANE_PADDING : cross + LANE_PADDING
    const relY = isLR ? cross + LANE_HEADER : flowCoordById[n.id] - height / 2 + LANE_PADDING

    return {
      ...n,
      parentId: `lane-${n.data.actorId}`,
      extent: 'parent',
      position: { x: relX, y: relY },
    }
  })

  const groupFrameNodes = buildGroupFrameNodes(laneRects, groups)

  return {
    nodes: [...groupFrameNodes, ...newLaneNodes, ...newContentNodes],
    edges,
  }
}

function layoutEmptyLanes(laneNodes, actors, direction, groups = []) {
  const isLR = direction === 'LR'
  const minLaneCrossLength = LANE_HEADER + NODE_DIMENSIONS.action.height + LANE_PADDING
  let crossCursor = 0
  const laneRects = {}
  const newLaneNodes = actors.map((actor) => {
    const existing = laneNodes.find((n) => n.data?.actorId === actor.id)
    const laneCrossLength = Math.max(actor.laneSize ?? minLaneCrossLength, minLaneCrossLength)
    const rect = isLR
      ? { x: 0, y: crossCursor, width: 640, height: laneCrossLength }
      : { x: crossCursor, y: 0, width: laneCrossLength, height: 640 }
    laneRects[actor.id] = rect
    crossCursor += laneCrossLength + LANE_GAP
    return {
      id: existing?.id ?? `lane-${actor.id}`,
      type: 'lane',
      position: { x: rect.x, y: rect.y },
      style: { width: rect.width, height: rect.height },
      data: { actorId: actor.id },
      draggable: false,
      selectable: false,
      zIndex: -1,
    }
  })
  const groupFrameNodes = buildGroupFrameNodes(laneRects, groups)
  return [...groupFrameNodes, ...newLaneNodes]
}
