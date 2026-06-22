# Stock Trend MVP

株価、業績、ニュース、決算予定、確認タスク、AI分析履歴をローカルで管理する調査補助アプリです。

このアプリのスコア、AI分析、メモ表示は機械的な整理・要約であり、投資判断ではありません。売買推奨や将来株価の断定は行いません。

## 起動方法

```powershell
npm install
npm run dev
```

ブラウザで以下を開きます。

```text
http://127.0.0.1:3000
```

別のアプリが3000番を使っている場合は、ポートを変えて起動してください。

```powershell
npm run dev -- -p 3001
```

その場合は `http://127.0.0.1:3001` を開きます。

## 検証コマンド

```powershell
npm run typecheck
npm run test
npm run build
```

主要導線のブラウザ確認はPlaywright smoke testでも確認できます。

```powershell
npm run test:e2e
```

このE2Eは `http://127.0.0.1:3010` を使って一時的にアプリを起動し、Edgeで確認します。実LLM APIは呼びません。ポートを変えたい場合は、以下のように指定します。

```powershell
$env:E2E_PORT="3011"
npm run test:e2e
```

PlaywrightのUIモードで確認したい場合:

```powershell
npm run test:e2e:ui
```

依存が未導入の場合は、このプロジェクトでは `pnpm-lock.yaml` に合わせて次を使うのが安全です。

```powershell
corepack pnpm install
```

## 主な機能

- 銘柄登録、編集、削除
- 株価CSVテンプレート出力、プレビュー、取り込み
- 株価チャート、移動平均線、トレンドスコア
- 株価Mock API更新
- 業績CSVテンプレート出力、プレビュー、取り込み
- 業績Mock API更新
- 成長率、成長性スコア、財務安全性スコア、総合調査スコア
- ウォッチリスト、確認水準メモ
- リスクメモ、リスクスコア
- ニュース管理、決算カレンダー、確認タスク
- Mock LLM / 実LLM API Route
- AI分析履歴、検索、比較、差分表示、Markdown/JSONエクスポート
- LLM送信設定、利用ログ、回数制限
- CSVインポート履歴
- 銘柄ごとの株価データだけ削除、業績データだけ削除
- 設定画面からのlocalStorageバックアップ/復元

## CSVテンプレート

株価CSV:

```csv
date,open,high,low,close,volume
2026-01-05,100,105,98,103,1200000
2026-01-06,103,108,102,107,1500000
```

業績CSV:

```csv
fiscalYear,revenue,operatingIncome,netIncome,eps,operatingCashFlow,freeCashFlow,equityRatio,roe,roic,marketCap,per,pbr,psr
2022,100000,10000,7000,70,12000,8000,55,12,9,500000,30,3,5
2023,120000,14000,9000,90,15000,10000,58,14,10,650000,35,4,5.4
```

取り込み前にプレビューを表示します。エラーがある場合は保存されません。同じ日付の株価データ、同じ会計年度の業績データは、後から取り込んだデータで更新します。

CSVインポート履歴には件数、ファイル名、成否を保存します。CSV本文全文は保存しません。

## データ保存

データ保存はlocalStorageです。初回起動時、既存データがない場合のみサンプル銘柄を読み込みます。既存データは上書きしません。

主な保存対象:

- 銘柄、株価、業績
- ウォッチリスト、リスクメモ、ニュース、決算予定、確認タスク
- AI分析履歴、LLM送信設定、LLM利用ログ
- CSVインポート履歴

β版運用前や実データ投入前は、設定画面の「β版データバックアップ」からlocalStorageバックアップJSONを保存してください。復元は上書き方式です。詳しい手順は [docs/beta-backup-guide.md](docs/beta-backup-guide.md) を参照してください。

## β版開始時点への復旧

β版開始時点はGitの初期コミットとして保存し、タグ `beta-0.1.0` を付けています。

コードをβ版開始時点に戻して確認したい場合は、以下を使います。

```powershell
git checkout beta-0.1.0
```

localStorageに保存された銘柄データやAI分析履歴はGitでは戻りません。設定画面の「β版データバックアップ」で保存したJSONを使って復元してください。

## APIキーと実LLM

実LLMはサーバー側Route Handler経由で呼び出します。APIキーはブラウザ側コード、localStorage、利用ログには保存しません。

`.env.local.example` を参考に `.env.local` を作成してください。

```text
OPENAI_API_KEY=your-openai-api-key
OPENAI_MODEL=gpt-5-mini
```

`.env.local` は `.gitignore` 対象です。

株価API・業績APIの設定画面にもAPIキー欄がありますが、β版では安全のためAPIキーをlocalStorageへ保存しません。Mock APIでの動作確認を優先してください。

## 手動確認

初めて使う場合は [docs/beginner-guide.md](docs/beginner-guide.md) を先に読むと、起動からCSV取り込みまで順番に確認できます。

ブラウザでの確認手順は [docs/manual-checklist.md](docs/manual-checklist.md) を参照してください。

E2Eは主要導線が壊れていないかを短時間で確認するためのものです。見た目の読みやすさ、スマホ幅、長文AI分析の見え方は手動チェックリストで確認してください。

β版までの変更内容は [docs/beta-change-summary.md](docs/beta-change-summary.md) にまとめています。

## 未実装・制限

- 実株価API・実業績APIの本格接続
- ユーザー認証
- サーバーDB保存
- 複数端末同期
- localStorageバックアップの世代管理や差分復元

## 次に追加するとよい機能

- 手動確認チェックリストのE2E自動化
- APIプロバイダ別の安全なサーバー側接続
- AI分析履歴のタグ付けと横断検索強化
