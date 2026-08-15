import { useFlowStore } from '../store/useFlowStore'
import { GROUP_LABEL_STRIP } from './nodeDimensions'

export default function GroupFrameNode({ data }) {
  const direction = useFlowStore((s) => s.direction)
  const isLR = direction === 'LR'

  return (
    <div className="relative w-full h-full rounded-xl border-2 border-dashed border-slate-400/70 bg-slate-400/5 pointer-events-none">
      <div
        className={`absolute flex items-center justify-center bg-white border border-dashed border-slate-400/70 text-xs font-semibold text-slate-500 ${
          isLR ? 'left-0 top-0 h-full rounded-l-lg' : 'top-0 left-0 w-full rounded-t-lg'
        }`}
        style={{
          width: isLR ? GROUP_LABEL_STRIP : '100%',
          height: isLR ? '100%' : GROUP_LABEL_STRIP,
        }}
      >
        <span className="px-1 truncate" style={isLR ? { writingMode: 'vertical-rl' } : undefined}>
          {data.name}
        </span>
      </div>
    </div>
  )
}
