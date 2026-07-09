# Goal Loop

## Loop Metadata

Loop ID: stock-trend-mvp-remote-push-2026-06-28
Parent thread name: G001 GitHub remote push
Parent thread ID: 019ec675-18fe-7e83-a067-72c80b46ec6f

## Parent Goal

stock-trend-mvp のベータ版開始時点を、Gitで戻せる状態にし、可能ならGitHubリモートにも退避する。

## Strategic Summary

- 既存のベータ版開始コミットは `7fb1e79 chore: create beta baseline`。
- ベータ版開始タグは `beta-0.1.0`。
- `.env.local`、APIキー、生成物、スクリーンショット、ZIPはGit管理対象に含めない。
- GitHub操作では `--force` push を使わない。

## Current Milestone

G014b: localStorage復帰導線UI + 退避データ管理。

## Root Done Evidence

- origin が `https://github.com/kyou041849-cyber/stock-trend-mvp.git` に設定されている。
- `main` と `beta-0.1.0` が安全にpushされている。
- GitHub Actions CIが追加され、typecheck/test/build/E2Eを自動実行する。
- 実LLM API、APIキー、`.env.local` に依存しない検証導線になっている。
- 株価API・業績APIの実取得はサーバー側Route Handlerを通り、APIキーはブラウザ/localStorageへ渡らない。

## Quality Bar

- 実装変更をしない。
- 実LLM APIを呼ばない。
- `.env.local` とAPIキーをpushしない。
- リモートに既存履歴がある場合、force pushしない。

## Non-Goals

- Public/private設定変更。
- 実装変更。
- リモート既存履歴の上書き。

## Approval Boundaries

### Codex may do automatically

- write/update allowed files: `GOAL.md`, `goals/HUMAN_NEEDED.md`
- run validation/review commands: git status/log/tag/remote/ls-files/ls-remote and secret scans
- commit/branch/PR: local Goal Loop record commit only
- push: user-approved target only, no force push

### Human approval required

- changing an existing origin URL
- force push
- deleting or overwriting remote history
- changing GitHub repository visibility/settings
- adding GitHub Actions or deployment settings

## Gap-Closing Goal Map

| ID | Status | Owner | Acceptance | Depends On | Child thread name | Outcome | Acceptance Evidence | Child Packet |
|---|---|---|---|---|---|---|---|---|
| G001 | blocked | manager | codex-verifiable | human decision on remote existing history | none | GitHubリモートpush | main push was attempted and rejected because remote main already contains work; no force push used | n/a |
| G002 | human-needed | manager | human-decision | none | none | GitHubリモート既存履歴の確認と安全な統合方針決定 | remote main was inspected and judged unrelated to stock-trend-mvp; user decision required before any merge/push | [goals/G002_REMOTE_HISTORY.md](goals/G002_REMOTE_HISTORY.md) |
| G006 | accepted | manager | codex-verifiable | none | none | 株価/業績APIをサーバー側Route Handler経由に統一 | server routes, client adapter proxying, settings safety copy, tests, docs, E2E, safety scan, PR, and CI completed | [goals/G006_SERVER_SIDE_MARKET_API.md](goals/G006_SERVER_SIDE_MARKET_API.md) |
| G007 | accepted | manager | codex-verifiable | G006 merged to main | none | 実株価データ接続（日本株 + 米国株） | PR #2 opened; local validation and PR CI succeeded; live provider/base URL/key confirmation remains manual | [goals/G007_REALDATA_JP_US.md](goals/G007_REALDATA_JP_US.md) |
| G008 | accepted | manager | codex-verifiable | G007 merged to main | none | テクニカル指標（RSI）とシグナル拡張 | local validation and PR #3 CI succeeded; main merge remains human | [goals/G008_INDICATORS_SIGNALS.md](goals/G008_INDICATORS_SIGNALS.md) |
| G009 | accepted | manager | codex-verifiable | G008 merged to main | none | LLMプロバイダ可変化（OpenAI互換 Chat Completions対応） | local validation, PR #4, GitHub Actions CI, and main merge succeeded; live DeepSeek smoke remains manual | [goals/G009_LLM_PROVIDER_CONFIG.md](goals/G009_LLM_PROVIDER_CONFIG.md) |
| G010 | accepted | manager | codex-verifiable | G009 merged to main | none | RSI/SMAクロスをトレンド強さスコアへ加点 | local validation, PR #5, and GitHub Actions CI succeeded; main merge remains human | [goals/G010_INDICATOR_SCORING.md](goals/G010_INDICATOR_SCORING.md) |
| G011 | accepted | manager | codex-verifiable | G010 merged to main | none | プロバイダ設定のUI表示改善（実効LLM設定の非秘密表示） | local validation, PR #6, and GitHub Actions CI succeeded; main merge remains human | [goals/G011_PROVIDER_SETTINGS_UI.md](goals/G011_PROVIDER_SETTINGS_UI.md) |
| G012 | accepted | manager | codex-verifiable | G011 merged to main | none | 株価ライブ疎通（Alpha Vantage適合） | local validation, PR #7, and GitHub Actions CI succeeded; live Alpha Vantage smoke remains human-needed | [goals/G012_ALPHAVANTAGE_LIVE.md](goals/G012_ALPHAVANTAGE_LIVE.md) |
| G013 | accepted | manager | codex-verifiable | G012 merged to main | none | localStorageデータ消失経路の封鎖 | local validation, PR #8, and GitHub Actions CI succeeded; main merge remains human | [goals/G013_LOCALSTORAGE_SAFETY.md](goals/G013_LOCALSTORAGE_SAFETY.md) |
| G013.1 | accepted | manager | codex-verifiable | G013 merged to main | none | localStorage安全性の仕上げ | local validation, PR #9, and GitHub Actions CI succeeded; main merge remains human | [goals/G013_1_LOCALSTORAGE_POLISH.md](goals/G013_1_LOCALSTORAGE_POLISH.md) |
| G014a | accepted | manager | codex-verifiable | G013.1 merged to main | none | 復元前自動スナップショット + 文言修正 | local validation, PR #10, and GitHub Actions CI succeeded; main merge remains human | [goals/G014A_RESTORE_SNAPSHOT.md](goals/G014A_RESTORE_SNAPSHOT.md) |
| G014b | accepted | manager | codex-verifiable | G014a merged to main | none | localStorage復帰導線UI + 退避データ管理 | local validation, PR #11, and GitHub Actions CI succeeded; main merge remains human | [goals/G014B_RECOVERY_UI.md](goals/G014B_RECOVERY_UI.md) |

