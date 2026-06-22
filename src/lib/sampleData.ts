import { sampleDataSource } from "./dataSource";
import { inferCurrency, inferFinancialUnit, inferMarketRegion, inferPriceUnit } from "./normalization";
import type { CompanyInfo, EarningsRow, PriceRow, StockProfile } from "./types";

const SAMPLE_UPDATED_AT = "2026-06-15T00:00:00.000Z";

function makeCompanyInfo(stock: Pick<StockProfile, "id" | "ticker" | "companyName" | "market" | "sector" | "region" | "currency" | "priceUnit" | "financialUnit" | "displayUnit">, description: string, website: string): CompanyInfo {
  return {
    stockId: stock.id,
    ticker: stock.ticker,
    companyName: stock.companyName,
    market: stock.market,
    sector: stock.sector,
    region: stock.region,
    currency: stock.currency,
    priceUnit: stock.priceUnit,
    financialUnit: stock.financialUnit,
    displayUnit: stock.displayUnit,
    description,
    website,
    dataSource: sampleDataSource(SAMPLE_UPDATED_AT),
    updatedAt: SAMPLE_UPDATED_AT,
  };
}

function makePriceRows(startDate: string, count: number, base: number, step: number, volumeBase: number): PriceRow[] {
  const rows: PriceRow[] = [];
  const date = new Date(`${startDate}T00:00:00.000Z`);

  while (rows.length < count) {
    const day = date.getUTCDay();
    if (day !== 0 && day !== 6) {
      const i = rows.length;
      const close = Number((base + step * i + Math.sin(i / 9) * base * 0.012).toFixed(2));
      rows.push({
        date: date.toISOString().slice(0, 10),
        open: Number((close * 0.995).toFixed(2)),
        high: Number((close * 1.012).toFixed(2)),
        low: Number((close * 0.982).toFixed(2)),
        close,
        volume: Math.round(volumeBase + i * volumeBase * 0.002 + (i % 20 === 0 ? volumeBase * 0.25 : 0)),
      });
    }
    date.setUTCDate(date.getUTCDate() + 1);
  }

  return rows;
}

function makeEarnings(prefix: string, rows: Array<Omit<EarningsRow, "id" | "memo">>): EarningsRow[] {
  return rows.map((row) => ({
    ...row,
    id: `${prefix}-${row.fiscalYear}`,
    memo: "サンプルデータ",
  }));
}

