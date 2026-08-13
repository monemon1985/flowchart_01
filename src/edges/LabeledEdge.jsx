import { useState, useRef, useEffect } from 'react'
import { BaseEdge, EdgeLabelRenderer, getBezierPath, useReactFlow } from '@xyflow/react'
import { useFlowStore } from '../store/useFlowStore'

export default function LabeledEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  markerEnd,
  selected,
}) {
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(data?.label ?? '')
  const inputRef = useRef(null)
  const updateEdgeLabel = useFlowStore((s) => s.updateEdgeLabel)
  const removeEdge = useFlowStore((s) => s.removeEdge)
  const { deleteElements } = useReactFlow()

  useEffect(() => setText(data?.label ?? ''), [data?.label])
  useEffect(() => {
    if (editing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [editing])

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  })

  function commit() {
    setEditing(false)
    updateEdgeLabel(id, text.trim())
  }

  function handleContextMenu(e) {
    e.preventDefault()
    if (confirm('この矢印を削除しますか？')) {
      deleteElements({ edges: [{ id }] })
      removeEdge(id)
    }
  }

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{ stroke: selected ? '#3b82f6' : '#64748b', strokeWidth: 2 }}
        interactionWidth={20}
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
          }}
          className="nodrag nopan pointer-events-auto"
          onDoubleClick={() => setEditing(true)}
          onContextMenu={handleContextMenu}
        >
          {editing ? (
            <input
              ref={inputRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onBlur={commit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commit()
                if (e.key === 'Escape') {
                  setText(data?.label ?? '')
                  setEditing(false)
                }
              }}
              className="w-20 rounded border border-slate-300 bg-white px-1 text-xs text-center outline-none"
            />
          ) : (
            text && (
              <div className="rounded bg-white border border-slate-300 px-1.5 py-0.5 text-xs text-slate-700 shadow-sm">
                {text}
              </div>
            )
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  )
}
