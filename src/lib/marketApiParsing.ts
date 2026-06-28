import type { StockPriceApiRawRow } from "../types/api";
import type { FundamentalApiRawRow } from "../types/fundamentalApi";

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function asRawRows<T extends Record<string, unknown>>(value: unknown): T[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  return value.filter((item): item is T => item !== null && typeof item === "object" && !Array.isArray(item));
}

function extractAlphaVantageRows(payload: Record<string, unknown>): StockPriceApiRawRow[] | null {
  const timeSeriesKey = Object.keys(payload).find((key) => key.toLowerCase().includes("time series"));

  if (!timeSeriesKey) {
    return null;
  }

  const timeSeries = asRecord(payload[timeSeriesKey]);
  if (!timeSeries) {
    return null;
  }

  return Object.entries(timeSeries).map(([date, value]) => {
    const row = asRecord(value) ?? {};
    return {
      date,
      open: row["1. open"] ?? row.open,
      high: row["2. high"] ?? row.high,
      low: row["3. low"] ?? row.low,
      close: row["4. close"] ?? row.close ?? row["5. adjusted close"],
      volume: row["5. volume"] ?? row.volume ?? row["6. volume"],
    };
  });
}

export function extractStockPriceApiRows(payload: unknown): StockPriceApiRawRow[] | null {
  const directRows = asRawRows<StockPriceApiRawRow>(payload);
  if (directRows) {
    return directRows;
  }

  const row = asRecord(payload);
  if (!row) {
    return null;
  }

  const alphaRows = extractAlphaVantageRows(row);
  if (alphaRows) {
    return alphaRows;
  }

  const candidates = [row.data, row.prices, row.historical, row.results, row.values];
  return candidates.map(asRawRows<StockPriceApiRawRow>).find((rows) => rows !== null) ?? null;
}

export function extractFundamentalApiRows(payload: unknown): FundamentalApiRawRow[] | null {
  const directRows = asRawRows<FundamentalApiRawRow>(payload);
  if (directRows) {
    return directRows;
  }

  const row = asRecord(payload);
  if (!row) {
    return null;
  }

  const candidates = [
    row.data,
    row.fundamentals,
    row.financials,
    row.annualReports,
    row.incomeStatement,
    row.incomeStatements,
    row.results,
  ];
  const direct = candidates.map(asRawRows<FundamentalApiRawRow>).find((rows) => rows !== null);
  if (direct) {
    return direct;
  }

  const financials = asRecord(row.financials);
  if (!financials) {
    return null;
  }

  return asRawRows<FundamentalApiRawRow>(financials.annual)
    ?? asRawRows<FundamentalApiRawRow>(financials.incomeStatement)
    ?? asRawRows<FundamentalApiRawRow>(financials.results);
}

export function extractMarketApiMessage(payload: unknown): string {
  const row = asRecord(payload);
  if (!row) {
    return "";
  }

  const values = [row.message, row.error, row["Error Message"], row.Note, row.Information];
  return values.find((value): value is string => typeof value === "string") ?? "";
}
