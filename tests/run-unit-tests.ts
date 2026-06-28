import assert from "node:assert/strict";
import { ApiFundamentalAdapter } from "../src/adapters/apiFundamentalAdapter";
import { ApiStockPriceAdapter } from "../src/adapters/apiStockPriceAdapter";
import { FORBIDDEN_MOCK_LLM_PHRASES } from "../src/adapters/mockLlmAdapter";
import { OpenAiLlmAdapter, getOpenAiLlmConfig } from "../src/adapters/openAiLlmAdapter";
import {
  alertToneClasses,
  badgeToneClasses,
  buttonSizeClasses,
  buttonVariantClasses,
  cx,
  inputClassName,
  uiTokens,
} from "../src/components/ui/tokens";
import {
  CSV_IMPORT_HISTORY_STORAGE_KEY,
  appendCsvImportHistory,
  createCsvImportHistory,
  loadCsvImportHistories,
} from "../src/lib/csvImportHistory";
import {
  loadStockPriceApiSettings,
  normalizeStockPriceApiSettings,
  saveStockPriceApiSettings,
} from "../src/lib/apiSettings";
import {
  createEarningsCsvTemplate,
  createPriceCsvTemplate,
  previewEarningsCsv,
  previewPriceCsv,
} from "../src/lib/csvImportWorkflow";
import { manualDataSource } from "../src/lib/dataSource";
import { mergeEarningsCalendarItems } from "../src/lib/earningsDeduplication";
import { formatInteger, formatNumber, formatPercent } from "../src/lib/format";
import { calculateFundamentalAnalysis } from "../src/lib/growth-math";
import {
  DEFAULT_LLM_CONTEXT_LIMITS,
  buildStockResearchContext,
  sanitizeLlmContextValue,
} from "../src/lib/llmContext";
import {
  buildAiHistoryRows,
  createAiComparisonData,
  createAiComparisonJsonExport,
  createAiComparisonMarkdown,
  createAiHistoryFullMarkdown,
  createAiHistoryJsonExport,
  createAiHistoryMarkdown,
  filterAiHistoryRows,
  sortAiHistoryRows,
} from "../src/lib/llmHistory";
import {
  LOCAL_STORAGE_BACKUP_SCHEMA_VERSION,
  createLocalStorageBackup,
  listStockTrendLocalStorageKeys,
  parseLocalStorageBackupJson,
  restoreLocalStorageBackup,
} from "../src/lib/localStorageBackup";
import {
  extractFundamentalApiRows,
  extractStockPriceApiRows,
} from "../src/lib/marketApiParsing";
import {
  buildServerMarketApiUrl,
  getServerMarketApiConfig,
} from "../src/lib/serverMarketApi";
import {
  deleteLlmOutputFromList,
  isLlmOutputCurrent,
  normalizeLlmOutput,
  upsertLlmOutput,
} from "../src/lib/llmOutputStorage";
import { buildLlmSystemPrompt } from "../src/lib/llmPrompt";
import {
  REQUIRED_LLM_REPORT_NOTICE,
  createLlmReportCopyText,
  ensureLlmReportNotice,
  getLlmReportSections,
  parseStructuredLlmReportJson,
  parseLlmReport,
  resolveStructuredLlmReport,
  structuredLlmReportToMarkdown,
} from "../src/lib/llmReport";
import { containsForbiddenLlmPhrase } from "../src/lib/llmSafety";
import {
  DEFAULT_LLM_SEND_SETTINGS,
  LLM_DAILY_LIMIT,
  LLM_DAILY_STOCK_LIMIT,
  checkLlmUsageLimit,
  createLlmUsageLog,
  filterLlmContextForSend,
  getLlmInputSizeSummary,
} from "../src/lib/llmUsage";
import {
  createEmptyLlmSendSettingsStore,
  exportLlmSendSettingsStoreToJson,
  getDefaultLlmSendSettings,
  getRecommendedLlmSendSettings,
  normalizeLlmSendSettingsStore,
  parseLlmSendSettingsStoreJson,
  readLlmSendSettingsFromStore,
  removeLlmSendSettingsFromStore,
  upsertLlmSendSettingsInStore,
} from "../src/lib/llmSendSettings";
import { mergeNewsItems } from "../src/lib/newsDeduplication";
import { calculateTrendAnalysis } from "../src/lib/stock-math";
import { generateMockLlmAnalysis, generateRealLlmAnalysis } from "../src/services/llmService";
import type { EarningsCalendarItem, LlmOutputType, NewsItem, PriceRow, StockProfile } from "../src/lib/types";

function makePrices(count: number): PriceRow[] {
  return Array.from({ length: count }, (_, index) => {
    const close = 100 + index;
    return {
      date: `2026-01-${String(index + 1).padStart(2, "0")}`,
      open: close - 1,
      high: close + 2,
      low: close - 3,
      close,
      volume: 1_000_000 + index * 1_000,
      source: manualDataSource("2026-02-01T00:00:00.000Z"),
      updatedAt: "2026-02-01T00:00:00.000Z",
    };
  });
}

function makeNews(index: number, stock: StockProfile): NewsItem {
  return {
    id: `news-${index}`,
    stockId: stock.id,
    ticker: stock.ticker,
    companyName: stock.companyName,
    date: `2026-02-${String((index % 28) + 1).padStart(2, "0")}`,
    title: `確認用ニュース ${index}`,
    url: `https://example.com/news/${index}`,
    mediaName: "Example Media",
    summary: "調査補助用のニュース要約です。",
    category: index % 2 === 0 ? "業績" : "その他",
    relatedStockIds: [stock.id],
    importance: index % 3 === 0 ? "高" : "中",
    sentiment: index % 4 === 0 ? "ネガティブ" : "中立",
    source: "手入力",
    fetchedAt: "2026-02-01T00:00:00.000Z",
    userMemo: `ニュースメモ ${index}`,
    checked: index % 2 === 0,
    dataSource: manualDataSource("2026-02-01T00:00:00.000Z"),
    createdAt: "2026-02-01T00:00:00.000Z",
    updatedAt: "2026-02-01T00:00:00.000Z",
  };
}

function makeCalendar(index: number, stock: StockProfile): EarningsCalendarItem {
  return {
    id: `calendar-${index}`,
    stockId: stock.id,
    ticker: stock.ticker,
    companyName: stock.companyName,
    earningsDate: `2026-03-${String(index + 1).padStart(2, "0")}`,
    scheduledDate: `2026-03-${String(index + 1).padStart(2, "0")}`,
    fiscalYear: "2026",
    fiscalQuarter: "Q1",
    quarter: "Q1",
    status: "未確認",
    source: "手入力",
    memo: `決算予定メモ ${index}`,
    dataSource: manualDataSource("2026-02-01T00:00:00.000Z"),
    createdAt: "2026-02-01T00:00:00.000Z",
    updatedAt: "2026-02-01T00:00:00.000Z",
  };
}

