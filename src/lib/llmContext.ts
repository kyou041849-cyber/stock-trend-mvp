import { formatDataSource, formatDataSourceDate } from "./dataSource";
import { calculateFundamentalAnalysis } from "./growth-math";
import { calculateRiskItemScore, calculateRiskScore, getRiskScoreLabel } from "./risk-math";
import { loadStocks } from "./storage";
import { calculateTrendAnalysis } from "./stock-math";
import type {
  DataSourceInfo,
  EarningsCalendarItem,
  EarningsMemo,
  EarningsRow,
  LlmContextLimits,
  LlmSafeRecord,
  LlmStockResearchContext,
  NewsItem,
  PriceReviewNote,
  ResearchMemo,
  RiskItem,
  StockProfile,
  TrendAnalysis,
  FundamentalAnalysis,
  WatchlistEntry,
  ConfirmationTask,
} from "./types";

export const DEFAULT_LLM_CONTEXT_LIMITS: LlmContextLimits = {
  news: 20,
  researchMemos: 20,
  riskMemos: 20,
  earningsMemos: 20,
  earningsCalendar: 20,
  tasks: 20,
  fundamentals: 10,
};

type BuildStockResearchContextOptions = {
  limits?: Partial<LlmContextLimits>;
  generatedAt?: string;
};

const DENIED_FIELD_NAMES = new Set([
  "apiKey",
  "apikey",
  "apiBaseUrl",
  "baseUrl",
  "token",
  "secret",
  "password",
  "authorization",
  "credentials",
  "localStorage",
  "localStorageRaw",
]);

function isDeniedFieldName(key: string): boolean {
  return DENIED_FIELD_NAMES.has(key) || key.toLowerCase().includes("apikey");
}

function toSafeNumber(value: number | null | undefined): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function toNonEmptyString(value: string | null | undefined): string | undefined {
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed ? trimmed : undefined;
}

function sourceSummary(source: DataSourceInfo | undefined): LlmSafeRecord | undefined {
  if (!source) {
    return undefined;
  }

  return {
    type: source.type,
    label: formatDataSource(source),
    provider: source.provider,
    updatedAt: source.updatedAt,
    updatedAtLabel: formatDataSourceDate(source),
    status: source.status,
  };
}

export function sanitizeLlmContextValue(value: unknown): unknown {
  if (value === null || value === undefined) {
    return undefined;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined;
  }

  if (typeof value === "string") {
    return toNonEmptyString(value);
  }

  if (typeof value === "boolean") {
    return value;
  }

  if (Array.isArray(value)) {
    const items = value
      .map((item) => sanitizeLlmContextValue(item))
      .filter((item) => item !== undefined);
    return items.length > 0 ? items : undefined;
  }

  if (typeof value === "object") {
    const sanitizedEntries = Object.entries(value as Record<string, unknown>)
      .filter(([key]) => !isDeniedFieldName(key))
      .map(([key, item]) => [key, sanitizeLlmContextValue(item)] as const)
      .filter(([, item]) => item !== undefined);

    if (sanitizedEntries.length === 0) {
      return undefined;
    }

    return Object.fromEntries(sanitizedEntries);
  }

  return undefined;
}

