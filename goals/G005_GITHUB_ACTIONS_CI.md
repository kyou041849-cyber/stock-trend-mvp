# G005 GitHub Actions CI

## Status

completed

## Objective

`stock-trend-mvp` にGitHub Actions CIを追加し、`main` へのpushとpull requestで主要検証を自動実行できるようにする。

## Scope

- `.github/workflows/ci.yml` を追加する
- READMEまたはdocsにCI説明を追加する
- Goal LoopにG005結果を記録する
- ローカルでtypecheck/test/build/E2Eを検証する
- 変更をcommitし、`origin/main` へpushする

## Workflow

File:

```text
.github/workflows/ci.yml
```

Triggers:

- `push` to `main`
- `pull_request` to `main`

Job:

- runner: `ubuntu-latest`
- timeout: 25 minutes
- Node.js: 22
- package manager: pnpm
- CI E2E browser: Chromium
- local E2E browser: Edge

Steps:

1. checkout
2. setup Node.js
3. enable pnpm with corepack
4. `pnpm install --frozen-lockfile`
5. `node node_modules/@playwright/test/cli.js install --with-deps chromium`
6. `pnpm run typecheck`
7. `pnpm run test`
8. `pnpm run build`
9. `pnpm run test:e2e -- --reporter=line`
10. upload Playwright artifacts on failure

## Package Manager Decision

CI uses pnpm for dependency installation because:

- `pnpm-lock.yaml` exists
- `package-lock.json` does not exist
- `pnpm install --frozen-lockfile` gives a deterministic install on GitHub Actions

Local developer commands may continue to use `npm.cmd run ...` because the scripts are package-manager agnostic after dependencies are installed.

## Safety Notes

- CI does not use `.env.local`.
- CI does not require GitHub Secrets.
- CI sets empty `OPENAI_API_KEY` and `OPENAI_MODEL` to make the no-real-LLM assumption explicit.
- E2E covers Mock-only flows and does not call the real LLM API.
- localStorage real user data is not required.
- Test artifacts are uploaded only on failure and are not committed.

## Validation

Before adding CI:

- `npm.cmd run typecheck`: success
- `npm.cmd run test`: success
- `npm.cmd run build`: success
- `npm.cmd run test:e2e -- --reporter=line`: success, 3 passed

After adding CI:

- `npm.cmd run typecheck`: success
- `npm.cmd run test`: success
- `npm.cmd run build`: success
- `npm.cmd run test:e2e -- --reporter=line`: success, 3 passed

## GitHub Actions Result

The workflow is pushed with this G005 commit. GitHub should start CI automatically after push to `main`.

If Codex cannot read the GitHub Actions result automatically, confirm it in GitHub:

1. Open the `stock-trend-mvp` repository.
2. Open the `Actions` tab.
3. Select the latest `CI` workflow run.
4. Confirm the `Typecheck, test, build, and E2E` job is successful.

## Commit / Push

Commit message:

```text
ci: add GitHub Actions validation
```

Push target:

```text
https://github.com/kyou041849-cyber/stock-trend-mvp.git
```

## Next Goal Candidates

1. GitHub Actionsの結果を確認し、必要ならCI調整を行う。
2. CIバッジをREADMEへ追加する。
3. localStorageバックアップの世代管理と復元前比較を追加する。

## CI Install Failure Fix

Status: completed

### Failure

GitHub Actions failed at:

```text
Install dependencies
pnpm install --frozen-lockfile
```

Error:

```text
ERROR packages field missing or empty
```

### Cause

`pnpm-workspace.yaml` existed but did not define `packages`. Because this repository is a single-package app, pnpm needs the root package listed explicitly.

### Fix

`pnpm-workspace.yaml` was updated to:

```yaml
packages:
  - "."

allowBuilds:
  sharp: true
```

### Validation

- `pnpm install --frozen-lockfile`: success
- `npm.cmd run typecheck`: success
- `npm.cmd run test`: success
- `npm.cmd run build`: success
- `npm.cmd run test:e2e -- --reporter=line`: success, 3 passed

### GitHub Actions

Pushing the fix to `origin/main` should trigger a new CI run. Confirm the latest `CI` run in GitHub Actions after push.

## CI Browser Stabilization Fix

