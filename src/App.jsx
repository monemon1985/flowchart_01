import { useEffect, useState } from 'react'
import { ReactFlowProvider } from '@xyflow/react'
import Toolbar from './components/Toolbar'
import NodePalette from './components/NodePalette'
import ActorPanel from './components/ActorPanel'
import FlowEditor from './components/FlowEditor'
import TemplateDialog from './components/TemplateDialog'
import { useFlowStore } from './store/useFlowStore'
import { readStateFromUrl, clearUrlHash } from './utils/shareUrl'

export default function App() {
  const nodes = useFlowStore((s) => s.nodes)
  const loadState = useFlowStore((s) => s.loadState)
  const [templateOpen, setTemplateOpen] = useState(false)

  useEffect(() => {
    const shared = readStateFromUrl()
    if (shared) {
      if (confirm('共有されたフローチャートを読み込みます。現在の内容は上書きされます。よろしいですか？')) {
        loadState(shared)
      }
      clearUrlHash()
    } else if (nodes.length === 0) {
      setTemplateOpen(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <ReactFlowProvider>
      <div className="flex flex-col h-full w-full">
        <Toolbar onOpenTemplates={() => setTemplateOpen(true)} />
        <div className="flex flex-1 min-h-0">
          <NodePalette />
          <FlowEditor />
          <ActorPanel />
        </div>
      </div>
      {templateOpen && <TemplateDialog onClose={() => setTemplateOpen(false)} />}
    </ReactFlowProvider>
  )
}
