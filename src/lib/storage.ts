import { apiDataSource, apiPlannedDataSource, csvDataSource, manualDataSource, mockApiDataSource, normalizeDataSource } from "./dataSource";
import { findSensitiveBackupEntries, STOCK_TREND_LOCAL_STORAGE_PREFIX, type LocalStorageLike } from "./localStorageBackup";
import { sortEarningsRows } from "./growth-math";
import {
  inferCurrency,
  inferFinancialUnit,
  inferMarketRegion,
  inferPriceUnit,
  normalizeDisplayUnit,
  normalizeMarket,
  normalizeNumericUnit,
  normalizeTicker,
} from "./normalization";
import { getSampleStocks } from "./sampleData";
import { sortPriceRows } from "./stock-math";
import type {
  ConfirmationTask,
  CompanyInfo,
  CurrencyCode,
  DataSourceInfo,
  DisplayUnit,
  EarningsMemo,
  EarningsCalendarItem,
  EarningsCalendarSource,
  EarningsCalendarStatus,
  EarningsRow,
  MarketRegion,
  NewsCategory,
  NewsItem,
  NewsSentiment,
  NewsSource,
  PriceReviewNote,
  ResearchMemo,
  RiskItem,
  StockProfile,
  WatchlistEntry,
  PriceRow,
  FundamentalFiscalQuarter,
  FundamentalPeriodType,
  FundamentalUpdateHistory,
  StockPriceUpdateHistory,
} from "./types";

export const STOCKS_STORAGE_KEY = "stock-trend-mvp:stocks:v1";
export const STOCKS_CORRUPT_BACKUP_PREFIX = "stock-trend-mvp:stocks:corrupt:";
const STOCKS_CORRUPT_BACKUP_LIMIT = 3;
const STORAGE_WARNING_BYTES = 3 * 1024 * 1024;
const STORAGE_DANGER_BYTES = Math.round(4.5 * 1024 * 1024);

export type StorageUsageEstimate = {
  keyCount: number;
  totalBytes: number;
  stocksBytes: number;
  warningLevel: "normal" | "warning" | "danger";
  warningMessage: string;
};

export type LoadStocksResult =
  | {
      ok: true;
      stocks: StockProfile[];
      warning?: string;
      droppedCount?: number;
      rawBackupKey?: string;
      rawContainsSensitivePattern?: boolean;
      shouldBlockAutoSave?: boolean;
      usage?: StorageUsageEstimate;
    }
  | {
      ok: false;
      stocks: StockProfile[];
      error: string;
      droppedCount?: number;
      rawBackupKey?: string;
      rawContainsSensitivePattern?: boolean;
      shouldBlockAutoSave: true;
      usage?: StorageUsageEstimate;
    };

export type SaveStocksResult =
  | {
      ok: true;
      bytes: number;
      usage?: StorageUsageEstimate;
    }
  | {
      ok: false;
      message: string;
      reason: "quota-exceeded" | "storage-unavailable" | "serialization-error" | "unknown";
    };

function isPriceRow(value: unknown): value is PriceRow {
  if (!value || typeof value !== "object") {
    return false;
  }

  const row = value as Record<string, unknown>;

  return (
    typeof row.date === "string" &&
    typeof row.open === "number" &&
    typeof row.high === "number" &&
    typeof row.low === "number" &&
    typeof row.close === "number" &&
    typeof row.volume === "number"
  );
}

function readNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function normalizeEarningsRow(value: unknown, fallback?: {
  currency: CurrencyCode;
  unit: StockProfile["financialUnit"];
  source: DataSourceInfo;
  updatedAt: string;
}): EarningsRow | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const row = value as Record<string, unknown>;
  const periodType = typeof row.periodType === "string" ? row.periodType as FundamentalPeriodType : "annual";
  const fiscalQuarter = typeof row.fiscalQuarter === "string" ? row.fiscalQuarter as FundamentalFiscalQuarter : "fullYear";
  const updatedAt = typeof row.updatedAt === "string" ? row.updatedAt : fallback?.updatedAt;
  const fiscalYear =
    typeof row.fiscalYear === "string"
      ? row.fiscalYear
      : typeof row.period === "string"
        ? row.period
        : "";
  const revenue = readNumber(row.revenue);
  const operatingIncome = readNumber(row.operatingIncome) ?? readNumber(row.operatingProfit);
  const netIncome = readNumber(row.netIncome);

  if (!fiscalYear || revenue === null || operatingIncome === null || netIncome === null) {
    return null;
  }

  return {
    id: typeof row.id === "string" ? row.id : `earnings-${fiscalYear}`,
    periodType: ["annual", "quarterly"].includes(periodType) ? periodType : "annual",
    fiscalYear,
    fiscalQuarter: ["Q1", "Q2", "Q3", "Q4", "fullYear"].includes(fiscalQuarter) ? fiscalQuarter : "fullYear",
    revenue,
    operatingIncome,
    netIncome,
    eps: readNumber(row.eps),
    operatingCashFlow: readNumber(row.operatingCashFlow),
    freeCashFlow: readNumber(row.freeCashFlow),
    equityRatio: readNumber(row.equityRatio),
    roe: readNumber(row.roe),
    roic: readNumber(row.roic),
    marketCap: readNumber(row.marketCap),
    per: readNumber(row.per),
    pbr: readNumber(row.pbr),
    psr: readNumber(row.psr),
    currency: readCurrency(row.currency, fallback?.currency ?? "UNKNOWN"),
    unit: normalizeNumericUnit(row.unit, fallback?.unit ?? "未指定"),
    source: row.source && fallback ? normalizeDataSource(row.source, fallback.source) : undefined,
    updatedAt,
    memo: typeof row.memo === "string" ? row.memo : "",
  };
}

