import { mockApiDataSource } from "@/lib/dataSource";
import { formatFundamentalPeriod } from "@/lib/updateHistory";
import type { CurrencyCode, FundamentalFetchPeriod, NumericUnit } from "@/lib/types";
import type { FundamentalApiFetchResult, FundamentalApiRawRow } from "@/types/fundamentalApi";

function tickerSeed(ticker: string): number {
  return ticker
    .trim()
    .toUpperCase()
    .split("")
    .reduce((sum, char, index) => sum + char.charCodeAt(0) * (index + 5), 113);
}

function roundTo(value: number, digits = 2): number {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function makePattern(seed: number): "growth" | "flat" | "loss" {
  const index = seed % 3;
  if (index === 0) return "growth";
  if (index === 1) return "flat";
  return "loss";
}

function makeMockRows(
  ticker: string,
  currency: CurrencyCode,
  unit: NumericUnit,
): FundamentalApiRawRow[] {
  const seed = tickerSeed(ticker);
  const pattern = makePattern(seed);
  const rowsCount = 3 + (seed % 3);
  const latestYear = 2025;
  const baseRevenue = currency === "JPY" ? 85000 + (seed % 60000) : 12000 + (seed % 18000);
  const rows: FundamentalApiRawRow[] = [];

  for (let index = 0; index < rowsCount; index += 1) {
    const fiscalYear = String(latestYear - rowsCount + 1 + index);
    const growthRate =
      pattern === "growth"
        ? 1 + index * 0.13
        : pattern === "flat"
          ? 1 + Math.sin(index) * 0.025
          : 1 - Math.max(0, rowsCount - index - 1) * 0.035;
    const revenue = roundTo(baseRevenue * growthRate, 0);
    const operatingMargin = pattern === "loss" && index >= rowsCount - 2 ? -0.04 + index * 0.015 : pattern === "flat" ? 0.095 : 0.13 + index * 0.012;
    const netMargin = pattern === "loss" && index >= rowsCount - 2 ? -0.03 + index * 0.012 : pattern === "flat" ? 0.065 : 0.085 + index * 0.01;
    const operatingIncome = roundTo(revenue * operatingMargin, 0);
    const netIncome = roundTo(revenue * netMargin, 0);
    const eps = roundTo(netIncome / (80 + (seed % 40)), 2);
    const operatingCashFlow = roundTo(revenue * (pattern === "loss" ? 0.055 : 0.14), 0);
    const freeCashFlow = roundTo(operatingCashFlow - revenue * (pattern === "loss" && index === rowsCount - 1 ? 0.08 : 0.055), 0);

    rows.push({
      periodType: "annual",
      fiscalYear,
      fiscalQuarter: "fullYear",
      revenue,
      operatingIncome,
      netIncome,
      eps,
      operatingCashFlow,
      freeCashFlow,
      equityRatio: pattern === "loss" ? 28 + index * 2 : 42 + index * 3,
      roe: pattern === "loss" ? -4 + index * 3 : 10 + index * 2,
      roic: pattern === "loss" ? 3 + index : 7 + index * 1.4,
      marketCap: roundTo(revenue * (pattern === "growth" ? 8 + index : 3 + index * 0.5), 0),
      per: netIncome <= 0 ? -1 : roundTo(22 + index * 2 + (pattern === "growth" ? 8 : 0), 1),
      pbr: roundTo(pattern === "growth" ? 4 + index * 0.6 : 1.4 + index * 0.2, 1),
      psr: roundTo(pattern === "growth" ? 5 + index * 0.7 : 1.8 + index * 0.2, 1),
      currency,
      unit,
    });
  }

  return rows;
}

export const MockFundamentalApiAdapter = {
  async fetchFundamentals(
    ticker: string,
    period: FundamentalFetchPeriod,
    currency: CurrencyCode,
    unit: NumericUnit,
  ): Promise<FundamentalApiFetchResult> {
    const now = new Date().toISOString();
    const rawRows = period === "quarterly" ? [] : makeMockRows(ticker, currency, unit);
    const dataSource = mockApiDataSource(now, `対象期間：${formatFundamentalPeriod(period)} / 取得件数：${rawRows.length}件`);

    return {
      ok: rawRows.length > 0,
      status: rawRows.length > 0 ? "success" : "empty",
      rawRows,
      dataSource,
      message: rawRows.length > 0
        ? `Mock APIから業績データを取得しました（${rawRows.length}件）。`
        : "Mock APIに対象期間の業績データがありません。",
    };
  },
};
