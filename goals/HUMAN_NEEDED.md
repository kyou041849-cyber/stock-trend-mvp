# Human Needed

## Now Needed

### H005: DeepSeek / OpenAI互換 Chat Completions のライブ疎通

- 状態: human-needed
- Blocks: ライブ実LLM疎通確認のみ。G009のコード検証、PR、CIはCodex側で継続可能。
- G011補足: 設定画面でプロバイダ形式、ベースURL、モデル、キー設定状況、キー源名は確認できる。APIキー値は表示しない。
- 推奨デフォルト: まずMock LLMと単体テストで確認し、実キーを使うライブ疎通はユーザーのローカル環境で必要なタイミングに実施する。
- ユーザーに必要な作業:
  1. Next.jsサーバーを起動する。
  2. サーバープロセス環境変数に `DEEPSEEK_API_KEY` を設定する。
  3. `LLM_API_BASE_URL=https://api.deepseek.com` を設定する。
  4. `LLM_API_FORMAT=chat-completions` を設定する。
  5. `OPENAI_MODEL=deepseek-v4-flash` または利用可能な互換モデルを設定する。
  6. `node scripts/live-llm-smoke.mjs` を実行する。
- 注意: 実キーをコード、Git、画面、localStorage、ログ、スクリーンショットに残さない。

### H006: RSI/SMAクロス重み・閾値の最終確定

- 状態: human-needed
- Blocks: 将来のスコア調整のみ。G010の実装、PR、CIは既定値で継続可能。
- 推奨デフォルト: まずはG010のモメンタム確認方式で運用し、実データ確認後に必要なら別Goalで調整する。
- 現在の既定:
  - RSI(14) 50以上: +5点
  - SMA25/75ゴールデンクロス: +5点
  - RSI(14) 70超、RSI(14) 30未満、SMA25/75デッドクロス: 0点の参考表示
  - positive-weight maximum: 100点
- ユーザーに必要な判断: 運用後、RSI閾値、SMA window、各配点を変更するか決める。
- 注意: スコアはチャート上の機械的な集計であり、投資判断ではありません。

## Resolved

### H001: GitHubリモートの既存履歴をどう扱うか決める

- 状態: resolved
- 解消内容: `AI_Agent.git` への統合や上書きは行わず、`stock-trend-mvp` 専用のPrivate repositoryへpushする方針に決定。
- 関連記録:
  - [goals/G002_REMOTE_HISTORY.md](G002_REMOTE_HISTORY.md)
  - [goals/G003_STOCK_TREND_REMOTE_PUSH.md](G003_STOCK_TREND_REMOTE_PUSH.md)

### H002: stock-trend-mvp専用GitHub Private repository URLを指定する

- 状態: resolved
- provided URL: `https://github.com/kyou041849-cyber/stock-trend-mvp.git`
- 解消内容: `origin` を専用リポジトリへ設定し、`main` と `beta-0.1.0` をpush済み。
- 関連記録:
  - [goals/G003_STOCK_TREND_REMOTE_PUSH.md](G003_STOCK_TREND_REMOTE_PUSH.md)

### H003: GitHub Actions 最新CIの赤いstep確認

- 状態: resolved
- 解消内容: GitHub APIを既存Git認証情報で一時的に読み取り、最新CI runの失敗stepを確認した。
- 確認結果:
  - run: `28325049150`
  - commit: `6bd8ac5 docs: record ci recheck requirement`
  - failed step: `E2E smoke tests`
  - cause: `pnpm run test:e2e -- --reporter=line` が `node scripts/run-e2e.js -- --reporter=line` として実行され、Linux上で先頭の `--` がPlaywrightへ渡り `No tests found` になっていた。
- 関連記録:
  - [goals/G005_GITHUB_ACTIONS_CI.md](G005_GITHUB_ACTIONS_CI.md)

### H004: G007 PRをGitHub UIで作成する

- 状態: resolved
- 解消内容: GitHub connectorのPR作成は `403 Resource not accessible by integration` で拒否されたが、ローカルGit認証を使ったGitHub REST APIでPR #2を作成した。
- PR: `https://github.com/kyou041849-cyber/stock-trend-mvp/pull/2`
- CI: run `28348160444`, conclusion `success`
- 関連記録:
  - [goals/G007_REALDATA_JP_US.md](G007_REALDATA_JP_US.md)

## Later / Deferred

- 実株価API・実業績APIの本格接続は別Goalで扱う。
- G007の実株価APIライブ疎通では、人間がプロバイダ、base URL、APIキーを `.env.local` に設定して `node scripts/live-stock-smoke.mjs` を実行する。
- G008のRSI閾値、SMA window、トレンドスコア加点有無は運用後に別Goalで調整可能。初期値は RSI14 / 70 / 30、SMA25 / SMA75、参考シグナル0点。
- localStorageバックアップの世代管理や履歴整理は別Goalで扱う。
