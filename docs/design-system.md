# Design System 方針

このアプリは、株価・業績・ニュース・AI分析をまとめて確認する調査補助ツールです。画面は装飾よりも、次に確認する情報を迷わず見つけられることを優先します。

## デザインの前提

- 対象: 個人利用のローカル分析アプリ
- 密度: やや高め。ただし重要情報と詳細情報を分ける
- 色: primary / muted / success / warning / danger / info の用途別に使う
- 文言: 投資判断ではなく、調査補助・機械的な表示として扱う
- 危険操作: 削除・リセットは danger 扱いにする

## トークン

トークンは `src/components/ui/tokens.ts` に集約します。

- 角丸: card は `rounded-lg`、control は `rounded-md`
- 影: 通常カードは `shadow-panel`
- 見出し: ページ見出し、セクション見出し、補助テキストを分ける
- ボタン: primary / secondary / ghost / danger
- バッジ・アラート: neutral / primary / success / warning / danger / info
- 入力欄: `inputClassName()` を使う

## 共通コンポーネント

共通UIは `src/components/ui/design-system.tsx` に集約します。

- `AppShell`: ページ全体の余白と背景
- `PageHeader`: 画面タイトルと主操作
- `SectionCard`: まとまりのある情報カード
- `MetricCard`: スコアや件数
- `StatusBadge`: 状態やスコアの補助表示
- `ActionButton`: 主要・補助・危険操作
- `ActionGroup`: ボタン群
- `InfoAlert`: 注意・成功・警告・エラー
- `EmptyState`: データ不足
- `DataTable`: 横スクロール前提の表
- `Toolbar`: 検索・絞り込み
- `FormField`: ラベル付き入力欄
- `CollapsibleSection`: 詳細設定や履歴

## 適用方針

- 新しいUIはまず Design System コンポーネントを使う
- `data-testid` は壊さない
- localStorageキー、API Route、保存構造は変更しない
- AI入力プレビュー、送信項目、利用ログ、CSV履歴などは折りたたみに入れる
- 一覧・CSV・AI履歴では、主操作を上に、補助操作を右側または詳細内に置く

## 置き換え済みの入口

- 全体外枠: `AppShell`
- 画面見出し: `PageHeader`
- 主要ボタン: `ActionButton`
- フォーム入力: `FormField` と `inputClassName`
- スコア・件数: `MetricCard`
- スコア/状態バッジ: `StatusBadge`
- 注意文: `InfoAlert`
- 折りたたみ: `CollapsibleSection`
- AI履歴検索: `Toolbar`
- AI比較: `SectionCard` と `StatusBadge`

## 今後の追加ルール

1. 同じ意味の操作は同じボタン種別を使う。
2. エラー・警告・成功・情報は `InfoAlert` または tone 付きバッジで表す。
3. 表が横に長い場合は `DataTable` または横スクロール領域で包む。
4. 履歴、ログ、JSON、入力プレビューは最初から開きっぱなしにしない。
5. 売買判断を促す断定表現は使わず、調査補助の表現に統一する。
