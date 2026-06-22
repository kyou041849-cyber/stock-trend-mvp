# β版バックアップガイド

このアプリは調査補助ツールです。スコアやAI分析は投資判断ではありません。

β版で実データを入れる前に、プロジェクト本体とブラウザ内データを分けてバックアップしてください。

## β版開始前にやること

1. `npm.cmd run typecheck`
2. `npm.cmd run test`
3. `npm.cmd run build`
4. `npm.cmd run test:e2e -- --reporter=line`
5. プロジェクトZIPを作る
6. アプリの設定画面からlocalStorageバックアップJSONを保存する
7. Gitの初期コミットとタグ `beta-0.1.0` があることを確認する

## Gitでコードを戻す

β版開始時点のコードには、タグ `beta-0.1.0` を付けています。

コードだけをβ版開始時点で確認したい場合は、以下を使います。

```powershell
git checkout beta-0.1.0
```

localStorageの銘柄データ、CSV取り込み履歴、AI分析履歴などはGitでは戻りません。ブラウザ内データは、このガイドのlocalStorageバックアップJSONで管理してください。

## プロジェクトZIPバックアップ

保存先の例:

```text
C:\Users\kyou0\Documents\日常の困りごと\stock-trend-mvp-backups
```

ZIPには、ソースコード、テスト、ドキュメント、設定ファイル、`.env.local.example` を含めます。

ZIPに含めないもの:

```text
node_modules/
.next/
dist/
coverage/
playwright-report/
test-results/
screenshots/
.env.local
*.zip
*.log
```

`.env.local` には実LLM APIキーを置く可能性があるため、絶対にバックアップZIPへ含めないでください。共有するのは `.env.local.example` だけです。

## localStorageバックアップ

設定画面の「β版データバックアップ」から `バックアップJSONを保存` を押します。

バックアップ対象は `stock-trend-mvp:` で始まるlocalStorageキーだけです。

主な対象:

- 銘柄、株価、業績
- ニュース、リスクメモ、決算予定、確認タスク
- AI分析履歴
- LLM送信設定
- LLM利用ログ
- CSVインポート履歴

バックアップJSONには、バックアップ日時、schemaVersion、対象キー一覧が入ります。

## localStorage復元

設定画面の「β版データバックアップ」でJSONファイルを選択します。

復元前に以下を確認してください。

- `stock-trend-mvp` のバックアップとして認識されている
- 復元対象キー一覧が表示されている
- 既存データを上書きすることを理解している

確認チェックを入れてから `復元を実行` を押します。

復元後はページを再読み込みしてください。

## 安全ルール

- APIキーらしい値を検出した場合、バックアップまたは復元を中止します。
- `stock-trend-mvp:` で始まらないキーは復元しません。
- `.env.local` の内容はバックアップ対象ではありません。
- localStorageバックアップは単純な上書き復元です。マージ復元ではありません。

## バックアップ頻度の目安

- 実データを入れる前
- CSVやMock APIで大きくデータを追加する前
- AI分析履歴を多く生成した後
- UIや保存処理を大きく変更する前
- β版を人に見せる前

## 復元時の注意

復元すると、同じlocalStorageキーの現在データは上書きされます。

不安な場合は、復元前に現在の状態も別名でバックアップしてください。
