# HANDOFF — 開発引き継ぎ資料

このドキュメントは、このリポジトリの開発経緯を知らない別のAI（または人間）が、
このファイルと現在のコードだけを読んで開発を継続できることを目的に書かれている。
「なぜそうなっているか」を優先して記述する（コードを読めば分かる「何をしているか」は最小限に留める）。

READMEはユーザー向け（使い方・ビルド方法）。このファイルは開発者/AI向け（内部構造・既知の不具合・過去の設計判断の理由）。

---

## 1. 何のアプリか

複数の役割者（最大6人、`MAX_ACTORS`）が関わる業務フローを、スイムレーン形式のフローチャートとして
Web上で作成・編集・共有できるツール。React Flow（`@xyflow/react`）ベース。

- URL: https://monemon1985.github.io/flowchart_01/
- リポジトリ: `git@github.com:monemon1985/flowchart_01.git`
- `main`ブランチにpushすると GitHub Actions が自動ビルド・GitHub Pagesへデプロイする
  （`.github/workflows/deploy.yml`）。**PRは無く、直接`main`にpushして本番反映される運用。**

## 2. 技術スタック

- React 19 / Vite 8 / Tailwind CSS v4
- `@xyflow/react`（React Flow） v12 — ノード・エッジのcanvas全般
- `@dagrejs/dagre` — 自動整列（rank/order計算）
- `zustand` v5 + `zundo`（`temporal()`ミドルウェア） — 状態管理 + Undo/Redo
- `html-to-image` — SVG/PNG書き出し（**既知のバグあり、後述**）
- `@supabase/supabase-js` — 「みんなのフロー」ギャラリー機能のバックエンド
- `lz-string` — URL共有時の状態圧縮（`shareUrl.js`）

パッケージマネージャ: npm。Lintは `oxlint`（`npm run lint`）。テストは無し（テストコード自体が存在しない）。

## 3. ディレクトリ構成と各ファイルの責務

```
src/
├── App.jsx                      アプリのルート。モーダル群の開閉状態を持つ
├── main.jsx                     エントリポイント
├── components/
│   ├── Toolbar.jsx               上部ツールバー（Undo/Redo, 方向切替, 自動整列,
│   │                              レーン間隔設定, 保存/読込, URL共有, ギャラリー, 書き出し）
│   ├── FlowEditor.jsx            ReactFlowのcanvas本体。ノード/エッジ登録、DnD、
│   │                              コンテキストメニュー、キーボードショートカット等
│   ├── NodePalette.jsx           左サイドバー：ノード種別のパレット（DnD元）
│   ├── ActorPanel.jsx            右サイドバー：役割者(actor)一覧・追加・削除・色・
│   │                              レーン幅リサイズUI・グループ化
│   ├── TemplateDialog.jsx        テンプレート選択モーダル（起動時 or ボタンから）
│   ├── GalleryGate.jsx           ギャラリー閲覧用の合言葉入力モーダル
│   └── GalleryModal.jsx          「みんなのフロー」一覧・投稿・上書き保存モーダル
├── nodes/
│   ├── nodeDimensions.js         ノードサイズ・レーン関連の定数（下記4章参照）
│   ├── BaseNode.jsx              各図形ノードの共通ラッパー（ハンドル・編集UI等）
│   ├── ActionNode.jsx            四角（アクション）
│   ├── DecisionNode.jsx          ひし形（分岐）
│   ├── TerminatorNode.jsx        角丸四角（開始/終了）
│   ├── LaneNode.jsx              レーン(帯)本体。NodeResizeControlでの手動リサイズを実装
│   ├── NoteNode.jsx              付箋（レーンに属さない自由配置ノード）
│   └── GroupFrameNode.jsx        複数レーンを束ねるグループ枠（合成ノード、自動生成のみ）
├── edges/
│   ├── LabeledEdge.jsx           カスタムエッジ（ラベル・矢印スタイル・分岐/合流描画）
│   ├── EdgeContextMenu.jsx       エッジ右クリックメニュー
│   └── strokeWidthPresets.js     線幅プリセット定数
├── store/
│   ├── useFlowStore.js           ★中核。フローチャートの状態全体（下記5章参照）
│   ├── useGalleryStore.js        ギャラリー(Supabase)関連の状態
│   ├── useClipboardStore.js      コピー&ペースト用の一時状態
│   ├── useUiPrefsStore.js        UI設定（永続化不要な軽い設定）
│   └── actorColors.js            役割者の色パレット定数・MAX_ACTORS
├── utils/
│   ├── layout.js                 ★中核。自動整列・レーンリサイズのレイアウト計算（下記6章参照）
│   ├── exportUtils.js            SVG/PNG書き出し（★既知のバグあり、7章参照）
│   ├── shareUrl.js               状態をURLハッシュに圧縮/復元してURL共有
│   ├── fileUtils.js              JSON保存/読込（ファイルダウンロード/アップロード）
│   ├── edgeGeometry.js           エッジのfloating接続点計算等の幾何ユーティリティ
│   ├── laneHitTest.js            ドラッグ中のノードがどのレーン上にあるか判定
│   └── nanoid.js                 ID生成
├── hooks/
│   ├── useIsDesktop.js           レスポンシブ判定（デスクトップ/モバイルでUI出し分け）
│   └── useAutoFitFontSize.js     付箋(NoteNode)のテキストサイズ自動縮小
├── templates/index.js            同梱テンプレート3種の定義データ
└── lib/supabaseClient.js         Supabaseクライアント初期化（env var使用）
```

