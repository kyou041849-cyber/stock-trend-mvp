# G013.1: localStorage Safety Polish

## Status

accepted, PR #9 CI succeeded; main merge remains human

## Background

G013 PR #8 was independently reviewed as "Go with nits". No blocking issue remained, but three small safety concerns should be closed before moving to G014:

1. Repeated reloads with the same corrupt stocks raw value can create many `stock-trend-mvp:stocks:corrupt:<timestamp>` keys.
2. Direct `window.localStorage` access can throw in SecurityError-like browser environments.
3. E2E coverage did not include corrupt stocks JSON startup.

## Fix

- Reuse an existing corrupt backup key when the stored raw value is identical.
- Limit corrupt stock raw backup keys to 3 entries.
- Delete older corrupt backup keys first when possible.
- Never delete or overwrite `stock-trend-mvp:stocks:v1` during corrupt backup cleanup.
- Guard `window.localStorage` resolution and usage estimation.
- Return storage-unavailable safe results for load/save when localStorage cannot be accessed.
- Protect Settings backup/restore helpers from direct localStorage access errors.
- Add Playwright smoke coverage for corrupt stocks JSON startup.

## Not In Scope

- "Save current normalized data and resume autosave" UI.
- Corrupt backup key deletion UI.
- Backup generation management.
- Restore diff preview.
- IndexedDB migration.
- Server DB migration.

## Validation

Local validation:

- `pnpm run typecheck`: success
- `pnpm run test`: success
- `pnpm run build`: success
- `pnpm run test:e2e -- --reporter=line`: success, 4 passed
- `npm.cmd run typecheck`: success
- `npm.cmd run test`: success
- `npm.cmd run build`: success
- `npm.cmd run test:e2e -- --reporter=line`: success, 4 passed
- API key / secret scan: no real key found. Hits are environment variable names, docs, existing server-side adapters, and test fake values such as `SECRET_API_KEY`, `av-test-key`, and `sk-test-secret-key-1234567890`.

PR / CI:

- PR: #9, `https://github.com/kyou041849-cyber/stock-trend-mvp/pull/9`
- Branch: `codex/g013-1-localstorage-polish`
- Commit: `80fb835 fix: polish localStorage safety handling`
- CI: GitHub Actions run `28626987037` succeeded

## Human Needed

None for this implementation. Recovery/resume UI remains a separate product decision.
