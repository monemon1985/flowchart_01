import { toPng, toSvg } from 'html-to-image'
import { getViewportForBounds } from '@xyflow/react'

const PADDING = 40
const EXPORT_TIMEOUT_MS = 30000
const SVG_BBOX_PADDING = 4

function downloadDataUrl(dataUrl, filename) {
  const a = document.createElement('a')
  a.href = dataUrl
  a.download = filename
  a.click()
}

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('画像の生成がタイムアウトしました。')), ms),
    ),
  ])
}

/**
 * @xyflow/react v12 はエッジごとに個別の <svg> 要素を生成するが、
 * width/height/viewBox を持たず CSS の overflow:visible だけで成立している。
 * html-to-image はDOMをクローンして<foreignObject>経由でラスタライズするため、
 * 明示サイズのないネストしたSVGは overflow:visible が尊重されず、
 * 中身がクリップ/消失することがある（矢印だけ書き出されない不具合の原因）。
 * キャプチャ直前だけ各エッジ自身の描画範囲(getBBox)を明示し、直後に元へ戻す。
 */
function withExplicitEdgeSvgSize(viewportEl, fn) {
  const svgs = viewportEl.querySelectorAll('.react-flow__edges svg')
  const original = Array.from(svgs).map((svg) => ({
    svg,
    width: svg.getAttribute('width'),
    height: svg.getAttribute('height'),
    viewBox: svg.getAttribute('viewBox'),
  }))
  svgs.forEach((svg) => {
    let box
    try {
      box = svg.getBBox()
    } catch {
      return
    }
    const x = box.x - SVG_BBOX_PADDING
    const y = box.y - SVG_BBOX_PADDING
    const w = box.width + SVG_BBOX_PADDING * 2
    const h = box.height + SVG_BBOX_PADDING * 2
    svg.setAttribute('width', String(w))
    svg.setAttribute('height', String(h))
    svg.setAttribute('viewBox', `${x} ${y} ${w} ${h}`)
  })
  return fn().finally(() => {
    original.forEach(({ svg, width: w, height: h, viewBox }) => {
      w == null ? svg.removeAttribute('width') : svg.setAttribute('width', w)
      h == null ? svg.removeAttribute('height') : svg.setAttribute('height', h)
      viewBox == null ? svg.removeAttribute('viewBox') : svg.setAttribute('viewBox', viewBox)
    })
  })
}

/**
 * 画面に見えている範囲ではなく、図全体（全ノード・全レーン）を書き出す。
 *
 * getNodesBounds(@xyflow/react)は、useReactFlow()経由でnodeLookupを
 * 補って呼んでも、レーンの子ノード(parentId持ち)の絶対座標や実測サイズを
 * 正しく拾えず幅0近くまで縮んでしまう問題があった。DOM上に実際に描画された
 * 各ノード要素の位置を直接測って範囲を求める方が確実なため、こちらを使う。
 */
function measureNodesBounds(screenToFlowPosition) {
  const nodeEls = document.querySelectorAll('.react-flow__node')
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  nodeEls.forEach((el) => {
    const r = el.getBoundingClientRect()
    if (r.width === 0 && r.height === 0) return
    if (r.left < minX) minX = r.left
    if (r.top < minY) minY = r.top
    if (r.right > maxX) maxX = r.right
    if (r.bottom > maxY) maxY = r.bottom
  })
  if (minX === Infinity) return { x: 0, y: 0, width: 0, height: 0 }
  const topLeft = screenToFlowPosition({ x: minX, y: minY })
  const bottomRight = screenToFlowPosition({ x: maxX, y: maxY })
  return {
    x: topLeft.x,
    y: topLeft.y,
    width: bottomRight.x - topLeft.x,
    height: bottomRight.y - topLeft.y,
  }
}

export async function exportDiagram(screenToFlowPosition, format = 'png') {
  const bounds = measureNodesBounds(screenToFlowPosition)
  const width = Math.ceil(bounds.width + PADDING * 2)
  const height = Math.ceil(bounds.height + PADDING * 2)
  const viewportEl = document.querySelector('.react-flow__viewport')
  if (!viewportEl) return

  const { x, y, zoom } = getViewportForBounds(bounds, width, height, 1, 1, 0)
  const transform = `translate(${x}px, ${y}px) scale(${zoom})`

  const toFn = format === 'svg' ? toSvg : toPng
  const dataUrl = await withExplicitEdgeSvgSize(viewportEl, () =>
    withTimeout(
      toFn(viewportEl, {
        backgroundColor: '#ffffff',
        width,
        height,
        style: { width: `${width}px`, height: `${height}px`, transform },
      }),
      EXPORT_TIMEOUT_MS,
    ),
  )
  downloadDataUrl(dataUrl, `flowchart.${format}`)
}