## 4. データモデル

`useFlowStore`が保持する状態（永続化・Undo対象。詳細は`src/store/useFlowStore.js`）:

```js
{
  version: 1,                 // localStorage/JSON保存のスキーマバージョン。互換性が壊れたら上げる
  direction: 'LR' | 'TB',     // 横フロー / 縦フロー
  actors: [
    { id, name, color, laneSize? } // laneSize未設定=自動幅。手動リサイズすると数値が入る
  ],
  groups: [
    { id, name, actorIds: [] }     // 複数レーンをまとめる枠（GroupFrameNodeとして自動描画）
  ],
  nodes: [ /* React Flowのノード配列。type別に形が異なる。下記参照 */ ],
  edges: [ /* React Flowのエッジ配列。全て type: 'labeled' */ ],
  flowLength: number | null,  // 全レーン共通の「フロー方向の長さ」の手動上書き値。nullなら自動
  laneGap: number,            // レーン同士の間隔(px)。デフォルト16(`LANE_GAP`定数)
}
```

### ノードの種類（`node.type`）

| type | 説明 | 位置の扱い |
|---|---|---|
| `terminator` / `action` / `decision` | 図形ノード（開始終了/アクション/分岐） | `parentId: 'lane-{actorId}'`, `extent: 'parent'` でレーン内座標として保持 |
| `lane` | レーン(帯)本体 | `position`と`style.width/height`が矩形。`autoLayout`/`resizeLanes`が毎回作り直す**合成ノード**（IDは`lane-{actorId}`で安定） |
| `groupFrame` | 複数レーンを囲む枠 | 完全に合成・毎回作り直し。`draggable:false, selectable:false` |
| `note` | 付箋 | レーンに属さない絶対座標配置。自動整列(`autoLayout`)の対象外で位置がそのまま素通しされる |

`lane`と`groupFrame`は**永続化はされるが実質的には毎回のレイアウト計算で上書きされる導出データ**。
新しいノードtype/機能を追加するときは、この「実データはactors/content nodes/edgesで、
lane・groupFrameは表示用に都度合成される」という設計を崩さないこと。

## 5. `useFlowStore.js` の設計上の要点

- `zundo`の`temporal()`でUndo/Redoを実装。`partialize`で`direction/actors/groups/flowLength/laneGap/nodes/edges`のみを
  履歴対象にし、`equality`は`stripVisualState()`で`selected`/`dragging`フラグを除いた内容比較にしている
  （選択状態の変化だけでUndo履歴が汚れるのを防ぐため）。
- **ドラッグ/リサイズ操作は「1ジェスチャー=1つのUndoエントリ」にする**ため、明示的に`pause()`/`resume()`を呼ぶ箇所がある：
  - `onNodesChange`: `position`変更で`dragging:true`→`pause()`、`dragging:false`（ドロップ確定）→`resume()`。
    **ここは「dragging===falseのpositionイベントの時だけresumeする」という条件が重要**。
    以前、「ドラッグ以外の変更なら何でもresume」という実装にしたところ、`NodeResizeControl`が
    内部で発火する`dimensions`型の`onNodesChange`イベントがresumeを誤爆させ、レーンリサイズ側の
    意図的なpauseを横から解除してしまうバグがあった（詳細は8章）。
  - `LaneNode.jsx`のリサイズハンドラも同様のpause/resume制御を持つ（"revert-then-commit"パターン、
    下記8章参照）。**新しくドラッグ/リサイズ系の操作を追加するときはこのパターンを踏襲すること。**
- `setActorLaneSize` / `setFlowLength` / `setLaneGap` はいずれも`autoLayout()`（dagre再実行）ではなく
  `resizeLanes()`（軽量な再配置、6章参照）を使う。**dagreを再実行すると、ユーザーが手動でドラッグした
  ノードの位置が毎回リセットされてしまうため**、意図的に使い分けている。

