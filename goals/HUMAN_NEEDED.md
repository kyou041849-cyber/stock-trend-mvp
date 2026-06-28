# Human Needed

## Now Needed

### H001: GitHubリモートの既存履歴をどう扱うか決める

- Blocks: G001 GitHubリモートpush完了
- 状態: open
- 推奨デフォルト: GitHub側の既存内容を確認して、必要なら別リポジトリにpushするか、既存リポジトリの内容を取り込む方針を決める。
- 必要な判断:
  1. `https://github.com/kyou041849-cyber/AI_Agent.git` の既存 `main` を残して統合する。
  2. 別の空Private repositoryを作り、そこへpushする。
  3. GitHub側の既存履歴をユーザー判断で削除または置き換える。
- Evidence:
  - local `main`: `7fb1e79 chore: create beta baseline`
  - local tag: `beta-0.1.0`
  - remote `main`: `99793f92a9c5aedeaecb194c825a9fb2196dec4a`
  - remote tags: none
  - push result: `git push -u origin main` rejected with `fetch first`
- 注意:
  - `--force` pushは禁止方針のため実行していません。
  - tag pushは、main pushが拒否されたため部分的なリモート状態を避けて未実行です。

## Later / Deferred

- GitHub Actions CI追加は次フェーズ。
- リモートのREADMEや既存ファイルを統合する場合は別Goalで扱う。
