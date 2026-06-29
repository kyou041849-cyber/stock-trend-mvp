import type { ChartPoint, PriceRow, TrendAnalysis, TrendMetrics, TrendSignal } from "./types";

const TRADING_DAYS_52_WEEKS = 252;
export const RSI_PERIOD = 14;
export const RSI_UPPER_THRESHOLD = 70;
export const RSI_LOWER_THRESHOLD = 30;
export const SMA_CROSS_SHORT_WINDOW = 25;
export const SMA_CROSS_LONG_WINDOW = 75;

export type SmaCrossState = "golden" | "dead" | "none";

export type SmaCrossResult = {
  state: SmaCrossState;
  shortWindow: number;
  longWindow: number;
  shortLatest: number | null;
  longLatest: number | null;
};

export function sortPriceRows(rows: PriceRow[]): PriceRow[] {
  return [...rows].sort((a, b) => a.date.localeCompare(b.date));
}

export function roundTo(value: number, digits = 2): number {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

export function calculateMovingAverage(rows: PriceRow[], windowSize: number): Array<number | null> {
  if (windowSize <= 0) {
    throw new Error("windowSize must be greater than 0");
  }

  const sortedRows = sortPriceRows(rows);
  let rollingSum = 0;

  return sortedRows.map((row, index) => {
    rollingSum += row.close;

    if (index >= windowSize) {
      rollingSum -= sortedRows[index - windowSize].close;
    }

    if (index < windowSize - 1) {
      return null;
    }

    return roundTo(rollingSum / windowSize);
  });
}

function calculateRsiValue(averageGain: number, averageLoss: number): number {
  if (averageGain === 0 && averageLoss === 0) {
    return 50;
  }

  if (averageLoss === 0) {
    return 100;
  }

  if (averageGain === 0) {
    return 0;
  }

  return roundTo(100 - 100 / (1 + averageGain / averageLoss));
}

export function calculateRsi(rows: PriceRow[], period = RSI_PERIOD): Array<number | null> {
  if (period <= 0) {
    throw new Error("period must be greater than 0");
  }

  const sortedRows = sortPriceRows(rows);
  const values: Array<number | null> = sortedRows.map(() => null);

  if (sortedRows.length <= period) {
    return values;
  }

  let gainSum = 0;
  let lossSum = 0;

  for (let index = 1; index <= period; index += 1) {
    const change = sortedRows[index].close - sortedRows[index - 1].close;
    gainSum += Math.max(change, 0);
    lossSum += Math.max(-change, 0);
  }

  let averageGain = gainSum / period;
  let averageLoss = lossSum / period;
  values[period] = calculateRsiValue(averageGain, averageLoss);

  for (let index = period + 1; index < sortedRows.length; index += 1) {
    const change = sortedRows[index].close - sortedRows[index - 1].close;
    const gain = Math.max(change, 0);
    const loss = Math.max(-change, 0);
    averageGain = (averageGain * (period - 1) + gain) / period;
    averageLoss = (averageLoss * (period - 1) + loss) / period;
    values[index] = calculateRsiValue(averageGain, averageLoss);
  }

  return values;
}

export function detectSmaCross(
  rows: PriceRow[],
  shortWindow = SMA_CROSS_SHORT_WINDOW,
  longWindow = SMA_CROSS_LONG_WINDOW,
): SmaCrossResult {
  const sortedRows = sortPriceRows(rows);
  const shortValues = calculateMovingAverage(sortedRows, shortWindow);
  const longValues = calculateMovingAverage(sortedRows, longWindow);

  let latestIndex = -1;
  for (let index = sortedRows.length - 1; index >= 0; index -= 1) {
    if (shortValues[index] !== null && longValues[index] !== null) {
      latestIndex = index;
      break;
    }
  }

  if (latestIndex < 0) {
    return {
      state: "none",
      shortWindow,
      longWindow,
      shortLatest: null,
      longLatest: null,
    };
  }

  const shortLatest = shortValues[latestIndex];
  const longLatest = longValues[latestIndex];
  let previousIndex = -1;
  for (let index = latestIndex - 1; index >= 0; index -= 1) {
    if (shortValues[index] !== null && longValues[index] !== null) {
      previousIndex = index;
      break;
    }
  }

  if (shortLatest === null || longLatest === null || previousIndex < 0) {
    return {
      state: "none",
      shortWindow,
      longWindow,
      shortLatest,
      longLatest,
    };
  }

  const previousShort = shortValues[previousIndex];
  const previousLong = longValues[previousIndex];
  let state: SmaCrossState = "none";

  if (previousShort !== null && previousLong !== null) {
    if (previousShort <= previousLong && shortLatest > longLatest) {
      state = "golden";
    } else if (previousShort >= previousLong && shortLatest < longLatest) {
      state = "dead";
    }
  }

  return {
    state,
    shortWindow,
    longWindow,
    shortLatest,
    longLatest,
  };
}

export function buildChartData(rows: PriceRow[]): ChartPoint[] {
  const sortedRows = sortPriceRows(rows);
  const ma25 = calculateMovingAverage(sortedRows, 25);
  const ma75 = calculateMovingAverage(sortedRows, 75);
  const ma200 = calculateMovingAverage(sortedRows, 200);

  return sortedRows.map((row, index) => ({
    ...row,
    ma25: ma25[index],
    ma75: ma75[index],
    ma200: ma200[index],
  }));
}

export function average(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }

  return roundTo(values.reduce((sum, value) => sum + value, 0) / values.length);
}