## Human-Needed Queue / Checkpoints

Checklist: [goals/HUMAN_NEEDED.md](goals/HUMAN_NEEDED.md)

| Item | Blocks | Summary | Status |
|---|---|---|---|
| H005 | live DeepSeek smoke only | DeepSeek / OpenAI互換 Chat Completions の実キー疎通は人間が必要なタイミングで手動確認する | human-needed |
| H006 | future scoring tuning only | RSI/SMAクロスの重み・閾値の最終確定は運用後に人間判断する。G010 PR/CIは既定値で継続可能 | human-needed |
| H007 | live Alpha Vantage smoke only | Alpha Vantageの実キー疎通は人間が無料キーとサーバー環境変数を設定して手動確認する | human-needed |

## Review / Integration / Push Policy

- Push only to `https://github.com/kyou041849-cyber/stock-trend-mvp.git`.
- Do not force push.
- Stop and report if GitHub rejects push due to existing remote history.
- Keep local status clean after recording the result.

## Integration Ledger

| Child | Result | Child Gates | Manager Decision | Integration / Push | Goal Map Status Update | Notes |
|---|---|---|---|---|---|---|
| G001 | blocked | not_required | blocked by remote existing history | `git push -u origin main` rejected with `fetch first`; tag push not attempted to avoid partial remote state | blocked | origin configured; remote main is `99793f92a9c5aedeaecb194c825a9fb2196dec4a`; remote tags empty |
| G002 | human-needed | not_required | stop; remote history is unrelated to stock-trend-mvp | no merge, no push, no force | G002 human-needed | remote main includes `AGENTS.md`, workflow docs, `projects/`, and `tools/`; see `goals/G002_REMOTE_HISTORY.md` |

## Achievement Review

Active child window status: none
Goal map status: G001 blocked, G002 human-needed
Parent goal status: partially complete, remote configured but push blocked by unrelated remote history
Human-needed checkpoint status: open
Gap review / refreshed Gap-Closing Goal Map needed: no

## G003 Update

Status: human-needed

Outcome: 専用GitHub Private repositoryへのpushは未実行。依頼内の新しいリポジトリURLが `<新しいGitHubリポジトリURL>` のままで、実URLが確定していないため停止。

Safety decision:

- `AI_Agent.git` へはpushしない。
- URL未指定のため `git remote rename`、`git remote add origin`、`git push` は実行しない。
- `beta-0.1.0` tagは移動しない。
- `--force` / `--force-with-lease` は使わない。

Goal map note:

| ID | Status | Owner | Acceptance | Depends On | Outcome | Evidence |
|---|---|---|---|---|---|---|
| G003 | human-needed | manager | human-decision | dedicated repository URL | 専用GitHub Private repositoryへのpush | Request still contains `<新しいGitHubリポジトリURL>` placeholder; see [goals/G003_STOCK_TREND_REMOTE_PUSH.md](goals/G003_STOCK_TREND_REMOTE_PUSH.md) |

## G003 Completion Update

Status: completed

Outcome: `stock-trend-mvp` 専用GitHub Private repositoryへ `main` と `beta-0.1.0` をpush済み。

Remote setup:

