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

## Later / Deferred

- GitHub Actions CI追加は次フェーズ。
- 実株価API・実業績APIの本格接続は別Goalで扱う。
- localStorageバックアップの世代管理や履歴整理は別Goalで扱う。
