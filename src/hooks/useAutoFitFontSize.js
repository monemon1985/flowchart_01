import { useLayoutEffect, useState } from 'react'

const DEFAULT_MAX = 14
const DEFAULT_MIN = 8
const STEP = 1

/**
 * containerRefの中身(テキスト)がはみ出す間、fontSizeを段階的に縮小して収める。
 * テキストやコンテナのサイズが変わるたびに再計算する。
 */
export function useAutoFitFontSize(containerRef, deps, { max = DEFAULT_MAX, min = DEFAULT_MIN } = {}) {
  const [fontSize, setFontSize] = useState(max)

  useLayoutEffect(() => {
    const el = containerRef.current
    if (!el) return

    let size = max
    el.style.fontSize = `${size}px`

    while (size > min && (el.scrollHeight > el.clientHeight || el.scrollWidth > el.clientWidth)) {
      size -= STEP
      el.style.fontSize = `${size}px`
    }

    setFontSize(size)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return fontSize
}
