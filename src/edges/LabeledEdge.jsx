import { useState, useRef, useEffect } from 'react'
import {
  BaseEdge,
  EdgeLabelRenderer,
  getStraightPath,
  getSmoothStepPath,
  useInternalNode,
  useReactFlow,
  useEdges,
} from '@xyflow/react'
import { useFlowStore } from '../store/useFlowStore'
import { getEdgeParams, getBranchEdgeParams } from '../utils/edgeGeometry'
import { DEFAULT_STROKE_WIDTH } from './strokeWidthPresets'
import EdgeContextMenu from './EdgeContextMenu'

const ALIGN_TOLERANCE = 2

export default function LabeledEdge({
  id,
  source,
  target,
  sourceHandleId,
  targetHandleId,
  data,
  markerStart,
  markerEnd,
  selected,
}) {
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(data?.label ?? '')
  const [menuPos, setMenuPos] = useState(null)
  const [dragLabelT, setDragLabelT] = useState(null)
  const inputRef = useRef(null)
  const pathRef = useRef(null)
  const updateEdgeLabel = useFlowStore((s) => s.updateEdgeLabel)
  const updateEdgeLabelOffset = useFlowStore((s) => s.updateEdgeLabelOffset)
  const updateEdgeArrowStyle = useFlowStore((s) => s.updateEdgeArrowStyle)
  const updateEdgeStrokeWidth = useFlowStore((s) => s.updateEdgeStrokeWidth)
  const removeEdge = useFlowStore((s) => s.removeEdge)
  const { deleteElements, screenToFlowPosition } = useReactFlow()

  const sourceNode = useInternalNode(source)
  const targetNode = useInternalNode(target)
  const allEdges = useEdges()
  const direction = useFlowStore((s) => s.direction)

  useEffect(() => setText(data?.label ?? ''), [data?.label])
  useEffect(() => {
    if (editing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [editing])

  if (!sourceNode || !targetNode) return null

  // 同じsourceから「フロー方向の辺(自然な分岐の向き)」で出るエッジが2本以上ある場合は
  // 「幹が1本にまとまって見える」分岐専用のパスを使う（getBranchEdgeParams参照）。
  // 左右上下など明示的に別のハンドルを選んだエッジは、幹の出口(フロー方向固定)と
  // 実際のターゲット方向が食い違い経路が壊れて見えるため、分岐の対象から外し
  // 常に個別のgetEdgeParams(ハンドル指定があればそれを尊重)で描画する。
  const naturalSide = direction === 'LR' ? 'right' : 'bottom'
  const isNaturalSide = (handleId) => !handleId || handleId === naturalSide
  const branchSiblingCount = allEdges.filter((e) => e.source === source && isNaturalSide(e.sourceHandle)).length
  const isBranch = branchSiblingCount >= 2 && isNaturalSide(sourceHandleId)

  let edgePath, labelX, labelY

  if (isBranch) {
    const branch = getBranchEdgeParams(sourceNode, targetNode, direction)
    edgePath = branch.path
    labelX = branch.labelX
    labelY = branch.labelY
  } else {
    const { sx, sy, tx, ty, sourcePos, targetPos } = getEdgeParams(sourceNode, targetNode, sourceHandleId, targetHandleId)
    const isAligned = Math.abs(sx - tx) < ALIGN_TOLERANCE || Math.abs(sy - ty) < ALIGN_TOLERANCE

    ;[edgePath, labelX, labelY] = isAligned
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
  }

  // ラベルを手動で線に沿ってスライドした位置(labelT: 0〜1)が保存されていれば、
  // 実際に描画中のパス(edgePath)上をその割合でたどった点をラベル位置として使う。
  // ドラッグ中はストア確定前のローカル値(dragLabelT)を優先してなめらかに追従させる。
  const labelT = dragLabelT ?? data?.labelT
  if (typeof labelT === 'number' && pathRef.current) {
    const total = pathRef.current.getTotalLength()
    const pt = pathRef.current.getPointAtLength(labelT * total)
    labelX = pt.x
    labelY = pt.y
  }

  const hasArrowStart = Boolean(markerStart)
  const hasArrowEnd = Boolean(markerEnd)
  const strokeWidth = data?.strokeWidth ?? DEFAULT_STROKE_WIDTH

  function commit() {
    setEditing(false)
    updateEdgeLabel(id, text.trim())
  }

  function handleLabelDragStart(e) {
    if (editing) return
    e.stopPropagation()
    const path = pathRef.current
    if (!path) return
    const total = path.getTotalLength()

    function nearestT(clientX, clientY) {
      const { x, y } = screenToFlowPosition({ x: clientX, y: clientY })
      const steps = 60
      let best = { t: 0, d: Infinity }
      for (let i = 0; i <= steps; i++) {
        const t = i / steps
        const pt = path.getPointAtLength(t * total)
        const d = (pt.x - x) ** 2 + (pt.y - y) ** 2
        if (d < best.d) best = { t, d }
      }
      return best.t
    }

    function onMove(moveEvent) {
      setDragLabelT(nearestT(moveEvent.clientX, moveEvent.clientY))
    }
    function onUp(upEvent) {
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup', onUp)
      const finalT = nearestT(upEvent.clientX, upEvent.clientY)
      setDragLabelT(null)
      updateEdgeLabelOffset(id, finalT)
    }
    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup', onUp)
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
      {/* ラベル位置をパス上でサンプリングするための非表示パス（表示用edgePathと常に同じ形） */}
      <path ref={pathRef} d={edgePath} fill="none" stroke="none" />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            cursor: editing ? 'text' : 'grab',
            touchAction: 'none',
          }}
          className="nodrag nopan pointer-events-auto"
          onPointerDown={handleLabelDragStart}
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
          ) : text ? (
            <div className="rounded bg-white border border-slate-300 px-1.5 py-0.5 text-xs text-slate-700 shadow-sm">
              {text}
            </div>
          ) : (
            <div
              className="w-4 h-4 rounded-full border border-dashed border-slate-300 bg-white/70 opacity-40 hover:opacity-100 transition-opacity"
              title="ダブルクリックで文字を追加"
            />
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
