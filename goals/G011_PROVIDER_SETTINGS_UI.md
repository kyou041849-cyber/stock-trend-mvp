# G011: Provider Settings UI

## Status

in-progress, PR pending

## Objective

SettingsViewで、実LLMが参照するサーバー側の実効プロバイダ設定を確認できるようにする。

## Scope

- 非秘密のLLM設定要約APIを追加する。
- 設定画面に読み取り専用の「現在のLLMプロバイダ（サーバー側）」セクションを追加する。
- APIキー値は全文・一部とも返さない。
- 実LLM APIは呼ばない。
- 既存のMock LLM、実LLM API Route、localStorage保存構造、設定画面の既存保存機能は変更しない。

## Non-Secret API Shape

Endpoint:

```text
GET /api/llm/config
```

Response fields:

- `configured`: LLM API形式、モデル、キー設定状態が実LLM生成に必要な条件を満たすか。
- `format`: `responses` / `chat-completions` / `null`。
- `baseUrl`: クエリ文字列とハッシュを除去したベースURL。
- `model`: `OPENAI_MODEL` の値。未設定時は空文字。
- `apiKeySource`: `LLM_API_KEY` / `OPENAI_API_KEY` / `DEEPSEEK_API_KEY` / `null`。
- `apiKeyConfigured`: キーが設定されているかどうかの真偽値。
- `status`: `configured` / `api-not-configured` / `invalid-format`。
- `message`: 画面表示用の非秘密メッセージ。

Not returned:

- `apiKey`
- APIキー値の全文または一部
- Authorization header
- 実LLM送信本文
- localStorageの生データ

## Settings UI

Added read-only fields:

- 設定状態
- プロバイダ形式
- ベースURL
- モデル
- キー設定状況
- キー源

The section includes:

> APIキーの値は表示しません。画面で確認できるのは、キーが設定済みかどうかと参照している環境変数名だけです。

## Validation Plan

- `pnpm run typecheck`
- `pnpm run test`
- `pnpm run build`
- `pnpm run test:e2e -- --reporter=line`
- API key / secret scan excluding generated and dependency directories
- PR CI on `codex/g011-provider-settings-ui`

## Current Evidence

- `pnpm run typecheck`: success
- `pnpm run test`: success
- `pnpm run build`: success
- `pnpm run test:e2e -- --reporter=line`: success, 3 passed
- API key / secret scan: no real API key found; hits are env var names, docs, test fake values, server-side adapters, and `risk-` / `task-` false positives
- PR / CI: pending

## Human Needed

None for this goal.

Existing deferred items remain:

- H005: live DeepSeek smoke with real key is manual.
- H006: RSI/SMA scoring weights and thresholds can be tuned later after operation.
