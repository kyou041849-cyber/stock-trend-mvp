# G015: Secret scan false-positive fix for backup data

## Status

in progress

## Outcome

Fix the localStorage backup sensitive-value scanner so normal app IDs such as
`risk-...`, `task-...`, and `sample-jp-7203-task-earnings-check` are not treated
as `sk-...` API keys.

## Scope

- Add a word boundary to the `sk-` branch of `SENSITIVE_VALUE_PATTERN`.
- Keep detection for values that actually start with an OpenAI-style `sk-` key.
- Do not change the other sensitive-value branches (`OPENAI_API_KEY`, `Bearer`,
  `AIza`) in this goal.
- Do not change the backup JSON format or localStorage keys.

## Test oracle

- A value like `sk-abcdefghijklmnop` is still detected.
- A value like `risk-1751871234567-a3f9c81b2e4d1` is not detected.
- A value like `task-1751871234567-a3f9c81b2e4d1` is not detected.
- A value like `sample-jp-7203-task-earnings-check` is not detected.
- `createLocalStorageBackup` succeeds for the built-in sample stock data.

## Validation plan

- `pnpm run typecheck`
- `pnpm run test`
- `pnpm run build`
- `pnpm run test:e2e -- --reporter=line`
- API key / secret scan with generated folders excluded.

## Current evidence

- RED observed before the production fix: `pnpm run test` failed because
  `risk-1751871234567-a3f9c81b2e4d1` was reported as sensitive.
- Minimal fix applied: `sk-` detection now requires a word boundary.
- GREEN observed after the fix: `pnpm run test` succeeded.
- `pnpm run typecheck`: success
- `pnpm run test`: success
- `pnpm run build`: success
- `pnpm run test:e2e -- --reporter=line`: success, 5 passed
- API key / secret scan: no real key found. Hits are environment variable names,
  docs, existing server-side adapters, test fake values, and the intentional
  false-positive regression strings.

## PR / CI

- PR: pending
- CI: pending
