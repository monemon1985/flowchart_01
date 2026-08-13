import { useCallback, useRef } from 'react'
import { ReactFlow, Background, Controls, MarkerType, useReactFlow } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useFlowStore } from '../store/useFlowStore'
import ActionNode from '../nodes/ActionNode'
import DecisionNode from '../nodes/DecisionNode'
import TerminatorNode from '../nodes/TerminatorNode'
import LaneNode from '../nodes/LaneNode'
import LabeledEdge from '../edges/LabeledEdge'

const nodeTypes = {
  action: ActionNode,
  decision: DecisionNode,
  terminator: TerminatorNode,
  lane: LaneNode,
}

const edgeTypes = {
  labeled: LabeledEdge,
}

const defaultEdgeOptions = {
  type: 'labeled',
  markerEnd: { type: MarkerType.ArrowClosed, color: '#64748b' },
}

export default function FlowEditor() {
  const nodes = useFlowStore((s) => s.nodes)
  const edges = useFlowStore((s) => s.edges)
  const onNodesChange = useFlowStore((s) => s.onNodesChange)
  const onEdgesChange = useFlowStore((s) => s.onEdgesChange)
  const onConnect = useFlowStore((s) => s.onConnect)
  const addNode = useFlowStore((s) => s.addNode)
  const wrapperRef = useRef(null)
  const { screenToFlowPosition } = useReactFlow()

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
      const laneNode = nodes.find(
        (n) =>
          n.type === 'lane' &&
          point.x >= n.position.x &&
          point.x <= n.position.x + (n.style?.width ?? 0) &&
          point.y >= n.position.y &&
          point.y <= n.position.y + (n.style?.height ?? 0),
      )
      if (!laneNode) return

      addNode(laneNode.data.actorId, shape, {
        x: point.x - laneNode.position.x,
        y: point.y - laneNode.position.y,
      })
    },
    [nodes, addNode, screenToFlowPosition],
  )

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
