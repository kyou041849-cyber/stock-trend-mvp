# G004 README Operation Docs

## Status

completed

## Objective

GitHubリモート退避後、GitHub上で最初に見るREADMEとβ版運用手順を整備し、β版運用に入るための導線を明確にする。

## Scope

- READMEをGitHub初見向けに整理する
- β版運用チェックシートを追加する
- CHANGELOGを追加し、`beta-0.1.0` を記録する
- Goal LoopにG004の結果を記録する
- 既存機能を壊していないことを検証する
- 変更をcommitし、`origin/main` へpushする

## Updated Files

- `README.md`
- `docs/beta-operation-checklist.md`
- `CHANGELOG.md`
- `GOAL.md`
- `goals/HUMAN_NEEDED.md`
- `goals/G004_README_OPERATION_DOCS.md`

## README Update

READMEには以下を整理した。

- アプリ概要
- 調査補助ツールであり投資判断ではないこと
- 主な機能
- 起動方法
- テスト方法
- localStorageデータとバックアップJSONの扱い
- CSV取り込み仕様
- `.env.local` と `.env.local.example` の扱い
- 実LLM APIを使う場合の注意
- β版タグ `beta-0.1.0` の意味
- 関連docsへのリンク

## Added Docs

### `docs/beta-operation-checklist.md`

β版運用時の確認項目を追加した。

- β版開始前チェック
- 実データ投入前チェック
- 銘柄追加時チェック
- CSV取り込み時チェック
- AI分析生成時チェック
- 実LLM API利用時チェック
- localStorageバックアップタイミング
- Gitコミットタイミング
- 不具合発見時の記録項目
- 復元が必要になったときの対応
- GitHubへpushする前の確認

### `CHANGELOG.md`

`beta-0.1.0` の初版変更履歴を追加した。

- β版初期タグ
- 主要機能
- CSV取り込み改善
- AI分析履歴/比較/差分
- Design System導入
- UI情報設計改善
- E2E追加
- localStorageバックアップ/復元
- GitHubリモート退避

## Validation

- `npm.cmd run typecheck`: success
- `npm.cmd run test`: success
- `npm.cmd run build`: success
- `npm.cmd run test:e2e -- --reporter=line`: success, 3 passed

## Safety Notes

- 実装機能や保存構造は変更していない。
- localStorageキーは変更していない。
- `.env.local` は追加していない。
- APIキーは記載していない。
- 実LLM APIは呼び出していない。
- `beta-0.1.0` タグは移動していない。
- `AI_Agent.git` へはpushしない。

## Commit / Push

This G004 record is included in the commit:

```text
docs: improve beta operation guide
```

Push target:

```text
https://github.com/kyou041849-cyber/stock-trend-mvp.git
```

## Next Goal Candidates

1. GitHub Actions CIでtypecheck/test/build/E2Eの自動検証を追加する。
2. localStorageバックアップの世代管理と復元前比較を追加する。
3. β版利用中の不具合記録テンプレートを画面またはdocsで整備する。
