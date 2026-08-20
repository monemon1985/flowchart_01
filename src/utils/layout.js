import dagre from '@dagrejs/dagre'
import {
  NODE_DIMENSIONS,
  LANE_HEADER,
  LANE_PADDING,
  LANE_GAP,
  GROUP_FRAME_MARGIN,
  GROUP_LABEL_STRIP,
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

/**
 * レーンが中身より小さくリサイズされた場合に、各コンテンツノードの
 * 交差軸方向の位置を、確定したレーン矩形に収まるようクランプする（押し込む）。
 * クランプが不要なノードは同一参照のまま返す。
 */
function clampContentToLaneRects(contentNodes, laneRects, isLR) {
  return contentNodes.map((n) => {
    const rect = laneRects[n.data?.actorId]
    if (!rect) return n
    const { width, height } = dimsOf(n)
    if (isLR) {
      const min = LANE_HEADER
      const max = Math.max(min, rect.height - LANE_PADDING - height)
      const y = Math.min(Math.max(n.position.y, min), max)
      return y === n.position.y ? n : { ...n, position: { ...n.position, y } }
    }
    const min = LANE_PADDING
    const max = Math.max(min, rect.width - LANE_PADDING - width)
    const x = Math.min(Math.max(n.position.x, min), max)
    return x === n.position.x ? n : { ...n, position: { ...n.position, x } }
  })
}

/**
 * レーン矩形群から、各グループのメンバーレーンを包む枠ノードを合成する。
 * ラベル用の帯(GroupFrameNode側で描画)を置くスペースとして、
 * レーンヘッダーと同じ辺(LRなら左、TBなら上)だけ余白を広めに取る。
 */
function buildGroupFrameNodes(laneRects, groups, direction) {
  const isLR = direction === 'LR'
  return groups
    .map((group) => {
      const rects = group.actorIds.map((id) => laneRects[id]).filter(Boolean)
      if (rects.length === 0) return null
      const minX = Math.min(...rects.map((r) => r.x)) - (isLR ? GROUP_LABEL_STRIP : GROUP_FRAME_MARGIN)
      const minY = Math.min(...rects.map((r) => r.y)) - (isLR ? GROUP_FRAME_MARGIN : GROUP_LABEL_STRIP)
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
export function autoLayout({ nodes, edges, actors, direction, groups = [], flowLength = null, laneGap = LANE_GAP }) {
  const laneNodes = nodes.filter((n) => n.type === 'lane')
  // groupFrame は毎回このレイアウト計算から作り直す合成ノードなので、
  // 通常のコンテンツノードとして dagre 配置対象に混ぜてはいけない。
  // note(付箋)はレーンに紐づかない自由配置ノードなので、同様にdagre対象から外し
  // 位置を書き換えずそのまま素通しする（自動整列の影響を受けない）。
  const noteNodes = nodes.filter((n) => n.type === 'note')
  const contentNodes = nodes.filter((n) => n.type !== 'lane' && n.type !== 'groupFrame' && n.type !== 'note')
  const isLR = direction === 'LR'

  if (contentNodes.length === 0) {
    const laid = layoutEmptyLanes(laneNodes, actors, direction, groups, flowLength, laneGap)
    return { nodes: [...laid, ...noteNodes], edges }
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
  const minLaneFlowLength = maxFlowExtent + LANE_PADDING * 2
  const laneFlowLength = Math.max(flowLength ?? minLaneFlowLength, minLaneFlowLength)

  // 各レーンが「中身が必要とする最小の交差軸長さ」を計算する。これは
  // laneSize未設定時のデフォルト(uniformCrossLength、起動時の一律幅)にのみ使い、
  // ユーザーが手動でlaneSizeを設定した場合はこの値で下限クランプはしない
  // （中身が入りきらなくなったらノード側をレーン枠内にクランプして押し込む＝下のclampContentToLaneRects）。
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
    const laneCrossLength = actor.laneSize ?? uniformCrossLength

    laneRects[actor.id] = isLR
      ? { x: 0, y: crossCursor, width: laneFlowLength, height: laneCrossLength }
      : { x: crossCursor, y: 0, width: laneCrossLength, height: laneFlowLength }

    crossCursor += laneCrossLength + laneGap
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

  const clampedContentNodes = clampContentToLaneRects(newContentNodes, laneRects, isLR)
  const groupFrameNodes = buildGroupFrameNodes(laneRects, groups, direction)

  return {
    nodes: [...groupFrameNodes, ...newLaneNodes, ...clampedContentNodes, ...noteNodes],
    edges,
  }
}

/**
 * レーンのリサイズ(交差軸・フロー方向)専用の軽量な再配置。
 * autoLayout()と違い、dagreを再実行してコンテンツノードの位置を作り直すことはしない
 * （手動で動かしたノードの配置が、レーンをリサイズしただけで消えてしまうのを防ぐため）。
 * 中身の必要最小サイズは、既存のノード位置(レーン原点からの相対座標)から逆算する。
 */
export function resizeLanes({ nodes, actors, direction, groups = [], flowLength = null, laneGap = LANE_GAP }) {
  const laneNodes = nodes.filter((n) => n.type === 'lane')
  const noteNodes = nodes.filter((n) => n.type === 'note')
  const contentNodes = nodes.filter((n) => n.type !== 'lane' && n.type !== 'groupFrame' && n.type !== 'note')
  const isLR = direction === 'LR'

  if (contentNodes.length === 0) {
    return [...layoutEmptyLanes(laneNodes, actors, direction, groups, flowLength, laneGap), ...noteNodes]
  }

  let maxFlowFootprint = 0
  const crossExtentByActor = {}
  contentNodes.forEach((n) => {
    const { width, height } = dimsOf(n)
    const footprint = isLR ? n.position.x + width : n.position.y + height
    if (footprint > maxFlowFootprint) maxFlowFootprint = footprint

    const cross = isLR ? n.position.y - LANE_HEADER : n.position.x - LANE_PADDING
    const crossExtent = cross + (isLR ? height : width) / 2
    const actorId = n.data?.actorId
    if (!actorId) return
    if (!crossExtentByActor[actorId] || crossExtent > crossExtentByActor[actorId]) {
      crossExtentByActor[actorId] = crossExtent
    }
  })
  const minLaneFlowLength = maxFlowFootprint + LANE_PADDING
  const laneFlowLength = Math.max(flowLength ?? minLaneFlowLength, minLaneFlowLength)

  const minLaneCrossLengthByActor = {}
  actors.forEach((actor) => {
    const contentCrossSize = crossExtentByActor[actor.id] || 0
    const laneCrossSize = Math.max(contentCrossSize + LANE_PADDING * 2, LANE_HEADER + NODE_DIMENSIONS.action.height + LANE_PADDING)
    minLaneCrossLengthByActor[actor.id] = laneCrossSize + LANE_HEADER
  })
  const uniformCrossLength = Math.max(
    LANE_HEADER + NODE_DIMENSIONS.action.height + LANE_PADDING,
    ...actors.map((a) => minLaneCrossLengthByActor[a.id]),
  )

  let crossCursor = 0
  const laneRects = {}
  actors.forEach((actor) => {
    const laneCrossLength = actor.laneSize ?? uniformCrossLength
    laneRects[actor.id] = isLR
      ? { x: 0, y: crossCursor, width: laneFlowLength, height: laneCrossLength }
      : { x: crossCursor, y: 0, width: laneCrossLength, height: laneFlowLength }
    crossCursor += laneCrossLength + laneGap
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

  const clampedContentNodes = clampContentToLaneRects(contentNodes, laneRects, isLR)
  const groupFrameNodes = buildGroupFrameNodes(laneRects, groups, direction)

  return [...groupFrameNodes, ...newLaneNodes, ...clampedContentNodes, ...noteNodes]
}

function layoutEmptyLanes(laneNodes, actors, direction, groups = [], flowLength = null, laneGap = LANE_GAP) {
  const isLR = direction === 'LR'
  const minLaneCrossLength = LANE_HEADER + NODE_DIMENSIONS.action.height + LANE_PADDING
  const laneFlowLength = Math.max(flowLength ?? 640, 640)
  let crossCursor = 0
  const laneRects = {}
  const newLaneNodes = actors.map((actor) => {
    const existing = laneNodes.find((n) => n.data?.actorId === actor.id)
    const laneCrossLength = Math.max(actor.laneSize ?? minLaneCrossLength, minLaneCrossLength)
    const rect = isLR
      ? { x: 0, y: crossCursor, width: laneFlowLength, height: laneCrossLength }
      : { x: crossCursor, y: 0, width: laneCrossLength, height: laneFlowLength }
    laneRects[actor.id] = rect
    crossCursor += laneCrossLength + laneGap
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
  const groupFrameNodes = buildGroupFrameNodes(laneRects, groups, direction)
  return [...groupFrameNodes, ...newLaneNodes]
}
