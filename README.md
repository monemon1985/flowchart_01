# フローチャート作成ツール

複数の役割者（最大6人）が関わる業務フローを、スイムレーン形式で可視化するWebアプリ。

- 四角（アクション/状況）・ひし形（ディシジョン）・角丸四角（開始/終了）をドラッグ＆ドロップで配置
- 横フロー / 縦フローを切り替え可能（自動整列つき）
- URL共有・JSON保存/読込・PNG/SVG書き出し
- Undo/Redo・自動保存（localStorage）
- テンプレート3種（稟議承認・問い合わせ対応・データ分析プロジェクト）を同梱

## 開発

```bash
npm install
npm run dev
```

## ビルド

```bash
npm run build
```

`main` ブランチへのpushで GitHub Actions が自動的にビルドし、GitHub Pages へデプロイします
（初回のみ、リポジトリの Settings → Pages → Source を「GitHub Actions」に設定してください）。
