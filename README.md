# Stock Trend MVP

株価、業績、ニュース、決算予定、確認タスク、AI分析履歴をローカルで整理する、長期投資候補の調査補助アプリです。

このアプリのスコア、チャート、AI分析、メモ表示は、入力済みデータを機械的に整理するためのものです。投資判断ではありません。取引判断や将来株価の断定は行いません。

## 主な機能

- 銘柄管理: 銘柄の登録、編集、削除
- 株価分析: 株価CSV取り込み、CSVプレビュー、チャート、移動平均線、トレンドスコア
- 業績分析: 業績CSV取り込み、CSVプレビュー、成長率、成長性スコア、財務安全性スコア、総合調査スコア
- 調査管理: ウォッチリスト、確認水準メモ、リスクメモ、ニュース、決算予定、確認タスク
- AI分析: Mock LLM / 実LLM API Route、AI分析履歴、検索、比較、差分表示、Markdown/JSONエクスポート
- データ保全: CSVインポート履歴、localStorageバックアップ/復元
- 品質確認: TypeScript検証、単体テスト、Playwright E2E smoke test

## 起動方法

```powershell
npm install
npm run dev
```

ブラウザで以下を開きます。

```text
http://127.0.0.1:3000
```

3000番ポートが別アプリで使われている場合は、別ポートで起動してください。

```powershell
npm run dev -- -p 3001
```

その場合は `http://127.0.0.1:3001` を開きます。

依存関係を入れ直す場合、このプロジェクトでは `pnpm-lock.yaml` に合わせて次を使うのが安全です。

```powershell
corepack pnpm install
```

## テスト方法

```powershell
npm run typecheck
npm run test
npm run build
npm run test:e2e
```

E2Eは `http://127.0.0.1:3010` を使って一時的にアプリを起動し、主要導線を確認します。実LLM APIは呼びません。

ポートを変えたい場合:

```powershell
$env:E2E_PORT="3011"
npm run test:e2e
```

PlaywrightのUIモードで確認したい場合:

```powershell
npm run test:e2e:ui
```

## GitHub Actions CI

`main` へのpushとpull requestでGitHub Actions CIが動きます。

CIで実行する内容:

- `pnpm install --frozen-lockfile`
- `pnpm run typecheck`
- `pnpm run test`
- `pnpm run build`
- `pnpm run test:e2e -- --reporter=line`

CIは `pnpm-lock.yaml` を基準に依存関係を入れ、Playwrightの `chromium` をインストールしてE2E smoke testを実行します。実LLM API、実株価API、実業績APIは呼びません。APIキーやGitHub Secretsも不要です。

CIが失敗した場合は、まずローカルで次を実行して再現してください。

```powershell
npm run typecheck
npm run test
npm run build
npm run test:e2e -- --reporter=line
```

E2Eの失敗時は、GitHub Actionsのartifactに `test-results` や `playwright-report` が保存される場合があります。これらはGit管理対象には含めません。

## データ保存とバックアップ

データ保存はブラウザのlocalStorageです。サーバーDBは使っていません。

主な保存対象:

- 銘柄、株価、業績
- ウォッチリスト、リスクメモ、ニュース、決算予定、確認タスク
- AI分析履歴、LLM送信設定、LLM利用ログ
- CSVインポート履歴

localStorageのデータはGitでは管理されません。実データを入れる前や大きな取り込み前は、設定画面の「β版データバックアップ」からバックアップJSONを保存してください。復元は上書き方式です。

詳しい手順は [docs/beta-backup-guide.md](docs/beta-backup-guide.md) を参照してください。

## CSV取り込み

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

## 実APIと環境変数

実LLM、株価API、業績APIはサーバー側Route Handler経由で呼び出します。APIキーはブラウザ側コード、localStorage、利用ログには保存しません。

実APIを使う場合は、`.env.local.example` を参考に `.env.local` を作成してください。

