import { useRef } from 'react'
import { NodeResizeControl } from '@xyflow/react'
import { useFlowStore } from '../store/useFlowStore'
import { LANE_HEADER } from './nodeDimensions'

const MIN_LANE_CROSS_SIZE = LANE_HEADER + 60
const HIT_AREA = 18
const GRIP_THICKNESS = 6
const GRIP_LENGTH = 44

export default function LaneNode({ id, data }) {
  const direction = useFlowStore((s) => s.direction)
  const actor = useFlowStore((s) => s.actors.find((a) => a.id === data.actorId))
  const setActorLaneSize = useFlowStore((s) => s.setActorLaneSize)
  const setFlowLength = useFlowStore((s) => s.setFlowLength)
  const startLaneSizeRef = useRef(null)
  const startFlowLengthRef = useRef(null)
  if (!actor) return null

  const isLR = direction === 'LR'

  // リサイズ中はドラッグの1px移動ごとにonResizeが発火するため、そのたびに
  // undo履歴を積まず、ドラッグ中は記録を一時停止して見た目だけ更新する。
  // 指を離した瞬間、一旦リサイズ開始時点の値へ(一時停止中のまま)静かに戻してから
  // 記録を再開して最終値をセットすることで、undo履歴には
  // 「開始前の値→最終値」という正しい1件だけが記録されるようにしている
  // (React 18のバッチ処理により、この2段階の書き戻しは画面のちらつきなしで行われる)。
  function handleResizeStart() {
    startLaneSizeRef.current = actor.laneSize ?? null
    useFlowStore.temporal.getState().pause()
  }

  function handleResize(_event, { width, height }) {
    setActorLaneSize(actor.id, isLR ? height : width)
  }

  function handleResizeEnd(_event, { width, height }) {
    const finalSize = isLR ? height : width
    setActorLaneSize(actor.id, startLaneSizeRef.current)
    // React Flow自身がリサイズ確定時にonNodesChangeで寸法を反映する処理を
    // 内部で走らせるため、それが終わるのを待ってから再開・確定する
    // （同期的に再開すると、その内部更新まで余分な履歴として記録されてしまう）。
    setTimeout(() => {
      useFlowStore.temporal.getState().resume()
      setActorLaneSize(actor.id, finalSize)
    }, 0)
  }

  function handleFlowResizeStart() {
    startFlowLengthRef.current = useFlowStore.getState().flowLength ?? null
    useFlowStore.temporal.getState().pause()
  }

  function handleFlowResize(_event, { width, height }) {
    setFlowLength(isLR ? width : height)
  }

  function handleFlowResizeEnd(_event, { width, height }) {
    const finalSize = isLR ? width : height
    setFlowLength(startFlowLengthRef.current)
    setTimeout(() => {
      useFlowStore.temporal.getState().resume()
      setFlowLength(finalSize)
    }, 0)
  }

  return (
    <div
      className="relative w-full h-full rounded-lg"
      style={{ background: `${actor.color.bg}66`, border: `2px solid ${actor.color.border}` }}
    >
      {/*
        レーンの太さ(交差軸方向)だけをドラッグでリサイズできるハンドル。
        横フローなら下辺、縦フローなら右辺の境界線上に表示する。
        実際に掴める判定領域(HIT_AREA)を、見た目のつまみ(グリップ)より
        大きく取ることで、細い線を正確に狙わなくても掴めるようにしている。
      */}
      <NodeResizeControl
        nodeId={id}
        position={isLR ? 'bottom' : 'right'}
        variant="line"
        minWidth={MIN_LANE_CROSS_SIZE}
        minHeight={MIN_LANE_CROSS_SIZE}
        onResizeStart={handleResizeStart}
        onResize={handleResize}
        onResizeEnd={handleResizeEnd}
        className="group/resize !border-0 flex items-center justify-center !bg-transparent"
        style={
          isLR
            ? { height: HIT_AREA, marginTop: -HIT_AREA / 2, pointerEvents: 'auto' }
            : { width: HIT_AREA, marginLeft: -HIT_AREA / 2, pointerEvents: 'auto' }
        }
      >
        <div
          className="pointer-events-none rounded-full opacity-70 group-hover/resize:opacity-100 shadow-sm transition-opacity"
          style={{
            background: actor.color.border,
            width: isLR ? GRIP_LENGTH : GRIP_THICKNESS,
            height: isLR ? GRIP_THICKNESS : GRIP_LENGTH,
          }}
        />
      </NodeResizeControl>

      {/*
        レーンの長さ(フロー方向)をドラッグでリサイズできるハンドル。
        横フローなら右辺、縦フローなら下辺。全レーン共通の長さを更新する。
      */}
      <NodeResizeControl
        nodeId={id}
        position={isLR ? 'right' : 'bottom'}
        variant="line"
        minWidth={MIN_LANE_CROSS_SIZE}
        minHeight={MIN_LANE_CROSS_SIZE}
        onResizeStart={handleFlowResizeStart}
        onResize={handleFlowResize}
        onResizeEnd={handleFlowResizeEnd}
        className="group/resize-flow !border-0 flex items-center justify-center !bg-transparent"
        style={
          isLR
            ? { width: HIT_AREA, marginLeft: -HIT_AREA / 2, pointerEvents: 'auto' }
            : { height: HIT_AREA, marginTop: -HIT_AREA / 2, pointerEvents: 'auto' }
        }
      >
        <div
          className="pointer-events-none rounded-full opacity-70 group-hover/resize-flow:opacity-100 shadow-sm transition-opacity"
          style={{
            background: actor.color.border,
            width: isLR ? GRIP_THICKNESS : GRIP_LENGTH,
            height: isLR ? GRIP_LENGTH : GRIP_THICKNESS,
          }}
        />
      </NodeResizeControl>

      <div
        className={`absolute flex items-center justify-center font-semibold text-sm ${
          isLR ? 'left-0 top-0 h-full rounded-l-md' : 'top-0 left-0 w-full rounded-t-md'
        }`}
        style={{
          background: actor.color.bg,
          color: actor.color.text,
          width: isLR ? LANE_HEADER : '100%',
          height: isLR ? '100%' : LANE_HEADER,
          borderRight: isLR ? `2px solid ${actor.color.border}` : undefined,
          borderBottom: !isLR ? `2px solid ${actor.color.border}` : undefined,
        }}
      >
        <span style={isLR ? { writingMode: 'vertical-rl' } : undefined}>
          {actor.name}
        </span>
      </div>
    </div>
  )
}
