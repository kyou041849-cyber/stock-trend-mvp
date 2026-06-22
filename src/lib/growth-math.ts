import { roundTo } from "./stock-math";
import type {
  EarningsRow,
  FundamentalAnalysis,
  FundamentalComputedRow,
  FundamentalMetrics,
  ScoreSignal,
  ValuationWarning,
} from "./types";

export function sortEarningsRows(rows: EarningsRow[]): EarningsRow[] {
  return [...rows].sort((a, b) => a.fiscalYear.localeCompare(b.fiscalYear, "ja-JP", { numeric: true }));
}

function percentGrowth(current: number | null, previous: number | null): number | null {
  if (current === null || previous === null || previous <= 0) {
    return null;
  }

  return roundTo(((current - previous) / previous) * 100, 1);
}

function percentOf(numerator: number | null, denominator: number | null): number | null {
  if (numerator === null || denominator === null || denominator <= 0) {
    return null;
  }

  return roundTo((numerator / denominator) * 100, 1);
}

function average(values: Array<number | null>): number | null {
  const validValues = values.filter((value): value is number => value !== null && Number.isFinite(value));

  if (validValues.length === 0) {
    return null;
  }

  return roundTo(validValues.reduce((sum, value) => sum + value, 0) / validValues.length, 1);
}

function passedAbove(value: number | null, threshold: number): boolean | null {
  if (value === null) {
    return null;
  }

  return value >= threshold;
}

function allPositive(values: Array<number | null>): boolean | null {
  if (values.length === 0 || values.some((value) => value === null)) {
    return null;
  }

  return values.every((value) => (value ?? 0) > 0);
}

function isConsecutiveGrowth(
  rows: EarningsRow[],
  getValue: (row: EarningsRow) => number | null,
  transitions = 3,
): boolean | null {
  if (rows.length < transitions + 1) {
    return null;
  }

  const recentRows = rows.slice(-(transitions + 1));

  for (let index = 1; index < recentRows.length; index += 1) {
    const previous = getValue(recentRows[index - 1]);
    const current = getValue(recentRows[index]);

    if (previous === null || current === null) {
      return null;
    }

    if (current <= previous) {
      return false;
    }
  }

  return true;
}

function averageGrowth(rows: FundamentalComputedRow[], key: keyof FundamentalComputedRow, years: number): number | null {
  if (rows.length < years) {
    return null;
  }

  return average(rows.slice(-years).slice(1).map((row) => row[key] as number | null));
}

export function buildFundamentalRows(rows: EarningsRow[]): FundamentalComputedRow[] {
  const sortedRows = sortEarningsRows(rows);

  return sortedRows.map((row, index) => {
    const previous = index > 0 ? sortedRows[index - 1] : null;

    return {
      ...row,
      revenueGrowthPercent: previous ? percentGrowth(row.revenue, previous.revenue) : null,
      operatingIncomeGrowthPercent: previous
        ? percentGrowth(row.operatingIncome, previous.operatingIncome)
        : null,
      netIncomeGrowthPercent: previous ? percentGrowth(row.netIncome, previous.netIncome) : null,
      epsGrowthPercent: previous ? percentGrowth(row.eps, previous.eps) : null,
      operatingMarginPercent: percentOf(row.operatingIncome, row.revenue),
      netMarginPercent: percentOf(row.netIncome, row.revenue),
      freeCashFlowGrowthPercent: previous
        ? percentGrowth(row.freeCashFlow, previous.freeCashFlow)
        : null,
    };
  });
}

