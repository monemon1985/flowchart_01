import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string'
import { STATE_VERSION } from '../store/useFlowStore'

export function buildShareUrl(state) {
  const { direction, actors, nodes, edges } = state
  const payload = { version: STATE_VERSION, direction, actors, nodes, edges }
  const compressed = compressToEncodedURIComponent(JSON.stringify(payload))
  const url = new URL(window.location.href)
  url.hash = `d=${compressed}`
  return url.toString()
}

export function readStateFromUrl() {
  const hash = window.location.hash
  if (!hash.startsWith('#d=')) return null
  try {
    const compressed = hash.slice(3)
    const json = decompressFromEncodedURIComponent(compressed)
    if (!json) return null
    const data = JSON.parse(json)
    if (data.version !== STATE_VERSION) return null
    return data
  } catch {
    return null
  }
}

export function clearUrlHash() {
  history.replaceState(null, '', window.location.pathname + window.location.search)
}