```text
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5-mini
LLM_API_BASE_URL=
LLM_API_FORMAT=

STOCK_PRICE_API_KEY=
STOCK_PRICE_API_BASE_URL=

FUNDAMENTAL_API_KEY=
FUNDAMENTAL_API_BASE_URL=
```

`.env.local` は `.gitignore` 対象です。GitHubへpushしないでください。共有するのは `.env.local.example` だけです。

LLMは既定ではOpenAI Responses APIを使います。OpenAI互換のChat Completionsを使う場合は、サーバー側環境変数で次のように設定します。

```text
LLM_API_BASE_URL=https://api.deepseek.com
LLM_API_FORMAT=chat-completions
OPENAI_MODEL=deepseek-v4-flash
```

DeepSeekなどChat Completions経路のAPIキーは、サーバープロセスのシステム環境変数 `DEEPSEEK_API_KEY` から読みます。実キーをコード、Git、画面、localStorage、ログに残さないでください。汎用上書きとして `LLM_API_KEY` も使えますが、これもサーバー側環境変数だけで扱います。

実LLMの手動疎通を行う場合は、Next.jsサーバーを起動し、必要なサーバー側環境変数を設定したうえで次を実行します。このスクリプトはCIでは実行しません。

```powershell
node scripts/live-llm-smoke.mjs
```

設定画面ではAPIプロバイダ名やMockモードを管理できますが、APIキーは入力・保存しません。株価API・業績APIの実接続は、ブラウザから直接外部APIへfetchせず、`/api/stock-prices` と `/api/fundamentals` のサーバー側Route Handlerを通します。β版ではMock APIでの動作確認を優先してください。

株価APIは日本株・米国株の地域情報をサーバー側Routeへ渡します。日本株は `7203` のような4桁コードを `7203.T` に正規化し、地域に応じて `JPY` / `USD` を株価データへ付与します。外部APIキーはヘッダーで扱い、URLクエリやlocalStorageには保存しません。

実株価APIの手動疎通を行う場合は、Next.jsサーバーを起動し、サーバー側の `.env.local` に株価API設定を入れたうえで次を実行します。このスクリプトはCIでは実行しません。

```powershell
node scripts/live-stock-smoke.mjs
```

`STOCK_PRICE_API_BASE_URL` は、APIキーをURLに含めず、サーバー側ヘッダー認証で呼べるエンドポイントを指定してください。実プロバイダごとのURL仕様は運用時に確認してください。

## β版タグ

β版開始時点のコードには `beta-0.1.0` タグを付けています。

コードだけをβ版開始時点で確認したい場合:

```powershell
git checkout beta-0.1.0
```

localStorageに保存された銘柄データ、CSV履歴、AI分析履歴はGitタグでは戻りません。必要な場合はバックアップJSONから復元してください。

## 関連ドキュメント

- 初心者向け説明書: [docs/beginner-guide.md](docs/beginner-guide.md)
- β版バックアップガイド: [docs/beta-backup-guide.md](docs/beta-backup-guide.md)
- β版運用チェックシート: [docs/beta-operation-checklist.md](docs/beta-operation-checklist.md)
- β版変更サマリー: [docs/beta-change-summary.md](docs/beta-change-summary.md)
- 手動確認チェックリスト: [docs/manual-checklist.md](docs/manual-checklist.md)
- Design System: [docs/design-system.md](docs/design-system.md)
- 変更履歴: [CHANGELOG.md](CHANGELOG.md)

## 未実装・制限

- プロバイダ別の実株価API・実業績APIレスポンス変換の拡充
- 実株価APIプロバイダごとのライブ疎通確認
- ユーザー認証
- サーバーDB保存
- 複数端末同期
- localStorageバックアップの世代管理や差分復元

## 次に追加するとよい機能

- localStorageバックアップの世代管理
- APIプロバイダ別の安全なサーバー側接続
- AI分析履歴のタグ付けと横断検索強化
