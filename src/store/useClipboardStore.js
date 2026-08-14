import { create } from 'zustand'

// コピーしたノード/エッジを一時的に保持するだけの、ドキュメント内容ではない
// UI状態。永続化・Undo履歴・共有URL/JSONスキーマには一切含めない。
export const useClipboardStore = create(() => ({
  nodes: [],
  edges: [],
}))
