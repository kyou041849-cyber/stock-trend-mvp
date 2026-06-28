# Human Needed

## Now Needed

### H003: GitHub Actions 最新CIの赤いstep確認

- 状態: open
- Blocks: G005 CI成功判定
- 推奨アクション: GitHubの `stock-trend-mvp` → `Actions` → 最新 `CI` run を開き、成功/失敗と、失敗している場合は赤いstep名とエラーログ先頭から原因部分を共有する。
- 背景:
  - `gh` CLI はローカル未導入。
  - GitHub connector はpush-triggered workflow runを返さなかった。
  - ブラウザ経由のActions画面確認は、この環境ではブラウザ接続/Chrome不足で確認できなかった。
  - `origin/main` は `3d4c3c3 ci: stabilize GitHub Actions validation` を指している。
- Codex側で確認済み:
  - `pnpm install --frozen-lockfile`: success
  - `pnpm run typecheck`: success
  - `pnpm run test`: success
  - `pnpm run build`: success
  - `pnpm run test:e2e -- --reporter=line`: success, 3 passed
- 注意:
  - 実LLM APIは呼んでいない。
  - APIキーやSecretsは使っていない。
  - `CI=true node scripts/run-e2e.js -- --reporter=line` はローカルChromium未インストールで失敗したが、GitHub Actionsでは事前にChromiumをinstallするため、CI failureの直接証拠としては扱わない。

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

## Later / Deferred

- 実株価API・実業績APIの本格接続は別Goalで扱う。
- localStorageバックアップの世代管理や履歴整理は別Goalで扱う。
