import { toPng, toSvg } from 'html-to-image'

const PADDING = 40
const EXPORT_TIMEOUT_MS = 30000

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
 * 画面に見えている範囲ではなく、図全体（全ノード・全レーン）を書き出す。
 * html-to-image のクローン専用に viewport の transform を上書きするだけで、
 * 実際の画面表示（現在のズーム・スクロール位置）には影響しない。
 *
 * getNodesBounds は @xyflow/react から直接importせず、呼び出し側で
 * useReactFlow() から取得したものを渡すこと。親子(レーン)構造があるため
 * 静的インポート版では子ノードの絶対座標を正しく解決できない。
 */
export async function exportDiagram(getNodesBounds, nodes, format = 'png') {
  const bounds = getNodesBounds(nodes)
  const width = Math.ceil(bounds.width + PADDING * 2)
  const height = Math.ceil(bounds.height + PADDING * 2)
  const viewportEl = document.querySelector('.react-flow__viewport')
  if (!viewportEl) return

  const transform = `translate(${PADDING - bounds.x}px, ${PADDING - bounds.y}px) scale(1)`
  const toFn = format === 'svg' ? toSvg : toPng
  const dataUrl = await withTimeout(
    toFn(viewportEl, {
      backgroundColor: '#ffffff',
      width,
      height,
      style: { width: `${width}px`, height: `${height}px`, transform },
    }),
    EXPORT_TIMEOUT_MS,
  )
  downloadDataUrl(dataUrl, `flowchart.${format}`)
}
