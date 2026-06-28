# Changelog

このアプリは調査補助ツールです。各変更は、入力済みデータの整理、確認、記録をしやすくするためのものです。

## beta-0.1.0 - β版初期タグ

タグ: `beta-0.1.0`

### 追加・整備した主な機能

- 銘柄管理
- 株価CSV取り込み、CSVプレビュー、テンプレート出力
- 業績CSV取り込み、CSVプレビュー、テンプレート出力
- 株価チャート、移動平均線、トレンドスコア
- 業績成長率、成長性スコア、財務安全性スコア、総合調査スコア
- ウォッチリスト、確認水準メモ、リスクメモ、ニュース、決算予定、確認タスク
- Mock APIによる株価、業績、ニュース、決算予定更新
- Mock LLM / 実LLM API Route
- AI分析生成、保存、履歴表示
- AI分析履歴の検索、比較、差分表示
- structuredReport形式のAI分析レポート
- Markdown/JSONエクスポート
- LLM送信設定、利用ログ、回数制限、入力サイズ制御
- CSVインポート履歴
- 株価データだけ削除、業績データだけ削除
- localStorageバックアップ/復元

### CSV取り込み改善

- 株価CSVと業績CSVのテンプレートを追加
- 取り込み前プレビューを追加
- 追加予定件数、更新予定件数、エラー件数を表示
- 行番号付きエラー表示を追加
- CSV本文全文を履歴に保存しない方針を明確化

### AI分析履歴・比較・差分

- AI分析履歴の横断一覧を追加
- 銘柄名、ティッカー、分析タイプ、日付、キーワードで検索できるように整理
- 2件比較とcontextHashによる鮮度表示を追加
- 差分サマリー、追加項目、削除項目、変更候補の表示を追加
- 旧content形式のAI分析履歴も表示・コピー・比較できるように互換対応

### UI/UXとDesign System

- Design Systemを導入
- `PageHeader`、`SectionCard`、`MetricCard`、`StatusBadge`、`ActionButton`、`InfoAlert`、`DataTable`、`Toolbar`、`CollapsibleSection` などを整備
- ダッシュボード、銘柄一覧、銘柄詳細、CSV取り込み、AI分析、AI履歴の情報設計を改善
- AI履歴比較では、変化あり項目を優先表示する構成へ整理

### テストと運用

- TypeScript検証、単体テスト、Next.js buildを整備
- Playwright E2E smoke testを追加
- スマホ幅の主要画面表示をE2Eで確認
- 手動確認チェックリストを追加
- β版バックアップガイドを追加
- GitHub専用Private repositoryへリモート退避

### 既知の制限

- 実株価API・実業績APIの本格接続は未実装
- サーバーDB保存は未実装
- 複数端末同期は未実装
- localStorageバックアップは単純な上書き復元
