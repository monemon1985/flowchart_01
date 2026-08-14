import { create } from 'zustand'
import { DEFAULT_STROKE_WIDTH } from '../edges/strokeWidthPresets'

// 「次に接続を作るときのデフォルト矢印スタイル」だけを保持する、
// ドキュメント内容ではない一時的なUI設定。永続化・Undo履歴・共有には含めない。
export const useUiPrefsStore = create(() => ({
  newEdgeArrowStart: false,
  newEdgeArrowEnd: true,
  newEdgeStrokeWidth: DEFAULT_STROKE_WIDTH,
}))

export function setNewEdgeArrowStyle(arrowStart, arrowEnd) {
  useUiPrefsStore.setState({ newEdgeArrowStart: arrowStart, newEdgeArrowEnd: arrowEnd })
}

export function setNewEdgeStrokeWidth(strokeWidth) {
  useUiPrefsStore.setState({ newEdgeStrokeWidth: strokeWidth })
}
