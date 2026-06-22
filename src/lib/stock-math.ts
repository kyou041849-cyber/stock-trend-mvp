import type { ChartPoint, PriceRow, TrendAnalysis, TrendMetrics, TrendSignal } from "./types";

const TRADING_DAYS_52_WEEKS = 252;

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
  ];

  const score = Math.min(
    100,
    signals.reduce((sum, signal) => sum + (signal.passed ? signal.points : 0), 0),
  );

  return {
    chartData,
    latest,
    score,
    scoreLabel: rows.length === 0 ? "データ不足" : getScoreLabel(score),
    signals,
    metrics,
  };
}
