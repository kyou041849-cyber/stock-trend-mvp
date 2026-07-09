# G017: Bare JP ticker inference

## Status

local validation succeeded, PR and CI pending

## Outcome

When the market field is blank, infer four-digit numeric tickers such as `7203`
and `9984` as JP / `東証` / `JPY`. Keep explicit market input authoritative and
make the stock form market preview feel recoverable instead of showing
`未推定`.

## Scope

- Update market / region / currency inference for blank-market four-digit
  numeric tickers.
- Preserve explicit market input priority, including `NYSE` overriding a
  four-digit ticker.
- Preserve existing `.T` suffix, JP market keywords, and US market keyword
  behavior.
- Do not migrate or overwrite saved stock `region` fields.
- Do not change storage format, localStorage keys, or external API behavior.

## Implementation Notes

- `inferMarketRegion` now checks explicit JP/US market keywords first.
- If market keywords do not determine a region, `.T` suffix or exactly four
  digits infer JP.
- `normalizeMarket("", "7203")` resolves to `東証`.
- `inferCurrency("", "7203")` resolves to `JPY`.
- Stock form market preview now says the market and currency can be edited
  later when the ticker cannot be inferred.

## Test oracle

- `inferMarketRegion("", "7203")` -> `JP`
- `inferMarketRegion("", "9984")` -> `JP`
- `inferMarketRegion("", "AAPL")` -> `OTHER`
- `inferMarketRegion("", "SPCX")` -> `OTHER`
- `inferMarketRegion("", "7203.T")` -> `JP`
- `inferMarketRegion("NYSE", "7203")` -> `US`
- `inferMarketRegion("東証", "AAPL")` -> `JP`
- `normalizeMarket("", "7203")` -> `東証`
- `inferCurrency("", "7203")` -> `JPY`
- `inferMarketRegion("", "123")` -> `OTHER`
- `inferMarketRegion("", "72030")` -> `OTHER`
- E2E confirms ticker-only registration with `7203` shows `東証` preview and
  opens the stock detail page.

## Known Constraints

- Four-digit numeric tickers from unsupported non-JP markets, such as Hong Kong,
  may be inferred as JP. This app currently targets JP / US workflows, so that
  tradeoff is accepted for this goal.
- Alphabetic US tickers such as `AAPL` and `SPCX` remain `OTHER` when market is
  blank. Users can enter `NASDAQ` / `NYSE` or edit the stock later.

## Validation plan

- `pnpm run typecheck`
- `pnpm run test`
- `pnpm run build`
- `pnpm run test:e2e -- --reporter=line`
- API key / secret scan with generated folders excluded.

## Current evidence

- RED: `pnpm run test` failed before the inference fix because
  `inferMarketRegion("", "7203")` returned `OTHER`.
- GREEN: `pnpm run test` passed after adding the four-digit fallback.
- `pnpm run typecheck`: success
- `pnpm run test`: success
- `pnpm run build`: success
- `pnpm run test:e2e -- --reporter=line`: success, 6 passed
- API key / secret scan: no real key found. Hits are environment variable
  names, docs, existing server-side adapters, and test fake values.
- PR and CI are pending.
