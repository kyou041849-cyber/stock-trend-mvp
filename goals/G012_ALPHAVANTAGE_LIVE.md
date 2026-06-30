# G012: Alpha Vantage Live Stock Price Compatibility

## Status

completed

## Objective

`STOCK_PRICE_API_PROVIDER=alpha-vantage` のとき、サーバー側Route HandlerがAlpha Vantageの `TIME_SERIES_DAILY` 形式に合うURLを構築し、日本株・米国株の株価ライブ取得を手動確認できる状態にする。

## Provider Modes

| Provider | Env value | Auth method | Request params |
|---|---|---|---|
| Generic | unset / `generic` | `Authorization: Bearer` and `X-API-Key` headers | existing `symbol`, `ticker`, `period`, `region`, `marketRegion`, `currency` |
| Alpha Vantage | `alpha-vantage` | server-side query `apikey` only | `function=TIME_SERIES_DAILY`, `symbol`, `outputsize`, `apikey` |

## Alpha Vantage Period Mapping

| App period | Alpha Vantage `outputsize` |
|---|---|
| `1m` | `compact` |
| `3m` | `compact` |
| `6m` | `compact` |
| `1y` | `full` |
| `3y` | `full` |
| `5y` | `full` |
| `all` | `full` |

## Key Handling

- The Alpha Vantage key is added only to the server-to-Alpha-Vantage request URL as `apikey`.
- The key is not included in browser requests, Route Handler JSON responses, data source messages, UI, localStorage, docs with real values, or logs.
- Tests use dummy values only.
- `.env.local` is not created or committed.

## JP / US Notes

- US tickers such as `AAPL` are the preferred first live smoke target.
- JP numeric tickers such as `7203` are normalized to `7203.T`.
- Alpha Vantage free tier coverage for `.T` tickers can be unstable; this is a provider data availability issue, not necessarily an app failure.

## Validation Plan

- `pnpm run typecheck`
- `pnpm run test`
- `pnpm run build`
- `pnpm run test:e2e -- --reporter=line`
- Secret scan excluding dependencies and generated output
- PR CI on `codex/g012-alphavantage-live`

## Current Evidence

- `pnpm run typecheck`: success
- `pnpm run test`: success
- `pnpm run build`: success
- `pnpm run test:e2e -- --reporter=line`: success, 3 passed
- Secret scan: no real API key found; hits are env var names, docs, test fake values including `av-test-key`, server-side adapters, and `risk-` / `task-` false positives
- PR: `https://github.com/kyou041849-cyber/stock-trend-mvp/pull/7`
- CI run: `28437898362`
- CI conclusion: `success`

## Human Needed

Live Alpha Vantage smoke requires human-provided credentials and remains manual. See H007 in `goals/HUMAN_NEEDED.md`.
