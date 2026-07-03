# G013: localStorage Data-Loss Safety

## Status

completed

## Problem

`loadStocks()` が壊れたJSON、非配列JSON、不正stockを `[]` や不完全な正規化結果として返すと、起動直後の保存effectが元データを上書きし、復旧不能になるリスクがあった。

`saveStocks()` もquota超過などの保存失敗を `console.error` のみで扱っており、ユーザーが保存失敗に気づけない状態だった。

## Fix

- `loadStocksWithSafety()` を追加し、読み込み結果を `ok/error/warning/shouldBlockAutoSave` 付きで返す。
- JSON破損、非配列、正規化drop検出時にraw文字列を `stock-trend-mvp:stocks:corrupt:<timestamp>` に退避する。
- 読み込み異常時はAppの自動保存を停止し、空配列や不完全データで上書きしない。
- `saveStocks()` は保存結果を返し、quota超過、storage unavailable、serialization error、unknownを区別する。
- App上部にlocalStorage安全警告を表示する。
- 設定画面にstock-trend-mvp prefixのlocalStorage使用量概算を表示する。

## Usage Estimate Thresholds

| Level | Threshold |
|---|---:|
| normal | below 3 MB |
| warning | 3 MB or more |
| danger | 4.5 MB or more |

The estimate uses UTF-16 string length approximation for keys and values.

## Acceptance Criteria

- Corrupt stocks JSON does not get overwritten with `[]`.
- Corrupt/non-array raw data is quarantined under a timestamped key.
- Partial invalid stock drops are visible and block autosave.
- Save failure is returned to callers and shown in UI.
- Quota-like errors are detected.
- localStorage usage estimate is visible.
- Existing backup/restore JSON format remains compatible.
- Existing localStorage keys remain unchanged.

## Validation

Local validation:

- `pnpm run typecheck`: success
- `pnpm run test`: success
- `pnpm run build`: success
- `pnpm run test:e2e -- --reporter=line`: success, 3 passed
- API key / secret scan: no real key found. Hits are environment variable names, docs, existing server-side adapters, test fake values, and `risk-` / `task-` false positives.

PR / CI:

- PR: `https://github.com/kyou041849-cyber/stock-trend-mvp/pull/8`
- CI run: `28591075215`
- CI conclusion: `success`

## G013.1 Follow-Up Nits

Independent verification judged PR #8 as "Go with nits". G013.1 addresses the remaining non-blocking safety nits:

- Reuse existing `stock-trend-mvp:stocks:corrupt:*` key when the raw corrupt stocks value is identical.
- Keep at most 3 corrupt stock raw backup keys, deleting the oldest first when possible.
- Guard `window.localStorage` access itself so SecurityError-like environments do not crash the app.
- Add E2E coverage for corrupt stocks JSON startup.

Still not in scope for G013.1:

- "Save current normalized data and resume autosave" UI.
- Corrupt backup key deletion UI.
- Backup generation management.
- Restore diff preview.
- IndexedDB or server DB migration.

## Not In Scope

- IndexedDB migration
- Server database
- Backup generation management
- Restore diff preview
- Large StockAnalysisApp refactor
- Shift_JIS CSV support
- LLM server-side rate limiting

## Human Needed

None for this implementation. Future storage migration or backup generation policy can be a separate human-decision goal.