function readString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function readBoolean(value: unknown): boolean {
  return typeof value === "boolean" ? value : false;
}

function normalizePriceRow(value: unknown): PriceRow | null {
  if (!isPriceRow(value)) {
    return null;
  }

  const row = value as Record<string, unknown>;
  const updatedAt = readString(row.updatedAt);
  const fallbackSource = row.source ? manualDataSource(updatedAt || new Date().toISOString()) : undefined;
  const marketRegion = ["JP", "US", "OTHER"].includes(String(row.marketRegion)) ? row.marketRegion as MarketRegion : undefined;
  const currency = ["JPY", "USD", "UNKNOWN"].includes(String(row.currency)) ? row.currency as CurrencyCode : undefined;

  return {
    date: value.date,
    open: value.open,
    high: value.high,
    low: value.low,
    close: value.close,
    volume: value.volume,
    marketRegion,
    currency,
    source: fallbackSource ? normalizeDataSource(row.source, fallbackSource) : undefined,
    updatedAt: updatedAt || undefined,
  };
}

function normalizeStockPriceUpdateHistory(value: unknown, stockId: string): StockPriceUpdateHistory | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const row = value as Record<string, unknown>;
  const updatedAt = readString(row.updatedAt) || new Date().toISOString();
  const method = readString(row.method) as StockPriceUpdateHistory["method"];
  const period = readString(row.period) as StockPriceUpdateHistory["period"];
  const fallbackSource = manualDataSource(updatedAt);

  return {
    id: readString(row.id) || `price-history-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    stockId: readString(row.stockId) || stockId,
    updatedAt,
    method: ["手入力", "CSV", "API", "Mock API"].includes(method) ? method : "手入力",
    period: ["1m", "3m", "6m", "1y", "3y", "5y", "all"].includes(period) ? period : "all",
    fetchedCount: readNumber(row.fetchedCount) ?? 0,
    success: readBoolean(row.success),
    errorMessage: readString(row.errorMessage),
    dataSource: normalizeDataSource(row.dataSource, fallbackSource),
  };
}

function normalizeFundamentalUpdateHistory(value: unknown, stockId: string): FundamentalUpdateHistory | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const row = value as Record<string, unknown>;
  const updatedAt = readString(row.updatedAt) || new Date().toISOString();
  const method = readString(row.method) as FundamentalUpdateHistory["method"];
  const period = readString(row.period) as FundamentalUpdateHistory["period"];
  const fallbackSource = manualDataSource(updatedAt);

  return {
    id: readString(row.id) || `fundamental-history-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    stockId: readString(row.stockId) || stockId,
    updatedAt,
    method: ["手入力", "CSV", "API", "Mock API"].includes(method) ? method : "手入力",
    period: ["annual", "quarterly", "all"].includes(period) ? period : "annual",
    fetchedCount: readNumber(row.fetchedCount) ?? 0,
    success: readBoolean(row.success),
    errorMessage: readString(row.errorMessage),
    dataSource: normalizeDataSource(row.dataSource, fallbackSource),
  };
}

function readCurrency(value: unknown, fallback: CurrencyCode): CurrencyCode {
  return ["JPY", "USD", "UNKNOWN"].includes(String(value)) ? value as CurrencyCode : fallback;
}

function readRegion(value: unknown, fallback: MarketRegion): MarketRegion {
  return ["JP", "US", "OTHER"].includes(String(value)) ? value as MarketRegion : fallback;
}

