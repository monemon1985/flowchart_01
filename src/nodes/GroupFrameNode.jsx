export default function GroupFrameNode({ data }) {
  return (
    <div className="relative w-full h-full rounded-xl border-2 border-dashed border-slate-400/70 bg-slate-400/5 pointer-events-none">
      <span className="absolute top-1 left-3 bg-white px-2 text-xs font-semibold text-slate-500 rounded shadow-sm">
        {data.name}
      </span>
    </div>
  )
}
