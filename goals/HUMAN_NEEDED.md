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