function normalizeCompanyInfo(value: unknown, stock: {
  id: string;
  ticker: string;
  companyName: string;
  market: string;
  sector: string;
  region: MarketRegion;
  currency: CurrencyCode;
  priceUnit: StockProfile["priceUnit"];
  financialUnit: StockProfile["financialUnit"];
  displayUnit: DisplayUnit;
  dataSource: DataSourceInfo;
  updatedAt: string;
}): CompanyInfo {
  const row = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const dataSource = normalizeDataSource(row.dataSource, stock.dataSource);

  return {
    stockId: stock.id,
    ticker: readString(row.ticker) || stock.ticker,
    companyName: readString(row.companyName) || stock.companyName,
    market: readString(row.market) || stock.market,
    sector: readString(row.sector) || stock.sector,
    region: readRegion(row.region, stock.region),
    currency: readCurrency(row.currency, stock.currency),
    priceUnit: normalizeNumericUnit(row.priceUnit, stock.priceUnit),
    financialUnit: normalizeNumericUnit(row.financialUnit, stock.financialUnit),
    displayUnit: normalizeDisplayUnit(row.displayUnit),
    description: readString(row.description),
    website: readString(row.website),
    dataSource,
    updatedAt: readString(row.updatedAt) || stock.updatedAt,
  };
}

function normalizeNewsItem(value: unknown, stock: {
  id: string;
  ticker: string;
  companyName: string;
}): NewsItem | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const row = value as Record<string, unknown>;
  const importance = readString(row.importance) as NewsItem["importance"];
  const category = readString(row.category) as NewsCategory;
  const sentiment = readString(row.sentiment) as NewsSentiment;
  const source = readString(row.source) as NewsSource;
  const updatedAt = readString(row.updatedAt) || new Date().toISOString();
  const normalizedSource: NewsSource = ["手入力", "API", "Mock API"].includes(source) ? source : "手入力";
  const fallbackSource =
    normalizedSource === "Mock API"
      ? mockApiDataSource(updatedAt)
      : normalizedSource === "API"
        ? apiDataSource("ニュースAPI", updatedAt)
        : manualDataSource(updatedAt);

  return {
    id: readString(row.id) || `news-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    stockId: readString(row.stockId) || stock.id,
    ticker: readString(row.ticker) || stock.ticker,
    companyName: readString(row.companyName) || stock.companyName,
    date: readString(row.date),
    title: readString(row.title),
    url: readString(row.url),
    mediaName: readString(row.mediaName),
    summary: readString(row.summary),
    category: ["決算", "業績", "新製品", "提携", "M&A", "規制", "訴訟", "マクロ経済", "セクター動向", "その他"].includes(category) ? category : "その他",
    relatedStockIds: Array.isArray(row.relatedStockIds) && row.relatedStockIds.length > 0
      ? row.relatedStockIds.filter((item): item is string => typeof item === "string")
      : [stock.id],
    importance: ["高", "中", "低"].includes(importance) ? importance : "中",
    sentiment: ["ポジティブ", "ネガティブ", "中立", "未分類"].includes(sentiment) ? sentiment : "未分類",
    source: normalizedSource,
    fetchedAt: readString(row.fetchedAt) || updatedAt,
    userMemo: readString(row.userMemo),
    checked: readBoolean(row.checked),
    dataSource: normalizeDataSource(row.dataSource, fallbackSource),
    createdAt: readString(row.createdAt) || new Date().toISOString(),
    updatedAt,
  };
}

function normalizeEarningsCalendarItem(value: unknown, stock: {
  id: string;
  ticker: string;
  companyName: string;
}): EarningsCalendarItem | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const row = value as Record<string, unknown>;
  const quarter = (readString(row.fiscalQuarter) || readString(row.quarter)) as EarningsCalendarItem["quarter"];
  const status = readString(row.status) as EarningsCalendarStatus;
  const source = readString(row.source) as EarningsCalendarSource;
  const updatedAt = readString(row.updatedAt) || new Date().toISOString();
  const normalizedSource: EarningsCalendarSource = ["手入力", "API", "Mock API"].includes(source) ? source : "手入力";
  const fallbackSource =
    normalizedSource === "Mock API"
      ? mockApiDataSource(updatedAt)
      : normalizedSource === "API"
        ? apiDataSource("決算カレンダーAPI", updatedAt)
        : manualDataSource(updatedAt);
  const earningsDate = readString(row.earningsDate) || readString(row.scheduledDate);
  const fiscalQuarter: EarningsCalendarItem["quarter"] = ["Q1", "Q2", "Q3", "Q4", "通期"].includes(quarter) ? quarter : "通期";

  return {
    id: readString(row.id) || `earnings-calendar-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    stockId: readString(row.stockId) || stock.id,
    ticker: readString(row.ticker) || stock.ticker,
    companyName: readString(row.companyName) || stock.companyName,
    earningsDate,
    scheduledDate: earningsDate,
    fiscalYear: readString(row.fiscalYear),
    fiscalQuarter,
    quarter: fiscalQuarter,
    status: ["未確認", "確認予定", "確認済み"].includes(status) ? status : "未確認",
    source: normalizedSource,
    memo: readString(row.memo),
    dataSource: normalizeDataSource(row.dataSource, fallbackSource),
    createdAt: readString(row.createdAt) || new Date().toISOString(),
    updatedAt,
  };
}

