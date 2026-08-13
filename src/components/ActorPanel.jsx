import { useState } from 'react'
import { useFlowStore } from '../store/useFlowStore'
import { ACTOR_COLORS, MAX_ACTORS } from '../store/actorColors'

export default function ActorPanel() {
  const actors = useFlowStore((s) => s.actors)
  const nodes = useFlowStore((s) => s.nodes)
  const addActor = useFlowStore((s) => s.addActor)
  const renameActor = useFlowStore((s) => s.renameActor)
  const setActorColor = useFlowStore((s) => s.setActorColor)
  const removeActor = useFlowStore((s) => s.removeActor)
  const [editingId, setEditingId] = useState(null)
  const [colorPickerId, setColorPickerId] = useState(null)

  function handleRemove(actor) {
    const count = nodes.filter((n) => n.data?.actorId === actor.id).length
    const message =
      count > 0
        ? `「${actor.name}」を削除します。レーン内の${count}個のノードも一緒に削除されます。よろしいですか？`
        : `「${actor.name}」を削除しますか？`
    if (confirm(message)) {
      removeActor(actor.id)
    }
  }

  return (
    <aside className="w-48 shrink-0 border-l border-slate-200 bg-slate-50 p-3 flex flex-col gap-3">
      <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
        役割者 ({actors.length}/{MAX_ACTORS})
      </h2>
      <ul className="flex flex-col gap-2">
        {actors.map((actor) => (
          <li key={actor.id} className="flex items-center gap-2 group">
            <button
              type="button"
              onClick={() => setColorPickerId(colorPickerId === actor.id ? null : actor.id)}
              className="w-4 h-4 rounded-full border border-black/10 shrink-0"
              style={{ background: actor.color.border }}
              title="色を変更"
            />
            {editingId === actor.id ? (
              <input
                autoFocus
                defaultValue={actor.name}
                onBlur={(e) => {
                  renameActor(actor.id, e.target.value.trim() || actor.name)
                  setEditingId(null)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') e.target.blur()
                }}
                className="flex-1 min-w-0 text-sm border border-slate-300 rounded px-1"
              />
            ) : (
              <span
                onDoubleClick={() => setEditingId(actor.id)}
                className="flex-1 min-w-0 truncate text-sm text-slate-700"
                title="ダブルクリックで名前変更"
              >
                {actor.name}
              </span>
            )}
            <button
              type="button"
              onClick={() => handleRemove(actor)}
              className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 text-xs"
              title="削除"
            >
              ✕
            </button>
            {colorPickerId === actor.id && (
              <div className="absolute z-20 mt-8 ml-4 flex gap-1 bg-white border border-slate-200 rounded p-1.5 shadow">
                {ACTOR_COLORS.map((c) => (
                  <button
                    key={c.border}
                    type="button"
                    onClick={() => {
                      setActorColor(actor.id, c)
                      setColorPickerId(null)
                    }}
                    className="w-4 h-4 rounded-full border border-black/10"
                    style={{ background: c.border }}
                  />
                ))}
              </div>
            )}
          </li>
        ))}
      </ul>
      <button
        type="button"
        disabled={actors.length >= MAX_ACTORS}
        onClick={() => addActor()}
        className="text-sm border border-dashed border-slate-300 rounded py-1.5 text-slate-500 hover:border-slate-400 hover:text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        + 役割者を追加
      </button>
    </aside>
  )
}