- `origin`: `https://github.com/kyou041849-cyber/stock-trend-mvp.git`
- `ai-agent-hub`: `https://github.com/kyou041849-cyber/AI_Agent.git`
- `AI_Agent.git` へはpushしていない。

Validation before push:

- `npm.cmd run typecheck`: success
- `npm.cmd run test`: success
- `npm.cmd run build`: success
- `npm.cmd run test:e2e -- --reporter=line`: success, 3 passed

Push evidence:

- `git push -u origin main`: success
- `git push origin beta-0.1.0`: success
- `beta-0.1.0` remains on `7fb1e793f2dd0b5d9ba9996054a021997471dbfe`

Goal map note:

| ID | Status | Owner | Acceptance | Depends On | Outcome | Evidence |
|---|---|---|---|---|---|---|
| G003 | accepted | manager | codex-verifiable | none | 専用GitHub Private repositoryへのpush | main and beta tag pushed to dedicated origin; final record commit pending push |

## G004 Completion Update

Status: completed

Outcome: GitHub上で最初に読むREADMEと、β版運用チェックシート、CHANGELOGを整備済み。

Updated docs:

- `README.md`: アプリ概要、調査補助ツールである注意、主な機能、起動方法、検証、実LLM API注意、β版タグ、localStorageバックアップ導線、関連docsリンクを整理。
- `docs/beta-operation-checklist.md`: β版開始前、実データ投入前、CSV取り込み、AI分析、実LLM、バックアップ、Git push前のチェックを追加。
- `CHANGELOG.md`: `beta-0.1.0` 初期β版の主要機能、CSV改善、AI履歴/比較/差分、Design System、E2E、バックアップ/復元、GitHub退避を記録。
- `goals/G004_README_OPERATION_DOCS.md`: G004の目的、変更内容、検証結果、push方針を記録。
- `goals/HUMAN_NEEDED.md`: G001/G002/G003で解消済みのhuman-neededを現在未対応なしへ整理。

Validation:

- `npm.cmd run typecheck`: success
- `npm.cmd run test`: success
- `npm.cmd run build`: success
- `npm.cmd run test:e2e -- --reporter=line`: success, 3 passed

Goal map note:

| ID | Status | Owner | Acceptance | Depends On | Outcome | Evidence |
|---|---|---|---|---|---|---|
| G004 | accepted | manager | codex-verifiable | none | READMEとβ版運用手順をGitHub上で分かりやすく整備 | docs updated, validation succeeded, record commit to be pushed to `origin/main` |

## G005 Completion Update

Status: completed

Outcome: GitHub Actions CIを追加し、push / pull request時にtypecheck、unit test、build、E2E smoke testを自動実行する導線を整備済み。

Workflow:

- `.github/workflows/ci.yml`
- trigger: `push` to `main`, `pull_request` to `main`
- runner: `ubuntu-latest`
- package manager: `pnpm`, because the repository has `pnpm-lock.yaml` and no `package-lock.json`
- validation: `pnpm run typecheck`, `pnpm run test`, `pnpm run build`, `pnpm run test:e2e -- --reporter=line`
- E2E browser: Playwright `chromium` in CI, local Edge preserved
- failure artifacts: `test-results`, `playwright-report`

Safety:

- No `.env.local` usage.
- No API keys or GitHub Secrets required.
- Real LLM API is not called.
- Existing localStorage keys and saved data shape are unchanged.
- `beta-0.1.0` tag is unchanged.

Validation:

- pre-change `npm.cmd run typecheck`: success
- pre-change `npm.cmd run test`: success
- pre-change `npm.cmd run build`: success
- pre-change `npm.cmd run test:e2e -- --reporter=line`: success, 3 passed
- post-change `npm.cmd run typecheck`: success
- post-change `npm.cmd run test`: success
- post-change `npm.cmd run build`: success
- post-change `npm.cmd run test:e2e -- --reporter=line`: success, 3 passed

Goal map note:

| ID | Status | Owner | Acceptance | Depends On | Outcome | Evidence |
|---|---|---|---|---|---|---|
| G005 | accepted | manager | codex-verifiable | none | GitHub Actions CI追加 | workflow, README/docs, and Goal Loop record updated; local validation succeeded; record commit to be pushed to `origin/main` |

## G005 CI Fix Update

Status: completed, GitHub Actions recheck pending

Failure:

- GitHub Actions step: `Install dependencies`
- command: `pnpm install --frozen-lockfile`
- error: `ERROR packages field missing or empty`

Cause:

- `pnpm-workspace.yaml` existed but did not define `packages`.
- The project is a single-package app, so pnpm workspace needs `packages: ["." ]`.

Fix:

- Updated `pnpm-workspace.yaml`:

```yaml
packages:
  - "."

allowBuilds:
  sharp: true
```

Validation:

- `pnpm install --frozen-lockfile`: success
- `npm.cmd run typecheck`: success
- `npm.cmd run test`: success
- `npm.cmd run build`: success
- `npm.cmd run test:e2e -- --reporter=line`: success, 3 passed

Goal map note:

| ID | Status | Owner | Acceptance | Depends On | Outcome | Evidence |
|---|---|---|---|---|---|---|
| G005-fix | accepted | manager | codex-verifiable | GitHub Actions re-run | pnpm workspace設定を修正し、CI install失敗を解消 | local frozen install and validation succeeded; push will trigger CI re-run |

## G005 CI Stabilization Update

Status: completed, GitHub Actions recheck pending

Latest run:

- workflow: `CI`
- commit: `ebbcbce`
- branch: `main`
- status reported by user: Failure
- job: `Typecheck, test, build, and E2E`
- detailed GitHub logs: not available from local `gh` because `gh` is not installed; GitHub connector did not expose push-triggered workflow runs for this private repository; browser bridge was unavailable

Confirmed locally:

- `CI=true` makes Playwright list the `chromium` project after the config change.
- local non-CI E2E still uses the existing Edge project.

Likely failing area:

- The prior `Install dependencies` issue was fixed.
- The next likely CI-only failure area is Playwright browser installation or E2E browser launch using `msedge` on `ubuntu-latest`.

Fix:

- `.github/workflows/ci.yml`: install Playwright `chromium` with `node node_modules/@playwright/test/cli.js install --with-deps chromium`.
- `playwright.config.ts`: use `chromium` only when `process.env.CI` is set; keep local Edge behavior unchanged.

Validation:

- `npm.cmd run typecheck`: success
- `npm.cmd run test`: success
- `npm.cmd run build`: success
- `npm.cmd run test:e2e -- --reporter=line`: success, 3 passed
- `CI=true node node_modules/@playwright/test/cli.js test --list`: success, 3 tests listed under `[chromium]`

Goal map note:

| ID | Status | Owner | Acceptance | Depends On | Outcome | Evidence |
|---|---|---|---|---|---|---|
| G005-stabilize | accepted | manager | codex-verifiable | GitHub Actions re-run | CIのPlaywrightブラウザ処理をChromiumへ安定化 | workflow and Playwright config updated; local validation succeeded; push will trigger CI re-run |

## G005 Post-Stabilization Recheck Update

Status: human-needed

Outcome: `origin/main` が `3d4c3c3 ci: stabilize GitHub Actions validation` を指していること、pnpm経由のローカル検証が成功することは確認済み。ただし、この環境からGitHub Actions最新runの赤いstepを取得できなかったため、GitHub UIでの確認が必要。

External-state checks attempted:

- `git ls-remote origin refs/heads/main refs/tags/beta-0.1.0`: success
- `gh --version`: unavailable
- GitHub connector combined status / commit workflow runs: no push-triggered run data returned
- Browser inspection: unavailable due in-app browser timeout and local Chrome missing

Validation:

- `pnpm install --frozen-lockfile`: success
- `pnpm run typecheck`: success
- `pnpm run test`: success
- `pnpm run build`: success
- `pnpm run test:e2e -- --reporter=line`: success, 3 passed

Goal map note:

| ID | Status | Owner | Acceptance | Depends On | Outcome | Evidence |
|---|---|---|---|---|---|---|
| G005-recheck | human-needed | manager | human-decision | GitHub UI latest CI status | CI最新runの結果確認 | local validation succeeded; GitHub Actions run result not retrievable from current tools; see H003 |

## G005 E2E Argument Fix Update

Status: completed

Latest run inspected:

- run: `28325049150`
- commit: `6bd8ac5 docs: record ci recheck requirement`
- job: `Typecheck, test, build, and E2E`
- failed step: `E2E smoke tests`

Cause:

- GitHub Actions executed `pnpm run test:e2e -- --reporter=line`.
- pnpm invoked `node scripts/run-e2e.js -- --reporter=line`.
- `scripts/run-e2e.js` forwarded the standalone `--` to Playwright.
- On Linux CI, Playwright treated that standalone `--` as a test-file pattern and exited with `Error: No tests found.`

Fix:

- `scripts/run-e2e.js` now filters standalone `--` from forwarded arguments before invoking Playwright.

Validation:

- `pnpm run test:e2e -- --reporter=line`: success, 3 passed
- `pnpm run typecheck`: success
- `pnpm run test`: success
- `pnpm run build`: success

Goal map note:

| ID | Status | Owner | Acceptance | Depends On | Outcome | Evidence |
|---|---|---|---|---|---|---|
| G005-e2e-args | accepted | manager | codex-verifiable | GitHub Actions re-run | E2Eの引数転送不具合を修正 | failing step and log inspected; local pnpm validation succeeded; push will trigger CI re-run |

GitHub Actions success:

- fix commit: `20978e8 ci: fix E2E argument forwarding`
- run: `28325237178`
- status: `completed`
- conclusion: `success`
- URL: `https://github.com/kyou041849-cyber/stock-trend-mvp/actions/runs/28325237178`

## G006 Server-Side Market API Update

Status: completed

Outcome: 株価API・業績APIの実取得を、ブラウザから外部APIへ直接fetchする構成からNext.js Route Handler経由へ統一。

Implementation:

- Added `src/app/api/stock-prices/route.ts`
- Added `src/app/api/fundamentals/route.ts`
- Added `src/lib/marketApiParsing.ts`
- Added `src/lib/serverMarketApi.ts`
- Updated stock/fundamental API adapters to call internal Route Handlers only
- Updated settings UI so API keys are server-side environment variables, not browser inputs
- Updated README/docs and `.env.local.example`

Safety:

- API keys are not sent in client request bodies.
- API keys are not saved to localStorage.
- API keys are not appended to external URL query strings by the server helper.
- Mock API, CSV, localStorage keys, AI/LLM routes, and existing save structures are unchanged.

Validation:

- `pnpm run typecheck`: success
- `pnpm run test`: success
- `pnpm run build`: success
- `pnpm run test:e2e -- --reporter=line`: success, 3 passed
- `.env.local`: not present and not tracked
- tracked unwanted files: none
- secret scan: no real API key found; hits are env var names, docs, test fixtures, existing server-side OpenAI adapter, and `risk-` / `task-` false positives
- commit: `4c539e6 feat: proxy market APIs through server routes`
- PR: `https://github.com/kyou041849-cyber/stock-trend-mvp/pull/1`
- CI run: `28337959243`, conclusion `success`

Goal map note:

| ID | Status | Owner | Acceptance | Depends On | Outcome | Evidence |
|---|---|---|---|---|---|---|
| G006 | accepted | manager | codex-verifiable | none | 株価/業績APIをサーバー側Route Handler経由に統一 | local validation and safety scan completed; draft PR #1 opened; GitHub Actions run `28337959243` succeeded |

## G008 Technical Indicators and Signal Extension Update

Status: completed

Outcome: RSI(14) と SMA25/75クロス判定を追加し、既存のトレンドシグナル表示へ機械的な参考シグナルとして統合。

Implementation:

- `calculateRsi(rows, period = 14)`: Wilder smoothing、初期14期間は `null`、横ばいデータは RSI 50 としてゼロ除算を回避。
- `detectSmaCross(rows, shortWindow = 25, longWindow = 75)`: `calculateMovingAverage` を使い、直近の golden / dead / none を判定。
- `calculateTrendAnalysis`: `TrendMetrics` に `rsi14` と SMAクロス情報を追加し、RSI 70超、RSI 30未満、SMA golden/dead cross を `TrendSignal` に追加。
- `StockDetailView`: 既存 `SignalTable` にトレンドスコア判定を表示。0点シグナルは「参考」と表示。

Score policy:

- 既存トレンドスコアの重みは変更しない。
- RSI / SMAクロスは `points = 0` の参考シグナルとして追加。
- スコア上限は既存どおり 100。

Validation:

- `pnpm run typecheck`: success
- `pnpm run test`: success
- `pnpm run build`: success
- `pnpm run test:e2e -- --reporter=line`: success, 3 passed
- secret scan: no real API key found; hits are env var names, docs, test fake values, server-side adapters, and `risk-` / `task-` false positives

PR / CI:

- PR: `https://github.com/kyou041849-cyber/stock-trend-mvp/pull/3`
- CI run: `28361803492`
- CI conclusion: `success`

## G015 Secret Scan False Positive Update

Status: accepted, PR #12 CI succeeded; main merge remains human

Outcome target: prevent backup / restore sensitive-value scanning from treating normal
`risk-...`, `task-...`, and sample task IDs as OpenAI-style `sk-...` API keys, while
continuing to detect real `sk-...` style key values.

Implementation:

- Add a word boundary to the `sk-` branch of `SENSITIVE_VALUE_PATTERN`.
- Keep `OPENAI_API_KEY`, `Bearer`, and `AIza` sensitive-value checks unchanged.
- Add unit tests for real `sk-...` detection and `risk-` / `task-` false-positive prevention.
- Add a sample-data backup success test.

Current evidence:

- RED: `pnpm run test` failed before the fix because `risk-1751871234567-a3f9c81b2e4d1` was detected as sensitive.
- GREEN: `pnpm run test` passed after the regex boundary fix.
- `pnpm run typecheck`: success
- `pnpm run test`: success
- `pnpm run build`: success
- `pnpm run test:e2e -- --reporter=line`: success, 5 passed
- API key / secret scan: no real key found; hits are env var names, docs, server-side adapters, and test fake values.

PR / CI:

