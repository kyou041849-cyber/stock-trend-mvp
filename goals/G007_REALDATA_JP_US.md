# G007 Real Stock Price Data for JP and US

## Status

human-needed

## Objective

日本株と米国株の株価データを、G006で確立したサーバー側Route Handler経由で取得・解析・正規化できるようにする。CIでは実APIを呼ばず、fixtureとfetch stubで数値正確性と堅牢性を検証する。

## Scope

- 株価APIリクエストに `MarketRegion` を渡す
- 日本株ティッカーは必要に応じて `.T` を補完する
- 地域に応じて `CurrencyCode` を付与する
- Route Handlerから `serverMarketApi` へ、正規化済みティッカー、地域、通貨を渡す
- `PriceRow` に optional な `marketRegion` / `currency` を追加する
- Alpha Vantage互換fixtureとstubでJP/US、欠損、空、休場日ギャップ、レート制限、不正JSONを検証する
- 手動ライブ疎通スクリプトを追加するが、CIからは呼ばない

## Implementation Notes

- `src/lib/normalization.ts`
  - `resolveMarketRegion`
  - `normalizeTickerForMarket`
  - `currencyForMarketRegion`
- `src/app/api/stock-prices/route.ts`
  - bodyの `marketRegion` を受け取る
  - JPの4桁ティッカーを `.T` 付きに正規化する
  - `symbol` / `ticker` / `region` / `marketRegion` / `currency` を外部APIパラメータへ渡す
- `src/services/stockPriceUpdateService.ts`
  - 実API時に銘柄の地域をRouteへ渡す
  - 正規化時に地域・通貨を `PriceRow` へ付与する

## Fixtures

- `tests/fixtures/stock-price/av_jp_7203T_daily.json`
- `tests/fixtures/stock-price/av_us_aapl_daily.json`
- `tests/fixtures/stock-price/av_rate_limit_note.json`
- `tests/fixtures/stock-price/av_missing_fields.json`
- `tests/fixtures/stock-price/av_holiday_gap.json`
- `tests/fixtures/stock-price/malformed.json`
- `tests/fixtures/stock-price/empty.json`

## Validation

Local validation:

- `pnpm run typecheck`: success
- `pnpm run test`: success
- `pnpm run build`: success
- `pnpm run test:e2e -- --reporter=line`: success, 3 passed
- secret scan: no real API key found; hits are env var names, docs, server-side adapters, `risk-` / `task-` false positives, and test fake values

Branch / commit:

- branch: `codex/g007-realdata-jp-us`
- commit: `0061c01 feat: connect real stock price data for JP and US with fixtures`
- push: completed to `origin/codex/g007-realdata-jp-us`

Remaining:

- PR creation
- PR CI confirmation

## Safety

- `.env.local` is not created.
- API keys are not sent from the browser and are not saved to localStorage.
- API keys are not appended to URL query strings by the app.
- Tests and E2E use fixtures/stubs only.
- Real LLM API is not called.
- No holiday gap filling or fabricated price rows.

## Human-Needed / Deferred

- PR creation is human-needed because GitHub connector returned `403 Resource not accessible by integration` and local `gh` CLI is not installed.
- PR URL: `https://github.com/kyou041849-cyber/stock-trend-mvp/pull/new/codex/g007-realdata-jp-us`
- 実プロバイダの確定、base URLの確定、実APIキー投入、ライブ疎通は人間が実施する。
- `scripts/live-stock-smoke.mjs` は手動確認用であり、CIでは実行しない。