function normalizeConfirmationTask(value: unknown, stock: {
  id: string;
  ticker: string;
  companyName: string;
}): ConfirmationTask | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const row = value as Record<string, unknown>;
  const taskType = readString(row.taskType) as ConfirmationTask["taskType"];
  const priority = readString(row.priority) as ConfirmationTask["priority"];
  const status = readString(row.status) as ConfirmationTask["status"];

  return {
    id: readString(row.id) || `task-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    stockId: readString(row.stockId) || stock.id,
    ticker: readString(row.ticker) || stock.ticker,
    companyName: readString(row.companyName) || stock.companyName,
    title: readString(row.title),
    dueDate: readString(row.dueDate),
    taskType: ["決算確認", "ニュース確認", "株価確認", "業績確認", "リスク確認", "その他"].includes(taskType) ? taskType : "その他",
    priority: ["高", "中", "低"].includes(priority) ? priority : "中",
    status: ["未着手", "対応中", "完了", "保留"].includes(status) ? status : "未着手",
    memo: readString(row.memo),
    createdAt: readString(row.createdAt) || new Date().toISOString(),
    updatedAt: readString(row.updatedAt) || new Date().toISOString(),
  };
}

function normalizeWatchlistEntry(value: unknown, stockId: string): WatchlistEntry | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const row = value as Record<string, unknown>;
  const status = readString(row.status) as WatchlistEntry["status"];
  const priority = readString(row.priority) as WatchlistEntry["priority"];

  return {
    stockId,
    status: ["未保有", "監視中", "少額保有中", "保有中", "一時除外"].includes(status) ? status : "監視中",
    reason: readString(row.reason),
    themes: readString(row.themes),
    trigger: readString(row.trigger),
    priority: ["高", "中", "低"].includes(priority) ? priority : "中",
    nextCheck: readString(row.nextCheck),
    nextReviewDate: readString(row.nextReviewDate),
    memo: readString(row.memo),
    createdAt: readString(row.createdAt) || new Date().toISOString(),
    updatedAt: readString(row.updatedAt) || new Date().toISOString(),
  };
}

function normalizePriceReview(value: unknown): PriceReviewNote {
  const row = value && typeof value === "object" ? (value as Record<string, unknown>) : {};

  return {
    currentPriceMemo: readString(row.currentPriceMemo),
    reviewPriceLevel: readString(row.reviewPriceLevel),
    reviewReason: readString(row.reviewReason),
    dropFromHighPercent: readNumber(row.dropFromHighPercent),
    checkAfterEarnings: readBoolean(row.checkAfterEarnings),
    checkOnSharpDrop: readBoolean(row.checkOnSharpDrop),
    cautionMemo: readString(row.cautionMemo),
    updatedAt: readString(row.updatedAt) || new Date().toISOString(),
  };
}

function normalizeEarningsMemo(value: unknown): EarningsMemo | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const row = value as Record<string, unknown>;
  const quarter = readString(row.quarter) as EarningsMemo["quarter"];
  const revenueImpression = readString(row.revenueImpression) as EarningsMemo["revenueImpression"];
  const profitImpression = readString(row.profitImpression) as EarningsMemo["profitImpression"];
  const guidanceImpression = readString(row.guidanceImpression) as EarningsMemo["guidanceImpression"];

  return {
    id: readString(row.id) || `earnings-memo-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    announcementDate: readString(row.announcementDate),
    fiscalYear: readString(row.fiscalYear),
    quarter: ["Q1", "Q2", "Q3", "Q4", "通期"].includes(quarter) ? quarter : "通期",
    revenueImpression: ["良い", "普通", "悪い", "未確認"].includes(revenueImpression) ? revenueImpression : "未確認",
    profitImpression: ["良い", "普通", "悪い", "未確認"].includes(profitImpression) ? profitImpression : "未確認",
    guidanceImpression: ["良い", "普通", "悪い", "未確認"].includes(guidanceImpression) ? guidanceImpression : "未確認",
    goodPoints: readString(row.goodPoints),
    badPoints: readString(row.badPoints),
    nextCheckPoints: readString(row.nextCheckPoints),
    priceReactionMemo: readString(row.priceReactionMemo),
    overallMemo: readString(row.overallMemo),
    createdAt: readString(row.createdAt) || new Date().toISOString(),
    updatedAt: readString(row.updatedAt) || new Date().toISOString(),
  };
}