function createSampleStock(input: {
  id: string;
  ticker: string;
  companyName: string;
  market: string;
  sector: string;
  description: string;
  website: string;
  prices: PriceRow[];
  earnings: EarningsRow[];
}): StockProfile {
  const currency = inferCurrency(input.market, input.ticker);
  const region = inferMarketRegion(input.market, input.ticker);
  const base = {
    id: input.id,
    ticker: input.ticker,
    companyName: input.companyName,
    market: input.market,
    sector: input.sector,
    region,
    currency,
    priceUnit: inferPriceUnit(currency),
    financialUnit: inferFinancialUnit(currency),
    displayUnit: "raw" as const,
  };

  return {
    ...base,
    memo: "初回起動時の動作確認用サンプルです。",
    prices: input.prices,
    earnings: input.earnings,
    companyInfo: makeCompanyInfo(base, input.description, input.website),
    dataSource: sampleDataSource(SAMPLE_UPDATED_AT),
    priceDataSource: sampleDataSource(SAMPLE_UPDATED_AT),
    fundamentalDataSource: sampleDataSource(SAMPLE_UPDATED_AT),
    priceUpdateHistories: [],
    fundamentalUpdateHistories: [],
    watchlist: {
      stockId: input.id,
      status: "監視中",
      reason: "データ構造と画面表示の確認用",
      themes: input.sector,
      trigger: "サンプルデータ",
      priority: "中",
      nextCheck: "ニュース欄と決算予定を確認",
      nextReviewDate: "2026-06-30",
      memo: "投資判断ではありません。",
      createdAt: SAMPLE_UPDATED_AT,
      updatedAt: SAMPLE_UPDATED_AT,
    },
    priceReview: {
      currentPriceMemo: "サンプルの価格メモです。",
      reviewPriceLevel: "確認水準の記録例",
      reviewReason: "CSV/API連携前の表示確認",
      dropFromHighPercent: 15,
      checkAfterEarnings: true,
      checkOnSharpDrop: true,
      cautionMemo: "確認水準は調査補助の記録です。",
      updatedAt: SAMPLE_UPDATED_AT,
    },
    earningsMemos: [
      {
        id: `${input.id}-earnings-memo-2026-q1`,
        announcementDate: "2026-05-10",
        fiscalYear: "2026",
        quarter: "Q1",
        revenueImpression: "普通",
        profitImpression: "普通",
        guidanceImpression: "未確認",
        goodPoints: "売上推移を確認するためのサンプルです。",
        badPoints: "",
        nextCheckPoints: "次回発表で利益率とキャッシュフローを確認",
        priceReactionMemo: "サンプルメモ",
        overallMemo: "機械的な表示確認用の決算メモです。",
        createdAt: SAMPLE_UPDATED_AT,
        updatedAt: SAMPLE_UPDATED_AT,
      },
    ],
    risks: [
      {
        id: `${input.id}-risk-valuation`,
        category: "バリュエーションリスク",
        content: "市場環境により指標の見え方が変わる可能性を確認",
        impact: "中",
        probability: "中",
        confirmationMethod: "PER、PSR、成長率の変化を比較",
        responseMemo: "追加調査時に前提を見直す",
        lastCheckedDate: "2026-06-15",
        createdAt: SAMPLE_UPDATED_AT,
        updatedAt: SAMPLE_UPDATED_AT,
      },
    ],
    researchMemos: [
      {
        id: `${input.id}-research-news`,
        date: "2026-06-15",
        type: "ニュース",
        title: "サンプル調査メモ",
        content: "ニュース欄と調査メモ履歴の動作確認用です。",
        importance: "中",
        createdAt: SAMPLE_UPDATED_AT,
        updatedAt: SAMPLE_UPDATED_AT,
      },
    ],
    news: [
      {
        id: `${input.id}-news-1`,
        stockId: input.id,
        ticker: input.ticker,
        companyName: input.companyName,
        date: "2026-06-12",
        title: `${input.companyName} のサンプルニュース`,
        url: "",
        mediaName: "サンプルメディア",
        summary: "外部ニュースAPI連携前の表示確認用データです。",
        category: "その他",
        relatedStockIds: [input.id],
        importance: "中",
        sentiment: "未分類",
        source: "手入力",
        fetchedAt: SAMPLE_UPDATED_AT,
        userMemo: "",
        checked: false,
        dataSource: sampleDataSource(SAMPLE_UPDATED_AT),
        createdAt: SAMPLE_UPDATED_AT,
        updatedAt: SAMPLE_UPDATED_AT,
      },
    ],
    earningsCalendar: [
      {
        id: `${input.id}-calendar-2026-q2`,
        stockId: input.id,
        ticker: input.ticker,
        companyName: input.companyName,
        earningsDate: "2026-07-30",
        scheduledDate: "2026-07-30",
        fiscalYear: "2026",
        fiscalQuarter: "Q2",
        quarter: "Q2",
        status: "確認予定",
        source: "手入力",
        memo: "決算カレンダーAPI連携前のサンプル予定です。",
        dataSource: sampleDataSource(SAMPLE_UPDATED_AT),
        createdAt: SAMPLE_UPDATED_AT,
        updatedAt: SAMPLE_UPDATED_AT,
      },
    ],
    confirmationTasks: [
      {
        id: `${input.id}-task-earnings-check`,
        stockId: input.id,
        ticker: input.ticker,
        companyName: input.companyName,
        title: "決算内容を確認",
        dueDate: "2026-07-31",
        taskType: "決算確認",
        priority: "中",
        status: "未着手",
        memo: "サンプル決算予定に紐づく確認タスクです。",
        createdAt: SAMPLE_UPDATED_AT,
        updatedAt: SAMPLE_UPDATED_AT,
      },
    ],
    createdAt: SAMPLE_UPDATED_AT,
    updatedAt: SAMPLE_UPDATED_AT,
  };
}

