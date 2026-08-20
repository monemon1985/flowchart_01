import { useState, useRef, useEffect } from 'react'
import { NodeResizeControl, useReactFlow } from '@xyflow/react'
import { useFlowStore } from '../store/useFlowStore'
import { useAutoFitFontSize } from '../hooks/useAutoFitFontSize'
import { NOTE_MIN_SIZE } from './nodeDimensions'

const DEFAULT_TEXT_COLOR = '#57534e'
const TEXT_COLOR_PRESETS = ['#57534e', '#dc2626', '#2563eb', '#16a34a', '#d97706', '#7c3aed']

const CORNERS = ['top-left', 'top-right', 'bottom-left', 'bottom-right']

export default function NoteNode({ id, data, selected }) {
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(data.label)
  const [pickerOpen, setPickerOpen] = useState(false)
  const inputRef = useRef(null)
  const textRef = useRef(null)
  const updateNodeText = useFlowStore((s) => s.updateNodeText)
  const updateNoteColor = useFlowStore((s) => s.updateNoteColor)
  const updateNoteSize = useFlowStore((s) => s.updateNoteSize)
  const removeNode = useFlowStore((s) => s.removeNode)
  const { deleteElements, getNode } = useReactFlow()
  const startSizeRef = useRef(null)

  useEffect(() => setText(data.label), [data.label])
  useEffect(() => {
    if (editing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [editing])

  const fontSize = useAutoFitFontSize(textRef, [data.label, editing])

  function commit() {
    setEditing(false)
    updateNodeText(id, text.trim())
  }

  function handleContextMenu(e) {
    e.preventDefault()
    if (confirm('この付箋を削除しますか？')) {
      deleteElements({ nodes: [{ id }] })
      removeNode(id)
    }
  }

  const textColor = data.textColor ?? DEFAULT_TEXT_COLOR

  // リサイズ中は1pxごとにonResizeが発火するため、そのたびにundo履歴を積まず、
  // ドラッグ中は記録を一時停止して見た目だけ更新する。指を離した瞬間、一旦
  // 開始時点のサイズへ(一時停止中のまま)静かに戻してから記録を再開して最終値を
  // セットすることで、undo履歴には正しい1件だけが記録されるようにしている。
  function handleResizeStart() {
    const node = getNode(id)
    startSizeRef.current = { width: node?.style?.width, height: node?.style?.height }
    useFlowStore.temporal.getState().pause()
  }
  function handleResize(_event, { width, height }) {
    updateNoteSize(id, { width, height })
  }
  function handleResizeEnd(_event, { width, height }) {
    if (startSizeRef.current) updateNoteSize(id, startSizeRef.current)
    setTimeout(() => {
      useFlowStore.temporal.getState().resume()
      updateNoteSize(id, { width, height })
    }, 0)
  }

  return (
    <div
      className="group relative w-full h-full rounded shadow-sm"
      style={{ background: '#fef9c3', border: '1px solid #eab308' }}
      onDoubleClick={() => setEditing(true)}
      onContextMenu={handleContextMenu}
    >
      {CORNERS.map((pos) => (
        <NodeResizeControl
          key={pos}
          nodeId={id}
          position={pos}
          minWidth={NOTE_MIN_SIZE}
          minHeight={NOTE_MIN_SIZE}
          onResizeStart={handleResizeStart}
          onResize={handleResize}
          onResizeEnd={handleResizeEnd}
          className="!border-0 !bg-transparent"
          style={{ width: 14, height: 14, pointerEvents: 'auto' }}
        />
      ))}

      <button
        type="button"
        onClick={() => setPickerOpen((v) => !v)}
        className="nodrag absolute top-1 right-1 w-4 h-4 rounded-full border border-white opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ background: textColor }}
        title="文字色を変更"
      />
      {pickerOpen && (
        <div className="nodrag absolute z-20 top-6 right-1 flex gap-1 bg-white border border-slate-200 rounded p-1.5 shadow">
          {TEXT_COLOR_PRESETS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => {
                updateNoteColor(id, c)
                setPickerOpen(false)
              }}
              className="w-4 h-4 rounded-full border border-black/10"
              style={{ background: c }}
            />
          ))}
        </div>
      )}

      <div
        ref={textRef}
        className="w-full h-full p-2 overflow-hidden text-center leading-snug break-words flex items-center justify-center"
        style={{ color: textColor }}
      >
        {editing ? (
          <textarea
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setText(data.label)
                setEditing(false)
              }
            }}
            className="nodrag w-full h-full bg-transparent text-center outline-none resize-none"
            style={{ color: textColor, fontSize }}
          />
        ) : (
          <span style={{ fontSize }}>{text || 'ダブルクリックでコメントを入力'}</span>
        )}
      </div>
    </div>
  )
}
