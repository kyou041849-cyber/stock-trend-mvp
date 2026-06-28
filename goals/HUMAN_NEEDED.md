# Human Needed

## Now Needed

### H001: GitHubリモートの既存履歴をどう扱うか決める

- Blocks: G001 GitHubリモートpush完了、G002統合方針決定
- 状態: open
- 推奨デフォルト: `stock-trend-mvp` 用に別の空Private repositoryを作成し、そこへpushする。
- 必要な判断:
  1. 別の空Private repositoryを作り、`stock-trend-mvp` をそこへpushする。
  2. `https://github.com/kyou041849-cyber/AI_Agent.git` の中にサブディレクトリとして統合する方針を別Goalで設計する。
  3. GitHub側の既存履歴をユーザー判断で削除または置き換える。
- Evidence:
  - local `main`: `7fb1e79 chore: create beta baseline`
  - local tag: `beta-0.1.0`
  - remote `main`: `99793f92a9c5aedeaecb194c825a9fb2196dec4a`
  - remote tags: none
  - push result: `git push -u origin main` rejected with `fetch first`
  - remote content: `AGENTS.md`, workflow docs, `projects/`, `tools/` などを含むCodex hub構成
  - conclusion: `stock-trend-mvp` の履歴へそのままmergeするのは安全ではない
- 注意:
  - `--force` pushは禁止方針のため実行していません。
  - `beta-0.1.0` tag pushは、main pushが未解決のため未実行です。
  - remote既存履歴を破壊する操作はしていません。

## Later / Deferred

- GitHub Actions CI追加は次フェーズ。
- リモートのREADMEや既存ファイルを統合する場合は別Goalで扱う。

## G003 Now Needed

### H002: stock-trend-mvp専用GitHub Private repository URLを指定する

- Blocks: G003 専用GitHub Private repositoryへのpush
- 状態: open
- 推奨デフォルト: GitHubで空のPrivate repositoryを作成し、そのHTTPS URLを渡す。
- 必要な情報:
  - 例: `https://github.com/kyou041849-cyber/stock-trend-mvp.git`
  - ただし、これは例であり、実際に作成済みの専用リポジトリURLが必要です。
- Evidence:
  - 最新のG003依頼ではURL欄が `<新しいGitHubリポジトリURL>` のまま。
  - 現在の `origin` はまだ `https://github.com/kyou041849-cyber/AI_Agent.git`。
  - `AI_Agent.git` へはpushしない方針。
- 注意:
  - 誤ったリポジトリへのpushを避けるため、URL未指定の状態では `git remote rename`、`git remote add origin`、`git push` を実行しません。
