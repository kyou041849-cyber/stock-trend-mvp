# G008 Technical Indicators and Signal Extension

## Status

completed

## Objective

既存の株価分析に RSI(14) と SMAクロス判定を追加し、既存のトレンドシグナル表示に機械的な参考シグナルとして統合する。投資判断や売買推奨に見える表現は追加しない。

## Scope

- `src/lib/stock-math.ts`
  - Wilder smoothing による `calculateRsi(rows, period = 14)`
  - `calculateMovingAverage` を使う `detectSmaCross(rows, shortWindow = 25, longWindow = 75)`
  - `calculateTrendAnalysis` の `TrendMetrics` と `TrendSignal` に RSI / SMAクロスを統合
- `src/lib/types.ts`
  - `TrendMetrics` に `rsi14` と SMAクロス関連値を追加
- `src/components/views/StockDetailView.tsx`
  - 既存 `SignalTable` でトレンドスコア判定も表示
  - 0点の参考シグナルは「参考」と表示
- `tests/run-unit-tests.ts`
  - RSI reference dataset
  - moving average regression
  - SMA golden/dead/none
  - trend signal integration
  - insufficient data / flat price edge cases

## Indicator Defaults

- RSI period: `14`
- RSI upper threshold: `70`
- RSI lower threshold: `30`
- SMA cross short window: `25`
- SMA cross long window: `75`

## Score Policy

既存のトレンドスコア重みは変更しない。

- RSI(14) 70超: `points = 0`
- RSI(14) 30未満: `points = 0`
- SMA25/75 golden cross: `points = 0`
- SMA25/75 dead cross: `points = 0`

理由:

- 既存の100点満点設計を壊さない。
- RSIとクロスはまず機械的な参考シグナルとして表示する。
- スコア重み付けは、運用で見た後に別Goalで調整できるようにする。

## Validation

Local validation:

- `pnpm run typecheck`: success
- `pnpm run test`: success
- `pnpm run build`: success
- `pnpm run test:e2e -- --reporter=line`: success, 3 passed
- secret scan: no real API key found; hits are env var names, docs, test fake values, server-side adapters, and `risk-` / `task-` false positives

Branch / PR:

- branch: `codex/g008-indicators-signals`
- implementation commit: `2c9120e feat: add RSI indicator and SMA-cross signals with reference tests`
- PR: `https://github.com/kyou041849-cyber/stock-trend-mvp/pull/3`
- CI run: `28361803492`
- CI conclusion: `success`

## Safety

- 実API・実LLM APIは呼んでいない。
- APIキー、`.env.local`、localStorage保存構造は変更していない。
- `beta-0.1.0` tagは変更していない。
- 投資助言や売買推奨に見える文言は追加していない。

## Human-Needed / Deferred

- RSI閾値、SMA window、トレンドスコアへの加点有無は、運用確認後に別Goalで調整可能。
- G008では `RSI14 / 70 / 30` と `SMA25 / SMA75` を初期値として採用し、スコア加点は行わない。
