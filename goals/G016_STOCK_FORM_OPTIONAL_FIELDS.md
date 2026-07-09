# G016: Stock form optional-field clarity

## Status

in progress

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

## PR / CI

- PR: pending
- CI: pending
