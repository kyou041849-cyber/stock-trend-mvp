import type {
  DataSourceInfo,
  FundamentalFetchPeriod,
  FundamentalUpdateHistory,
  FundamentalUpdateMethod,
  StockPriceFetchPeriod,
  StockPriceUpdateHistory,
  StockPriceUpdateMethod,
} from "./types";

function createHistoryId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `price-history-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function createStockPriceUpdateHistory(input: {
  stockId: string;
  method: StockPriceUpdateMethod;
  period: StockPriceFetchPeriod;
  fetchedCount: number;
  success: boolean;
  errorMessage?: string;
  dataSource: DataSourceInfo;
  updatedAt?: string;
}): StockPriceUpdateHistory {
  return {
    id: createHistoryId(),
    stockId: input.stockId,
    updatedAt: input.updatedAt ?? new Date().toISOString(),
    method: input.method,
    period: input.period,
    fetchedCount: input.fetchedCount,
    success: input.success,
    errorMessage: input.errorMessage ?? "",
    dataSource: input.dataSource,
  };
}

export function prependStockPriceUpdateHistory(
  histories: StockPriceUpdateHistory[],
  history: StockPriceUpdateHistory,
  limit = 30,
): StockPriceUpdateHistory[] {
  return [history, ...histories.filter((item) => item.id !== history.id)]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, limit);
}

export function createFundamentalUpdateHistory(input: {
  stockId: string;
  method: FundamentalUpdateMethod;
  period: FundamentalFetchPeriod;
  fetchedCount: number;
  success: boolean;
  errorMessage?: string;
  dataSource: DataSourceInfo;
  updatedAt?: string;
}): FundamentalUpdateHistory {
  return {
    id: createHistoryId(),
    stockId: input.stockId,
    updatedAt: input.updatedAt ?? new Date().toISOString(),
    method: input.method,
    period: input.period,
    fetchedCount: input.fetchedCount,
    success: input.success,
    errorMessage: input.errorMessage ?? "",
    dataSource: input.dataSource,
  };
}

export function prependFundamentalUpdateHistory(
  histories: FundamentalUpdateHistory[],
  history: FundamentalUpdateHistory,
  limit = 30,
): FundamentalUpdateHistory[] {
  return [history, ...histories.filter((item) => item.id !== history.id)]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, limit);
}

export function formatStockPricePeriod(period: StockPriceFetchPeriod): string {
  const labels: Record<StockPriceFetchPeriod, string> = {
    "1m": "直近1か月",
    "3m": "直近3か月",
    "6m": "直近6か月",
    "1y": "直近1年",
    "3y": "直近3年",
    "5y": "直近5年",
    all: "全期間",
  };

  return labels[period];
}

export function formatFundamentalPeriod(period: FundamentalFetchPeriod): string {
  const labels: Record<FundamentalFetchPeriod, string> = {
    annual: "年次",
    quarterly: "四半期",
    all: "全期間",
  };

  return labels[period];
}