function createMemoryStorage(initial: Record<string, string> = {}) {
  const data = new Map<string, string>(Object.entries(initial));
  return {
    get length() {
      return data.size;
    },
    key(index: number) {
      return Array.from(data.keys())[index] ?? null;
    },
    getItem(key: string) {
      return data.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      data.set(key, value);
    },
    dump() {
      return Object.fromEntries(data.entries());
    },
  };
}

function makeStockFixture(): StockProfile {
  const dataSource = manualDataSource("2026-02-01T00:00:00.000Z");
  const baseStock: StockProfile = {
    id: "stock-test",
    ticker: "TEST",
    companyName: "テスト株式会社",
    market: "東証",
    sector: "テクノロジー",
    region: "JP",
    currency: "JPY",
    priceUnit: "円",
    financialUnit: "百万円",
    displayUnit: "raw",
    memo: "調査補助用の銘柄メモ",
    prices: makePrices(30),
    earnings: [
      {
        id: "earnings-2023",
        periodType: "annual",
        fiscalYear: "2023",
        fiscalQuarter: "fullYear",
        revenue: 100_000,
        operatingIncome: 10_000,
        netIncome: 7_000,
        eps: 70,
        operatingCashFlow: 12_000,
        freeCashFlow: 8_000,
        equityRatio: 55,
        roe: 12,
        roic: 9,
        marketCap: 500_000,
        per: 30,
        pbr: 3,
        psr: 5,
        currency: "JPY",
        unit: "百万円",
        source: dataSource,
        updatedAt: "2026-02-01T00:00:00.000Z",
        memo: "初年度",
      },
      {
        id: "earnings-2024",
        periodType: "annual",
        fiscalYear: "2024",
        fiscalQuarter: "fullYear",
        revenue: 120_000,
        operatingIncome: 14_000,
        netIncome: 9_000,
        eps: 90,
        operatingCashFlow: 15_000,
        freeCashFlow: 10_000,
        equityRatio: 58,
        roe: 14,
        roic: 10,
        marketCap: 650_000,
        per: 35,
        pbr: 4,
        psr: 5.4,
        currency: "JPY",
        unit: "百万円",
        source: dataSource,
        updatedAt: "2026-02-01T00:00:00.000Z",
        memo: "二年目",
      },
      {
        id: "earnings-2025",
        periodType: "annual",
        fiscalYear: "2025",
        fiscalQuarter: "fullYear",
        revenue: 150_000,
        operatingIncome: 20_000,
        netIncome: 13_000,
        eps: 130,
        operatingCashFlow: 22_000,
        freeCashFlow: 16_000,
        equityRatio: 60,
        roe: 16,
        roic: 12,
        marketCap: 900_000,
        per: 40,
        pbr: 5,
        psr: 6,
        currency: "JPY",
        unit: "百万円",
        source: dataSource,
        updatedAt: "2026-02-01T00:00:00.000Z",
        memo: "三年目",
      },
    ],
    companyInfo: {
      stockId: "stock-test",
      ticker: "TEST",
      companyName: "テスト株式会社",
      market: "東証",
      sector: "テクノロジー",
      region: "JP",
      currency: "JPY",
      priceUnit: "円",
      financialUnit: "百万円",
      displayUnit: "raw",
      description: "調査補助用の企業概要",
      website: "https://example.com",
      dataSource,
      updatedAt: "2026-02-01T00:00:00.000Z",
    },
    dataSource,
    priceDataSource: dataSource,
    fundamentalDataSource: dataSource,
    priceUpdateHistories: [],
    fundamentalUpdateHistories: [],
    watchlist: {
      stockId: "stock-test",
      status: "監視中",
      reason: "事業成長を継続確認したいため",
      themes: "クラウド",
      trigger: "決算資料",
      priority: "高",
      nextCheck: "次回決算",
      nextReviewDate: "2026-03-15",
      memo: "ウォッチリストメモ",
      createdAt: "2026-02-01T00:00:00.000Z",
      updatedAt: "2026-02-01T00:00:00.000Z",
    },
    priceReview: {
      currentPriceMemo: "価格メモ",
      reviewPriceLevel: "再調査ライン",
      reviewReason: "出来高変化を確認",
      dropFromHighPercent: 20,
      checkAfterEarnings: true,
      checkOnSharpDrop: true,
      cautionMemo: "確認水準メモ",
      updatedAt: "2026-02-01T00:00:00.000Z",
    },
    earningsMemos: Array.from({ length: 2 }, (_, index) => ({
      id: `earnings-memo-${index}`,
      announcementDate: `2026-02-${String(index + 1).padStart(2, "0")}`,
      fiscalYear: "2026",
      quarter: "Q1",
      revenueImpression: "良い",
      profitImpression: "普通",
      guidanceImpression: "未確認",
      goodPoints: "売上の伸び",
      badPoints: "",
      nextCheckPoints: "利益率",
      priceReactionMemo: "",
      overallMemo: `決算メモ ${index}`,
      createdAt: "2026-02-01T00:00:00.000Z",
      updatedAt: "2026-02-01T00:00:00.000Z",
    })),
    risks: Array.from({ length: 25 }, (_, index) => ({
      id: `risk-${index}`,
      category: "競合リスク",
      content: `リスク内容 ${index}`,
      impact: index % 2 === 0 ? "大" : "中",
      probability: index % 2 === 0 ? "高" : "中",
      confirmationMethod: "四半期ごとに確認",
      responseMemo: `リスクメモ ${index}`,
      lastCheckedDate: "2026-02-01",
      createdAt: "2026-02-01T00:00:00.000Z",
      updatedAt: "2026-02-01T00:00:00.000Z",
    })),
    researchMemos: Array.from({ length: 25 }, (_, index) => ({
      id: `research-${index}`,
      date: `2026-02-${String((index % 28) + 1).padStart(2, "0")}`,
      type: "事業内容",
      title: `調査メモ ${index}`,
      content: `確認した内容 ${index}`,
      importance: index % 2 === 0 ? "高" : "中",
      createdAt: "2026-02-01T00:00:00.000Z",
      updatedAt: "2026-02-01T00:00:00.000Z",
    })),
    news: [],
    earningsCalendar: [],
    confirmationTasks: Array.from({ length: 2 }, (_, index) => ({
      id: `task-${index}`,
      stockId: "stock-test",
      ticker: "TEST",
      companyName: "テスト株式会社",
      title: `確認タスク ${index}`,
      dueDate: `2026-03-${String(index + 1).padStart(2, "0")}`,
      taskType: "決算確認",
      priority: "高",
      status: "未着手",
      memo: `タスクメモ ${index}`,
      createdAt: "2026-02-01T00:00:00.000Z",
      updatedAt: "2026-02-01T00:00:00.000Z",
    })),
    createdAt: "2026-02-01T00:00:00.000Z",
    updatedAt: "2026-02-01T00:00:00.000Z",
  };

  baseStock.news = Array.from({ length: 25 }, (_, index) => makeNews(index, baseStock));
  baseStock.earningsCalendar = Array.from({ length: 3 }, (_, index) => makeCalendar(index, baseStock));

  return baseStock;
}

