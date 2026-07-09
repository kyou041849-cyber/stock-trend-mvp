# G016: Stock form optional-field clarity

## Status

accepted, PR #13 CI succeeded; main merge remains human

## Outcome

Make the stock registration form clearly communicate that only the ticker is
required. Company name, market, and sector are optional and can be left blank.

## Scope

- UI labels and placeholders only for the stock form.
- Preserve existing `handleSubmit` and `handleSubmitStock` validation behavior.
- Preserve existing market / region / currency inference logic.
- Add a smoke E2E test proving ticker-only registration remains usable.

## Implementation Notes

- Ticker label now says required.
- Company name, market, and sector labels now say blank is allowed.
- Optional fields explain what happens when they are left blank.
- Market field shows a read-only preview for the current ticker when market is empty.

## Test oracle

- The form shows `ティッカー（必須）`.
- The company name, market, and sector fields show `（空欄可）`.
- Optional fields have explanatory placeholders.
- A stock can be saved with only a ticker and the detail page opens.

## Validation plan

- `pnpm run typecheck`
- `pnpm run test`
- `pnpm run build`
- `pnpm run test:e2e -- --reporter=line`
- API key / secret scan with generated folders excluded.

## Current evidence

- RED: `pnpm run test:e2e -- --reporter=line` failed before the UI fix because
  `ティッカー（必須）` was not visible.
- GREEN: `pnpm run test:e2e -- --reporter=line` passed after the UI labels,
  placeholders, and ticker-only registration test were added.
- `pnpm run typecheck`: success
- `pnpm run test`: success
- `pnpm run build`: success
- `pnpm run test:e2e -- --reporter=line`: success, 6 passed
- API key / secret scan: no real key found. Hits are environment variable names,
  docs, existing server-side adapters, and test fake values.

## PR / CI

- PR: #13, `https://github.com/kyou041849-cyber/stock-trend-mvp/pull/13`
- Branch: `codex/g016-stock-form-optional-fields`
- Commit: `14a3af5 fix: clarify optional stock form fields`
- CI: GitHub Actions run `29030019800` succeeded
