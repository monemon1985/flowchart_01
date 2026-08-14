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

/**
 * 2つのノードの現在位置から、両者を結ぶのに最適な接続点(境界上の交点)と
 * その点がどちら側の辺にあるかを都度計算する。
 * ハンドルIDに依存しないため、ノードがどこに動いてもフローティング接続が保たれる。
 */
export function getEdgeParams(sourceNode, targetNode) {
  const sourceIntersection = getNodeIntersection(sourceNode, targetNode)
  const targetIntersection = getNodeIntersection(targetNode, sourceNode)

  return {
    sx: sourceIntersection.x,
    sy: sourceIntersection.y,
    tx: targetIntersection.x,
    ty: targetIntersection.y,
    sourcePos: getEdgePosition(sourceNode, sourceIntersection),
    targetPos: getEdgePosition(targetNode, targetIntersection),
  }
}
