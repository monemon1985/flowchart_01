import { useUiPrefsStore, setNewEdgeArrowStyle, setNewEdgeStrokeWidth } from '../store/useUiPrefsStore'
import { STROKE_WIDTH_PRESETS } from '../edges/strokeWidthPresets'

const PALETTE_ITEMS = [
  { shape: 'terminator', label: '開始/終了', preview: 'rounded-full border-2 border-slate-500 bg-slate-50' },
  { shape: 'action', label: 'アクション', preview: 'rounded-md border-2 border-slate-400 bg-white' },
  { shape: 'decision', label: 'ディシジョン', preview: 'border-2 border-amber-500 bg-amber-50 [clip-path:polygon(50%_0%,100%_50%,50%_100%,0%_50%)]' },
]

export default function NodePalette() {
  const arrowStart = useUiPrefsStore((s) => s.newEdgeArrowStart)
  const arrowEnd = useUiPrefsStore((s) => s.newEdgeArrowEnd)
  const strokeWidth = useUiPrefsStore((s) => s.newEdgeStrokeWidth)

  function onDragStart(e, shape) {
    e.dataTransfer.setData('application/flowchart-shape', shape)
    e.dataTransfer.effectAllowed = 'move'
  }

  return (
    <aside className="w-40 shrink-0 border-r border-slate-200 bg-slate-50 p-3 flex flex-col gap-4">
      <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">ノード</h2>
      {PALETTE_ITEMS.map((item) => (
        <div
          key={item.shape}
          draggable
          onDragStart={(e) => onDragStart(e, item.shape)}
          className="flex flex-col items-center gap-1.5 cursor-grab active:cursor-grabbing"
        >
          <div className={`w-20 h-12 flex items-center justify-center ${item.preview}`} />
          <span className="text-xs text-slate-600">{item.label}</span>
        </div>
      ))}

      <div className="border-t border-slate-200 pt-3">
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
          新規接続のスタイル
        </h2>
        <div className="text-[11px] text-slate-500 mb-1">矢印</div>
        <div className="flex gap-1 mb-2 text-xs">
          <button
            type="button"
            onClick={() => setNewEdgeArrowStyle(false, false)}
            className={`flex-1 border rounded py-1 ${!arrowStart && !arrowEnd ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white'}`}
          >
            線
          </button>
          <button
            type="button"
            onClick={() => setNewEdgeArrowStyle(false, true)}
            className={`flex-1 border rounded py-1 ${arrowEnd && !arrowStart ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white'}`}
          >
            片矢印
          </button>
          <button
            type="button"
            onClick={() => setNewEdgeArrowStyle(true, true)}
            className={`flex-1 border rounded py-1 ${arrowStart && arrowEnd ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white'}`}
          >
            両矢印
          </button>
        </div>
        <div className="text-[11px] text-slate-500 mb-1">太さ</div>
        <div className="flex gap-1 text-xs">
          {STROKE_WIDTH_PRESETS.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => setNewEdgeStrokeWidth(p.value)}
              className={`flex-1 border rounded py-1 ${strokeWidth === p.value ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white'}`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <p className="mt-auto text-[11px] text-slate-400 leading-relaxed">
        ドラッグしてレーンにドロップ。ダブルクリックで文字編集、右クリックで削除。
      </p>
    </aside>
  )
}