## 6. `layout.js` のレイアウトアルゴリズム

3つのエクスポート関数があり、**呼び分けの理由を理解することが重要**：

| 関数 | 呼ばれる場面 | ノード位置の扱い |
|---|---|---|
| `autoLayout()` | 「自動整列」ボタン、方向切替、テンプレート読込、actor追加/削除等 | dagreを2段階（全体のフロー順序＋レーン内の並び）で実行し、**全ノードの位置を作り直す** |
| `resizeLanes()` | レーン幅リサイズ、フロー長リサイズ、レーン間隔変更 | dagreを実行**せず**、既存ノードの位置から「中身が必要とする最小サイズ」を逆算し、レーン矩形だけ再計算。ノード位置は基本維持（はみ出す場合のみクランプ、後述） |
| `layoutEmptyLanes()` | コンテンツノードが1つも無い場合の共通処理（上記2つの内部から呼ばれる） | レーン矩形のみ計算 |

### レーン幅の制約（現在の仕様）

- `actor.laneSize`（ユーザーが手動設定した値）には、**コンテンツサイズによる下限クランプをかけない**。
  `NodeResizeControl`の`minWidth`/`minHeight={MIN_LANE_CROSS_SIZE}`（`LaneNode.jsx`、`LANE_HEADER + 60` = 116px）
  だけが絶対下限。
- レーンが中身より小さくリサイズされた場合、`clampContentToLaneRects()`が各コンテンツノードの
  交差軸方向の位置を確定したレーン矩形の内側に押し込む（クランプ）。
- レーンは`crossCursor += laneCrossLength + laneGap`で直交方向に隙間なく積み上げられているため、
  あるレーンを縮めると後続のレーンは自動的に詰めて配置される＝レーン間隔は常に`laneGap`で一定に保たれる
  （追加のロジックなしで自然に成立する設計）。
- `laneSize`が未設定のレーンは`uniformCrossLength`（コンテンツ駆動の自動デフォルト幅、全レーン共通）を使う。
  この値の計算自体は変更していない。

新しい「レーンの制約」に関する要望が来た場合は、まずこの`clampContentToLaneRects()`と
`crossCursor`の積み上げロジック（`autoLayout`と`resizeLanes`の両方に同じロジックが複製されている点に注意、
片方だけ直さないこと）を見ること。

## 7. 既知の未解決バグ（重要）

### 7.1 SVG/PNG書き出しで矢印が完全に欠落する

- **現象**: 「SVG書き出し」を実行すると、ノード・レーンの位置・サイズは正しく書き出されるが、
  **エッジ（矢印）が1本も出力されない**。
- **原因**: `html-to-image`（v1.11.13）の内部実装 `node_modules/html-to-image/lib/clone-node.js` の
  `cloneChildren()`関数が、クローン対象要素が`isSVGElement()`と判定されるとき早期returnし、
  子孫の`<g>`/`<path>`要素へのスタイルコピー処理をスキップする。React Flow v12は各エッジを
  個別の`<svg>`要素として描画する実装のため、この早期returnに引っかかり、シリアライズ後の
  出力から矢印の`<g>`/`<path>`タグが丸ごと消える。
- **試した対処（未解決）**: キャプチャ直前に各エッジ`<svg>`へ明示的な`width`/`height`/`viewBox`を
  設定する処理（`exportUtils.js`の`withExplicitEdgeSvgSize()`）を追加したが、これは
  「別の既知問題（サイズ0のネストSVGがoverflow:visibleに従わずクリップされる問題）」向けの対策であり、
  今回の「タグそのものが消える」問題の直接原因ではないため効果がなかった。
- **次に試すべき方向性**: `html-to-image`を別ライブラリ（例: `modern-screenshot`, `dom-to-image-more`等、
  同種の問題を修正済みのフォーク）に置き換える、または矢印だけ別レイヤーとして手動でSVG文字列に
  合成してから`html-to-image`の出力に重ねる、等。

### 7.2 PNG書き出しがタイムアウトする

- **現象**: 「PNG書き出し」を実行すると`EXPORT_TIMEOUT_MS`（30秒）まで待っても完了せず、
  タイムアウトエラーになる。SVG書き出しは（矢印欠落はあるが）完了はする。
- **未調査**: `toPng()`が何で止まっているか（フォント読み込み待ち、巨大画像のラスタライズ、
  無限ループ等）の切り分けはまだ行っていない。`exportUtils.js`の`toFn(viewportEl, {...})`呼び出し周りに
  ブラウザのDevToolsやconsole.logで直接張り付いて調査するのが早い。