function getFundamentalMetrics(rows: FundamentalComputedRow[]): FundamentalMetrics {
  const latest = rows.at(-1) ?? null;

  return {
    latestFiscalYear: latest?.fiscalYear ?? null,
    latestRevenueGrowthPercent: latest?.revenueGrowthPercent ?? null,
    latestOperatingIncomeGrowthPercent: latest?.operatingIncomeGrowthPercent ?? null,
    latestNetIncomeGrowthPercent: latest?.netIncomeGrowthPercent ?? null,
    latestEpsGrowthPercent: latest?.epsGrowthPercent ?? null,
    latestOperatingMarginPercent: latest?.operatingMarginPercent ?? null,
    latestNetMarginPercent: latest?.netMarginPercent ?? null,
    latestFreeCashFlowGrowthPercent: latest?.freeCashFlowGrowthPercent ?? null,
    latestFreeCashFlow: latest?.freeCashFlow ?? null,
    latestEquityRatio: latest?.equityRatio ?? null,
    latestRoe: latest?.roe ?? null,
    latestRoic: latest?.roic ?? null,
    latestPer: latest?.per ?? null,
    latestPbr: latest?.pbr ?? null,
    latestPsr: latest?.psr ?? null,
    average3YearRevenueGrowthPercent: averageGrowth(rows, "revenueGrowthPercent", 3),
    average3YearOperatingIncomeGrowthPercent: averageGrowth(rows, "operatingIncomeGrowthPercent", 3),
    average3YearEpsGrowthPercent: averageGrowth(rows, "epsGrowthPercent", 3),
    average5YearRevenueGrowthPercent: averageGrowth(rows, "revenueGrowthPercent", 5),
    average5YearOperatingIncomeGrowthPercent: averageGrowth(rows, "operatingIncomeGrowthPercent", 5),
    average5YearEpsGrowthPercent: averageGrowth(rows, "epsGrowthPercent", 5),
  };
}

function getGrowthScoreLabel(score: number, rowsCount: number): string {
  if (rowsCount === 0) return "データ不足";
  if (score >= 80) return "成長性は高め";
  if (score >= 60) return "成長性はやや高め";
  if (score >= 40) return "成長性は中立";
  if (score >= 20) return "成長性は弱め";
  return "成長性はかなり弱め";
}

function getSafetyScoreLabel(score: number, rowsCount: number): string {
  if (rowsCount === 0) return "データ不足";
  if (score >= 80) return "財務安全性は高め";
  if (score >= 60) return "財務安全性はやや高め";
  if (score >= 40) return "財務安全性は中立";
  if (score >= 20) return "慎重に確認";
  return "データ不足または弱め";
}

export function getTotalResearchScoreLabel(score: number): string {
  if (score >= 80) return "追加調査の優先度が高い";
  if (score >= 60) return "調査候補";
  if (score >= 40) return "中立";
  if (score >= 20) return "慎重に確認";
  return "現時点では優先度低め";
}

function calculateGrowthSignals(rows: FundamentalComputedRow[], metrics: FundamentalMetrics): ScoreSignal[] {
  return [
    {
      key: "revenueConsecutiveGrowth",
      label: "売上が3年以上連続成長",
      passed: isConsecutiveGrowth(rows, (row) => row.revenue),
      points: 20,
    },
    {
      key: "average3YearRevenueGrowth",
      label: "3年平均売上成長率が10%以上",
      passed: passedAbove(metrics.average3YearRevenueGrowthPercent, 10),
      points: 15,
    },
    {
      key: "operatingIncomeConsecutiveGrowth",
      label: "営業利益が3年以上連続成長",
      passed: isConsecutiveGrowth(rows, (row) => row.operatingIncome),
      points: 15,
    },
    {
      key: "average3YearOperatingIncomeGrowth",
      label: "3年平均営業利益成長率が10%以上",
      passed: passedAbove(metrics.average3YearOperatingIncomeGrowthPercent, 10),
      points: 15,
    },
    {
      key: "epsConsecutiveGrowth",
      label: "EPSが3年以上連続成長",
      passed: isConsecutiveGrowth(rows, (row) => row.eps),
      points: 10,
    },
    {
      key: "operatingMargin",
      label: "営業利益率が10%以上",
      passed: passedAbove(metrics.latestOperatingMarginPercent, 10),
      points: 10,
    },
    {
      key: "freeCashFlowPositive",
      label: "フリーキャッシュフローが直近年度でプラス",
      passed: metrics.latestFreeCashFlow === null ? null : metrics.latestFreeCashFlow > 0,
      points: 10,
    },
    {
      key: "roe",
      label: "ROEが10%以上",
      passed: passedAbove(metrics.latestRoe, 10),
      points: 5,
    },
  ];
}