export function calculateLinearRegressionSlope(values: number[]): number | null {
  if (values.length < 2) {
    return null;
  }

  const meanX = (values.length - 1) / 2;
  const meanY = values.reduce((sum, value) => sum + value, 0) / values.length;

  let numerator = 0;
  let denominator = 0;

  values.forEach((value, index) => {
    const xOffset = index - meanX;
    numerator += xOffset * (value - meanY);
    denominator += xOffset * xOffset;
  });

  if (denominator === 0) {
    return null;
  }

  return roundTo(numerator / denominator, 4);
}

export function getScoreLabel(score: number): string {
  if (score >= 80) return "トレンド上は強い";
  if (score >= 60) return "やや強い";
  if (score >= 40) return "中立";
  if (score >= 20) return "弱い";
  return "かなり弱い";
}

function compareGreater(left: number | null, right: number | null): boolean | null {
  if (left === null || right === null) {
    return null;
  }

  return left > right;
}

function getLatestMetrics(chartData: ChartPoint[]): TrendMetrics {
  const latest = chartData.at(-1) ?? null;
  const trailing20 = chartData.slice(-20);
  const trailing52Weeks = chartData.slice(-TRADING_DAYS_52_WEEKS);
  const rsi14 = calculateRsi(chartData, RSI_PERIOD).at(-1) ?? null;
  const smaCross = detectSmaCross(chartData, SMA_CROSS_SHORT_WINDOW, SMA_CROSS_LONG_WINDOW);
  const volumeAverage20 = trailing20.length >= 20 ? average(trailing20.map((row) => row.volume)) : null;
  const closeSlope20 =
    trailing20.length >= 20 ? calculateLinearRegressionSlope(trailing20.map((row) => row.close)) : null;
  const high52Week =
    trailing52Weeks.length > 0 ? Math.max(...trailing52Weeks.map((row) => row.high)) : null;
  const low52Week =
    trailing52Weeks.length > 0 ? Math.min(...trailing52Weeks.map((row) => row.low)) : null;

  return {
    latestClose: latest?.close ?? null,
    latestDate: latest?.date ?? null,
    ma25: latest?.ma25 ?? null,
    ma75: latest?.ma75 ?? null,
    ma200: latest?.ma200 ?? null,
    rsi14,
    smaCrossState: smaCross.state,
    smaCrossShort: smaCross.shortLatest,
    smaCrossLong: smaCross.longLatest,
    closeSlope20,
    volumeAverage20,
    drawdownFrom52WeekHighPercent:
      latest && high52Week && high52Week > 0
        ? roundTo(((high52Week - latest.close) / high52Week) * 100, 1)
        : null,
    riseFrom52WeekLowPercent:
      latest && low52Week && low52Week > 0
        ? roundTo(((latest.close - low52Week) / low52Week) * 100, 1)
        : null,
    high52Week,
    low52Week,
  };
}

