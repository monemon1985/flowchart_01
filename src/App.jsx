import { useEffect, useState } from 'react'
import { ReactFlowProvider } from '@xyflow/react'
import Toolbar from './components/Toolbar'
import NodePalette from './components/NodePalette'
import ActorPanel from './components/ActorPanel'
import FlowEditor from './components/FlowEditor'
import TemplateDialog from './components/TemplateDialog'
import GalleryGate from './components/GalleryGate'
import GalleryModal from './components/GalleryModal'
import { useFlowStore } from './store/useFlowStore'
import { useGalleryStore } from './store/useGalleryStore'
import { useIsDesktop } from './hooks/useIsDesktop'
import { readStateFromUrl, clearUrlHash } from './utils/shareUrl'

export default function App() {
  const nodes = useFlowStore((s) => s.nodes)
  const loadState = useFlowStore((s) => s.loadState)
  const [templateOpen, setTemplateOpen] = useState(false)
  const [galleryGateOpen, setGalleryGateOpen] = useState(false)
  const [galleryOpen, setGalleryOpen] = useState(false)
  const [nodePaletteOpen, setNodePaletteOpen] = useState(false)
  const [actorPanelOpen, setActorPanelOpen] = useState(false)
  const galleryUnlocked = useGalleryStore((s) => s.unlocked)
  const isDesktop = useIsDesktop()

  function handleOpenGallery() {
    if (galleryUnlocked) {
      setGalleryOpen(true)
    } else {
      setGalleryGateOpen(true)
    }
  }

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
        <Toolbar
          onOpenTemplates={() => setTemplateOpen(true)}
          onOpenGallery={handleOpenGallery}
          onOpenNodePalette={() => setNodePaletteOpen(true)}
          onOpenActorPanel={() => setActorPanelOpen(true)}
        />
        <div className="flex flex-1 min-h-0">
          {isDesktop && <NodePalette />}
          <FlowEditor />
          {isDesktop && <ActorPanel />}
        </div>
      </div>

      {!isDesktop && nodePaletteOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-50 flex"
          onClick={() => setNodePaletteOpen(false)}
        >
          <div className="h-full" onClick={(e) => e.stopPropagation()}>
            <NodePalette onClose={() => setNodePaletteOpen(false)} />
          </div>
        </div>
      )}
      {!isDesktop && actorPanelOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-50 flex justify-end"
          onClick={() => setActorPanelOpen(false)}
        >
          <div className="h-full" onClick={(e) => e.stopPropagation()}>
            <ActorPanel onClose={() => setActorPanelOpen(false)} />
          </div>
        </div>
      )}

      {templateOpen && <TemplateDialog onClose={() => setTemplateOpen(false)} />}
      {galleryGateOpen && (
        <GalleryGate
          onClose={() => setGalleryGateOpen(false)}
          onUnlocked={() => {
            setGalleryGateOpen(false)
            setGalleryOpen(true)
          }}
        />
      )}
      {galleryOpen && <GalleryModal onClose={() => setGalleryOpen(false)} />}
    </ReactFlowProvider>
  )
}
