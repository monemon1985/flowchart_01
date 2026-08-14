import { useCallback, useEffect, useRef } from 'react'
import { ReactFlow, Background, Controls, useReactFlow } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useFlowStore } from '../store/useFlowStore'
import { useUiPrefsStore } from '../store/useUiPrefsStore'
import { useClipboardStore } from '../store/useClipboardStore'
import { findLaneAt } from '../utils/laneHitTest'
import ActionNode from '../nodes/ActionNode'
import DecisionNode from '../nodes/DecisionNode'
import TerminatorNode from '../nodes/TerminatorNode'
import LaneNode from '../nodes/LaneNode'
import GroupFrameNode from '../nodes/GroupFrameNode'
import LabeledEdge from '../edges/LabeledEdge'

function isEditableTarget(el) {
  return el?.tagName === 'INPUT' || el?.tagName === 'TEXTAREA' || el?.isContentEditable
}

const nodeTypes = {
  action: ActionNode,
  decision: DecisionNode,
  terminator: TerminatorNode,
  lane: LaneNode,
  groupFrame: GroupFrameNode,
}

const edgeTypes = {
  labeled: LabeledEdge,
}

const defaultEdgeOptions = {
  type: 'labeled',
}

export default function FlowEditor() {
  const nodes = useFlowStore((s) => s.nodes)
  const edges = useFlowStore((s) => s.edges)
  const onNodesChange = useFlowStore((s) => s.onNodesChange)
  const onEdgesChange = useFlowStore((s) => s.onEdgesChange)
  const onConnectAction = useFlowStore((s) => s.onConnect)
  const addNode = useFlowStore((s) => s.addNode)
  const newEdgeArrowStart = useUiPrefsStore((s) => s.newEdgeArrowStart)
  const newEdgeArrowEnd = useUiPrefsStore((s) => s.newEdgeArrowEnd)
  const newEdgeStrokeWidth = useUiPrefsStore((s) => s.newEdgeStrokeWidth)
  const wrapperRef = useRef(null)
  const { screenToFlowPosition } = useReactFlow()

  const onConnect = useCallback(
    (connection) =>
      onConnectAction(connection, {
        arrowStart: newEdgeArrowStart,
        arrowEnd: newEdgeArrowEnd,
        strokeWidth: newEdgeStrokeWidth,
      }),
    [onConnectAction, newEdgeArrowStart, newEdgeArrowEnd, newEdgeStrokeWidth],
  )

  const onDragOver = useCallback((e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }, [])

  const onDrop = useCallback(
    (e) => {
      e.preventDefault()
      const shape = e.dataTransfer.getData('application/flowchart-shape')
      if (!shape) return

      const point = screenToFlowPosition({ x: e.clientX, y: e.clientY })
      const laneNode = findLaneAt(nodes, point)
      if (!laneNode) return

      addNode(laneNode.data.actorId, shape, {
        x: point.x - laneNode.position.x,
        y: point.y - laneNode.position.y,
      })
    },
    [nodes, addNode, screenToFlowPosition],
  )

  const pasteClipboard = useFlowStore((s) => s.pasteClipboard)
  const { getNodes, getEdges } = useReactFlow()
  const mousePosRef = useRef({ x: 0, y: 0 })

  useEffect(() => {
    function onMouseMove(e) {
      mousePosRef.current = { x: e.clientX, y: e.clientY }
    }
    function onKeyDown(e) {
      const meta = e.metaKey || e.ctrlKey
      if (!meta || isEditableTarget(document.activeElement)) return

      if (e.key === 'c' || e.key === 'C') {
        const selectedNodes = getNodes().filter((n) => n.selected && n.type !== 'lane')
        if (selectedNodes.length === 0) return
        const ids = new Set(selectedNodes.map((n) => n.id))
        const innerEdges = getEdges().filter((ed) => ids.has(ed.source) && ids.has(ed.target))
        useClipboardStore.setState({ nodes: selectedNodes, edges: innerEdges })
      } else if (e.key === 'v' || e.key === 'V') {
        const { nodes: clipNodes, edges: clipEdges } = useClipboardStore.getState()
        if (clipNodes.length === 0) return
        const point = screenToFlowPosition(mousePosRef.current)
        const lane = findLaneAt(getNodes(), point)
        let laneOverride
        if (lane) {
          const minX = Math.min(...clipNodes.map((n) => n.position.x))
          const minY = Math.min(...clipNodes.map((n) => n.position.y))
          laneOverride = {
            actorId: lane.data.actorId,
            dx: point.x - lane.position.x - minX,
            dy: point.y - lane.position.y - minY,
          }
        }
        pasteClipboard(clipNodes, clipEdges, laneOverride)
      }
    }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [getNodes, getEdges, screenToFlowPosition, pasteClipboard])

  return (
    <div ref={wrapperRef} className="flex-1 h-full" onDragOver={onDragOver} onDrop={onDrop}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        defaultEdgeOptions={defaultEdgeOptions}
        minZoom={0.2}
        maxZoom={2}
        fitView
      >
        <Background gap={20} />
        <Controls />
      </ReactFlow>
    </div>
  )
}