function normalizeRiskItem(value: unknown): RiskItem | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const row = value as Record<string, unknown>;
  const category = readString(row.category) as RiskItem["category"];
  const impact = readString(row.impact) as RiskItem["impact"];
  const probability = readString(row.probability) as RiskItem["probability"];
  const categories = [
    "競合リスク",
    "技術リスク",
    "規制リスク",
    "金利リスク",
    "為替リスク",
    "景気後退リスク",
    "バリュエーションリスク",
    "業績悪化リスク",
    "資金繰りリスク",
    "地政学リスク",
    "その他リスク",
  ];

  return {
    id: readString(row.id) || `risk-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    category: categories.includes(category) ? category : "その他リスク",
    content: readString(row.content),
    impact: ["大", "中", "小"].includes(impact) ? impact : "中",
    probability: ["高", "中", "低"].includes(probability) ? probability : "中",
    confirmationMethod: readString(row.confirmationMethod),
    responseMemo: readString(row.responseMemo),
    lastCheckedDate: readString(row.lastCheckedDate),
    createdAt: readString(row.createdAt) || new Date().toISOString(),
    updatedAt: readString(row.updatedAt) || new Date().toISOString(),
  };
}

function normalizeResearchMemo(value: unknown): ResearchMemo | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const row = value as Record<string, unknown>;
  const type = readString(row.type) as ResearchMemo["type"];
  const importance = readString(row.importance) as ResearchMemo["importance"];

  return {
    id: readString(row.id) || `research-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    date: readString(row.date),
    type: ["ニュース", "決算", "株価", "事業内容", "競合", "リスク", "その他"].includes(type) ? type : "その他",
    title: readString(row.title),
    content: readString(row.content),
    importance: ["高", "中", "低"].includes(importance) ? importance : "中",
    createdAt: readString(row.createdAt) || new Date().toISOString(),
    updatedAt: readString(row.updatedAt) || new Date().toISOString(),
  };
}

