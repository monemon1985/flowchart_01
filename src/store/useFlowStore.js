import { create, useStore } from 'zustand'
import { temporal } from 'zundo'
import { applyNodeChanges, applyEdgeChanges, addEdge as addEdgeToList, MarkerType } from '@xyflow/react'
import { nanoid } from '../utils/nanoid'
import { ACTOR_COLORS, MAX_ACTORS } from './actorColors'
import { autoLayout } from '../utils/layout'
import { DEFAULT_STROKE_WIDTH } from '../edges/strokeWidthPresets'

const ARROW_COLOR = '#64748b'
function arrowMarker() {
  return { type: MarkerType.ArrowClosed, color: ARROW_COLOR }
}

const STORAGE_KEY = 'flowchart01-state'
export const STATE_VERSION = 1

// 選択状態(selected)やドラッグ中フラグ(dragging)だけの違いは
// Undo履歴上「変化なし」とみなすための比較用スナップショット。
function stripVisualState(state) {
  const strip = ({ selected, dragging, ...rest }) => rest
  return JSON.stringify({
    direction: state.direction,
    actors: state.actors,
    groups: state.groups,
    nodes: (state.nodes ?? []).map(strip),
    edges: (state.edges ?? []).map(strip),
  })
}

function defaultActors() {
  return [
    { id: nanoid(), name: '担当A', color: ACTOR_COLORS[0] },
    { id: nanoid(), name: '担当B', color: ACTOR_COLORS[1] },
  ]
}

function emptyState() {
  const actors = defaultActors()
  return {
    version: STATE_VERSION,
    direction: 'LR',
    actors,
    groups: [],
    nodes: [],
    edges: [],
  }
}

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (parsed.version !== STATE_VERSION) return null
    return parsed
  } catch {
    return null
  }
}

function persist(state) {
  const { version, direction, actors, groups, nodes, edges } = state
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ version, direction, actors, groups, nodes, edges }),
  )
}

const initial = loadFromStorage() ?? emptyState()
if (!initial.groups) initial.groups = []

