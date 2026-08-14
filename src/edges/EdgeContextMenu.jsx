import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { STROKE_WIDTH_PRESETS } from './strokeWidthPresets'

/**
 * React Flowの EdgeLabelRenderer は transform が効いた要素の内側にポータルするため、
 * その中で position:fixed を使っても真のブラウザビューポート基準にならない
 * （ズーム/パンで位置がずれる、外側クリック判定も壊れる）。
 * document.body へ直接ポータルすることでこれを回避する。
 */
export default function EdgeContextMenu({
  x,
  y,
  hasArrowStart,
  hasArrowEnd,
  strokeWidth,
  onSetArrowStyle,
  onSetStrokeWidth,
  onDelete,
  onClose,
}) {
  const menuRef = useRef(null)

  useEffect(() => {
    function handlePointerDown(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) onClose()
    }
    function handleKeyDown(e) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('pointerdown', handlePointerDown, true)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose])

  return createPortal(
    <div
      ref={menuRef}
      className="fixed z-50 bg-white border border-slate-200 rounded shadow-lg p-2 text-xs w-40"
      style={{ left: x, top: y }}
    >
      <div className="text-slate-400 font-semibold mb-1">矢印</div>
      <div className="flex gap-1 mb-2">
        <button
          type="button"
          onClick={() => onSetArrowStyle(false, false)}
          className={`flex-1 border rounded py-1 ${!hasArrowStart && !hasArrowEnd ? 'border-blue-500 bg-blue-50' : 'border-slate-200'}`}
        >
          線
        </button>
        <button
          type="button"
          onClick={() => onSetArrowStyle(false, true)}
          className={`flex-1 border rounded py-1 ${hasArrowEnd && !hasArrowStart ? 'border-blue-500 bg-blue-50' : 'border-slate-200'}`}
        >
          片矢印
        </button>
        <button
          type="button"
          onClick={() => onSetArrowStyle(true, true)}
          className={`flex-1 border rounded py-1 ${hasArrowStart && hasArrowEnd ? 'border-blue-500 bg-blue-50' : 'border-slate-200'}`}
        >
          両矢印
        </button>
      </div>
      <div className="text-slate-400 font-semibold mb-1">太さ</div>
      <div className="flex gap-1 mb-2">
        {STROKE_WIDTH_PRESETS.map((p) => (
          <button
            key={p.value}
            type="button"
            onClick={() => onSetStrokeWidth(p.value)}
            className={`flex-1 border rounded py-1 ${strokeWidth === p.value ? 'border-blue-500 bg-blue-50' : 'border-slate-200'}`}
          >
            {p.label}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={onDelete}
        className="w-full text-red-600 hover:bg-red-50 rounded py-1 text-left px-1"
      >
        削除
      </button>
    </div>,
    document.body,
  )
}
