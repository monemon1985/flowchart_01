import { useState } from 'react'
import { useGalleryStore } from '../store/useGalleryStore'

export default function GalleryGate({ onClose, onUnlocked }) {
  const unlock = useGalleryStore((s) => s.unlock)
  const [passphrase, setPassphrase] = useState('')
  const [failed, setFailed] = useState(false)

  function handleSubmit(e) {
    e.preventDefault()
    if (unlock(passphrase)) {
      onUnlocked()
    } else {
      setFailed(true)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={onClose}>
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-lg shadow-xl p-6 w-[360px] max-w-[90vw]"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-base font-semibold text-slate-800 mb-1">みんなのフロー</h2>
        <p className="text-xs text-slate-500 mb-4">合言葉を入れると、他の人が公開したフローを見られます。</p>
        <input
          autoFocus
          type="password"
          value={passphrase}
          onChange={(e) => {
            setPassphrase(e.target.value)
            setFailed(false)
          }}
          placeholder="合言葉"
          className="w-full text-sm border border-slate-300 rounded px-2 py-1.5 outline-none focus:border-slate-500"
        />
        {failed && <p className="text-xs text-red-600 mt-1">合言葉が違います。</p>}
        <div className="flex gap-2 mt-4">
          <button
            type="submit"
            className="flex-1 text-sm bg-blue-600 text-white rounded py-1.5 hover:bg-blue-700"
          >
            入る
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 text-sm border border-slate-300 rounded py-1.5 text-slate-600 hover:bg-slate-100"
          >
            キャンセル
          </button>
        </div>
      </form>
    </div>
  )
}