- PR: #12, `https://github.com/kyou041849-cyber/stock-trend-mvp/pull/12`
- Branch: `codex/g015-secret-scan-false-positive`
- Commit: `0f667cc fix: tighten sk key detection in backups`
- CI run: `28870318524`
- CI conclusion: `success`

Goal map note:

| ID | Status | Owner | Acceptance | Depends On | Outcome | Evidence |
|---|---|---|---|---|---|---|
| G015 | accepted | manager | codex-verifiable | G014b merged to main | backup secret scan false-positive fix | local validation, PR #12, and GitHub Actions CI succeeded; main merge remains human |

## G016 Stock Form Optional Fields Update

Status: in progress

Outcome target: make the stock registration form accurately communicate that only
the ticker is required, while company name, market, and sector can remain blank.

Implementation:

- Add required wording to the ticker label.
- Add optional wording and explanatory placeholders to company name, market, and sector.
- Add a read-only inferred-market preview when ticker is entered and market is blank.
- Preserve existing submit validation and normalization / inference logic.
- Add E2E coverage for ticker-only registration.

Current evidence:

- RED: `pnpm run test:e2e -- --reporter=line` failed before the UI fix because `ティッカー（必須）` was not visible.
- GREEN: `pnpm run test:e2e -- --reporter=line` passed after the UI fix, 6 passed.

Goal map note:

| ID | Status | Owner | Acceptance | Depends On | Outcome | Evidence |
|---|---|---|---|---|---|---|
| G016 | in-progress | manager | codex-verifiable | G015 merged to main | stock form optional-field clarity | E2E red/green observed; full validation, PR, and CI pending |

Goal map note:

| ID | Status | Owner | Acceptance | Depends On | Outcome | Evidence |
|---|---|---|---|---|---|---|
| G008 | accepted | manager | codex-verifiable | G007 merged to main | テクニカル指標（RSI）とシグナル拡張 | local validation and PR #3 CI succeeded; main merge remains human |

## G009 LLM Provider Configuration Update

Status: completed

Outcome: 既存OpenAI Responses経路の後方互換を維持しつつ、OpenAI互換 Chat Completions 経路を追加。DeepSeekなどの互換LLMへサーバー側Route Handler経由で接続できる土台を整備。

Implementation:

- `LLM_API_BASE_URL`: 未設定時 `https://api.openai.com`
- `LLM_API_FORMAT`: `responses` / `chat-completions`、未設定時 `responses`
- API key priority: `LLM_API_KEY` > format-specific key
- `responses`: `OPENAI_API_KEY`
- `chat-completions`: `DEEPSEEK_API_KEY`
- Responses body / Chat Completions messages bodyを分離
- Responses output / Chat Completions `choices[0].message.content` 解析を分離
- 禁止表現フィルタを両経路で適用
- `scripts/live-llm-smoke.mjs` を追加（CI対象外、キーや全文は表示しない）

Validation:

- `pnpm run typecheck`: success
- `pnpm run test`: success
- `pnpm run build`: success
- `pnpm run test:e2e -- --reporter=line`: success, 3 passed
- secret scan: no real API key found; hits are env var names, docs, test fake values, server-side adapters, and `risk-` / `task-` false positives

PR / CI:

- PR: `https://github.com/kyou041849-cyber/stock-trend-mvp/pull/4`
- CI run: `28365542131`
- CI conclusion: `success`

Human-needed / deferred:

- Live DeepSeek疎通は人間が実施する。
- サーバープロセス環境変数 `DEEPSEEK_API_KEY`、`LLM_API_BASE_URL=https://api.deepseek.com`、`LLM_API_FORMAT=chat-completions`、`OPENAI_MODEL=deepseek-v4-flash` などを設定し、`node scripts/live-llm-smoke.mjs` を実行する。

Goal map note:

| ID | Status | Owner | Acceptance | Depends On | Outcome | Evidence |
|---|---|---|---|---|---|---|
| G009 | accepted | manager | codex-verifiable | G008 merged to main | LLMプロバイダ可変化（OpenAI互換 Chat Completions対応） | local validation, PR #4 CI, and main merge succeeded |

## G010 Indicator Scoring Update

Status: completed

Outcome: G008で参考表示だった RSI(14) 50以上とSMA25/75ゴールデンクロスを、トレンド強さスコアのモメンタム確認項目として加点対象に変更。RSI(14) 70超、RSI(14) 30未満、デッドクロスは0点の参考表示を維持。

Weight table:

- `closeAboveMa25`: 8
- `closeAboveMa75`: 8
- `closeAboveMa200`: 18
- `ma25AboveMa75`: 13
- `ma75AboveMa200`: 13
- `risingClose20`: 15
- `volumeAboveAverage20`: 10
- `within20PercentFrom52WeekHigh`: 5
- `rsi14AtOrAbove50`: 5
- `sma25_75GoldenCross`: 5
- reference-only: `rsi14Above70`, `rsi14Below30`, `sma25_75DeadCross`: 0

Goal map note:

| ID | Status | Owner | Acceptance | Depends On | Outcome | Evidence |
|---|---|---|---|---|---|---|
| G010 | accepted | manager | codex-verifiable | G009 merged to main | RSI/SMAクロスをトレンド強さスコアへ加点 | local validation and PR #5 CI succeeded; main merge remains human |

PR / CI:

- PR: `https://github.com/kyou041849-cyber/stock-trend-mvp/pull/5`
- CI run: `28384531414`
- CI conclusion: `success`

## G011 Provider Settings UI Update

Status: completed

Outcome target: 実LLMのサーバー側実効設定を、APIキー値を一切返さずに設定画面で確認できるようにする。

Implementation:

- Add non-secret `GET /api/llm/config`.
- Add SettingsView read-only summary for provider format, base URL, model, key configured status, and key source name.
- Add tests that assert key values are not included in public config JSON.
- Local `pnpm run typecheck`, `pnpm run test`, `pnpm run build`, and `pnpm run test:e2e -- --reporter=line` succeeded.
- PR #6 and GitHub Actions CI succeeded.

Goal map note:

| ID | Status | Owner | Acceptance | Depends On | Outcome | Evidence |
|---|---|---|---|---|---|---|
| G011 | accepted | manager | codex-verifiable | G010 merged to main | プロバイダ設定のUI表示改善 | local validation, PR #6, and CI run `28410123188` succeeded; main merge remains human |

PR / CI:

- PR: `https://github.com/kyou041849-cyber/stock-trend-mvp/pull/6`
- CI run: `28410123188`
- CI conclusion: `success`

## G012 Alpha Vantage Live Stock Price Update

Status: completed

Outcome target: `STOCK_PRICE_API_PROVIDER=alpha-vantage` のとき、サーバー側Route HandlerがAlpha Vantageの `TIME_SERIES_DAILY` 形式に合うURLを構築し、APIキー値をクライアント応答へ出さない。

Implementation:

- Add stock price provider mode: `generic` / `alpha-vantage`.
- Keep generic header-auth path backward compatible.
- Add Alpha Vantage params: `function=TIME_SERIES_DAILY`, `symbol`, `outputsize`, and server-side `apikey` query.
- Add tests for request shaping, period mapping, fixture parsing, rate-limit mapping, and key non-exposure.
- Document Alpha Vantage setup and JP `.T` coverage caveat.

Goal map note:

| ID | Status | Owner | Acceptance | Depends On | Outcome | Evidence |
|---|---|---|---|---|---|---|
| G012 | accepted | manager | codex-verifiable | G011 merged to main | 株価ライブ疎通（Alpha Vantage適合） | local validation, PR #7, and CI run `28437898362` succeeded; live smoke remains H007 |

PR / CI:

- PR: `https://github.com/kyou041849-cyber/stock-trend-mvp/pull/7`
- CI run: `28437898362`
- CI conclusion: `success`

## G013 localStorage Safety Update

Status: completed

Outcome target: JSON破損・非配列・不正stock正規化drop・quota超過で、銘柄データが空配列や不完全データに自動上書きされる経路を塞ぐ。

Implementation:

- Add safe `loadStocksWithSafety` result object.
- Quarantine corrupt raw stocks data to `stock-trend-mvp:stocks:corrupt:<timestamp>`.
- Block autosave when load detects destructive normalization risk.
- Return structured `saveStocks` results and surface save failures in UI.
- Add localStorage usage estimate and warning thresholds.
- Add SettingsView usage summary and app-level storage safety warning.
- Add unit tests for corrupt JSON, non-array data, partial normalization drops, quota-like save errors, legacy compatibility, and usage thresholds.

Validation:

- `pnpm run typecheck`: success
- `pnpm run test`: success
- `pnpm run build`: success
- `pnpm run test:e2e -- --reporter=line`: success, 3 passed
- secret scan: no real API key found; hits are env var names, docs, existing server-side adapters, test fake values, and `risk-` / `task-` false positives

Goal map note:

| ID | Status | Owner | Acceptance | Depends On | Outcome | Evidence |
|---|---|---|---|---|---|---|
| G013 | accepted | manager | codex-verifiable | G012 merged to main | localStorageデータ消失経路の封鎖 | local validation, PR #8, and GitHub Actions CI succeeded; main merge remains human |

PR / CI:

- PR: `https://github.com/kyou041849-cyber/stock-trend-mvp/pull/8`
- CI run: `28591075215`
- CI conclusion: `success`

## G013.1 localStorage Safety Polish Update

Status: accepted, PR #9 CI succeeded; main merge remains human

Outcome target: PR #8 independent verificationで残ったnitsを小さく閉じる。破損raw退避キーの増殖を抑え、localStorage SecurityError環境で画面を壊さず、破損起動E2Eを追加する。

Implementation:

