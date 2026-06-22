import type { CurrencyCode, DisplayUnit, MarketRegion, NumericUnit } from "./types";

export function normalizeTicker(ticker: string): string {
  return ticker.trim().toUpperCase();
}

export function inferMarketRegion(market: string, ticker: string): MarketRegion {
  const normalizedMarket = market.trim().toUpperCase();
  const normalizedTicker = normalizeTicker(ticker);

  if (normalizedMarket.includes("東証") || normalizedMarket.includes("TSE") || normalizedTicker.endsWith(".T")) {
    return "JP";
  }

  if (["NASDAQ", "NYSE", "AMEX", "US"].some((keyword) => normalizedMarket.includes(keyword))) {
    return "US";
  }

  return "OTHER";
}

export function normalizeMarket(market: string, ticker: string): string {
  const trimmed = market.trim();
  if (trimmed) {
    return trimmed;
  }

  const region = inferMarketRegion(trimmed, ticker);
  if (region === "JP") return "東証";
  if (region === "US") return "NASDAQ/NYSE";
  return "";
}

export function inferCurrency(market: string, ticker: string): CurrencyCode {
  const region = inferMarketRegion(market, ticker);
  if (region === "JP") return "JPY";
  if (region === "US") return "USD";
  return "UNKNOWN";
}

export function inferPriceUnit(currency: CurrencyCode): NumericUnit {
  if (currency === "JPY") return "円";
  if (currency === "USD") return "ドル";
  return "未指定";
}

export function inferFinancialUnit(currency: CurrencyCode): NumericUnit {
  if (currency === "JPY") return "百万円";
  if (currency === "USD") return "百万ドル";
  return "未指定";
}

export function normalizeNumericUnit(value: unknown, fallback: NumericUnit): NumericUnit {
  return ["円", "ドル", "百万円", "百万ドル", "億円", "未指定"].includes(String(value))
    ? value as NumericUnit
    : fallback;
}

export function normalizeDisplayUnit(value: unknown): DisplayUnit {
  return ["raw", "thousand", "million", "hundred-million"].includes(String(value))
    ? value as DisplayUnit
    : "raw";
}

export function normalizeFiscalYear(value: string): string {
  return value.trim();
}

export function normalizeIsoDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value.trim() : date.toISOString().slice(0, 10);
}