export const useFlowStore = create(
  temporal(
    (set, get) => ({
      ...initial,

      setDirection(direction) {
        set((state) => {
          const laid = autoLayout({ ...state, direction })
          return { direction, nodes: laid.nodes }
        })
        persist(get())
      },

      autoLayout() {
        set((state) => {
          const laid = autoLayout(state)
          return { nodes: laid.nodes }
        })
        persist(get())
      },

      onNodesChange(changes) {
        // ドラッグ中の連続更新や選択トグルまで Undo 履歴に積まれるのを防ぐ。
        // ドラッグ中(dragging:true)は記録を一時停止し、ドロップ確定時にまとめて1件記録する。
        const isMidDrag = changes.some((c) => c.type === 'position' && c.dragging)
        const temporalApi = useFlowStore.temporal.getState()
        if (isMidDrag) {
          temporalApi.pause()
        } else {
          temporalApi.resume()
        }
        set((state) => ({ nodes: applyNodeChanges(changes, state.nodes) }))
        persist(get())
      },

      onEdgesChange(changes) {
        set((state) => ({ edges: applyEdgeChanges(changes, state.edges) }))
        persist(get())
      },

      onConnect(connection, opts = {}) {
        const { arrowStart = false, arrowEnd = true, strokeWidth = DEFAULT_STROKE_WIDTH } = opts
        set((state) => ({
          edges: addEdgeToList(
            {
              ...connection,
              id: nanoid(),
              type: 'labeled',
              markerStart: arrowStart ? arrowMarker() : undefined,
              markerEnd: arrowEnd ? arrowMarker() : undefined,
              data: { label: '', strokeWidth },
            },
            state.edges,
          ),
        }))
        persist(get())
      },

      updateEdgeLabel(edgeId, label) {
        set((state) => ({
          edges: state.edges.map((e) => (e.id === edgeId ? { ...e, data: { ...e.data, label } } : e)),
        }))
        persist(get())
      },

      updateEdgeArrowStyle(edgeId, { arrowStart, arrowEnd }) {
        set((state) => ({
          edges: state.edges.map((e) =>
            e.id === edgeId
              ? {
                  ...e,
                  markerStart: arrowStart ? arrowMarker() : undefined,
                  markerEnd: arrowEnd ? arrowMarker() : undefined,
                }
              : e,
          ),
        }))
        persist(get())
      },

      updateEdgeStrokeWidth(edgeId, strokeWidth) {
        set((state) => ({
          edges: state.edges.map((e) =>
            e.id === edgeId ? { ...e, data: { ...e.data, strokeWidth } } : e,
          ),
        }))
        persist(get())
      },

      removeEdge(edgeId) {
        set((state) => ({ edges: state.edges.filter((e) => e.id !== edgeId) }))
        persist(get())
      },

      addActor(name) {
        const state = get()
        if (state.actors.length >= MAX_ACTORS) return
        const color = ACTOR_COLORS[state.actors.length % ACTOR_COLORS.length]
        const actor = { id: nanoid(), name: name || `担当${state.actors.length + 1}`, color }
        set({ actors: [...state.actors, actor] })
        get().autoLayout()
      },

      renameActor(actorId, name) {
        set((state) => ({
          actors: state.actors.map((a) => (a.id === actorId ? { ...a, name } : a)),
        }))
        persist(get())
      },

      setActorColor(actorId, color) {
        set((state) => ({
          actors: state.actors.map((a) => (a.id === actorId ? { ...a, color } : a)),
        }))
        persist(get())
      },

      removeActor(actorId) {
        set((state) => ({
          actors: state.actors.filter((a) => a.id !== actorId),
          groups: state.groups
            .map((g) => ({ ...g, actorIds: g.actorIds.filter((id) => id !== actorId) }))
            .filter((g) => g.actorIds.length > 0),
          nodes: state.nodes.filter(
            (n) => n.data?.actorId !== actorId && n.id !== `lane-${actorId}`,
          ),
          edges: state.edges.filter((e) => {
            const removedNodeIds = new Set(
              state.nodes.filter((n) => n.data?.actorId === actorId).map((n) => n.id),
            )
            return !removedNodeIds.has(e.source) && !removedNodeIds.has(e.target)
          }),
        }))
        get().autoLayout()
      },

      /** 選択された役割者(actorIds)を1つの名前付きグループにまとめる。1人は最大1グループ。 */
      createGroup(name, actorIds) {
        set((state) => {
          const idSet = new Set(actorIds)
          const firstIndex = state.actors.findIndex((a) => idSet.has(a.id))
          const members = state.actors.filter((a) => idSet.has(a.id))
          const others = state.actors.filter((a) => !idSet.has(a.id))
          const reordered = [...others]
          reordered.splice(firstIndex, 0, ...members)

          const cleanedGroups = state.groups
            .map((g) => ({ ...g, actorIds: g.actorIds.filter((id) => !idSet.has(id)) }))
            .filter((g) => g.actorIds.length > 0)

          return {
            actors: reordered,
            groups: [...cleanedGroups, { id: nanoid(), name, actorIds }],
          }
        })
        get().autoLayout()
      },

      renameGroup(groupId, name) {
        set((state) => ({
          groups: state.groups.map((g) => (g.id === groupId ? { ...g, name } : g)),
        }))
        persist(get())
      },

      removeGroup(groupId) {
        set((state) => ({ groups: state.groups.filter((g) => g.id !== groupId) }))
        get().autoLayout()
      },

      addNode(actorId, shape, position) {
        const state = get()
        const id = nanoid()
        const label =
          shape === 'terminator' ? '開始' : shape === 'decision' ? '分岐？' : 'アクション'
        const node = {
          id,
          type: shape,
          position: position ?? { x: 40, y: 40 },
          parentId: `lane-${actorId}`,
          extent: 'parent',
          data: { label, actorId },
        }
        set({ nodes: [...state.nodes, node] })
        persist(get())
        return id
      },

      updateNodeText(nodeId, label) {
        set((state) => ({
          nodes: state.nodes.map((n) =>
            n.id === nodeId ? { ...n, data: { ...n.data, label } } : n,
          ),
        }))
        persist(get())
      },

      removeNode(nodeId) {
        set((state) => ({
          nodes: state.nodes.filter((n) => n.id !== nodeId),
          edges: state.edges.filter((e) => e.source !== nodeId && e.target !== nodeId),
        }))
        persist(get())
      },

      /**
       * 複数選択したノード(+その間のエッジ)を貼り付ける。
       * laneOverride が指定された場合はそのレーンへ dx/dy 分だけ平行移動して複製し、
       * 指定がなければ元のレーンに既定オフセットで複製する。
       */
      pasteClipboard(clipNodes, clipEdges, laneOverride) {
        if (clipNodes.length === 0) return
        const OFFSET = 32
        const idMap = new Map(clipNodes.map((n) => [n.id, nanoid()]))

        set((state) => {
          const newNodes = clipNodes.map((n) => ({
            ...n,
            id: idMap.get(n.id),
            selected: true,
            dragging: false,
            data: { ...n.data, actorId: laneOverride?.actorId ?? n.data.actorId },
            parentId: laneOverride ? `lane-${laneOverride.actorId}` : n.parentId,
            position: laneOverride
              ? { x: n.position.x + laneOverride.dx, y: n.position.y + laneOverride.dy }
              : { x: n.position.x + OFFSET, y: n.position.y + OFFSET },
          }))
          const newEdges = clipEdges
            .filter((e) => idMap.has(e.source) && idMap.has(e.target))
            .map((e) => ({
              ...e,
              id: nanoid(),
              source: idMap.get(e.source),
              target: idMap.get(e.target),
              selected: true,
            }))

          return {
            nodes: [...state.nodes.map((n) => ({ ...n, selected: false })), ...newNodes],
            edges: [...state.edges.map((e) => ({ ...e, selected: false })), ...newEdges],
          }
        })
        persist(get())
      },

      loadState(newState) {
        set({
          version: STATE_VERSION,
          direction: newState.direction ?? 'LR',
          actors: newState.actors ?? defaultActors(),
          groups: newState.groups ?? [],
          nodes: newState.nodes ?? [],
          edges: newState.edges ?? [],
        })
        persist(get())
      },

      resetState() {
        const fresh = emptyState()
        set(fresh)
        persist(get())
      },

      loadTemplate(template) {
        set({
          version: STATE_VERSION,
          direction: template.direction ?? 'LR',
          actors: template.actors,
          groups: template.groups ?? [],
          nodes: template.nodes,
          edges: template.edges,
        })
        get().autoLayout()
      },
    }),
    {
      limit: 50,
      partialize: (state) => ({
        direction: state.direction,
        actors: state.actors,
        groups: state.groups,
        nodes: state.nodes,
        edges: state.edges,
      }),
      equality: (a, b) => stripVisualState(a) === stripVisualState(b),
    },
  ),
)

export function useTemporalStore(selector) {
  return useStore(useFlowStore.temporal, selector)
}