function assertNoUnsafeValues(value: unknown): void {
  assert.notEqual(value, undefined);

  if (typeof value === "number") {
    assert.equal(Number.isFinite(value), true);
  }

  if (Array.isArray(value)) {
    value.forEach(assertNoUnsafeValues);
    return;
  }

  if (value && typeof value === "object") {
    for (const [key, item] of Object.entries(value)) {
      assert.equal(["apiKey", "baseUrl", "apiBaseUrl", "localStorageRaw"].includes(key), false);
      assertNoUnsafeValues(item);
    }
  }
}

async function run(): Promise<void> {
  assert.equal(uiTokens.radius.card, "rounded-lg");
  assert.match(buttonVariantClasses.primary, /bg-accent/);
  assert.match(buttonVariantClasses.danger, /text-decline/);
  assert.match(buttonSizeClasses.md, /h-10/);
  assert.match(badgeToneClasses.warning, /amber/);
  assert.match(alertToneClasses.danger, /rose/);
  assert.equal(cx("a", false, "b", null, undefined), "a b");
  assert.match(inputClassName("w-full"), /w-full/);

  assert.equal(formatNumber(Number.NaN), "-");
  assert.equal(formatNumber(Number.POSITIVE_INFINITY), "-");
  assert.equal(formatInteger(Number.NEGATIVE_INFINITY), "-");
  assert.equal(formatPercent(undefined), "-");

  const prices = makePrices(30);
  const trend = calculateTrendAnalysis(prices);
  assert.equal(trend.score >= 0 && trend.score <= 100, true);
  assert.notEqual(trend.latest, null);

  const stock = makeStockFixture();
  const fundamentals = calculateFundamentalAnalysis(stock.earnings, trend.score);
  assert.equal(fundamentals.growthScore >= 0 && fundamentals.growthScore <= 100, true);
  assert.equal(fundamentals.financialSafetyScore >= 0 && fundamentals.financialSafetyScore <= 100, true);
  assert.equal(fundamentals.totalResearchScore >= 0 && fundamentals.totalResearchScore <= 100, true);

  const priceTemplate = createPriceCsvTemplate();
  assert.equal(priceTemplate.startsWith("date,open,high,low,close,volume"), true);
  assert.equal(priceTemplate.split("\n").length >= 2, true);
  const earningsTemplate = createEarningsCsvTemplate();
  assert.equal(earningsTemplate.startsWith("fiscalYear,revenue,operatingIncome,netIncome"), true);
  assert.equal(earningsTemplate.includes("marketCap,per,pbr,psr"), true);

  const pricePreview = previewPriceCsv([
    "date,open,high,low,close,volume",
    "2026-01-01,100,105,98,102,1000000",
    "2026-02-01,130,135,128,134,1500000",
  ].join("\n"), stock.prices);
  assert.equal(pricePreview.ok, true);
  assert.equal(pricePreview.totalRows, 2);
  assert.equal(pricePreview.updatedRows, 1);
  assert.equal(pricePreview.addedRows, 1);
  assert.equal(pricePreview.previewRows[0].rowNumber, 2);

  const duplicatePricePreview = previewPriceCsv([
    "date,open,high,low,close,volume",
    "2026-02-02,100,105,98,102,1000000",
    "2026-02-02,102,108,101,107,1200000",
  ].join("\n"), stock.prices);
  assert.equal(duplicatePricePreview.ok, true);
  assert.equal(duplicatePricePreview.warningRows, 1);
  assert.equal(duplicatePricePreview.addedRows, 1);

  const invalidDatePreview = previewPriceCsv([
    "date,open,high,low,close,volume",
    "2026-02-30,100,105,98,102,1000000",
  ].join("\n"), stock.prices);
  assert.equal(invalidDatePreview.ok, false);
  assert.equal(invalidDatePreview.errorRows, 1);
  assert.equal(invalidDatePreview.result.errors[0].startsWith("2行目"), true);

  const invalidNumberPreview = previewPriceCsv([
    "date,open,high,low,close,volume",
    "2026-02-03,100,105,98,not-number,1000000",
  ].join("\n"), stock.prices);
  assert.equal(invalidNumberPreview.ok, false);
  assert.equal(invalidNumberPreview.result.errors[0].includes("close"), true);

  const earningsPreview = previewEarningsCsv([
    "fiscalYear,revenue,operatingIncome,netIncome,eps,operatingCashFlow,freeCashFlow,equityRatio,roe,roic,marketCap,per,pbr,psr",
    "2024,160000,22000,14000,140,23000,17000,61,17,13,950000,38,5,5.9",
    "2026,180000,25000,16000,160,26000,19000,62,18,14,1000000,36,4.8,5.5",
  ].join("\n"), stock.earnings);
  assert.equal(earningsPreview.ok, true);
  assert.equal(earningsPreview.updatedRows, 1);
  assert.equal(earningsPreview.addedRows, 1);

  const duplicateEarningsPreview = previewEarningsCsv([
    "fiscalYear,revenue,operatingIncome,netIncome,eps,operatingCashFlow,freeCashFlow,equityRatio,roe,roic,marketCap,per,pbr,psr",
    "2027,180000,25000,16000,160,26000,19000,62,18,14,1000000,36,4.8,5.5",
    "2027,190000,26000,17000,170,27000,20000,63,19,15,1100000,34,4.6,5.2",
  ].join("\n"), stock.earnings);
  assert.equal(duplicateEarningsPreview.ok, true);
  assert.equal(duplicateEarningsPreview.warningRows, 1);
  assert.equal(duplicateEarningsPreview.addedRows, 1);

  const invalidEarningsNumberPreview = previewEarningsCsv([
    "fiscalYear,revenue,operatingIncome,netIncome,eps,operatingCashFlow,freeCashFlow,equityRatio,roe,roic,marketCap,per,pbr,psr",
    "2028,bad,25000,16000,160,26000,19000,62,18,14,1000000,36,4.8,5.5",
  ].join("\n"), stock.earnings);
  assert.equal(invalidEarningsNumberPreview.ok, false);
  assert.equal(invalidEarningsNumberPreview.result.errors[0].includes("revenue"), true);

  const historyStorage = new Map<string, string>();
  const originalWindow = (globalThis as typeof globalThis & { window?: Window }).window;
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      localStorage: {
        getItem: (key: string) => historyStorage.get(key) ?? null,
        setItem: (key: string, value: string) => {
          historyStorage.set(key, value);
        },
      },
    },
  });
  const csvHistory = createCsvImportHistory({
    stockId: stock.id,
    ticker: stock.ticker,
    companyName: stock.companyName,
    dataType: "株価",
    fileName: "prices.csv",
    totalRows: pricePreview.totalRows,
    addedRows: pricePreview.addedRows,
    updatedRows: pricePreview.updatedRows,
    errorRows: pricePreview.errorRows,
    warningRows: pricePreview.warningRows,
    success: true,
    errorMessage: "",
    importedAt: "2026-02-04T00:00:00.000Z",
  });
  appendCsvImportHistory(csvHistory);
  const loadedCsvHistories = loadCsvImportHistories(stock.id);
  assert.equal(loadedCsvHistories.length, 1);
  assert.equal(loadedCsvHistories[0].fileName, "prices.csv");
  const storedHistoryJson = historyStorage.get(CSV_IMPORT_HISTORY_STORAGE_KEY) ?? "";
  assert.equal(storedHistoryJson.includes("date,open,high,low,close,volume"), false);
  assert.equal(storedHistoryJson.includes("2026-01-01,100,105"), false);
  assert.equal(normalizeStockPriceApiSettings({ providerName: "test", apiKey: "SECRET_API_KEY", baseUrl: "https://example.com", enabled: true, mockMode: false }).apiKey, "");
  const apiSaveResult = saveStockPriceApiSettings({
    providerName: "test",
    apiKey: "SECRET_API_KEY",
    baseUrl: "https://example.com",
    enabled: true,
    mockMode: false,
    lastConnectionCheckedAt: "2026-02-04T00:00:00.000Z",
  });
  assert.equal(apiSaveResult.ok, true);
  assert.equal(JSON.stringify(loadStockPriceApiSettings()).includes("SECRET_API_KEY"), false);
  assert.equal([...historyStorage.values()].join("\n").includes("SECRET_API_KEY"), false);

  const missingStockApiConfig = getServerMarketApiConfig("stock-price", {});
  assert.equal(missingStockApiConfig.ok, false);
  if (!missingStockApiConfig.ok) {
    assert.deepEqual(missingStockApiConfig.missing, ["STOCK_PRICE_API_KEY", "STOCK_PRICE_API_BASE_URL"]);
  }
  const stockApiConfig = getServerMarketApiConfig("stock-price", {
    STOCK_PRICE_API_KEY: "SECRET_API_KEY",
    STOCK_PRICE_API_BASE_URL: "https://example.com/prices",
  });
  assert.equal(stockApiConfig.ok, true);
  const marketUrl = buildServerMarketApiUrl("https://example.com/prices?existing=1", {
    symbol: "TEST",
    period: "1m",
  });
  assert.notEqual(marketUrl, null);
  assert.equal(marketUrl?.includes("SECRET_API_KEY"), false);
  assert.equal(marketUrl?.includes("symbol=TEST"), true);
  assert.equal(extractStockPriceApiRows({
    "Time Series (Daily)": {
      "2026-01-01": {
        "1. open": "100",
        "2. high": "105",
        "3. low": "98",
        "4. close": "102",
        "5. volume": "1000000",
      },
    },
  })?.length, 1);
  assert.equal(extractFundamentalApiRows({ fundamentals: [{ fiscalYear: 2026, revenue: "1000" }] })?.length, 1);

  const originalFetchForMarketAdapters = globalThis.fetch;
  let stockAdapterRequestBody = "";
  globalThis.fetch = async (input, init) => {
    assert.equal(input, "/api/stock-prices");
    stockAdapterRequestBody = String(init?.body ?? "");
    assert.equal(stockAdapterRequestBody.includes("SECRET_API_KEY"), false);
    assert.equal(stockAdapterRequestBody.includes("https://secret.example"), false);
    return new Response(JSON.stringify({
      ok: true,
      status: "success",
      rawRows: [{ date: "2026-01-01", open: 100, high: 105, low: 98, close: 102, volume: 1000000 }],
      dataSource: manualDataSource("2026-02-01T00:00:00.000Z"),
      message: "ok",
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  };
  const stockRouteResult = await ApiStockPriceAdapter.fetchPrices("TEST", "1m", {
    providerName: "Alpha Vantage",
    apiKey: "SECRET_API_KEY",
    baseUrl: "https://secret.example/prices",
    enabled: true,
    mockMode: false,
    lastConnectionCheckedAt: "",
  });
  assert.equal(stockRouteResult.ok, true);
  assert.deepEqual(Object.keys(JSON.parse(stockAdapterRequestBody)).sort(), ["period", "providerName", "ticker"]);

  let fundamentalAdapterRequestBody = "";
  globalThis.fetch = async (input, init) => {
    assert.equal(input, "/api/fundamentals");
    fundamentalAdapterRequestBody = String(init?.body ?? "");
    assert.equal(fundamentalAdapterRequestBody.includes("SECRET_API_KEY"), false);
    assert.equal(fundamentalAdapterRequestBody.includes("https://secret.example"), false);
    return new Response(JSON.stringify({
      ok: true,
      status: "success",
      rawRows: [{ fiscalYear: 2026, revenue: 1000, operatingIncome: 100, netIncome: 70 }],
      dataSource: manualDataSource("2026-02-01T00:00:00.000Z"),
      message: "ok",
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  };
  const fundamentalRouteResult = await ApiFundamentalAdapter.fetchFundamentals("TEST", "annual", {
    providerName: "Finnhub",
    apiKey: "SECRET_API_KEY",
    baseUrl: "https://secret.example/fundamentals",
    enabled: true,
    mockMode: false,
    lastConnectionCheckedAt: "",
  });
  assert.equal(fundamentalRouteResult.ok, true);
  assert.deepEqual(Object.keys(JSON.parse(fundamentalAdapterRequestBody)).sort(), ["period", "providerName", "ticker"]);
  globalThis.fetch = originalFetchForMarketAdapters;

  if (originalWindow === undefined) {
    Reflect.deleteProperty(globalThis, "window");
  } else {
    Object.defineProperty(globalThis, "window", { configurable: true, value: originalWindow });
  }

  const backupStorage = createMemoryStorage({
    "stock-trend-mvp:stocks:v1": JSON.stringify([{ id: stock.id, ticker: stock.ticker }]),
    "stock-trend-mvp:llm-outputs:v1": JSON.stringify([{ id: "llm-1" }]),
    "other-app:key": "should-not-export",
  });
  assert.deepEqual(listStockTrendLocalStorageKeys(backupStorage), ["stock-trend-mvp:llm-outputs:v1", "stock-trend-mvp:stocks:v1"]);
  const backup = createLocalStorageBackup(backupStorage, "2026-02-05T00:00:00.000Z");
  assert.equal(backup.ok, true);
  if (!backup.ok) {
    throw new Error("localStorage backup should succeed");
  }
  assert.equal(backup.payload.schemaVersion, LOCAL_STORAGE_BACKUP_SCHEMA_VERSION);
  assert.equal(backup.payload.createdAt, "2026-02-05T00:00:00.000Z");
  assert.equal(backup.json.includes("other-app:key"), false);
  assert.equal(backup.json.includes("should-not-export"), false);
  assert.equal(backup.json.includes("SECRET_API_KEY"), false);

  const parsedBackup = parseLocalStorageBackupJson(backup.json);
  assert.equal(parsedBackup.ok, true);
  if (!parsedBackup.ok) {
    throw new Error("backup json should parse");
  }
  assert.deepEqual(parsedBackup.restoreKeys, ["stock-trend-mvp:llm-outputs:v1", "stock-trend-mvp:stocks:v1"]);

  const invalidBackup = parseLocalStorageBackupJson("{ bad json");
  assert.equal(invalidBackup.ok, false);

  const wrongAppBackup = parseLocalStorageBackupJson(JSON.stringify({ ...backup.payload, appId: "other-app" }));
  assert.equal(wrongAppBackup.ok, false);

  const mixedBackup = parseLocalStorageBackupJson(JSON.stringify({
    ...backup.payload,
    entries: {
      ...backup.payload.entries,
      "other-app:key": "ignored",
    },
  }));
  assert.equal(mixedBackup.ok, true);
  assert.equal(mixedBackup.skippedKeys.includes("other-app:key"), true);

  const secretBackupStorage = createMemoryStorage({
    "stock-trend-mvp:stock-price-api-settings:v1": JSON.stringify({ apiKey: "sk-test-secret-key-1234567890" }),
  });
  const secretBackup = createLocalStorageBackup(secretBackupStorage, "2026-02-05T00:00:00.000Z");
  assert.equal(secretBackup.ok, false);

  const restoreStorage = createMemoryStorage({
    "stock-trend-mvp:stocks:v1": "old-data",
  });
  const restoreResult = restoreLocalStorageBackup(restoreStorage, parsedBackup.payload);
  assert.equal(restoreResult.ok, true);
  assert.equal(restoreStorage.getItem("stock-trend-mvp:stocks:v1"), backup.payload.entries["stock-trend-mvp:stocks:v1"]);
  assert.equal(restoreStorage.getItem("other-app:key"), null);

  const duplicateNews = makeNews(1, stock);
  const newsMerge = mergeNewsItems([duplicateNews], [{ ...duplicateNews, id: "news-duplicate" }]);
  assert.equal(newsMerge.addedCount, 0);
  assert.equal(newsMerge.skippedCount, 1);
  assert.equal(newsMerge.items.length, 1);

  const calendar = makeCalendar(0, stock);
  const calendarMerge = mergeEarningsCalendarItems([calendar], [{ ...calendar, id: "calendar-new", memo: "更新後" }]);
  assert.equal(calendarMerge.addedCount, 0);
  assert.equal(calendarMerge.updatedCount, 1);
  assert.equal(calendarMerge.items[0].memo, "更新後");

  const sanitized = sanitizeLlmContextValue({
    apiKey: "SECRET_API_KEY",
    baseUrl: "https://secret.example",
    keep: "value",
    unsafeNumber: Number.POSITIVE_INFINITY,
    nested: {
      apiBaseUrl: "https://secret.example/nested",
      values: [1, Number.NaN, "", null, "ok"],
    },
  });
  assert.deepEqual(sanitized, { keep: "value", nested: { values: [1, "ok"] } });

  const stockWithSecret = {
    ...stock,
    apiKey: "SECRET_API_KEY",
    baseUrl: "https://secret.example",
  } as StockProfile & { apiKey: string; baseUrl: string };
  const context = buildStockResearchContext(stock.id, [stockWithSecret], {
    generatedAt: "2026-02-01T00:00:00.000Z",
  });

  assert.notEqual(context, null);
  assert.equal(context?.news?.length, DEFAULT_LLM_CONTEXT_LIMITS.news);
  assert.equal(context?.researchMemos?.length, DEFAULT_LLM_CONTEXT_LIMITS.researchMemos);
  assert.equal(context?.riskMemos?.length, DEFAULT_LLM_CONTEXT_LIMITS.riskMemos);
  assert.equal(context?.priceSummary && "prices" in context.priceSummary, false);

  const contextJson = JSON.stringify(context);
  assert.equal(contextJson.includes("SECRET_API_KEY"), false);
  assert.equal(contextJson.includes("https://secret.example"), false);
  assert.equal(contextJson.includes("Infinity"), false);
  assert.equal(contextJson.includes("NaN"), false);
  assertNoUnsafeValues(context);

  const sameDataLater = buildStockResearchContext(stock.id, [stock], {
    generatedAt: "2026-02-02T00:00:00.000Z",
  });
  assert.equal(sameDataLater?.contextHash, context?.contextHash);

  const generated = await generateMockLlmAnalysis(stock.id, "銘柄要約", [stock], {
    generatedAt: "2026-02-01T00:00:00.000Z",
    outputId: "llm-output-test",
  });
  assert.equal(generated.ok, true);
  if (!generated.ok) {
    throw new Error("Mock LLM generation failed");
  }
  assert.equal(generated.output.stockId, stock.id);
  assert.equal(generated.output.sourceContextHash, generated.context.contextHash);
  assert.equal(generated.output.model, "mock-llm-v1");
  assert.equal(generated.output.content.length > 0, true);
  assert.notEqual(generated.output.structuredReport, undefined);
  assert.equal(generated.output.structuredReport?.analysisType, "銘柄要約");
  assert.equal(generated.output.structuredReport?.disclaimer, REQUIRED_LLM_REPORT_NOTICE);
  assert.equal((generated.output.structuredReport?.sections.length ?? 0) > 0, true);
  assert.equal(generated.output.content.includes(REQUIRED_LLM_REPORT_NOTICE), true);
  for (const section of getLlmReportSections("銘柄要約")) {
    assert.equal(generated.output.content.includes(`## ${section}`), true);
  }
  const parsedReport = parseLlmReport(generated.output.content, "銘柄要約");
  assert.equal(parsedReport.sections.some((section) => section.heading === "注意文"), true);
  const copyText = createLlmReportCopyText(generated.output.content, "銘柄要約", generated.output.structuredReport);
  assert.equal(copyText.includes("#"), true);
  assert.equal(copyText.includes("## 注意文"), true);
  assert.equal(copyText.includes(REQUIRED_LLM_REPORT_NOTICE), true);
  const markdownFromStructured = structuredLlmReportToMarkdown(generated.output.structuredReport!);
  assert.equal(markdownFromStructured.includes("## 注意文"), true);
  FORBIDDEN_MOCK_LLM_PHRASES.forEach((phrase) => {
    assert.equal(generated.output.content.includes(phrase), false);
  });

  const analysisTypes: LlmOutputType[] = ["銘柄要約", "ニュース要約", "決算要約", "リスク整理", "追加調査ポイント"];
  for (const type of analysisTypes) {
    const prompt = buildLlmSystemPrompt(type);
    assert.equal(prompt.includes(REQUIRED_LLM_REPORT_NOTICE), true);
    const mockByType = await generateMockLlmAnalysis(stock.id, type, [stock], {
      context: generated.context,
      generatedAt: "2026-02-01T00:00:00.000Z",
    });
    assert.equal(mockByType.ok, true);
    if (!mockByType.ok) {
      throw new Error(`Mock LLM generation failed for ${type}`);
    }
    assert.equal(mockByType.output.content.includes(REQUIRED_LLM_REPORT_NOTICE), true);
    assert.notEqual(mockByType.output.structuredReport, undefined);
    assert.equal(mockByType.output.structuredReport?.analysisType, type);
    for (const section of getLlmReportSections(type)) {
      assert.equal(prompt.includes(`## ${section}`), true);
      assert.equal(mockByType.output.structuredReport?.sections.some((item) => item.heading === section), true);
      assert.equal(mockByType.output.content.includes(`## ${section}`), true);
    }
    FORBIDDEN_MOCK_LLM_PHRASES.forEach((phrase) => {
      assert.equal(mockByType.output.content.includes(phrase), false);
    });
  }

  const supplementedReport = ensureLlmReportNotice("短い分析結果です。");
  assert.equal(supplementedReport.includes(REQUIRED_LLM_REPORT_NOTICE), true);

  const jsonReportText = JSON.stringify({
    title: "JSON銘柄要約",
    analysisType: "銘柄要約",
    sections: [
      { heading: "概要", items: ["JSON形式の確認です。"] },
      { heading: "注意文", items: [REQUIRED_LLM_REPORT_NOTICE] },
    ],
    disclaimer: REQUIRED_LLM_REPORT_NOTICE,
  });
  const parsedJsonReport = parseStructuredLlmReportJson(jsonReportText, "銘柄要約");
  assert.notEqual(parsedJsonReport, null);
  assert.equal(parsedJsonReport?.title, "JSON銘柄要約");
  assert.equal(parsedJsonReport?.sections.some((section) => section.heading === "概要"), true);
  assert.equal(createLlmReportCopyText(jsonReportText, "銘柄要約").includes("JSON形式の確認です。"), true);
  const brokenJsonReport = parseStructuredLlmReportJson("{ invalid json", "銘柄要約");
  assert.equal(brokenJsonReport, null);
  const brokenFallbackReport = resolveStructuredLlmReport("{ invalid json", "銘柄要約");
  assert.equal(brokenFallbackReport.disclaimer, REQUIRED_LLM_REPORT_NOTICE);

  const savedOutputs = upsertLlmOutput([], generated.output);
  assert.equal(savedOutputs.length, 1);
  assert.equal(savedOutputs[0].id, generated.output.id);
  assert.equal(savedOutputs[0].structuredReport?.disclaimer, REQUIRED_LLM_REPORT_NOTICE);
  const normalizedStructuredOutput = normalizeLlmOutput(savedOutputs[0]);
  assert.equal(normalizedStructuredOutput?.structuredReport?.disclaimer, REQUIRED_LLM_REPORT_NOTICE);
  assert.equal(isLlmOutputCurrent(savedOutputs[0], generated.context.contextHash), true);
  assert.equal(isLlmOutputCurrent(savedOutputs[0], "ctx-stale"), false);

  const oldTextOnlyOutput = normalizeLlmOutput({
    id: "old-output",
    stockId: stock.id,
    type: "銘柄要約",
    content: "古い文章形式のAI分析です。",
    model: "mock-llm-v0",
    createdAt: "2026-02-01T00:00:00.000Z",
    updatedAt: "2026-02-01T00:00:00.000Z",
    sourceContextHash: generated.context.contextHash,
  });
  assert.notEqual(oldTextOnlyOutput, null);
  assert.equal(oldTextOnlyOutput?.structuredReport, undefined);
  const oldResolvedReport = resolveStructuredLlmReport(oldTextOnlyOutput!.content, oldTextOnlyOutput!.type, oldTextOnlyOutput!.structuredReport);
  assert.equal(oldResolvedReport.disclaimer, REQUIRED_LLM_REPORT_NOTICE);
  assert.equal(oldResolvedReport.sections.some((section) => section.heading === "注意文"), true);

  const staleRiskOutput = normalizeLlmOutput({
    id: "stale-risk-output",
    stockId: stock.id,
    type: "リスク整理",
    content: "リスク確認メモです。追加確認が必要です。",
    model: "mock-llm-v1",
    createdAt: "2026-02-03T00:00:00.000Z",
    updatedAt: "2026-02-03T00:00:00.000Z",
    sourceContextHash: "stale-context-hash",
  });
  assert.notEqual(staleRiskOutput, null);

  const historyRows = buildAiHistoryRows(
    [stock],
    [generated.output, oldTextOnlyOutput!, staleRiskOutput!],
    new Map([[stock.id, generated.context.contextHash]]),
  );
  assert.equal(historyRows.length, 3);
  assert.equal(historyRows.filter((row) => row.isCurrent).length, 2);
  assert.equal(filterAiHistoryRows(historyRows, { stockQuery: "TEST" }).length, 3);
  assert.equal(filterAiHistoryRows(historyRows, { analysisType: "リスク整理" }).length, 1);
  assert.equal(filterAiHistoryRows(historyRows, { keyword: "古い文章" }).length, 1);
  assert.equal(filterAiHistoryRows(historyRows, { generatedDate: "2026-02-03" }).length, 1);
  assert.equal(filterAiHistoryRows(historyRows, { freshness: "stale" }).length, 1);
  assert.equal(sortAiHistoryRows(historyRows, "newest")[0].output.id, "stale-risk-output");
  assert.equal(sortAiHistoryRows(historyRows, "staleFirst")[0].output.id, "stale-risk-output");

  const oldHistoryRow = historyRows.find((row) => row.output.id === "old-output");
  assert.notEqual(oldHistoryRow, undefined);
  assert.equal(createAiHistoryMarkdown(oldHistoryRow!).includes(REQUIRED_LLM_REPORT_NOTICE), true);
  assert.equal(createAiHistoryFullMarkdown(historyRows).includes("AI分析履歴エクスポート"), true);
  const historyJson = createAiHistoryJsonExport(historyRows, "2026-02-04T00:00:00.000Z");
  assert.equal(historyJson.count, 3);
  assert.equal(historyJson.items.some((item) => item.structuredReport.disclaimer === REQUIRED_LLM_REPORT_NOTICE), true);
  const comparison = createAiComparisonData(historyRows[0], historyRows[1]);
  assert.equal(comparison.sameStock, true);
  assert.equal(comparison.sameContextHash, true);
  assert.equal(comparison.sections.length > 0, true);
  assert.equal(createAiComparisonMarkdown(comparison).includes("AI分析差分"), true);
  const comparisonJson = createAiComparisonJsonExport(comparison, "2026-02-04T00:00:00.000Z");
  assert.equal(comparisonJson.left.structuredReport.disclaimer, REQUIRED_LLM_REPORT_NOTICE);
  assert.equal(comparisonJson.sameContextHash, true);

  const diffBaseOutput = normalizeLlmOutput({
    id: "diff-base-output",
    stockId: stock.id,
    type: "銘柄要約",
    content: "差分テストの古い分析です。",
    structuredReport: {
      title: "差分テスト",
      analysisType: "銘柄要約",
      sections: [
        { heading: "概要", items: ["共通項目", "旧変更候補"] },
        { heading: "削除セクション", items: ["削除項目"] },
      ],
      disclaimer: REQUIRED_LLM_REPORT_NOTICE,
    },
    model: "mock-llm-v1",
    createdAt: "2026-02-01T00:00:00.000Z",
    updatedAt: "2026-02-01T00:00:00.000Z",
    sourceContextHash: "ctx-diff-old",
  });
  const diffNextOutput = normalizeLlmOutput({
    id: "diff-next-output",
    stockId: stock.id,
    type: "銘柄要約",
    content: "差分テストの新しい分析です。",
    structuredReport: {
      title: "差分テスト更新",
      analysisType: "銘柄要約",
      sections: [
        { heading: "概要", items: ["共通項目", "新変更候補"] },
        { heading: "追加セクション", items: ["追加項目"] },
      ],
      disclaimer: REQUIRED_LLM_REPORT_NOTICE,
    },
    model: "mock-llm-v2",
    createdAt: "2026-02-02T00:00:00.000Z",
    updatedAt: "2026-02-02T00:00:00.000Z",
    sourceContextHash: "ctx-diff-new",
  });
  assert.notEqual(diffBaseOutput, null);
  assert.notEqual(diffNextOutput, null);
  const diffRows = buildAiHistoryRows([stock], [diffNextOutput!, diffBaseOutput!], new Map([[stock.id, "ctx-diff-new"]]));
  const diffComparison = createAiComparisonData(diffRows[0], diffRows[1]);
  assert.equal(diffComparison.left.output.id, "diff-base-output");
  assert.equal(diffComparison.right.output.id, "diff-next-output");
  assert.equal(diffComparison.sameContextHash, false);
  assert.equal(diffComparison.summary.addedCount, 1);
  assert.equal(diffComparison.summary.removedCount, 1);
  assert.equal(diffComparison.summary.possibleChangeCount, 1);
  assert.equal(diffComparison.summary.unchangedCount >= 1, true);
  assert.equal(diffComparison.summary.contextMessage.includes("元データが更新"), true);
  assert.equal(diffComparison.sections.some((section) => section.heading === "概要" && section.possibleChangedItems.length === 1), true);
  assert.equal(createAiComparisonMarkdown(diffComparison).includes("追加項目数: 1"), true);
  const diffJson = createAiComparisonJsonExport(diffComparison, "2026-02-04T00:00:00.000Z");
  assert.equal(diffJson.summary.removedCount, 1);
  assert.equal(diffJson.sections.some((section) => section.addedItems.includes("追加項目")), true);

  const deletedOutputs = deleteLlmOutputFromList(savedOutputs, generated.output.id);
  assert.equal(deletedOutputs.length, 0);

  const filteredContext = filterLlmContextForSend(generated.context, {
    ...DEFAULT_LLM_SEND_SETTINGS,
    includeNews: false,
    includeRiskMemos: false,
    includeResearchMemos: false,
  });
  assert.equal(filteredContext.news, undefined);
  assert.equal(filteredContext.riskMemos, undefined);
  assert.equal(filteredContext.researchMemos, undefined);
  assert.notEqual(filteredContext.priceSummary, undefined);
  assert.equal(JSON.stringify(filteredContext).length < JSON.stringify(generated.context).length, true);

  const inputSummary = getLlmInputSizeSummary(filteredContext, 10, 20);
  assert.equal(inputSummary.isWarning, true);
  assert.equal(inputSummary.isBlocked, true);
  assert.equal(inputSummary.newsCount, 0);

  const defaultSendSettings = getDefaultLlmSendSettings();
  assert.deepEqual(defaultSendSettings, DEFAULT_LLM_SEND_SETTINGS);
  const recommendedNewsSettings = getRecommendedLlmSendSettings("ニュース要約");
  assert.equal(recommendedNewsSettings.includeNews, true);
  assert.equal(recommendedNewsSettings.includePriceSummary, false);
  assert.equal(recommendedNewsSettings.includeFundamentals, false);
  const recommendedEarningsSettings = getRecommendedLlmSendSettings("決算要約");
  assert.equal(recommendedEarningsSettings.includeFundamentals, true);
  assert.equal(recommendedEarningsSettings.includePriceSummary, false);

  const emptySendSettingsStore = createEmptyLlmSendSettingsStore("2026-02-01T00:00:00.000Z");
  assert.equal(readLlmSendSettingsFromStore(emptySendSettingsStore, stock.id, "銘柄要約").source, "default");
  const savedSendSettingsStore = upsertLlmSendSettingsInStore(
    emptySendSettingsStore,
    stock.id,
    "ニュース要約",
    recommendedNewsSettings,
    "2026-02-02T00:00:00.000Z",
  );
  const savedNewsSettings = readLlmSendSettingsFromStore(savedSendSettingsStore, stock.id, "ニュース要約");
  assert.equal(savedNewsSettings.source, "saved");
  assert.equal(savedNewsSettings.settings.includeNews, true);
  assert.equal(savedNewsSettings.settings.includeTasks, false);
  const resetSendSettingsStore = removeLlmSendSettingsFromStore(savedSendSettingsStore, stock.id, "ニュース要約", "2026-02-03T00:00:00.000Z");
  assert.equal(readLlmSendSettingsFromStore(resetSendSettingsStore, stock.id, "ニュース要約").source, "default");
  const exportedSendSettings = exportLlmSendSettingsStoreToJson(savedSendSettingsStore);
  assert.equal(exportedSendSettings.includes("SECRET_API_KEY"), false);
  assert.equal(exportedSendSettings.includes("https://secret.example"), false);
  const parsedSendSettingsStore = parseLlmSendSettingsStoreJson(exportedSendSettings);
  assert.notEqual(parsedSendSettingsStore, null);
  assert.equal(readLlmSendSettingsFromStore(parsedSendSettingsStore!, stock.id, "ニュース要約").settings.includeTasks, false);
  const normalizedBadStore = normalizeLlmSendSettingsStore({ entries: { bad: { stockId: stock.id, analysisType: "unknown", settings: {} } } });
  assert.equal(Object.keys(normalizedBadStore.entries).length, 0);

  const newsOnlyContext = filterLlmContextForSend(generated.context, recommendedNewsSettings);
  assert.equal(newsOnlyContext.priceSummary, undefined);
  assert.equal(newsOnlyContext.fundamentalSummary, undefined);
  assert.notEqual(newsOnlyContext.news, undefined);
  assert.equal(JSON.stringify(newsOnlyContext).includes("SECRET_API_KEY"), false);
  assert.equal(getLlmInputSizeSummary(newsOnlyContext).inputSize < getLlmInputSizeSummary(generated.context).inputSize, true);

  const todaysLogs = Array.from({ length: LLM_DAILY_LIMIT }, (_, index) => createLlmUsageLog({
    id: `usage-${index}`,
    stockId: index < LLM_DAILY_STOCK_LIMIT ? stock.id : `other-${index}`,
    ticker: index < LLM_DAILY_STOCK_LIMIT ? stock.ticker : `OTHER${index}`,
    companyName: "ログ確認",
    analysisType: "銘柄要約",
    mode: "実LLM",
    model: "test-model",
    requestedAt: "2026-02-01T10:00:00.000Z",
    success: true,
    errorMessage: "",
    inputSize: 1234,
    outputSize: 567,
    sourceContextHash: generated.context.contextHash,
  }));
  const dailyLimit = checkLlmUsageLimit(todaysLogs, "new-stock", new Date("2026-02-01T12:00:00.000Z"));
  assert.equal(dailyLimit.ok, false);
  const stockLimit = checkLlmUsageLimit(todaysLogs.slice(0, LLM_DAILY_STOCK_LIMIT), stock.id, new Date("2026-02-01T12:00:00.000Z"));
  assert.equal(stockLimit.ok, false);
  const mockLogsDoNotCount = checkLlmUsageLimit(todaysLogs.map((log) => ({ ...log, mode: "Mock" })), stock.id, new Date("2026-02-01T12:00:00.000Z"));
  assert.equal(mockLogsDoNotCount.ok, true);
  const logJson = JSON.stringify(todaysLogs[0]);
  assert.equal(logJson.includes("SECRET_API_KEY"), false);
  assert.equal(logJson.includes(JSON.stringify(generated.context)), false);

  assert.equal(getOpenAiLlmConfig({}).ok, false);
  assert.equal(getOpenAiLlmConfig({ OPENAI_API_KEY: "test-key" }).ok, false);
  assert.equal(containsForbiddenLlmPhrase("これは" + FORBIDDEN_MOCK_LLM_PHRASES[0] + "です"), true);

  const missingContextResult = await generateRealLlmAnalysis(stock.id, "銘柄要約", null);
  assert.equal(missingContextResult.ok, false);

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({
    ok: true,
    content: "実LLM風の分析です。投資判断ではありません。",
    model: "test-model",
    message: "実LLMでAI分析を生成しました。",
  }), { status: 200, headers: { "Content-Type": "application/json" } });
  const realResult = await generateRealLlmAnalysis(stock.id, "銘柄要約", generated.context, {
    generatedAt: "2026-02-01T00:00:00.000Z",
    outputId: "real-output-test",
  });
  assert.equal(realResult.ok, true);
  if (!realResult.ok) {
    throw new Error("Real LLM route client failed");
  }
  assert.equal(realResult.output.model, "test-model");
  assert.equal(realResult.output.sourceContextHash, generated.context.contextHash);
  assert.equal(realResult.output.content.includes(REQUIRED_LLM_REPORT_NOTICE), true);
  assert.equal(realResult.output.structuredReport, undefined);
  globalThis.fetch = originalFetch;

  const originalFetchForStructuredRoute = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({
    ok: true,
    content: jsonReportText,
    structuredReport: parsedJsonReport,
    model: "test-model",
    message: "実LLMでAI分析を生成しました。",
  }), { status: 200, headers: { "Content-Type": "application/json" } });
  const structuredRealResult = await generateRealLlmAnalysis(stock.id, "銘柄要約", generated.context, {
    generatedAt: "2026-02-01T00:00:00.000Z",
    outputId: "real-structured-output-test",
  });
  assert.equal(structuredRealResult.ok, true);
  if (!structuredRealResult.ok) {
    throw new Error("Structured real LLM route client failed");
  }
  assert.equal(structuredRealResult.output.structuredReport?.title, "JSON銘柄要約");
  assert.equal(structuredRealResult.output.content.includes("## 概要"), true);
  globalThis.fetch = originalFetchForStructuredRoute;

  const originalFetchForOpenAiJson = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({
    output_text: jsonReportText,
  }), { status: 200, headers: { "Content-Type": "application/json" } });
  const structuredAdapterResult = await OpenAiLlmAdapter.generate(generated.context, "銘柄要約", {
    OPENAI_API_KEY: "test-key",
    OPENAI_MODEL: "test-model",
  });
  assert.equal(structuredAdapterResult.ok, true);
  if (structuredAdapterResult.ok) {
    assert.equal(structuredAdapterResult.structuredReport?.title, "JSON銘柄要約");
    assert.equal(structuredAdapterResult.content.includes("## 概要"), true);
  }
  globalThis.fetch = originalFetchForOpenAiJson;

  const originalFetchForOpenAi = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({
    output_text: "これは" + FORBIDDEN_MOCK_LLM_PHRASES[1] + "という文です。",
  }), { status: 200, headers: { "Content-Type": "application/json" } });
  const forbiddenResult = await OpenAiLlmAdapter.generate(generated.context, "銘柄要約", {
    OPENAI_API_KEY: "test-key",
    OPENAI_MODEL: "test-model",
  });
  assert.equal(forbiddenResult.ok, false);
  if (!forbiddenResult.ok) {
    assert.equal(forbiddenResult.status, "forbidden-phrase");
  }
  globalThis.fetch = originalFetchForOpenAi;

  console.log("unit tests passed");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
