import { useState, useRef, useEffect } from 'react'
import {
  BaseEdge,
  EdgeLabelRenderer,
  getStraightPath,
  getSmoothStepPath,
  useInternalNode,
  useReactFlow,
} from '@xyflow/react'
import { useFlowStore } from '../store/useFlowStore'
import { getEdgeParams } from '../utils/edgeGeometry'
import { DEFAULT_STROKE_WIDTH } from './strokeWidthPresets'
import EdgeContextMenu from './EdgeContextMenu'

const ALIGN_TOLERANCE = 2

export default function LabeledEdge({
  id,
  source,
  target,
  data,
  markerStart,
  markerEnd,
  selected,
}) {
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(data?.label ?? '')
  const [menuPos, setMenuPos] = useState(null)
  const inputRef = useRef(null)
  const updateEdgeLabel = useFlowStore((s) => s.updateEdgeLabel)
  const updateEdgeArrowStyle = useFlowStore((s) => s.updateEdgeArrowStyle)
  const updateEdgeStrokeWidth = useFlowStore((s) => s.updateEdgeStrokeWidth)
  const removeEdge = useFlowStore((s) => s.removeEdge)
  const { deleteElements } = useReactFlow()

  const sourceNode = useInternalNode(source)
  const targetNode = useInternalNode(target)

  useEffect(() => setText(data?.label ?? ''), [data?.label])
  useEffect(() => {
    if (editing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [editing])

  if (!sourceNode || !targetNode) return null

  const { sx, sy, tx, ty, sourcePos, targetPos } = getEdgeParams(sourceNode, targetNode)
  const isAligned = Math.abs(sx - tx) < ALIGN_TOLERANCE || Math.abs(sy - ty) < ALIGN_TOLERANCE

  const [edgePath, labelX, labelY] = isAligned
    ? getStraightPath({ sourceX: sx, sourceY: sy, targetX: tx, targetY: ty })
    : getSmoothStepPath({
        sourceX: sx,
        sourceY: sy,
        sourcePosition: sourcePos,
        targetX: tx,
        targetY: ty,
        targetPosition: targetPos,
        borderRadius: 0,
      })

  const hasArrowStart = Boolean(markerStart)
  const hasArrowEnd = Boolean(markerEnd)
  const strokeWidth = data?.strokeWidth ?? DEFAULT_STROKE_WIDTH

  function commit() {
    setEditing(false)
    updateEdgeLabel(id, text.trim())
  }

  function handleContextMenu(e) {
    e.preventDefault()
    setMenuPos({ x: e.clientX, y: e.clientY })
  }

  function handleDelete() {
    setMenuPos(null)
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
        markerStart={markerStart}
        markerEnd={markerEnd}
        style={{ stroke: selected ? '#3b82f6' : '#64748b', strokeWidth }}
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
      {menuPos && (
        <EdgeContextMenu
          x={menuPos.x}
          y={menuPos.y}
          hasArrowStart={hasArrowStart}
          hasArrowEnd={hasArrowEnd}
          strokeWidth={strokeWidth}
          onSetArrowStyle={(arrowStart, arrowEnd) => updateEdgeArrowStyle(id, { arrowStart, arrowEnd })}
          onSetStrokeWidth={(w) => updateEdgeStrokeWidth(id, w)}
          onDelete={handleDelete}
          onClose={() => setMenuPos(null)}
        />
      )}
    </>
  )
}
