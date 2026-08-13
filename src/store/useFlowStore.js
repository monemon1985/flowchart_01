import { create, useStore } from 'zustand'
import { temporal } from 'zundo'
import { applyNodeChanges, applyEdgeChanges, addEdge as addEdgeToList } from '@xyflow/react'
import { nanoid } from '../utils/nanoid'
import { ACTOR_COLORS, MAX_ACTORS } from './actorColors'
import { autoLayout } from '../utils/layout'

const STORAGE_KEY = 'flowchart01-state'
export const STATE_VERSION = 1

// 選択状態(selected)やドラッグ中フラグ(dragging)だけの違いは
// Undo履歴上「変化なし」とみなすための比較用スナップショット。
function stripVisualState(state) {
  const strip = ({ selected, dragging, ...rest }) => rest
  return JSON.stringify({
    direction: state.direction,
    actors: state.actors,
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
  const { version, direction, actors, nodes, edges } = state
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ version, direction, actors, nodes, edges }))
}

const initial = loadFromStorage() ?? emptyState()

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

      onConnect(connection) {
        set((state) => ({
          edges: addEdgeToList(
            { ...connection, id: nanoid(), type: 'labeled', data: { label: '' } },
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

      loadState(newState) {
        set({
          version: STATE_VERSION,
          direction: newState.direction ?? 'LR',
          actors: newState.actors ?? defaultActors(),
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
