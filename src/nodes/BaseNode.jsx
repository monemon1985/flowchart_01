import { useState, useRef, useEffect } from 'react'
import { Handle, Position, useReactFlow } from '@xyflow/react'
import { useFlowStore } from '../store/useFlowStore'

const HANDLE_POSITIONS = [Position.Top, Position.Right, Position.Bottom, Position.Left]

export default function BaseNode({ id, data, selected, width, height, shapeClassName, textClassName = 'text-sm px-4' }) {
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(data.label)
  const inputRef = useRef(null)
  const updateNodeText = useFlowStore((s) => s.updateNodeText)
  const removeNode = useFlowStore((s) => s.removeNode)
  const { deleteElements } = useReactFlow()

  useEffect(() => setText(data.label), [data.label])

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [editing])

  function commit() {
    setEditing(false)
    const trimmed = text.trim()
    updateNodeText(id, trimmed || data.label)
    if (!trimmed) setText(data.label)
  }

  function handleContextMenu(e) {
    e.preventDefault()
    if (confirm('このノードを削除しますか？')) {
      deleteElements({ nodes: [{ id }] })
      removeNode(id)
    }
  }

  return (
    <div
      className="group relative"
      style={{ width, height }}
      onDoubleClick={() => setEditing(true)}
      onContextMenu={handleContextMenu}
    >
      <div
        className={`absolute inset-0 bg-white ${selected ? 'ring-2 ring-offset-2 ring-blue-500' : ''} ${shapeClassName}`}
      />
      {HANDLE_POSITIONS.map((pos) => (
        <Handle
          key={`s-${pos}`}
          type="source"
          position={pos}
          id={pos}
          className="!w-2.5 !h-2.5 !bg-slate-400 !border-white !border opacity-0 group-hover:opacity-100 !z-20"
        />
      ))}
      {HANDLE_POSITIONS.map((pos) => (
        <Handle
          key={`t-${pos}`}
          type="target"
          position={pos}
          id={pos}
          className="!w-2.5 !h-2.5 !bg-slate-400 !border-white !border opacity-0 group-hover:opacity-100 !z-20"
        />
      ))}
      <div className={`relative z-10 flex items-center justify-center w-full h-full text-center leading-snug break-words ${textClassName}`}>
        {editing ? (
          <textarea
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                commit()
              }
              if (e.key === 'Escape') {
                setText(data.label)
                setEditing(false)
              }
            }}
            className="w-full bg-transparent text-center outline-none resize-none nodrag"
            rows={2}
          />
        ) : (
          data.label
        )}
      </div>
    </div>
  )
}
