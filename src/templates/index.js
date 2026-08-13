import { ACTOR_COLORS } from '../store/actorColors'

const P0 = { x: 0, y: 0 }

function edge(id, source, target, label = '') {
  return { id, source, target, type: 'labeled', data: { label } }
}

function node(id, type, actorId, label) {
  return { id, type, position: P0, data: { label, actorId } }
}

export const APPROVAL_TEMPLATE = {
  name: '稟議・承認フロー',
  direction: 'LR',
  actors: [
    { id: 'applicant', name: '申請者', color: ACTOR_COLORS[0] },
    { id: 'manager', name: '上長', color: ACTOR_COLORS[1] },
    { id: 'accounting', name: '経理', color: ACTOR_COLORS[2] },
    { id: 'executive', name: '役員', color: ACTOR_COLORS[3] },
  ],
  nodes: [
    node('t1', 'terminator', 'applicant', '開始'),
    node('a1', 'action', 'applicant', '稟議書を作成'),
    node('rework', 'action', 'applicant', '差し戻し対応'),
    node('d1', 'decision', 'manager', '上長が承認？'),
    node('d2', 'decision', 'accounting', '予算内か？'),
    node('d3', 'decision', 'executive', '役員が決裁？'),
    node('a4', 'action', 'executive', '決裁書に押印'),
    node('t2', 'terminator', 'executive', '終了'),
  ],
  edges: [
    edge('e1', 't1', 'a1'),
    edge('e2', 'a1', 'd1'),
    edge('e3', 'd1', 'd2', '承認'),
    edge('e4', 'd1', 'rework', '却下'),
    edge('e5', 'rework', 'a1', '再申請'),
    edge('e6', 'd2', 'd3', '予算内'),
    edge('e7', 'd2', 'rework', '予算超過'),
    edge('e8', 'd3', 'a4', '決裁'),
    edge('e9', 'd3', 'rework', '却下'),
    edge('e10', 'a4', 't2'),
  ],
}

export const SUPPORT_TEMPLATE = {
  name: '問い合わせ・クレーム対応',
  direction: 'LR',
  actors: [
    { id: 'customer', name: '顧客', color: ACTOR_COLORS[0] },
    { id: 'frontdesk', name: '受付', color: ACTOR_COLORS[1] },
    { id: 'department', name: '担当部署', color: ACTOR_COLORS[2] },
    { id: 'admin', name: '管理者', color: ACTOR_COLORS[3] },
  ],
  nodes: [
    node('t1', 'terminator', 'customer', '問い合わせ発生'),
    node('a1', 'action', 'frontdesk', '内容をヒアリング'),
    node('d1', 'decision', 'frontdesk', '自己解決可能？'),
    node('a2', 'action', 'frontdesk', '回答して完了'),
    node('t2', 'terminator', 'frontdesk', '終了'),
    node('a3', 'action', 'department', '担当部署へ引き継ぎ'),
    node('a4', 'action', 'department', '調査・対応'),
    node('d2', 'decision', 'department', 'エスカレーション必要？'),
    node('a5', 'action', 'admin', '管理者が対応'),
    node('a6', 'action', 'department', '顧客へ回答'),
    node('t3', 'terminator', 'customer', '終了'),
  ],
  edges: [
    edge('e1', 't1', 'a1'),
    edge('e2', 'a1', 'd1'),
    edge('e3', 'd1', 'a2', 'できる'),
    edge('e4', 'd1', 'a3', 'できない'),
    edge('e5', 'a2', 't2'),
    edge('e6', 'a3', 'a4'),
    edge('e7', 'a4', 'd2'),
    edge('e8', 'd2', 'a5', '必要'),
    edge('e9', 'd2', 'a6', '不要'),
    edge('e10', 'a5', 'a6'),
    edge('e11', 'a6', 't3'),
  ],
}

export const ANALYSIS_TEMPLATE = {
  name: 'データ分析プロジェクト',
  direction: 'LR',
  actors: [
    { id: 'requester', name: '依頼者', color: ACTOR_COLORS[0] },
    { id: 'analyst', name: 'アナリスト', color: ACTOR_COLORS[1] },
    { id: 'reviewer', name: 'レビュアー', color: ACTOR_COLORS[2] },
  ],
  nodes: [
    node('t1', 'terminator', 'requester', '開始'),
    node('a1', 'action', 'requester', '分析を依頼'),
    node('a2', 'action', 'analyst', 'データ取得'),
    node('a3', 'action', 'analyst', '分析・可視化'),
    node('a4', 'action', 'analyst', '修正'),
    node('d1', 'decision', 'reviewer', 'レビューOK？'),
    node('a5', 'action', 'reviewer', 'レポート承認'),
    node('a6', 'action', 'requester', '報告を受領'),
    node('t2', 'terminator', 'requester', '終了'),
  ],
  edges: [
    edge('e1', 't1', 'a1'),
    edge('e2', 'a1', 'a2'),
    edge('e3', 'a2', 'a3'),
    edge('e4', 'a3', 'd1'),
    edge('e5', 'd1', 'a5', 'OK'),
    edge('e6', 'd1', 'a4', '差し戻し'),
    edge('e7', 'a4', 'a3'),
    edge('e8', 'a5', 'a6'),
    edge('e9', 'a6', 't2'),
  ],
}

export const TEMPLATES = [APPROVAL_TEMPLATE, SUPPORT_TEMPLATE, ANALYSIS_TEMPLATE]
