import { useEffect, useState } from 'react'
import { useFlowStore, STATE_VERSION } from '../store/useFlowStore'
import { useGalleryStore } from '../store/useGalleryStore'

function formatDate(iso) {
  const d = new Date(iso)
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export default function GalleryModal({ onClose }) {
  const state = useFlowStore()
  const loadState = useFlowStore((s) => s.loadState)
  const flows = useGalleryStore((s) => s.flows)
  const loading = useGalleryStore((s) => s.loading)
  const error = useGalleryStore((s) => s.error)
  const fetchFlows = useGalleryStore((s) => s.fetchFlows)
  const publish = useGalleryStore((s) => s.publish)

  const [title, setTitle] = useState('')
  const [author, setAuthor] = useState('')
  const [publishing, setPublishing] = useState(false)
  const [publishMessage, setPublishMessage] = useState('')

  useEffect(() => {
    fetchFlows()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handlePublish() {
    const trimmed = title.trim()
    if (!trimmed) return
    setPublishing(true)
    setPublishMessage('')
    const { direction, actors, groups, nodes, edges } = state
    const ok = await publish({
      title: trimmed,
      author: author.trim(),
      state: { version: STATE_VERSION, direction, actors, groups, nodes, edges },
    })
    setPublishing(false)
    if (ok) {
      setTitle('')
      setAuthor('')
      setPublishMessage('公開しました。')
      setTimeout(() => setPublishMessage(''), 3000)
    }
  }

  function handleOpen(flow) {
    if (confirm(`「${flow.title}」を読み込みます。現在の内容は上書きされます（元に戻すボタンで復元可）。よろしいですか？`)) {
      loadState(flow.state)
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-white rounded-lg shadow-xl p-6 w-[520px] max-w-[90vw] max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-base font-semibold text-slate-800 mb-1">みんなのフロー</h2>
        <p className="text-xs text-slate-500 mb-4">他の人が公開したフローを見たり、今のフローを公開したりできます。</p>

        <div className="border border-slate-200 rounded p-3 mb-4">
          <div className="text-xs font-semibold text-slate-500 mb-2">このフローを公開する</div>
          <div className="flex flex-col gap-2">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="タイトル（必須）"
              className="text-sm border border-slate-300 rounded px-2 py-1.5 outline-none focus:border-slate-500"
            />
            <input
              type="text"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="投稿者名（任意）"
              className="text-sm border border-slate-300 rounded px-2 py-1.5 outline-none focus:border-slate-500"
            />
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={!title.trim() || publishing}
                onClick={handlePublish}
                className="text-sm bg-blue-600 text-white rounded px-3 py-1.5 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {publishing ? '公開中…' : '公開'}
              </button>
              {publishMessage && <span className="text-xs text-emerald-600">{publishMessage}</span>}
            </div>
          </div>
        </div>

        <div className="text-xs font-semibold text-slate-500 mb-2">公開されているフロー</div>
        <div className="flex-1 overflow-y-auto flex flex-col gap-2 min-h-[120px]">
          {loading && <p className="text-xs text-slate-400">読み込み中…</p>}
          {error && <p className="text-xs text-red-600">読み込みに失敗しました: {error}</p>}
          {!loading && !error && flows.length === 0 && (
            <p className="text-xs text-slate-400">まだ公開されたフローはありません。</p>
          )}
          {flows.map((flow) => (
            <div
              key={flow.id}
              className="flex items-center justify-between gap-2 px-3 py-2 rounded border border-slate-200"
            >
              <div className="min-w-0">
                <div className="text-sm font-medium text-slate-800 truncate">{flow.title}</div>
                <div className="text-xs text-slate-400 truncate">
                  {flow.author ? `${flow.author} ・ ` : ''}
                  {formatDate(flow.created_at)}
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleOpen(flow)}
                className="shrink-0 text-xs border border-slate-300 rounded px-2 py-1 hover:bg-slate-100"
              >
                開く
              </button>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-4 self-start text-xs text-slate-400 hover:text-slate-600"
        >
          閉じる
        </button>
      </div>
    </div>
  )
}
