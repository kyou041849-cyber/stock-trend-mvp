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

Status: completed, GitHub Actions recheck pending

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