function normalizeStock(value: unknown): StockProfile | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const stock = value as Record<string, unknown>;

  if (typeof stock.id !== "string" || typeof stock.ticker !== "string") {
    return null;
  }

  const id = stock.id;
  const ticker = normalizeTicker(stock.ticker);
  const companyName = typeof stock.companyName === "string" ? stock.companyName : "";
  const market = normalizeMarket(typeof stock.market === "string" ? stock.market : "", ticker);
  const sector = typeof stock.sector === "string" ? stock.sector : "";
  const region = readRegion(stock.region, inferMarketRegion(market, ticker));
  const currency = readCurrency(stock.currency, inferCurrency(market, ticker));
  const priceUnit = normalizeNumericUnit(stock.priceUnit, inferPriceUnit(currency));
  const financialUnit = normalizeNumericUnit(stock.financialUnit, inferFinancialUnit(currency));
  const displayUnit = normalizeDisplayUnit(stock.displayUnit);
  const updatedAt = typeof stock.updatedAt === "string" ? stock.updatedAt : new Date().toISOString();
  const dataSource = normalizeDataSource(stock.dataSource, manualDataSource(updatedAt));
  const priceDataSource = normalizeDataSource(
    stock.priceDataSource,
    Array.isArray(stock.prices) && stock.prices.length > 0 ? csvDataSource(updatedAt) : apiPlannedDataSource(updatedAt),
  );
  const fundamentalDataSource = normalizeDataSource(
    stock.fundamentalDataSource,
    Array.isArray(stock.earnings) && stock.earnings.length > 0 ? manualDataSource(updatedAt) : apiPlannedDataSource(updatedAt),
  );
  const baseCompanyInfo = {
    id,
    ticker,
    companyName,
    market,
    sector,
    region,
    currency,
    priceUnit,
    financialUnit,
    displayUnit,
    dataSource,
    updatedAt,
  };

  return {
    id,
    ticker,
    companyName,
    market,
    sector,
    region,
    currency,
    priceUnit,
    financialUnit,
    displayUnit,
    memo: typeof stock.memo === "string" ? stock.memo : "",
    prices: sortPriceRows(
      Array.isArray(stock.prices)
        ? stock.prices
            .map(normalizePriceRow)
            .filter((row): row is PriceRow => row !== null)
        : [],
    ),
    earnings: Array.isArray(stock.earnings)
      ? sortEarningsRows(
          stock.earnings
            .map((row) => normalizeEarningsRow(row, {
              currency,
              unit: financialUnit,
              source: fundamentalDataSource,
              updatedAt,
            }))
            .filter((row): row is EarningsRow => row !== null),
        )
      : [],
    companyInfo: normalizeCompanyInfo(stock.companyInfo, baseCompanyInfo),
    dataSource,
    priceDataSource,
    fundamentalDataSource,
    priceUpdateHistories: Array.isArray(stock.priceUpdateHistories)
      ? stock.priceUpdateHistories
          .map((item) => normalizeStockPriceUpdateHistory(item, id))
          .filter((row): row is StockPriceUpdateHistory => row !== null)
          .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      : [],
    fundamentalUpdateHistories: Array.isArray(stock.fundamentalUpdateHistories)
      ? stock.fundamentalUpdateHistories
          .map((item) => normalizeFundamentalUpdateHistory(item, id))
          .filter((row): row is FundamentalUpdateHistory => row !== null)
          .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      : [],
    watchlist: normalizeWatchlistEntry(stock.watchlist, stock.id),
    priceReview: normalizePriceReview(stock.priceReview),
    earningsMemos: Array.isArray(stock.earningsMemos)
      ? stock.earningsMemos
          .map(normalizeEarningsMemo)
          .filter((row): row is EarningsMemo => row !== null)
          .sort((a, b) => b.announcementDate.localeCompare(a.announcementDate))
      : [],
    risks: Array.isArray(stock.risks)
      ? stock.risks
          .map(normalizeRiskItem)
          .filter((row): row is RiskItem => row !== null)
      : [],
    researchMemos: Array.isArray(stock.researchMemos)
      ? stock.researchMemos
          .map(normalizeResearchMemo)
          .filter((row): row is ResearchMemo => row !== null)
          .sort((a, b) => b.date.localeCompare(a.date))
      : [],
    news: Array.isArray(stock.news)
      ? stock.news
          .map((item) => normalizeNewsItem(item, { id, ticker, companyName }))
          .filter((row): row is NewsItem => row !== null)
          .sort((a, b) => b.date.localeCompare(a.date))
      : [],
    earningsCalendar: Array.isArray(stock.earningsCalendar)
      ? stock.earningsCalendar
          .map((item) => normalizeEarningsCalendarItem(item, { id, ticker, companyName }))
          .filter((row): row is EarningsCalendarItem => row !== null)
          .sort((a, b) => a.earningsDate.localeCompare(b.earningsDate))
      : [],
    confirmationTasks: Array.isArray(stock.confirmationTasks)
      ? stock.confirmationTasks
          .map((item) => normalizeConfirmationTask(item, { id, ticker, companyName }))
          .filter((row): row is ConfirmationTask => row !== null)
          .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
      : [],
    createdAt: typeof stock.createdAt === "string" ? stock.createdAt : new Date().toISOString(),
    updatedAt,
  };
}

function estimateStringBytes(value: string): number {
  return value.length * 2;
}

function createStorageUnavailableUsage(): StorageUsageEstimate {
  return {
    keyCount: 0,
    totalBytes: 0,
    stocksBytes: 0,
    warningLevel: "warning",
    warningMessage: "localStorageにアクセスできないため、使用量を確認できません。ブラウザ設定を確認してください。",
  };
}

function getStorageUsageWarning(totalBytes: number): Pick<StorageUsageEstimate, "warningLevel" | "warningMessage"> {
  if (totalBytes >= STORAGE_DANGER_BYTES) {
    return {
      warningLevel: "danger",
      warningMessage: "localStorage使用量が大きく、保存失敗リスクが高い状態です。バックアップJSONの保存や古い履歴の整理を検討してください。",
    };
  }

  if (totalBytes >= STORAGE_WARNING_BYTES) {
    return {
      warningLevel: "warning",
      warningMessage: "localStorage使用量が増えています。実データ投入前後はバックアップJSONを保存してください。",
    };
  }

  return {
    warningLevel: "normal",
    warningMessage: "localStorage使用量は通常範囲です。",
  };
}

