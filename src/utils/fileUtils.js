import { STATE_VERSION } from '../store/useFlowStore'

export function downloadJson(state, filename = 'flowchart.json') {
  const { direction, actors, nodes, edges } = state
  const payload = { version: STATE_VERSION, direction, actors, nodes, edges }
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function readJsonFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result)
        if (data.version !== STATE_VERSION) {
          reject(new Error('このファイルは対応していないバージョンです。'))
          return
        }
        resolve(data)
      } catch {
        reject(new Error('JSONファイルの読み込みに失敗しました。'))
      }
    }
    reader.onerror = () => reject(new Error('ファイルの読み込みに失敗しました。'))
    reader.readAsText(file)
  })
}
