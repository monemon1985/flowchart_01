import { NodeResizeControl } from '@xyflow/react'
import { useFlowStore } from '../store/useFlowStore'
import { LANE_HEADER } from './nodeDimensions'

const MIN_LANE_CROSS_SIZE = LANE_HEADER + 60

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
      {/* レーンの太さ(交差軸方向)だけをドラッグでリサイズできるハンドル。
          横フローなら下辺、縦フローなら右辺の1本だけを表示する。 */}
      <NodeResizeControl
        nodeId={id}
        position={isLR ? 'bottom' : 'right'}
        variant="line"
        minWidth={MIN_LANE_CROSS_SIZE}
        minHeight={MIN_LANE_CROSS_SIZE}
        onResize={handleResize}
        className="!border-2"
        style={{ borderColor: actor.color.border, cursor: isLR ? 'row-resize' : 'col-resize' }}
      />
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
