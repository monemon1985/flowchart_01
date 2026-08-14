/** フロー座標上の点(point)がどのレーン(役割者の帯)に属するかを判定する */
export function findLaneAt(nodes, point) {
  return nodes.find(
    (n) =>
      n.type === 'lane' &&
      point.x >= n.position.x &&
      point.x <= n.position.x + (n.style?.width ?? 0) &&
      point.y >= n.position.y &&
      point.y <= n.position.y + (n.style?.height ?? 0),
  )
}
