# G006 Server-Side Market API

## Status

completed locally, ready for PR/CI confirmation

## Objective

株価API・業績APIの実取得経路を、ブラウザから外部APIへ直接fetchする構成から、Next.js Route Handler経由へ統一する。

## Scope

- 株価API Route Handlerを追加する
- 業績API Route Handlerを追加する
- 既存のクライアント側APIアダプタを内部Route呼び出しへ変更する
- APIキーをブラウザ、localStorage、URLクエリ、更新履歴へ渡さない
- Mock API、CSV、手入力、既存保存構造は維持する
- `.env.local.example` とREADME/docsを更新する
- テストと安全確認を追加する

## Implementation

Added server-side Route Handlers:

- `src/app/api/stock-prices/route.ts`
- `src/app/api/fundamentals/route.ts`

Added shared helpers:

- `src/lib/marketApiParsing.ts`
- `src/lib/serverMarketApi.ts`

Updated client adapters:

- `src/adapters/apiStockPriceAdapter.ts`
- `src/adapters/apiFundamentalAdapter.ts`

Updated settings / service behavior:

- 設定画面のAPIキー欄は読み取り専用の案内に変更。
- APIキーは保存・送信しない。
- 実API有効時のクライアント側必須条件は `enabled` と `providerName` のみに整理。
- サーバー側環境変数未設定時はRoute Handlerが安全な `api-not-configured` を返す。

## Environment Variables

`.env.local.example` に以下を追加:

```text
STOCK_PRICE_API_KEY=
STOCK_PRICE_API_BASE_URL=
FUNDAMENTAL_API_KEY=
FUNDAMENTAL_API_BASE_URL=
```

`.env.local` は作成せず、Git管理対象にも含めない。

## Safety Checks

- APIキーはクライアント側adapterのfetch bodyに含めない。
- APIベースURLはクライアント側adapterのfetch bodyに含めない。
- サーバー側外部fetchではAPIキーをURLクエリに付与しない。
- 実APIをテスト/E2Eで呼ばない。
- Mock API、CSV、手入力、AI/LLM機能の保存構造は変更しない。

## Validation

Local validation:

- `pnpm run typecheck`: success
- `pnpm run test`: success
- `pnpm run build`: success
- `pnpm run test:e2e -- --reporter=line`: success, 3 passed
- `git ls-files .env.local`: no tracked file
- `git ls-files | Select-String -Pattern "node_modules|\.next|screenshots|\.zip$|\.log$|test-results|playwright-report"`: no tracked unwanted files
- `git grep -n -E "sk-|OPENAI_API_KEY|apiKey|API_KEY|Bearer "`: only env var names, docs, test fixtures, existing server-side OpenAI adapter, and `risk-` / `task-` false positives; no real API key found

## PR / CI

Branch:

```text
codex/g006-server-proxy
```

Target:

```text
main
```

PR and GitHub Actions CI result are to be recorded after push.

## Notes

- `beta-0.1.0` tag is unchanged.
- `AI_Agent.git` is not used.
- No force push.
- This goal does not implement provider-specific production adapters beyond the generic server-side proxy/normalization boundary.