export function getSampleStocks(): StockProfile[] {
  return [
    createSampleStock({
      id: "sample-jp-7203",
      ticker: "7203.T",
      companyName: "日本株サンプル",
      market: "東証プライム",
      sector: "輸送用機器",
      description: "日本株の通貨・単位・市場表示を確認するためのサンプル企業です。",
      website: "",
      prices: makePriceRows("2025-06-02", 220, 2600, 2.2, 1800000),
      earnings: makeEarnings("jp-sample", [
        { fiscalYear: "2022", revenue: 32000000, operatingIncome: 2800000, netIncome: 2100000, eps: 220, operatingCashFlow: 3500000, freeCashFlow: 1600000, equityRatio: 38, roe: 10, roic: 8, marketCap: 42000000, per: 14, pbr: 1.3, psr: 1.1 },
        { fiscalYear: "2023", revenue: 35000000, operatingIncome: 3100000, netIncome: 2400000, eps: 250, operatingCashFlow: 3900000, freeCashFlow: 1800000, equityRatio: 40, roe: 11, roic: 8.5, marketCap: 47000000, per: 15, pbr: 1.4, psr: 1.2 },
        { fiscalYear: "2024", revenue: 38600000, operatingIncome: 3600000, netIncome: 2850000, eps: 295, operatingCashFlow: 4400000, freeCashFlow: 2200000, equityRatio: 43, roe: 12, roic: 9, marketCap: 52000000, per: 16, pbr: 1.6, psr: 1.3 },
        { fiscalYear: "2025", revenue: 42100000, operatingIncome: 4100000, netIncome: 3300000, eps: 340, operatingCashFlow: 5000000, freeCashFlow: 2600000, equityRatio: 46, roe: 13, roic: 10, marketCap: 58000000, per: 17, pbr: 1.7, psr: 1.4 },
      ]),
    }),
    createSampleStock({
      id: "sample-us-msft",
      ticker: "MSFT",
      companyName: "US Stock Sample",
      market: "NASDAQ",
      sector: "Software",
      description: "米国株の通貨・単位・市場表示を確認するためのサンプル企業です。",
      website: "",
      prices: makePriceRows("2025-06-02", 220, 390, 0.35, 22000000),
      earnings: makeEarnings("us-sample", [
        { fiscalYear: "2022", revenue: 198000, operatingIncome: 83000, netIncome: 72000, eps: 9.6, operatingCashFlow: 89000, freeCashFlow: 65000, equityRatio: 45, roe: 38, roic: 25, marketCap: 2400000, per: 32, pbr: 11, psr: 12 },
        { fiscalYear: "2023", revenue: 212000, operatingIncome: 88000, netIncome: 73500, eps: 9.9, operatingCashFlow: 93000, freeCashFlow: 67000, equityRatio: 47, roe: 36, roic: 24, marketCap: 2600000, per: 35, pbr: 12, psr: 13 },
        { fiscalYear: "2024", revenue: 245000, operatingIncome: 109000, netIncome: 88000, eps: 11.8, operatingCashFlow: 118000, freeCashFlow: 82000, equityRatio: 49, roe: 37, roic: 26, marketCap: 3100000, per: 38, pbr: 13, psr: 14 },
        { fiscalYear: "2025", revenue: 281000, operatingIncome: 128000, netIncome: 103000, eps: 13.8, operatingCashFlow: 136000, freeCashFlow: 96000, equityRatio: 51, roe: 39, roic: 28, marketCap: 3500000, per: 40, pbr: 14, psr: 15 },
      ]),
    }),
  ];
}