export function estimateStockTrendLocalStorageUsage(storage: LocalStorageLike): StorageUsageEstimate {
  let totalBytes = 0;
  let stocksBytes = 0;
  let keyCount = 0;

  try {
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);
      if (!key?.startsWith(STOCK_TREND_LOCAL_STORAGE_PREFIX)) {
        continue;
      }

      const value = storage.getItem(key) ?? "";
      const bytes = estimateStringBytes(key) + estimateStringBytes(value);
      keyCount += 1;
      totalBytes += bytes;
      if (key === STOCKS_STORAGE_KEY) {
        stocksBytes = bytes;
      }
    }
  } catch {
    return createStorageUnavailableUsage();
  }

  return {
    keyCount,
    totalBytes,
    stocksBytes,
    ...getStorageUsageWarning(totalBytes),
  };
}

function isQuotaExceededError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const row = error as { name?: string; code?: number };
  return row.name === "QuotaExceededError" || row.name === "NS_ERROR_DOM_QUOTA_REACHED" || row.code === 22 || row.code === 1014;
}

function createCorruptBackupKey(now = new Date()): string {
  const stamp = now.toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
  return `${STOCKS_CORRUPT_BACKUP_PREFIX}${stamp}`;
}

function safeGetItem(storage: LocalStorageLike, key: string): string | null {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

function safeSetItem(storage: LocalStorageLike, key: string, value: string): boolean {
  try {
    storage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

function safeRemoveItem(storage: LocalStorageLike, key: string): void {
  try {
    storage.removeItem?.(key);
  } catch {
    // The original stocks key is intentionally never modified here.
  }
}

function listCorruptBackupKeys(storage: LocalStorageLike): string[] {
  const keys: string[] = [];
  try {
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);
      if (key?.startsWith(STOCKS_CORRUPT_BACKUP_PREFIX)) {
        keys.push(key);
      }
    }
  } catch {
    return [];
  }

  return keys.sort((a, b) => a.localeCompare(b));
}

function findExistingCorruptBackupKey(storage: LocalStorageLike, raw: string): string | undefined {
  return listCorruptBackupKeys(storage).find((key) => safeGetItem(storage, key) === raw);
}

function createUniqueCorruptBackupKey(storage: LocalStorageLike): string {
  const baseKey = createCorruptBackupKey();
  if (safeGetItem(storage, baseKey) === null) {
    return baseKey;
  }

  for (let index = 1; index <= 999; index += 1) {
    const candidate = `${baseKey}-${index}`;
    if (safeGetItem(storage, candidate) === null) {
      return candidate;
    }
  }

  return `${baseKey}-${Math.random().toString(16).slice(2)}`;
}

function pruneCorruptBackupKeys(storage: LocalStorageLike, preserveKey?: string): void {
  const keys = listCorruptBackupKeys(storage);
  let removableKeys = keys.filter((key) => key !== preserveKey);
  let overflow = Math.max(0, keys.length - STOCKS_CORRUPT_BACKUP_LIMIT);

  while (overflow > 0 && removableKeys.length > 0) {
    const key = removableKeys.shift();
    if (!key) break;
    safeRemoveItem(storage, key);
    overflow -= 1;
  }
}

function quarantineCorruptStocksRaw(storage: LocalStorageLike, raw: string): {
  rawBackupKey?: string;
  rawContainsSensitivePattern: boolean;
} {
  const rawContainsSensitivePattern = findSensitiveBackupEntries({ [STOCKS_STORAGE_KEY]: raw }).length > 0;
  const existingBackupKey = findExistingCorruptBackupKey(storage, raw);
  if (existingBackupKey) {
    pruneCorruptBackupKeys(storage, existingBackupKey);
    return { rawBackupKey: existingBackupKey, rawContainsSensitivePattern };
  }

  const rawBackupKey = createUniqueCorruptBackupKey(storage);
  if (safeSetItem(storage, rawBackupKey, raw)) {
    pruneCorruptBackupKeys(storage, rawBackupKey);
    return { rawBackupKey, rawContainsSensitivePattern };
  }

  return { rawContainsSensitivePattern };
}

function resolveLocalStorage(storage?: LocalStorageLike, accessMode: "read" | "write" = "write"): {
  ok: true;
  storage: LocalStorageLike;
} | {
  ok: false;
  message: string;
  usage: StorageUsageEstimate;
} {
  if (storage) {
    return { ok: true, storage };
  }

  if (typeof window === "undefined") {
    return {
      ok: false,
      message: "ブラウザ環境ではないためlocalStorageにアクセスできません。",
      usage: createStorageUnavailableUsage(),
    };
  }

  try {
    return { ok: true, storage: window.localStorage };
  } catch {
    const verb = accessMode === "read" ? "読み込めません" : "保存できません";
    return {
      ok: false,
      message: `localStorageにアクセスできないため${verb}。ブラウザのプライバシー設定や権限を確認してください。`,
      usage: createStorageUnavailableUsage(),
    };
  }
}

export function createStockId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `stock-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function loadStocksWithSafety(storage?: LocalStorageLike): LoadStocksResult {
  const resolvedStorage = resolveLocalStorage(storage, "read");
  if (!resolvedStorage.ok) {
    return {
      ok: false,
      stocks: [],
      error: resolvedStorage.message,
      shouldBlockAutoSave: true,
      usage: resolvedStorage.usage,
      rawContainsSensitivePattern: false,
    };
  }

  const localStorage = resolvedStorage.storage;
  const usage = estimateStockTrendLocalStorageUsage(localStorage);
  let raw: string | null;

  try {
    raw = localStorage.getItem(STOCKS_STORAGE_KEY);
  } catch {
    return {
      ok: false,
      stocks: [],
      error: "localStorageにアクセスできないため銘柄データを読み込めません。ブラウザのプライバシー設定や権限を確認してください。",
      shouldBlockAutoSave: true,
      usage,
      rawContainsSensitivePattern: false,
    };
  }

  if (!raw) {
    return { ok: true, stocks: getSampleStocks(), usage };
  }

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      const quarantine = quarantineCorruptStocksRaw(localStorage, raw);
      return {
        ok: false,
        stocks: [],
        error: "銘柄データの形式が配列ではありません。自動保存を停止しています。",
        shouldBlockAutoSave: true,
        usage,
        ...quarantine,
      };
    }

    const normalized = parsed
      .map(normalizeStock)
      .filter((stock): stock is StockProfile => stock !== null);
    const droppedCount = parsed.length - normalized.length;
    if (droppedCount > 0) {
      const quarantine = quarantineCorruptStocksRaw(localStorage, raw);
      const message = `${droppedCount} 件の銘柄データを正規化できませんでした。既存データ保護のため自動保存を停止しています。`;
      if (normalized.length === 0) {
        return {
          ok: false,
          stocks: [],
          error: message,
          shouldBlockAutoSave: true,
          droppedCount,
          usage,
          ...quarantine,
        };
      }

      return {
        ok: true,
        stocks: normalized,
        warning: message,
        droppedCount,
        shouldBlockAutoSave: true,
        usage,
        ...quarantine,
      };
    }

    return { ok: true, stocks: normalized, usage };
  } catch {
    const quarantine = raw ? quarantineCorruptStocksRaw(localStorage, raw) : { rawContainsSensitivePattern: false };
    return {
      ok: false,
      stocks: [],
      error: "銘柄データのJSONを読み込めませんでした。自動保存を停止しています。",
      shouldBlockAutoSave: true,
      usage,
      ...quarantine,
    };
  }
}

export function loadStocks(): StockProfile[] {
  const result = loadStocksWithSafety();
  return result.ok ? result.stocks : [];
}

export function saveStocks(stocks: StockProfile[], storage?: LocalStorageLike): SaveStocksResult {
  const resolvedStorage = resolveLocalStorage(storage, "write");
  if (!resolvedStorage.ok) {
    return { ok: false, message: resolvedStorage.message, reason: "storage-unavailable" };
  }

  const localStorage = resolvedStorage.storage;
  let serialized: string;
  try {
    serialized = JSON.stringify(stocks);
  } catch {
    return { ok: false, message: "銘柄データをJSONに変換できなかったため保存できませんでした。", reason: "serialization-error" };
  }

  try {
    localStorage.setItem(STOCKS_STORAGE_KEY, serialized);
    return {
      ok: true,
      bytes: estimateStringBytes(STOCKS_STORAGE_KEY) + estimateStringBytes(serialized),
      usage: estimateStockTrendLocalStorageUsage(localStorage),
    };
  } catch (error) {
    if (isQuotaExceededError(error)) {
      return {
        ok: false,
        message: "localStorageの容量上限に近いため、銘柄データを保存できませんでした。バックアップJSONを保存し、古い履歴の整理を検討してください。",
        reason: "quota-exceeded",
      };
    }

    if ((error as { name?: string } | null)?.name === "SecurityError") {
      return {
        ok: false,
        message: "localStorageにアクセスできないため保存できません。ブラウザのプライバシー設定や権限を確認してください。",
        reason: "storage-unavailable",
      };
    }

    return {
      ok: false,
      message: "localStorageへの保存に失敗しました。ブラウザ設定や空き容量を確認してください。",
      reason: "unknown",
    };
  }
}
