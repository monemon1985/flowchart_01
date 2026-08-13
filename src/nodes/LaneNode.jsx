import { useFlowStore } from '../store/useFlowStore'
import { LANE_HEADER } from './nodeDimensions'

export default function LaneNode({ data }) {
  const direction = useFlowStore((s) => s.direction)
  const actor = useFlowStore((s) => s.actors.find((a) => a.id === data.actorId))
  if (!actor) return null

  const isLR = direction === 'LR'

  return (
    <div
      className="relative w-full h-full rounded-lg"
      style={{ background: `${actor.color.bg}66`, border: `2px solid ${actor.color.border}` }}
    >
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
        <span
          style={
            isLR
              ? { writingMode: 'vertical-rl', transform: 'rotate(180deg)' }
              : undefined
          }
        >
          {actor.name}
        </span>
      </div>
    </div>
  )
}