Status: completed, GitHub Actions recheck pending

### Latest Run Context

User reported the latest CI run failed after the pnpm workspace fix:

- workflow: `CI`
- commit: `ebbcbce`
- branch: `main`
- status: Failure
- job: `Typecheck, test, build, and E2E`
- duration: about 1m31s

Detailed run logs could not be fetched from this environment:

- `gh` is not installed locally
- GitHub connector returned no push-triggered workflow runs for the commit
- browser-based GitHub Actions inspection was unavailable

### Likely Failing Area

The previous `Install dependencies` failure was fixed. The next CI-only risk was Playwright browser setup or launch, because the workflow installed `msedge` on `ubuntu-latest` while local runs use Edge on Windows.

### Fix

- CI now installs Chromium:

```yaml
node node_modules/@playwright/test/cli.js install --with-deps chromium
```

- `playwright.config.ts` now uses:
  - `chromium` when `process.env.CI` is set
  - existing local Edge configuration otherwise

### Validation

- `npm.cmd run typecheck`: success
- `npm.cmd run test`: success
- `npm.cmd run build`: success
- `npm.cmd run test:e2e -- --reporter=line`: success, 3 passed
- `CI=true node node_modules/@playwright/test/cli.js test --list`: success, 3 tests listed under `[chromium]`

### GitHub Actions

Pushing this stabilization fix to `origin/main` should trigger a new CI run. Confirm the latest `CI` run in GitHub Actions after push.

## Post-Stabilization Recheck Attempt

Status: human-needed

### Remote State

- `origin/main`: `3d4c3c3cfbee6fa3cb059987a02a7d18c46a47b8`
- `beta-0.1.0`: `7fb1e793f2dd0b5d9ba9996054a021997471dbfe`

### What Was Confirmed

- `gh --version`: unavailable; GitHub CLI is not installed.
- GitHub connector:
  - combined commit status for `3d4c3c3`: empty
  - push-triggered workflow runs for `3d4c3c3`: empty
  - direct Actions API fetch is unsupported by the connector's file-fetch endpoint
- Browser inspection:
  - in-app browser connection timed out while opening GitHub Actions
  - fallback Playwright browser could not start because local Chrome is missing

### Local CI-Equivalent Checks

- `pnpm install --frozen-lockfile`: success
- `pnpm run typecheck`: success
- `pnpm run test`: success
- `pnpm run build`: success
- `pnpm run test:e2e -- --reporter=line`: success, 3 passed

### Remaining Evidence Needed

Codex still needs the latest GitHub Actions `CI` run status from GitHub UI. If it failed, share the failing step name and the relevant error log. This is tracked as `H003` in `goals/HUMAN_NEEDED.md`.

## E2E Argument Forwarding Fix

Status: completed, GitHub Actions recheck pending

### Latest Run Inspected

- run: `28325049150`
- commit: `6bd8ac5 docs: record ci recheck requirement`
- job: `Typecheck, test, build, and E2E`
- failed step: `E2E smoke tests`

### Passing Steps

- `Install dependencies`: success
- `Install Playwright browser`: success
- `Typecheck`: success
- `Unit tests`: success
- `Build`: success

### Failure

The E2E step failed with:

```text
Error: No tests found.
Make sure that arguments are regular expressions matching test files.
```

The workflow command was:

```bash
pnpm run test:e2e -- --reporter=line
```

pnpm invoked the project script as:

```bash
node scripts/run-e2e.js -- --reporter=line
```

`scripts/run-e2e.js` forwarded the standalone `--` to Playwright. On Linux CI, Playwright treated that standalone `--` as a test-file pattern, so no test files matched.

### Fix

`scripts/run-e2e.js` now removes standalone `--` arguments before passing options to Playwright.

### Validation

- `pnpm run test:e2e -- --reporter=line`: success, 3 passed
- `pnpm run typecheck`: success
- `pnpm run test`: success
- `pnpm run build`: success

### GitHub Actions

GitHub Actions succeeded after pushing the fix:

- fix commit: `20978e8 ci: fix E2E argument forwarding`
- run: `28325237178`
- status: `completed`
- conclusion: `success`
- URL: `https://github.com/kyou041849-cyber/stock-trend-mvp/actions/runs/28325237178`
