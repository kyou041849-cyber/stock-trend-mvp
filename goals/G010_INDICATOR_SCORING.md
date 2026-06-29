# G010 Indicator Scoring

## Status

completed

## Objective

G008で参考表示として追加した RSI(14) と SMA25/75クロスを、モメンタム確認方式でトレンド強さスコアへ反映する。実データや外部APIには依存せず、決定的なクラフト系列で検証する。

## Scoring Policy

- 加点する:
  - RSI(14)が50以上
  - SMA25/75のゴールデンクロス発生
- 参考のままにする:
  - RSI(14)が70超
  - RSI(14)が30未満
  - SMA25/75のデッドクロス発生
- RSI(14)が70超の過熱判定は減点しない。
- `score = Math.min(100, passed signal points total)` は維持する。
- 新規加点を入れても最大構成点は100以内に収める。

## Weight Table

| Signal key | Points | Note |
|---|---:|---|
| `closeAboveMa25` | 8 | 旧10から圧縮 |
| `closeAboveMa75` | 8 | 旧10から圧縮 |
| `closeAboveMa200` | 18 | 旧20から圧縮 |
| `ma25AboveMa75` | 13 | 旧15から圧縮 |
| `ma75AboveMa200` | 13 | 旧15から圧縮 |
| `risingClose20` | 15 | 据え置き |
| `volumeAboveAverage20` | 10 | 据え置き |
| `within20PercentFrom52WeekHigh` | 5 | 据え置き |
| `rsi14AtOrAbove50` | 5 | 新規加点 |
| `sma25_75GoldenCross` | 5 | 参考から加点へ変更 |
| `rsi14Above70` | 0 | 参考 |
| `rsi14Below30` | 0 | 参考 |
| `sma25_75DeadCross` | 0 | 参考 |

Positive-weight maximum: 100.

## Score Examples

| Fixture | Before | After | Reason |
|---|---:|---:|---|
| 30日連続上昇の基本系列 | 40 | 43 | RSI(14) 50以上の+5を追加し、MA系配点を一部圧縮 |
| SMA25/75ゴールデンクロス発生系列 | 65 | 69 | ゴールデンクロス+5とRSI(14) 50以上+5を反映し、既存MA系配点を圧縮 |
| 76日連続上昇・クロスなし系列 | 65 | 64 | RSI(14) 50以上は加点、ゴールデンクロスは非該当、既存MA系配点を圧縮 |

## Implementation

- `src/lib/stock-math.ts`
  - `RSI_MOMENTUM_THRESHOLD = 50` を追加。
  - `TREND_SIGNAL_POINTS` でトレンドスコア重みを一元化。
  - `rsi14AtOrAbove50` signalを追加。
  - `sma25_75GoldenCross` を5点へ変更。
  - `rsi14Above70`, `rsi14Below30`, `sma25_75DeadCross` は0点の参考のまま維持。
- `src/components/views/StockDetailView.tsx`
  - 変更なし。既存 `SignalTable` は points 0なら「参考」、points > 0なら加点表示するため互換。

## Validation

- `pnpm run typecheck`
- `pnpm run test`
- `pnpm run build`
- `pnpm run test:e2e -- --reporter=line`
- secret scan excluding generated/dependency folders

Results:

- `pnpm run typecheck`: success
- `pnpm run test`: success
- `pnpm run build`: success
- `pnpm run test:e2e -- --reporter=line`: success, 3 passed
- secret scan: no real API key found; hits are env var names, docs, test fake values, server-side adapters, and `risk-` / `task-` false positives

PR / CI:

- PR: `https://github.com/kyou041849-cyber/stock-trend-mvp/pull/5`
- CI run: `28384531414`
- CI conclusion: `success`

## Human-Needed / Deferred

- RSI(14) 50、RSI(14) 70/30、SMA25/75、各重みの最終確定は運用後に人間が判断する。
- G010の実装・PR・CIは既定値で進める。

## Safety

- 実外部API・実LLMはテストで呼ばない。
- localStorage構造は変更しない。
- `TrendSignal` の型と既存SignalTable表示構造は変更しない。
- 投資助言・売買推奨表現は追加しない。
- `beta-0.1.0` tagは変更しない。
