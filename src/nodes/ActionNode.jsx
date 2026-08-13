import BaseNode from './BaseNode'
import { NODE_DIMENSIONS } from './nodeDimensions'

export default function ActionNode(props) {
  const { width, height } = NODE_DIMENSIONS.action
  return (
    <BaseNode
      {...props}
      width={width}
      height={height}
      shapeClassName="border-2 border-slate-400 rounded-md shadow-sm"
    />
  )
}