function calculateSafetySignals(rows: FundamentalComputedRow[], metrics: FundamentalMetrics): ScoreSignal[] {
  const latestTwoFreeCashFlows = rows.slice(-2).map((row) => row.freeCashFlow);

  return [
    {
      key: "equityRatio50",
      label: "自己資本比率が50%以上",
      passed: metrics.latestEquityRatio === null ? null : metrics.latestEquityRatio >= 50,
      points: metrics.latestEquityRatio !== null && metrics.latestEquityRatio >= 50 ? 30 : 0,
    },
    {
      key: "equityRatio30",
      label: "自己資本比率が30%以上50%未満",
      passed:
        metrics.latestEquityRatio === null
          ? null
          : metrics.latestEquityRatio >= 30 && metrics.latestEquityRatio < 50,
      points:
        metrics.latestEquityRatio !== null &&
        metrics.latestEquityRatio >= 30 &&
        metrics.latestEquityRatio < 50
          ? 20
          : 0,
    },
    {
      key: "freeCashFlowLatestPositive",
      label: "フリーキャッシュフローが直近年度でプラス",
      passed: metrics.latestFreeCashFlow === null ? null : metrics.latestFreeCashFlow > 0,
      points: 20,
    },
    {
      key: "freeCashFlowTwoYearsPositive",
      label: "フリーキャッシュフローが2年以上連続プラス",
      passed: rows.length < 2 ? null : allPositive(latestTwoFreeCashFlows),
      points: 20,
    },
    {
      key: "roic",
      label: "ROICが8%以上",
      passed: passedAbove(metrics.latestRoic, 8),
      points: 15,
    },
    {
      key: "roe",
      label: "ROEが10%以上",
      passed: passedAbove(metrics.latestRoe, 10),
      points: 15,
    },
  ];
}

export function calculateValuationWarnings(latest: FundamentalComputedRow | null): ValuationWarning[] {
  if (!latest) {
    return [{ key: "missing", label: "データ不足", status: "missing" }];
  }

  const warnings: ValuationWarning[] = [];

  if (latest.per === null && latest.pbr === null && latest.psr === null) {
    warnings.push({ key: "missing", label: "データ不足", status: "missing" });
  }

  if (latest.per !== null && latest.per >= 50) {
    warnings.push({ key: "perHigh", label: "PER割高注意", status: "warning" });
  }

  if ((latest.per !== null && latest.per < 0) || latest.netIncome < 0) {
    warnings.push({ key: "perLoss", label: "利益赤字のためPER評価注意", status: "warning" });
  }

  if (latest.psr !== null && latest.psr >= 20) {
    warnings.push({ key: "psrHigh", label: "PSR割高注意", status: "warning" });
  }

  if (latest.pbr !== null && latest.pbr >= 10) {
    warnings.push({ key: "pbrHigh", label: "PBR割高注意", status: "warning" });
  }

  if (warnings.length === 0) {
    warnings.push({ key: "ok", label: "機械的な注意なし", status: "ok" });
  }

  return warnings;
}

export function formatValuationWarningLabels(warnings: ValuationWarning[]): string {
  return warnings.map((warning) => warning.label).join(" / ");
}

export function calculateFundamentalAnalysis(
  earningsRows: EarningsRow[],
  trendScore: number,
): FundamentalAnalysis {
  const rows = buildFundamentalRows(earningsRows);
  const latest = rows.at(-1) ?? null;
  const metrics = getFundamentalMetrics(rows);
  const growthSignals = calculateGrowthSignals(rows, metrics);
  const safetySignals = calculateSafetySignals(rows, metrics);
  const growthScore = Math.min(
    100,
    growthSignals.reduce((sum, signal) => sum + (signal.passed ? signal.points : 0), 0),
  );
  const financialSafetyScore = Math.min(
    100,
    safetySignals.reduce((sum, signal) => sum + (signal.passed ? signal.points : 0), 0),
  );
  const totalResearchScore = Math.round(trendScore * 0.3 + growthScore * 0.5 + financialSafetyScore * 0.2);

  return {
    rows,
    latest,
    growthScore,
    growthScoreLabel: getGrowthScoreLabel(growthScore, rows.length),
    financialSafetyScore,
    financialSafetyScoreLabel: getSafetyScoreLabel(financialSafetyScore, rows.length),
    totalResearchScore,
    totalResearchScoreLabel: getTotalResearchScoreLabel(totalResearchScore),
    growthSignals,
    safetySignals,
    valuationWarnings: calculateValuationWarnings(latest),
    metrics,
  };
}
