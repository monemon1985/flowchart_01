import { Position } from '@xyflow/react'

/**
 * ノードの矩形境界と、相手ノードの中心方向から、境界上の交点を求める。
 * React Flow公式のfloating-edgesサンプルと同じ楕円近似アルゴリズム。
 */
function getNodeIntersection(intersectionNode, targetNode) {
  const { width, height } = intersectionNode.measured
  const intersectionNodePosition = intersectionNode.internals.positionAbsolute
  const targetPosition = targetNode.internals.positionAbsolute

  const w = width / 2
  const h = height / 2
  const x2 = intersectionNodePosition.x + w
  const y2 = intersectionNodePosition.y + h
  const x1 = targetPosition.x + targetNode.measured.width / 2
  const y1 = targetPosition.y + targetNode.measured.height / 2

  const xx1 = (x1 - x2) / (2 * w) - (y1 - y2) / (2 * h)
  const yy1 = (x1 - x2) / (2 * w) + (y1 - y2) / (2 * h)
  const a = 1 / (Math.abs(xx1) + Math.abs(yy1) || 1)
  const xx3 = a * xx1
  const yy3 = a * yy1

  return { x: w * (xx3 + yy3) + x2, y: h * (-xx3 + yy3) + y2 }
}

/** 交点がノードのどの辺(上下左右)にあるかを判定する */
function getEdgePosition(node, intersectionPoint) {
  const { x: nx, y: ny } = node.internals.positionAbsolute
  const { width, height } = node.measured
  const px = Math.round(intersectionPoint.x)
  const py = Math.round(intersectionPoint.y)

  if (px <= Math.round(nx) + 1) return Position.Left
  if (px >= Math.round(nx + width) - 1) return Position.Right
  if (py <= Math.round(ny) + 1) return Position.Top
  if (py >= Math.round(ny + height) - 1) return Position.Bottom
  return Position.Top
}

const HANDLE_POSITION_VALUES = [Position.Top, Position.Right, Position.Bottom, Position.Left]

/** ノードの指定辺(上下左右)の中央の固定点を返す（フローティングではなく、接続時に選んだハンドルに固定する用） */
function getFixedHandlePoint(node, position) {
  const { x, y } = node.internals.positionAbsolute
  const { width, height } = node.measured
  switch (position) {
    case Position.Top:
      return { x: x + width / 2, y }
    case Position.Bottom:
      return { x: x + width / 2, y: y + height }
    case Position.Left:
      return { x, y: y + height / 2 }
    case Position.Right:
    default:
      return { x: x + width, y: y + height / 2 }
  }
}

/**
 * 2つのノードの現在位置から、両者を結ぶのに最適な接続点(境界上の交点)と
 * その点がどちら側の辺にあるかを都度計算する。
 * sourceHandleId/targetHandleIdが指定されている（＝接続時に特定のハンドルから
 * ドラッグした）場合は、その辺の中央に固定する。未指定の場合のみ、
 * ノード同士の位置関係から毎回自動計算するフローティング接続になる。
 */
export function getEdgeParams(sourceNode, targetNode, sourceHandleId, targetHandleId) {
  let sx, sy, sourcePos
  if (HANDLE_POSITION_VALUES.includes(sourceHandleId)) {
    sourcePos = sourceHandleId
    ;({ x: sx, y: sy } = getFixedHandlePoint(sourceNode, sourcePos))
  } else {
    const sourceIntersection = getNodeIntersection(sourceNode, targetNode)
    sx = sourceIntersection.x
    sy = sourceIntersection.y
    sourcePos = getEdgePosition(sourceNode, sourceIntersection)
  }

  let tx, ty, targetPos
  if (HANDLE_POSITION_VALUES.includes(targetHandleId)) {
    targetPos = targetHandleId
    ;({ x: tx, y: ty } = getFixedHandlePoint(targetNode, targetPos))
  } else {
    const targetIntersection = getNodeIntersection(targetNode, sourceNode)
    tx = targetIntersection.x
    ty = targetIntersection.y
    targetPos = getEdgePosition(targetNode, targetIntersection)
  }

  return { sx, sy, tx, ty, sourcePos, targetPos }
}

const JUNCTION_OFFSET = 32

/**
 * 同じsourceから複数のエッジが出ている「分岐」の見た目用。
 * source側は流れ方向の辺の中央固定点から出て、一定距離先のジャンクション点まで
 * 直進する。同じsourceを持つ兄弟エッジは全員この区間(出口→ジャンクション)が
 * 寸分違わず同じ座標になるため、SVG上で完全に重なって「幹が1本」に見える。
 * ジャンクションから先だけ、各targetに向けて直角に折れて枝分かれする。
 */
export function getBranchEdgeParams(sourceNode, targetNode, direction) {
  const isLR = direction === 'LR'
  const { width: sw, height: sh } = sourceNode.measured
  const { x: snx, y: sny } = sourceNode.internals.positionAbsolute
  const { width: tw, height: th } = targetNode.measured
  const { x: tnx, y: tny } = targetNode.internals.positionAbsolute

  if (isLR) {
    const sx = snx + sw
    const sy = sny + sh / 2
    const junctionX = sx + JUNCTION_OFFSET
    const tx = tnx
    const ty = tny + th / 2
    return {
      path: `M ${sx} ${sy} L ${junctionX} ${sy} L ${junctionX} ${ty} L ${tx} ${ty}`,
      labelX: (junctionX + tx) / 2,
      labelY: ty,
      targetPos: Position.Left,
    }
  }

  const sx = snx + sw / 2
  const sy = sny + sh
  const junctionY = sy + JUNCTION_OFFSET
  const tx = tnx + tw / 2
  const ty = tny
  return {
    path: `M ${sx} ${sy} L ${sx} ${junctionY} L ${tx} ${junctionY} L ${tx} ${ty}`,
    labelX: tx,
    labelY: (junctionY + ty) / 2,
    targetPos: Position.Top,
  }
}