**ユーザーへの暫定案内**: SVG書き出しはノード配置の確認用途になら使えるが、矢印入りの完成版が
必要な場合は現状どちらの書き出し形式も実用にならない。この2点は次の開発サイクルの優先課題として扱うこと。

## 8. デバッグ時に役立つパターン・過去の教訓

- **zundoの履歴を直接覗く**: `pastStates`/`futureStates`配列を一時的に`window`へ生やして
  （例: `App.jsx`で`window.__flowStore = useFlowStore`）ブラウザのconsoleから
  `window.__flowStore.temporal.getState().pastStates`のように直接検査すると、
  「Undoが1ステップにまとまらない」系のバグの原因（余計な`resume()`呼び出し等）を素早く特定できる。
  デバッグ後は必ず削除すること（本番に残さない）。
- **"revert-then-commit while paused" パターン**（`LaneNode.jsx`の`handleResizeStart/Resize/ResizeEnd`が実装例）:
  ドラッグ/リサイズのような「連続イベントが多数発火するが、Undo履歴には最終結果だけを1件残したい」操作は、
  1. `onXxxStart`: 開始時点の値をrefに保存し、`temporal.pause()`
  2. `onXxx`（連続発火）: pauseされたまま、ライブに状態を更新（UIには反映されるが履歴には積まれない）
  3. `onXxxEnd`: pauseされたまま、いったん開始時点の値に戻す（revert）→ `setTimeout(..., 0)`で
     次のマイクロタスク以降に`resume()`してから最終値をcommitする
  という3段構成にすると、React Flowの内部イベント発火順序に依存せず確実に1エントリだけ記録できる。
  新しいドラッグ系/リサイズ系の操作（例: ノードの自由配置リサイズ等）を追加する際はこの実装を複製・流用するとよい。
- **`getNodesBounds()`（`@xyflow/react`）は信用しない**: `useReactFlow()`経由の`getNodesBounds`は、
  `parentId`を持つ子ノード（レーン内のコンテンツノード）の絶対座標・実測サイズの解決に失敗し、
  実際の図よりはるかに小さい範囲を返すことがある（`exportUtils.js`の`measureNodesBounds()`が
  DOM直接計測に切り替えた理由）。座標計算で不可解に小さい/ゼロに近い値が出た場合、
  まずこのAPIの戻り値を疑うこと。
- **ブラウザ自動化ツール（javascript_exec等）の初回結果がstaleなことがある**: 状態変更直後の
  最初の1回のツール呼び出しがstale/nullな結果を返し、同じ呼び出しをもう一度実行すると
  正しい値が返ることがあった。ツール自体のクセであり、アプリのバグではないので、
  怪しい結果が出たらまず再実行して確認すること。

## 9. Supabaseギャラリー機能（「みんなのフロー」）

- 個別ユーザー認証は無く、**anon key + RLS + クラス共通の合言葉ゲート**という設計。
  `useGalleryStore.js`の`unlock(passphrase)`が`import.meta.env.VITE_GALLERY_PASSPHRASE`と
  平文比較するだけの簡易ゲート（本格的な認証ではない、教室内利用が前提）。
- 必要な環境変数（ローカル開発では`.env.local`、本番はGitHub Secrets経由）:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
  - `VITE_GALLERY_PASSPHRASE`
- GitHub Actions（`.github/workflows/deploy.yml`）がビルド時にこれらをリポジトリのSecrets
  （`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `GALLERY_PASSPHRASE`）から注入する。
- Supabase側のテーブル定義・RLSポリシーはこのリポジトリには存在しない（Supabaseダッシュボード側の設定）。
  もし新しいカラムやテーブルが必要になった場合は、Supabase側の変更とこのリポジトリの
  `useGalleryStore.js`の対応する関数（`fetchFlows`/`publish`/`updateFlow`等）を両方変更する必要がある。

## 10. デプロイ・ビルド

```bash
npm install
npm run dev      # 開発サーバー
npm run build    # 本番ビルド（dist/）
npm run lint      # oxlint
```

`main`へのpushで自動デプロイ（`.github/workflows/deploy.yml`）。初回のみリポジトリの
Settings → Pages → Source を「GitHub Actions」に設定する必要がある（READMEにも記載）。
**テストコードは存在しない**ため、変更後は`npm run build`が通ることと、
可能であればブラウザで実際に操作して確認すること。

## 11. 未着手・将来の課題（このドキュメント作成時点で把握しているもの）

- 7章に記載のSVG/PNG書き出しバグ2件（矢印欠落・PNGタイムアウト）は最優先で未解決。
- 近接する矢印/エッジラベルが重なって見分けがつかなくなる問題（過去のフィードバックにあり、未着手）。
  `LabeledEdge.jsx`・`edgeGeometry.js`のfloating接続点計算が関係する可能性が高い。
