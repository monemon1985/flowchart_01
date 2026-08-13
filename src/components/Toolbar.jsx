import { useRef, useState } from 'react'
import { useReactFlow } from '@xyflow/react'
import { useFlowStore, useTemporalStore } from '../store/useFlowStore'
import { downloadJson, readJsonFile } from '../utils/fileUtils'
import { buildShareUrl } from '../utils/shareUrl'
import { exportDiagram } from '../utils/exportUtils'

export default function Toolbar({ onOpenTemplates }) {
  const state = useFlowStore()
  const direction = useFlowStore((s) => s.direction)
  const setDirection = useFlowStore((s) => s.setDirection)
  const runAutoLayout = useFlowStore((s) => s.autoLayout)
  const loadState = useFlowStore((s) => s.loadState)
  const undo = useTemporalStore((s) => s.undo)
  const redo = useTemporalStore((s) => s.redo)
  const canUndo = useTemporalStore((s) => s.pastStates.length > 0)
  const canRedo = useTemporalStore((s) => s.futureStates.length > 0)
  const { getNodes, getNodesBounds } = useReactFlow()
  const fileInputRef = useRef(null)
  const [copyMessage, setCopyMessage] = useState('')

  async function handleShare() {
    const url = buildShareUrl(state)
    try {
      await navigator.clipboard.writeText(url)
      setCopyMessage('URLをコピーしました')
    } catch {
      setCopyMessage(url)
    }
    setTimeout(() => setCopyMessage(''), 3000)
  }

  async function handleFileSelected(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const data = await readJsonFile(file)
      loadState(data)
    } catch (err) {
      alert(err.message)
    }
  }

  return (
    <header className="flex items-center gap-2 border-b border-slate-200 px-4 py-2 bg-white">
      <h1 className="text-sm font-semibold text-slate-800 mr-4">フローチャート</h1>

      <button type="button" onClick={onOpenTemplates} className="toolbar-btn">
        テンプレート
      </button>

      <div className="w-px h-5 bg-slate-200 mx-1" />

      <button type="button" onClick={() => undo()} disabled={!canUndo} className="toolbar-btn">
        ↶ 元に戻す
      </button>
      <button type="button" onClick={() => redo()} disabled={!canRedo} className="toolbar-btn">
        ↷ やり直し
      </button>

      <div className="w-px h-5 bg-slate-200 mx-1" />

      <div className="flex rounded border border-slate-300 overflow-hidden text-xs">
        <button
          type="button"
          onClick={() => setDirection('LR')}
          className={`px-2 py-1 ${direction === 'LR' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600'}`}
        >
          横フロー
        </button>
        <button
          type="button"
          onClick={() => setDirection('TB')}
          className={`px-2 py-1 ${direction === 'TB' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600'}`}
        >
          縦フロー
        </button>
      </div>

      <button type="button" onClick={runAutoLayout} className="toolbar-btn">
        自動整列
      </button>

      <div className="w-px h-5 bg-slate-200 mx-1" />

      <button type="button" onClick={() => downloadJson(state)} className="toolbar-btn">
        保存(JSON)
      </button>
      <button type="button" onClick={() => fileInputRef.current?.click()} className="toolbar-btn">
        読込(JSON)
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={handleFileSelected}
      />

      <button type="button" onClick={handleShare} className="toolbar-btn">
        URLをコピー
      </button>

      <div className="w-px h-5 bg-slate-200 mx-1" />

      <button
        type="button"
        onClick={() =>
          exportDiagram(getNodesBounds, getNodes(), 'png').catch((err) => {
            console.error(err)
            alert('PNG書き出しに失敗しました: ' + err.message)
          })
        }
        className="toolbar-btn"
      >
        PNG書き出し
      </button>
      <button
        type="button"
        onClick={() =>
          exportDiagram(getNodesBounds, getNodes(), 'svg').catch((err) => {
            console.error(err)
            alert('SVG書き出しに失敗しました: ' + err.message)
          })
        }
        className="toolbar-btn"
      >
        SVG書き出し
      </button>

      {copyMessage && (
        <span className="ml-2 text-xs text-emerald-600 truncate max-w-xs">{copyMessage}</span>
      )}
    </header>
  )
}
