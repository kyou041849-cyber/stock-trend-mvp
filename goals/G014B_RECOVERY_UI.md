# G014b: localStorage復帰導線UI + 退避データ管理

## Status

accepted, PR #11 CI succeeded; main merge remains human

## Outcome

G013〜G014aで保護したlocalStorage破損・復元前退避の仕組みに対して、UIだけで安全に保存を再開できる導線と、退避キーを確認・ダウンロード・削除する管理導線を追加する。

## Scope

- 自動保存停止バナー内に、確認チェック付きの「保存を再開」操作を追加する。
- `storage-unavailable` の場合は、保存再開ボタンを表示しない。
- `rawBackupKey` が無い場合は、上書き保存前に現在の `stock-trend-mvp:stocks:v1` rawをJSONファイルとしてダウンロードする。
- 設定画面に退避データ管理を追加し、`stock-trend-mvp:stocks:corrupt:*` と `stock-trend-mvp:restore:pre:*` の一覧、ダウンロード、削除を行えるようにする。
- 手動バックアップJSONから退避キーを除外し、入れ子化・肥大化を防ぐ。

## Non-Goals

- 退避データの差分プレビュー。
- バックアップ世代管理。
- IndexedDBやサーバーDBへの移行。
- 既存localStorageキーやバックアップフォーマットの変更。

## Implementation Notes

- `resumeAutoSaveAfterStorageRecovery` は `saveStocks` を使い、保存成功時だけ自動保存停止を解除するための結果を返す。
- 退避キー削除は `deleteEvacuatedLocalStorageEntry` を通し、対象キーが退避キーでない場合は拒否する。
- 通常バックアップ対象キーは `LOCAL_STORAGE_BACKUP_EXCLUDED_PREFIXES` で `corrupt` / `restore:pre` を除外する。
- 削除UIは `window.confirm` による明示確認を挟む。

## Validation Plan

- `pnpm run typecheck`
- `pnpm run test`
- `pnpm run build`
- `pnpm run test:e2e -- --reporter=line`
- APIキー検索で実キーがないことを確認

## Current Evidence

- Unit tests added for resume helper, evacuation key listing, targeted deletion safety, and manual backup exclusion.
- E2E test added for corrupt startup -> confirmation -> save resume -> valid `stocks:v1` -> banner gone.
- `pnpm run typecheck`: success
- `pnpm run test`: success
- `pnpm run build`: success
- `pnpm run test:e2e -- --reporter=line`: success, 5 passed
- API key / secret scan: no real key found. Hits are environment variable names, docs, existing server-side adapters, test fake values, and `risk-` / `task-` false positives.

## PR / CI

- PR: #11, `https://github.com/kyou041849-cyber/stock-trend-mvp/pull/11`
- Branch: `codex/g014b-recovery-ui`
- Commit: `70ecb76 feat: add localStorage recovery UI`
- CI: GitHub Actions run `28670925039` succeeded
