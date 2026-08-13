import BaseNode from './BaseNode'
import { NODE_DIMENSIONS } from './nodeDimensions'

export default function TerminatorNode(props) {
  const { width, height } = NODE_DIMENSIONS.terminator
  return (
    <BaseNode
      {...props}
      width={width}
      height={height}
      shapeClassName="border-2 border-slate-500 rounded-full shadow-sm bg-slate-50"
    />
  )
}
