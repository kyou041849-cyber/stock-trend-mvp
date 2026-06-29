# Human Needed

## Now Needed

なし。

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

## Later / Deferred

- 実株価API・実業績APIの本格接続は別Goalで扱う。
- G007の実株価APIライブ疎通では、人間がプロバイダ、base URL、APIキーを `.env.local` に設定して `node scripts/live-stock-smoke.mjs` を実行する。
- localStorageバックアップの世代管理や履歴整理は別Goalで扱う。
