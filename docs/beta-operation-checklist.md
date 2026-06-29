# β版運用チェックシート

このチェックシートは、β版を安全に使い始めるための確認表です。このアプリは調査補助ツールであり、投資判断ではありません。

## β版開始前チェック

- `npm run typecheck` が成功している
- `npm run test` が成功している
- `npm run build` が成功している
- `npm run test:e2e` が成功している
- GitHub Actions CIが `main` の最新commitで成功している
- Gitの作業ツリーがcleanである
- `origin` が `stock-trend-mvp` 専用リポジトリを向いている
- `beta-0.1.0` タグが存在する
- `.env.local` がGit管理対象に含まれていない
- 設定画面からlocalStorageバックアップJSONを保存済み

## 実データ投入前チェック

- 現在のlocalStorageをバックアップ済み
- CSVの列名がテンプレートと一致している
- 株価データの日付、業績データの会計年度に重複があるか確認した
- 大量データを入れる前に、少量データでプレビューを確認した
- APIキーや個人情報をCSVやメモに混ぜていない

## 銘柄追加時チェック

- ティッカー、会社名、市場、セクターを入力した
- 日本株/米国株など、市場と通貨の扱いを確認した
- メモにAPIキーや不要な個人情報を入れていない
- 追加後、銘柄一覧と銘柄詳細が開ける

## CSV取り込み時チェック

- まずテンプレートをダウンロードした
- ファイル選択または貼り付け後、プレビューを確認した
- 追加予定件数と更新予定件数を確認した
- エラー件数が0件である
- 同じ日付または同じ会計年度は後から取り込むデータで更新されることを理解した
- 取り込み後、チャートまたは業績表で反映を確認した
- 取り込み後、必要に応じてlocalStorageバックアップJSONを保存した

## AI分析生成時チェック

- 分析対象の銘柄が正しい
- LLM送信項目のON/OFFを確認した
- 入力サイズが警告または上限に達していない
- 実LLMではなくMock LLMで確認できる内容は先にMockで試した
- 生成結果に注意文が含まれている
- 生成結果は調査補助として扱い、別データで確認する
- 保存後、AI履歴に表示される

## 実LLM API利用時チェック

- `.env.local` に必要な環境変数を設定した
- `.env.local` をGit管理に含めていない
- APIキーをlocalStorage、メモ、CSV、スクリーンショットに含めていない
- OpenAI Responsesを使う場合は `OPENAI_API_KEY` と `OPENAI_MODEL` をサーバー側環境変数で設定した
- DeepSeekなどOpenAI互換Chat Completionsを使う場合は `LLM_API_BASE_URL`、`LLM_API_FORMAT=chat-completions`、`OPENAI_MODEL` を設定し、キーはサーバープロセスの `DEEPSEEK_API_KEY` または `LLM_API_KEY` で渡した
- 設定画面の「現在のLLMプロバイダ（サーバー側）」で形式、モデル、キー設定状況、キー源名を確認した。APIキー値は画面に出さない
- 利用回数制限と入力サイズを確認した
- 自動テストでは実LLM APIを呼ばない
- エラー時は再試行前に入力サイズ、回数制限、環境変数を確認する
- 実LLMの手動疎通は必要に応じて `node scripts/live-llm-smoke.mjs` で確認する

## 株価API・業績API利用時チェック

- `.env.local` に `STOCK_PRICE_API_KEY` と `STOCK_PRICE_API_BASE_URL` を設定した
- `.env.local` に `FUNDAMENTAL_API_KEY` と `FUNDAMENTAL_API_BASE_URL` を設定した
- `STOCK_PRICE_API_BASE_URL` にAPIキーを含めていない
- 株価APIの実取得対象は日本株なら `.T` 付き、米国株なら通常ティッカーで取得できるか確認した
- プロバイダがヘッダー認証に対応しているか、またはサーバー側で安全に扱える方式か確認した
- APIキーを設定画面、localStorage、CSV、メモ、スクリーンショットに含めていない
- 設定画面のAPIキー欄が「サーバー側環境変数で設定」になっている
- 実取得は `/api/stock-prices` または `/api/fundamentals` のサーバー側Route Handler経由で行われる
- 自動テストとE2Eでは実株価API・実業績APIを呼ばない
- 実株価APIの手動疎通は必要に応じて `node scripts/live-stock-smoke.mjs` で確認する
- 環境変数未設定時は、画面が落ちずに未設定メッセージを表示する

## localStorageバックアップタイミング

- 実データ投入前
- CSVで大きくデータを入れる前
- Mock APIや手入力でデータを大きく更新する前
- AI分析履歴を多く保存した後
- β版を人に見せる前
- 復元作業を行う前

## Gitコミットタイミング

- typecheck/test/build/E2Eが通った後
- READMEやdocsを更新した後
- UIや保存処理を変更した後
- バックアップや復元の手順を変えた後
- push前に `git status --short --branch` で差分を確認した後

## 不具合発見時の記録項目

- 発見日時
- 使用ブラウザ
- 画面名
- 操作手順
- 期待した動き
- 実際の動き
- エラーメッセージ
- スクリーンショットの有無
- localStorageバックアップの有無
- 再現できるか

## 復元が必要になったときの対応

1. 現在の状態を別名でバックアップする
2. 復元したいバックアップJSONを選択する
3. 復元対象キー一覧を確認する
4. 上書き復元であることを確認する
5. 復元を実行する
6. ページを再読み込みする
7. 銘柄一覧、銘柄詳細、AI履歴、CSV履歴を確認する

## GitHubへpushする前の確認

- `git status --short --branch` が想定どおり
- push先が `https://github.com/kyou041849-cyber/stock-trend-mvp.git`
- `.env.local` が追跡されていない
- `node_modules/`、`.next/`、`screenshots/`、ZIP、logが追跡されていない
- APIキーらしい実値が含まれていない
- `npm run typecheck` が成功している
- `npm run test` が成功している
- `npm run build` が成功している
- `npm run test:e2e` が成功している
- `--force` pushを使わない

## GitHub Actions CI確認

- CIは `main` へのpushとpull requestで実行される
- CIは `pnpm-lock.yaml` を使って依存関係を入れる
- CIは `typecheck`、単体テスト、build、E2E smoke testを実行する
- CIでは実LLM API、実株価API、実業績APIを呼ばない
- CIではAPIキーやGitHub Secretsを要求しない
- CIが失敗したら、まずローカルで次を実行する

```powershell
npm run typecheck
npm run test
npm run build
npm run test:e2e -- --reporter=line
```

- E2E失敗時はGitHub Actionsのartifactに `test-results` や `playwright-report` が保存される場合がある
- artifactやテスト結果ディレクトリはGit管理に含めない