- Reuse existing corrupt backup key when raw data is identical.
- Keep corrupt stock raw backup keys to 3 entries and remove older keys first when possible.
- Guard `window.localStorage` access and usage estimation.
- Return storage-unavailable safe results for load/save on SecurityError-like access failures.
- Add corrupt stocks JSON startup E2E.

Not in scope:

- Resume autosave UI after manual recovery.
- Corrupt backup key deletion UI.
- Backup generation management.
- Restore diff preview.
- IndexedDB or server DB migration.

Validation:

- `pnpm run typecheck`: success
- `pnpm run test`: success
- `pnpm run build`: success
- `pnpm run test:e2e -- --reporter=line`: success, 4 passed
- `npm.cmd run typecheck`: success
- `npm.cmd run test`: success
- `npm.cmd run build`: success
- `npm.cmd run test:e2e -- --reporter=line`: success, 4 passed
- API key / secret scan: no real API key found; hits are env var names, docs, existing server-side adapters, and test fake values

PR / CI:

- PR: #9, `https://github.com/kyou041849-cyber/stock-trend-mvp/pull/9`
- Branch: `codex/g013-1-localstorage-polish`
- Commit: `80fb835 fix: polish localStorage safety handling`
- CI: GitHub Actions run `28626987037` succeeded

Goal map note:

| ID | Status | Owner | Acceptance | Depends On | Outcome | Evidence |
|---|---|---|---|---|---|---|
| G013.1 | accepted | manager | codex-verifiable | G013 merged to main | localStorage安全性の仕上げ | local validation, PR #9, and GitHub Actions CI succeeded; main merge remains human |

## G014a Restore Pre-Snapshot Update

Status: accepted, PR #10 CI succeeded; main merge remains human

Outcome target: 復元実行直前に現在の `stock-trend-mvp:` localStorage状態を自動退避し、誤復元時に直前状態へ戻せるようにする。あわせて、localStorage unavailable時の読み込み/保存文言を分離する。

Implementation:

- Add pre-restore snapshot creation under `stock-trend-mvp:restore:pre:<timestamp>`.
- Keep only the latest pre-restore snapshot key.
- Exclude existing `restore:pre:*` keys from the snapshot payload.
- Abort restore when the pre-restore snapshot cannot be saved.
- Download the pre-restore snapshot JSON automatically from SettingsView.
- Split load unavailable copy to "読み込めません" while keeping save copy as "保存できません".

Validation:

- `pnpm run typecheck`: success
- `pnpm run test`: success
- `pnpm run build`: success
- `pnpm run test:e2e -- --reporter=line`: success, 4 passed
- API key / secret scan: no real API key found

PR / CI:

- PR: #10, `https://github.com/kyou041849-cyber/stock-trend-mvp/pull/10`
- Branch: `codex/g014a-restore-snapshot`
- Commit: `8fd3db4 fix: snapshot localStorage before restore`
- CI: GitHub Actions run `28641010072` succeeded

Goal map note:

| ID | Status | Owner | Acceptance | Depends On | Outcome | Evidence |
|---|---|---|---|---|---|---|
| G014a | accepted | manager | codex-verifiable | G013.1 merged to main | 復元前自動スナップショット + 文言修正 | local validation, PR #10, and GitHub Actions CI succeeded; main merge remains human |

## G014b Recovery UI Update

Status: accepted, PR #11 CI succeeded; main merge remains human

Outcome target: 自動保存停止状態からUI操作だけで安全に保存を再開でき、破損raw・復元前スナップショットの退避キーを設定画面で管理できるようにする。

Implementation:

- Add confirmation-gated save resume action to the storage safety banner.
- Keep resume action hidden when localStorage is unavailable.
- Download current `stock-trend-mvp:stocks:v1` raw before resume when no corrupt backup key exists.
- Add SettingsView evacuation management for `stock-trend-mvp:stocks:corrupt:*` and `stock-trend-mvp:restore:pre:*`.
- Allow evacuated key download and confirm-gated delete, scoped only to the selected evacuation key.
- Exclude corrupt and pre-restore keys from manual localStorage backup JSON.

Validation:

- `pnpm run typecheck`: success
- `pnpm run test`: success
- `pnpm run build`: success
- `pnpm run test:e2e -- --reporter=line`: success, 5 passed
- API key / secret scan: no real API key found; hits are env var names, docs, existing server-side adapters, test fake values, and `risk-` / `task-` false positives

PR / CI:

- PR: #11, `https://github.com/kyou041849-cyber/stock-trend-mvp/pull/11`
- CI run: `28670925039`
- CI conclusion: `success`

Goal map note:

| ID | Status | Owner | Acceptance | Depends On | Outcome | Evidence |
|---|---|---|---|---|---|---|
| G014b | accepted | manager | codex-verifiable | G014a merged to main | localStorage復帰導線UI + 退避データ管理 | local validation, PR #11, and GitHub Actions CI succeeded; main merge remains human |
