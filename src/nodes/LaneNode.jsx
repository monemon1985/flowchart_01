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
  if (!actor) return null

  const isLR = direction === 'LR'

  function handleResize(_event, { width, height }) {
    setActorLaneSize(actor.id, isLR ? height : width)
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
        onResize={handleResize}
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
