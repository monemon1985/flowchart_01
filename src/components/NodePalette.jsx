const PALETTE_ITEMS = [
  { shape: 'terminator', label: '開始/終了', preview: 'rounded-full border-2 border-slate-500 bg-slate-50' },
  { shape: 'action', label: 'アクション', preview: 'rounded-md border-2 border-slate-400 bg-white' },
  { shape: 'decision', label: 'ディシジョン', preview: 'border-2 border-amber-500 bg-amber-50 [clip-path:polygon(50%_0%,100%_50%,50%_100%,0%_50%)]' },
]

export default function NodePalette() {
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
      <p className="mt-auto text-[11px] text-slate-400 leading-relaxed">
        ドラッグしてレーンにドロップ。ダブルクリックで文字編集、右クリックで削除。
      </p>
    </aside>
  )
}
