# G009 LLM Provider Configuration

## Status

implemented, PR pending

## Objective

既存OpenAI Responses経路の後方互換を維持しつつ、OpenAI互換 Chat Completions 経路を追加し、DeepSeekなどの互換LLMへサーバー側Route Handler経由で接続できるようにする。自動テストでは実LLMを呼ばない。

## Background

- 既存実装は `https://api.openai.com/v1/responses` 固定だった。
- DeepSeekは OpenAI互換 Chat Completions API (`POST /chat/completions`) を使う。
- APIキーはブラウザ、localStorage、ログ、画面には出さず、サーバー側環境変数だけで扱う。

## Implementation

- `src/adapters/openAiLlmAdapter.ts`
  - `LLM_API_BASE_URL` を追加。未設定時は `https://api.openai.com`。
  - `LLM_API_FORMAT` を追加。`responses` / `chat-completions`、未設定時は `responses`。
  - `LLM_API_KEY` があれば最優先。
  - `responses` 経路は `OPENAI_API_KEY` を読む。
  - `chat-completions` 経路は `DEEPSEEK_API_KEY` を読む。
  - Responses body / Chat Completions body を分離。
  - Responses output / Chat Completions choices[0].message.content 解析を分離。
  - 禁止表現フィルタを両経路で適用。
- `scripts/live-llm-smoke.mjs`
  - 起動中の `/api/llm/analyze` を最小コンテキストで呼ぶ手動疎通用スクリプト。
  - APIキー、送信本文全文、レスポンス全文は表示しない。
- `.env.local.example`, `README.md`, docs
  - OpenAI Responses と OpenAI互換 Chat Completions の設定を追記。
  - DeepSeek利用時の設定例と、キーをサーバー側環境変数で扱う注意を追記。

## Validation

Local validation:

- `pnpm run typecheck`: success
- `pnpm run test`: success
- `pnpm run build`: success
- `pnpm run test:e2e -- --reporter=line`: success, 3 passed
- secret scan: no real API key found; hits are env var names, docs, test fake values, server-side adapters, and `risk-` / `task-` false positives

Unit coverage:

- default Responses config and endpoint
- Chat Completions config and endpoint
- `LLM_API_KEY` override
- missing `DEEPSEEK_API_KEY`
- invalid `LLM_API_FORMAT`
- Chat Completions request body shape
- Responses output extraction
- Chat Completions output extraction
- empty choices invalid-format
- rate limit mapping
- forbidden phrase guard in both paths
- body does not include API key

## Human-Needed / Deferred

- Live DeepSeek疎通は人間が実施する。
- 手順:
  1. Next.jsサーバーを起動する。
  2. サーバープロセス環境変数に `DEEPSEEK_API_KEY` を設定する。
  3. `LLM_API_BASE_URL=https://api.deepseek.com`
  4. `LLM_API_FORMAT=chat-completions`
  5. `OPENAI_MODEL=deepseek-v4-flash` または利用可能な互換モデルを設定する。
  6. `node scripts/live-llm-smoke.mjs` を実行する。

## Safety

- 実LLM APIは自動テスト・E2Eで呼んでいない。
- `.env.local` は作成していない。
- 実APIキーはコード、テスト、fixture、ログ、画面に入れていない。
- localStorage構造は変更していない。
- `beta-0.1.0` tagは変更していない。
