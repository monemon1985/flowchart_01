import { useState } from 'react'
import { useFlowStore } from '../store/useFlowStore'
import { ACTOR_COLORS, MAX_ACTORS } from '../store/actorColors'

/** actors配列を「グループのまとまり」と「単独」のブロックに分割する（グループ内は連続配置されている前提） */
function buildBlocks(actors, groups) {
  const groupByActorId = new Map()
  groups.forEach((g) => g.actorIds.forEach((id) => groupByActorId.set(id, g)))

  const blocks = []
  let i = 0
  while (i < actors.length) {
    const group = groupByActorId.get(actors[i].id)
    if (!group) {
      blocks.push({ type: 'single', actor: actors[i] })
      i += 1
      continue
    }
    const members = []
    while (i < actors.length && groupByActorId.get(actors[i].id)?.id === group.id) {
      members.push(actors[i])
      i += 1
    }
    blocks.push({ type: 'group', group, members })
  }
  return blocks
}

export default function ActorPanel() {
  const actors = useFlowStore((s) => s.actors)
  const groups = useFlowStore((s) => s.groups)
  const nodes = useFlowStore((s) => s.nodes)
  const addActor = useFlowStore((s) => s.addActor)
  const renameActor = useFlowStore((s) => s.renameActor)
  const setActorColor = useFlowStore((s) => s.setActorColor)
  const removeActor = useFlowStore((s) => s.removeActor)
  const createGroup = useFlowStore((s) => s.createGroup)
  const removeGroup = useFlowStore((s) => s.removeGroup)
  const [editingId, setEditingId] = useState(null)
  const [colorPickerId, setColorPickerId] = useState(null)
  const [selectedIds, setSelectedIds] = useState(() => new Set())

  function handleRemove(actor) {
    const count = nodes.filter((n) => n.data?.actorId === actor.id).length
    const message =
      count > 0
        ? `「${actor.name}」を削除します。レーン内の${count}個のノードも一緒に削除されます。よろしいですか？`
        : `「${actor.name}」を削除しますか？`
    if (confirm(message)) {
      removeActor(actor.id)
      setSelectedIds((prev) => {
        const next = new Set(prev)
        next.delete(actor.id)
        return next
      })
    }
  }

  function toggleSelect(actorId, e) {
    if (!(e.metaKey || e.ctrlKey)) return
    e.preventDefault()
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.has(actorId) ? next.delete(actorId) : next.add(actorId)
      return next
    })
  }

  function handleCreateGroup() {
    const name = prompt('グループ名を入力してください（例: 東京オフィス）')
    if (!name) return
    createGroup(name, [...selectedIds])
    setSelectedIds(new Set())
  }

  function handleRemoveGroup(group) {
    if (confirm(`「${group.name}」のグループ化を解除しますか？（役割者自体は削除されません）`)) {
      removeGroup(group.id)
    }
  }

  function renderActorRow(actor) {
    const isSelected = selectedIds.has(actor.id)
    return (
      <li
        key={actor.id}
        onClick={(e) => toggleSelect(actor.id, e)}
        className={`flex items-center gap-2 group rounded px-1 -mx-1 ${isSelected ? 'bg-blue-50 ring-1 ring-blue-300' : ''}`}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            setColorPickerId(colorPickerId === actor.id ? null : actor.id)
          }}
          className="w-4 h-4 rounded-full border border-black/10 shrink-0"
          style={{ background: actor.color.border }}
          title="色を変更"
        />
        {editingId === actor.id ? (
          <input
            autoFocus
            defaultValue={actor.name}
            onClick={(e) => e.stopPropagation()}
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
            onDoubleClick={(e) => {
              e.stopPropagation()
              setEditingId(actor.id)
            }}
            className="flex-1 min-w-0 truncate text-sm text-slate-700"
            title="ダブルクリックで名前変更。Cmd/Ctrl+クリックで複数選択"
          >
            {actor.name}
          </span>
        )}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            handleRemove(actor)
          }}
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
                onClick={(e) => {
                  e.stopPropagation()
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
    )
  }

  const blocks = buildBlocks(actors, groups)

  return (
    <aside className="w-48 shrink-0 border-l border-slate-200 bg-slate-50 p-3 flex flex-col gap-3">
      <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
        役割者 ({actors.length}/{MAX_ACTORS})
      </h2>
      <div className="flex flex-col gap-3">
        {blocks.map((block) =>
          block.type === 'single' ? (
            <ul key={block.actor.id}>{renderActorRow(block.actor)}</ul>
          ) : (
            <div key={block.group.id} className="border border-dashed border-slate-300 rounded p-1.5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-semibold text-slate-500 truncate">
                  {block.group.name}
                </span>
                <button
                  type="button"
                  onClick={() => handleRemoveGroup(block.group)}
                  className="text-slate-400 hover:text-red-500 text-xs shrink-0"
                  title="グループ解除"
                >
                  ✕
                </button>
              </div>
              <ul className="flex flex-col gap-2">{block.members.map(renderActorRow)}</ul>
            </div>
          ),
        )}
      </div>

      {selectedIds.size >= 2 && (
        <button
          type="button"
          onClick={handleCreateGroup}
          className="text-sm border border-blue-300 bg-blue-50 text-blue-700 rounded py-1.5 hover:bg-blue-100"
        >
          グループ化 ({selectedIds.size}人)
        </button>
      )}

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
