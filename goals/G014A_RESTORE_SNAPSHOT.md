# G014a: Restore Pre-Snapshot

## Status

completed locally, PR pending

## Background

G013 and G013.1 closed the localStorage corrupt-load and unavailable-storage loss paths. The remaining high-risk manual operation is restore itself because restore overwrites current `stock-trend-mvp:` localStorage keys.

## Scope

- Create a pre-restore snapshot immediately before applying a restore payload.
- Store the snapshot under `stock-trend-mvp:restore:pre:<timestamp>`.
- Keep only the latest pre-restore snapshot key.
- Download the same snapshot JSON automatically from SettingsView.
- Stop restore if snapshot creation fails.
- Exclude existing `restore:pre:*` keys from the snapshot payload to avoid recursively backing up snapshots.
- Split localStorage unavailable copy: load paths say "読み込めません"; save paths say "保存できません".

## Not In Scope

- Snapshot deletion UI.
- Snapshot generation history beyond latest 1.
- Restore diff preview.
- Backup generation management.
- IndexedDB migration.
- Server DB migration.

## Validation

Local validation:

- `pnpm run typecheck`: success
- `pnpm run test`: success
- `pnpm run build`: success
- `pnpm run test:e2e -- --reporter=line`: success, 4 passed
- API key / secret scan: no real key found

Pending:

- PR creation
- PR CI

## Human Needed

None for implementation. Main merge remains human-owned.
