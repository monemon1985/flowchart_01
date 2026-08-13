import { useFlowStore } from '../store/useFlowStore'
import { TEMPLATES } from '../templates'

export default function TemplateDialog({ onClose }) {
  const loadTemplate = useFlowStore((s) => s.loadTemplate)
  const resetState = useFlowStore((s) => s.resetState)

  function handlePick(template) {
    if (confirm(`「${template.name}」を読み込みます。現在の内容は上書きされます（元に戻すボタンで復元可）。よろしいですか？`)) {
      loadTemplate(template)
      onClose()
    }
  }

  function handleBlank() {
    if (confirm('空のキャンバスから始めます。現在の内容は上書きされます（元に戻すボタンで復元可）。よろしいですか？')) {
      resetState()
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-white rounded-lg shadow-xl p-6 w-[420px] max-w-[90vw]"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-base font-semibold text-slate-800 mb-1">テンプレートを選択</h2>
        <p className="text-xs text-slate-500 mb-4">サンプルを元に編集を始められます。</p>
        <div className="flex flex-col gap-2">
          {TEMPLATES.map((t) => (
            <button
              key={t.name}
              type="button"
              onClick={() => handlePick(t)}
              className="text-left px-3 py-2 rounded border border-slate-200 hover:border-slate-400 hover:bg-slate-50"
            >
              <div className="text-sm font-medium text-slate-800">{t.name}</div>
              <div className="text-xs text-slate-500">
                {t.actors.length}人の役割者 / {t.nodes.length}ノード
              </div>
            </button>
          ))}
          <button
            type="button"
            onClick={handleBlank}
            className="text-left px-3 py-2 rounded border border-dashed border-slate-300 text-slate-500 hover:border-slate-400"
          >
            空のキャンバスから始める
          </button>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="mt-4 text-xs text-slate-400 hover:text-slate-600"
        >
          閉じる
        </button>
      </div>
    </div>
  )
}