export function calculateTrendAnalysis(rows: PriceRow[]): TrendAnalysis {
  const chartData = buildChartData(rows);
  const latest = chartData.at(-1) ?? null;
  const metrics = getLatestMetrics(chartData);

  const risingClose20 =
    metrics.closeSlope20 === null ? null : metrics.closeSlope20 > 0;
  const volumeAboveAverage20 =
    latest === null || metrics.volumeAverage20 === null ? null : latest.volume > metrics.volumeAverage20;
  const within20PercentFrom52WeekHigh =
    metrics.drawdownFrom52WeekHighPercent === null
      ? null
      : metrics.drawdownFrom52WeekHighPercent <= 20;
  const rsiAboveUpperThreshold =
    metrics.rsi14 === null ? null : metrics.rsi14 > RSI_UPPER_THRESHOLD;
  const rsiBelowLowerThreshold =
    metrics.rsi14 === null ? null : metrics.rsi14 < RSI_LOWER_THRESHOLD;
  const smaCrossKnown =
    metrics.smaCrossShort !== null && metrics.smaCrossLong !== null;

  const signals: TrendSignal[] = [
    {
      key: "closeAboveMa25",
      label: "終値が25日移動平均線より上",
      passed: compareGreater(metrics.latestClose, metrics.ma25),
      points: 10,
    },
    {
      key: "closeAboveMa75",
      label: "終値が75日移動平均線より上",
      passed: compareGreater(metrics.latestClose, metrics.ma75),
      points: 10,
    },
    {
      key: "closeAboveMa200",
      label: "終値が200日移動平均線より上",
      passed: compareGreater(metrics.latestClose, metrics.ma200),
      points: 20,
    },
    {
      key: "ma25AboveMa75",
      label: "25日線が75日線より上",
      passed: compareGreater(metrics.ma25, metrics.ma75),
      points: 15,
    },
    {
      key: "ma75AboveMa200",
      label: "75日線が200日線より上",
      passed: compareGreater(metrics.ma75, metrics.ma200),
      points: 15,
    },
    {
      key: "risingClose20",
      label: "直近20営業日の終値が上昇傾向",
      passed: risingClose20,
      points: 15,
    },
    {
      key: "volumeAboveAverage20",
      label: "出来高が直近20営業日平均より増加",
      passed: volumeAboveAverage20,
      points: 10,
    },
    {
      key: "within20PercentFrom52WeekHigh",
      label: "52週高値からの下落率が20%以内",
      passed: within20PercentFrom52WeekHigh,
      points: 5,
    },
    {
      key: "rsi14Above70",
      label: `RSI(${RSI_PERIOD})が${RSI_UPPER_THRESHOLD}超`,
      passed: rsiAboveUpperThreshold,
      points: 0,
    },
    {
      key: "rsi14Below30",
      label: `RSI(${RSI_PERIOD})が${RSI_LOWER_THRESHOLD}未満`,
      passed: rsiBelowLowerThreshold,
      points: 0,
    },
    {
      key: "sma25_75GoldenCross",
      label: `${SMA_CROSS_SHORT_WINDOW}日線と${SMA_CROSS_LONG_WINDOW}日線のゴールデンクロス発生`,
      passed: smaCrossKnown ? metrics.smaCrossState === "golden" : null,
      points: 0,
    },
    {
      key: "sma25_75DeadCross",
      label: `${SMA_CROSS_SHORT_WINDOW}日線と${SMA_CROSS_LONG_WINDOW}日線のデッドクロス発生`,
      passed: smaCrossKnown ? metrics.smaCrossState === "dead" : null,
      points: 0,
    },
  ];

  const score = Math.min(
    100,
    signals.reduce((sum, signal) => sum + (signal.passed ? signal.points : 0), 0),
  );

  return {
    chartData,
    latest,
    score,
    scoreLabel: rows.length < 25 ? "データ不足" : getScoreLabel(score),
    signals,
    metrics,
  };
}