function createHash(input: string): string {
  let hash = 2166136261;

  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return `ctx-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

export function createLlmContextHash(context: Omit<LlmStockResearchContext, "contextHash">): string {
  const { generatedAt: _generatedAt, ...stableContext } = context;
  return createHash(JSON.stringify(stableContext));
}

function newestFirst<T>(items: T[], getDate: (item: T) => string): T[] {
  return [...items].sort((a, b) => getDate(b).localeCompare(getDate(a)));
}

function summarizeTrend(analysis: TrendAnalysis): LlmSafeRecord {
  return {
    score: analysis.score,
    label: analysis.scoreLabel,
    latestDate: analysis.metrics.latestDate,
    latestClose: analysis.metrics.latestClose,
    ma25: analysis.metrics.ma25,
    ma75: analysis.metrics.ma75,
    ma200: analysis.metrics.ma200,
    closeSlope20: analysis.metrics.closeSlope20,
    volumeAverage20: analysis.metrics.volumeAverage20,
    drawdownFrom52WeekHighPercent: analysis.metrics.drawdownFrom52WeekHighPercent,
    riseFrom52WeekLowPercent: analysis.metrics.riseFrom52WeekLowPercent,
    high52Week: analysis.metrics.high52Week,
    low52Week: analysis.metrics.low52Week,
  };
}

function summarizeFundamentals(analysis: FundamentalAnalysis): LlmSafeRecord {
  return {
    growthScore: analysis.growthScore,
    growthScoreLabel: analysis.growthScoreLabel,
    financialSafetyScore: analysis.financialSafetyScore,
    financialSafetyScoreLabel: analysis.financialSafetyScoreLabel,
    totalResearchScore: analysis.totalResearchScore,
    totalResearchScoreLabel: analysis.totalResearchScoreLabel,
    metrics: analysis.metrics,
    valuationWarnings: analysis.valuationWarnings.map((warning) => ({
      label: warning.label,
      status: warning.status,
    })),
  };
}

function summarizeFundamentalRows(rows: EarningsRow[], limit: number): LlmSafeRecord[] {
  return rows.slice(-limit).map((row) => ({
    fiscalYear: row.fiscalYear,
    periodType: row.periodType,
    fiscalQuarter: row.fiscalQuarter,
    revenue: row.revenue,
    operatingIncome: row.operatingIncome,
    netIncome: row.netIncome,
    eps: row.eps,
    operatingCashFlow: row.operatingCashFlow,
    freeCashFlow: row.freeCashFlow,
    equityRatio: row.equityRatio,
    roe: row.roe,
    roic: row.roic,
    marketCap: row.marketCap,
    per: row.per,
    pbr: row.pbr,
    psr: row.psr,
    currency: row.currency,
    unit: row.unit,
    source: sourceSummary(row.source),
    updatedAt: row.updatedAt,
    memo: row.memo,
  }));
}

function summarizeWatchlist(watchlist: WatchlistEntry | null): LlmSafeRecord | undefined {
  if (!watchlist) {
    return undefined;
  }

  return {
    status: watchlist.status,
    priority: watchlist.priority,
    reason: watchlist.reason,
    themes: watchlist.themes,
    trigger: watchlist.trigger,
    nextCheck: watchlist.nextCheck,
    nextReviewDate: watchlist.nextReviewDate,
    memo: watchlist.memo,
    updatedAt: watchlist.updatedAt,
  };
}

function summarizePriceReview(priceReview: PriceReviewNote): LlmSafeRecord {
  return {
    currentPriceMemo: priceReview.currentPriceMemo,
    reviewPriceLevel: priceReview.reviewPriceLevel,
    reviewReason: priceReview.reviewReason,
    dropFromHighPercent: priceReview.dropFromHighPercent,
    checkAfterEarnings: priceReview.checkAfterEarnings,
    checkOnSharpDrop: priceReview.checkOnSharpDrop,
    cautionMemo: priceReview.cautionMemo,
    updatedAt: priceReview.updatedAt,
  };
}

function summarizeRisks(risks: RiskItem[], limit: number): LlmSafeRecord[] {
  return risks.slice(0, limit).map((risk) => ({
    category: risk.category,
    content: risk.content,
    impact: risk.impact,
    probability: risk.probability,
    score: calculateRiskItemScore(risk),
    confirmationMethod: risk.confirmationMethod,
    responseMemo: risk.responseMemo,
    lastCheckedDate: risk.lastCheckedDate,
    updatedAt: risk.updatedAt,
  }));
}

function summarizeNews(news: NewsItem[], limit: number): LlmSafeRecord[] {
  return newestFirst(news, (item) => item.date).slice(0, limit).map((item) => ({
    date: item.date,
    title: item.title,
    url: item.url,
    mediaName: item.mediaName,
    summary: item.summary,
    category: item.category,
    importance: item.importance,
    sentiment: item.sentiment,
    source: item.source,
    dataSource: sourceSummary(item.dataSource),
    userMemo: item.userMemo,
    checked: item.checked,
  }));
}

function summarizeEarningsCalendar(items: EarningsCalendarItem[], limit: number): LlmSafeRecord[] {
  return [...items]
    .sort((a, b) => a.earningsDate.localeCompare(b.earningsDate))
    .slice(0, limit)
    .map((item) => ({
      earningsDate: item.earningsDate,
      fiscalYear: item.fiscalYear,
      fiscalQuarter: item.fiscalQuarter,
      status: item.status,
      source: item.source,
      dataSource: sourceSummary(item.dataSource),
      memo: item.memo,
      updatedAt: item.updatedAt,
    }));
}

function summarizeTasks(tasks: ConfirmationTask[], limit: number): LlmSafeRecord[] {
  return [...tasks]
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, limit)
    .map((task) => ({
      title: task.title,
      dueDate: task.dueDate,
      taskType: task.taskType,
      priority: task.priority,
      status: task.status,
      memo: task.memo,
      updatedAt: task.updatedAt,
    }));
}

function summarizeResearchMemos(memos: ResearchMemo[], limit: number): LlmSafeRecord[] {
  return newestFirst(memos, (memo) => memo.date).slice(0, limit).map((memo) => ({
    date: memo.date,
    type: memo.type,
    title: memo.title,
    content: memo.content,
    importance: memo.importance,
    updatedAt: memo.updatedAt,
  }));
}

function summarizeEarningsMemos(memos: EarningsMemo[], limit: number): LlmSafeRecord[] {
  return newestFirst(memos, (memo) => memo.announcementDate).slice(0, limit).map((memo) => ({
    announcementDate: memo.announcementDate,
    fiscalYear: memo.fiscalYear,
    quarter: memo.quarter,
    revenueImpression: memo.revenueImpression,
    profitImpression: memo.profitImpression,
    guidanceImpression: memo.guidanceImpression,
    goodPoints: memo.goodPoints,
    badPoints: memo.badPoints,
    nextCheckPoints: memo.nextCheckPoints,
    priceReactionMemo: memo.priceReactionMemo,
    overallMemo: memo.overallMemo,
    updatedAt: memo.updatedAt,
  }));
}

export function buildStockResearchContext(
  stockId: string,
  stocks: StockProfile[] = loadStocks(),
  options: BuildStockResearchContextOptions = {},
): LlmStockResearchContext | null {
  const stock = stocks.find((item) => item.id === stockId);
  if (!stock) {
    return null;
  }

  const limits = { ...DEFAULT_LLM_CONTEXT_LIMITS, ...options.limits };
  const generatedAt = options.generatedAt ?? new Date().toISOString();
  const trendAnalysis = calculateTrendAnalysis(stock.prices);
  const fundamentalAnalysis = calculateFundamentalAnalysis(stock.earnings, trendAnalysis.score);
  const riskScore = calculateRiskScore(stock.risks);
  const latestPrice = trendAnalysis.latest;
  const rawContext: Omit<LlmStockResearchContext, "contextHash"> = {
    schemaVersion: "stock-research-context-v1",
    generatedAt,
    limits,
    stock: {
      ticker: stock.ticker,
      companyName: stock.companyName,
      market: stock.market,
      sector: stock.sector,
      region: stock.region,
      currency: stock.currency,
      priceUnit: stock.priceUnit,
      financialUnit: stock.financialUnit,
      displayUnit: stock.displayUnit,
      memo: stock.memo,
      companyDescription: stock.companyInfo.description,
      companyWebsite: stock.companyInfo.website,
      dataSource: sourceSummary(stock.dataSource),
      updatedAt: stock.updatedAt,
    },
    scores: {
      trend: trendAnalysis.score,
      trendLabel: trendAnalysis.scoreLabel,
      growth: fundamentalAnalysis.growthScore,
      growthLabel: fundamentalAnalysis.growthScoreLabel,
      financialSafety: fundamentalAnalysis.financialSafetyScore,
      financialSafetyLabel: fundamentalAnalysis.financialSafetyScoreLabel,
      totalResearch: fundamentalAnalysis.totalResearchScore,
      totalResearchLabel: fundamentalAnalysis.totalResearchScoreLabel,
      risk: riskScore,
      riskLabel: getRiskScoreLabel(riskScore),
    },
    priceSummary: {
      rowCount: stock.prices.length,
      latestDate: latestPrice?.date,
      latestClose: toSafeNumber(latestPrice?.close),
      latestVolume: toSafeNumber(latestPrice?.volume),
      dataSource: sourceSummary(stock.priceDataSource),
      trend: summarizeTrend(trendAnalysis),
    },
    trendSignals: trendAnalysis.signals.map((signal) => ({
      label: signal.label,
      passed: signal.passed,
      points: signal.points,
    })),
    fundamentalSummary: {
      rowCount: stock.earnings.length,
      dataSource: sourceSummary(stock.fundamentalDataSource),
      ...summarizeFundamentals(fundamentalAnalysis),
    },
    fundamentals: summarizeFundamentalRows(fundamentalAnalysis.rows, limits.fundamentals),
    watchlist: summarizeWatchlist(stock.watchlist),
    priceReview: summarizePriceReview(stock.priceReview),
    riskMemos: summarizeRisks(stock.risks, limits.riskMemos),
    news: summarizeNews(stock.news, limits.news),
    earningsCalendar: summarizeEarningsCalendar(stock.earningsCalendar, limits.earningsCalendar),
    confirmationTasks: summarizeTasks(stock.confirmationTasks, limits.tasks),
    researchMemos: summarizeResearchMemos(stock.researchMemos, limits.researchMemos),
    earningsMemos: summarizeEarningsMemos(stock.earningsMemos, limits.earningsMemos),
  };

  const sanitizedContext = sanitizeLlmContextValue(rawContext) as Omit<LlmStockResearchContext, "contextHash">;
  const contextHash = createLlmContextHash(sanitizedContext);

  return {
    ...sanitizedContext,
    contextHash,
  };
}

export const buildLlmStockContext = buildStockResearchContext;
