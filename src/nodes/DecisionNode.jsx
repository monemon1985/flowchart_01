import BaseNode from './BaseNode'
import { NODE_DIMENSIONS } from './nodeDimensions'

export default function DecisionNode(props) {
  const { width, height } = NODE_DIMENSIONS.decision
  return (
    <BaseNode
      {...props}
      width={width}
      height={height}
      shapeClassName="border-2 border-amber-500 bg-amber-50 [clip-path:polygon(50%_0%,100%_50%,50%_100%,0%_50%)]"
      textClassName="text-xs px-10"
    />
  )
}
