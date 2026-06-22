export type DataSourceType = "manual" | "csv" | "sample" | "api" | "mock-api" | "external-api-planned";

export type FetchStatus =
  | "idle"
  | "loading"
  | "success"
  | "empty"
  | "failed"
  | "api-not-configured"
  | "rate-limited"
  | "invalid-format";

export type DataSourceInfo = {
  type: DataSourceType;
  label: string;
  provider: string;
  updatedAt: string;
  status: FetchStatus;
  message?: string;
};

export type CurrencyCode = "JPY" | "USD" | "UNKNOWN";
export type MarketRegion = "JP" | "US" | "OTHER";
export type NumericUnit = "円" | "ドル" | "百万円" | "百万ドル" | "億円" | "未指定";
export type DisplayUnit = "raw" | "thousand" | "million" | "hundred-million";

export type PriceRow = {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  source?: DataSourceInfo;
  updatedAt?: string;
};

export type StockPriceFetchPeriod = "1m" | "3m" | "6m" | "1y" | "3y" | "5y" | "all";
export type StockPriceUpdateMethod = "手入力" | "CSV" | "API" | "Mock API";
export type FundamentalPeriodType = "annual" | "quarterly";
export type FundamentalFiscalQuarter = "Q1" | "Q2" | "Q3" | "Q4" | "fullYear";
export type FundamentalFetchPeriod = "annual" | "quarterly" | "all";
export type FundamentalUpdateMethod = "手入力" | "CSV" | "API" | "Mock API";

export type StockPriceApiSettings = {
  providerName: string;
  apiKey: string;
  baseUrl: string;
  enabled: boolean;
  mockMode: boolean;
  lastConnectionCheckedAt: string;
};

export type StockPriceUpdateHistory = {
  id: string;
  stockId: string;
  updatedAt: string;
  method: StockPriceUpdateMethod;
  period: StockPriceFetchPeriod;
  fetchedCount: number;
  success: boolean;
  errorMessage: string;
  dataSource: DataSourceInfo;
};

export type FundamentalApiSettings = {
  providerName: string;
  apiKey: string;
  baseUrl: string;
  enabled: boolean;
  mockMode: boolean;
  lastConnectionCheckedAt: string;
};

export type FundamentalUpdateHistory = {
  id: string;
  stockId: string;
  updatedAt: string;
  method: FundamentalUpdateMethod;
  period: FundamentalFetchPeriod;
  fetchedCount: number;
  success: boolean;
  errorMessage: string;
  dataSource: DataSourceInfo;
};

export type EarningsRow = {
  id: string;
  periodType?: FundamentalPeriodType;
  fiscalYear: string;
  fiscalQuarter?: FundamentalFiscalQuarter;
  revenue: number;
  operatingIncome: number;
  netIncome: number;
  eps: number | null;
  operatingCashFlow: number | null;
  freeCashFlow: number | null;
  equityRatio: number | null;
  roe: number | null;
  roic: number | null;
  marketCap: number | null;
  per: number | null;
  pbr: number | null;
  psr: number | null;
  currency?: CurrencyCode;
  unit?: NumericUnit;
  source?: DataSourceInfo;
  updatedAt?: string;
  memo: string;
};

export type WatchStatus = "未保有" | "監視中" | "少額保有中" | "保有中" | "一時除外";
export type ResearchPriority = "高" | "中" | "低";
export type Quarter = "Q1" | "Q2" | "Q3" | "Q4" | "通期";
export type Impression = "良い" | "普通" | "悪い" | "未確認";
export type RiskCategory =
  | "競合リスク"
  | "技術リスク"
  | "規制リスク"
  | "金利リスク"
  | "為替リスク"
  | "景気後退リスク"
  | "バリュエーションリスク"
  | "業績悪化リスク"
  | "資金繰りリスク"
  | "地政学リスク"
  | "その他リスク";
export type RiskImpact = "大" | "中" | "小";
export type RiskProbability = "高" | "中" | "低";
export type ResearchMemoType = "ニュース" | "決算" | "株価" | "事業内容" | "競合" | "リスク" | "その他";
export type Importance = "高" | "中" | "低";
export type EarningsCalendarStatus = "未確認" | "確認予定" | "確認済み";
export type EarningsCalendarSource = "手入力" | "API" | "Mock API";
export type NewsCategory = "決算" | "業績" | "新製品" | "提携" | "M&A" | "規制" | "訴訟" | "マクロ経済" | "セクター動向" | "その他";
export type NewsSentiment = "ポジティブ" | "ネガティブ" | "中立" | "未分類";
export type NewsSource = "手入力" | "API" | "Mock API";
export type ConfirmationTaskType = "決算確認" | "ニュース確認" | "株価確認" | "業績確認" | "リスク確認" | "その他";
export type ConfirmationTaskStatus = "未着手" | "対応中" | "完了" | "保留";

export type CompanyInfo = {
  stockId: string;
  ticker: string;
  companyName: string;
  market: string;
  sector: string;
  region: MarketRegion;
  currency: CurrencyCode;
  priceUnit: NumericUnit;
  financialUnit: NumericUnit;
  displayUnit: DisplayUnit;
  description: string;
  website: string;
  dataSource: DataSourceInfo;
  updatedAt: string;
};

export type NewsItem = {
  id: string;
  stockId: string;
  ticker: string;
  companyName: string;
  date: string;
  title: string;
  url: string;
  mediaName: string;
  summary: string;
  category: NewsCategory;
  relatedStockIds: string[];
  importance: Importance;
  sentiment: NewsSentiment;
  source: NewsSource;
  fetchedAt: string;
  userMemo: string;
  checked: boolean;
  dataSource: DataSourceInfo;
  createdAt: string;
  updatedAt: string;
};

export type EarningsCalendarItem = {
  id: string;
  stockId: string;
  ticker: string;
  companyName: string;
  earningsDate: string;
  scheduledDate: string;
  fiscalYear: string;
  fiscalQuarter: Quarter;
  quarter: Quarter;
  status: EarningsCalendarStatus;
  source: EarningsCalendarSource;
  memo: string;
  dataSource: DataSourceInfo;
  createdAt: string;
  updatedAt: string;
};

export type ConfirmationTask = {
  id: string;
  stockId: string;
  ticker: string;
  companyName: string;
  title: string;
  dueDate: string;
  taskType: ConfirmationTaskType;
  priority: Importance;
  status: ConfirmationTaskStatus;
  memo: string;
  createdAt: string;
  updatedAt: string;
};

export type WatchlistEntry = {
  stockId: string;
  status: WatchStatus;
  reason: string;
  themes: string;
  trigger: string;
  priority: ResearchPriority;
  nextCheck: string;
  nextReviewDate: string;
  memo: string;
  createdAt: string;
  updatedAt: string;
};

export type PriceReviewNote = {
  currentPriceMemo: string;
  reviewPriceLevel: string;
  reviewReason: string;
  dropFromHighPercent: number | null;
  checkAfterEarnings: boolean;
  checkOnSharpDrop: boolean;
  cautionMemo: string;
  updatedAt: string;
};

export type EarningsMemo = {
  id: string;
  announcementDate: string;
  fiscalYear: string;
  quarter: Quarter;
  revenueImpression: Impression;
  profitImpression: Impression;
  guidanceImpression: Impression;
  goodPoints: string;
  badPoints: string;
  nextCheckPoints: string;
  priceReactionMemo: string;
  overallMemo: string;
  createdAt: string;
  updatedAt: string;
};

export type RiskItem = {
  id: string;
  category: RiskCategory;
  content: string;
  impact: RiskImpact;
  probability: RiskProbability;
  confirmationMethod: string;
  responseMemo: string;
  lastCheckedDate: string;
  createdAt: string;
  updatedAt: string;
};

export type ResearchMemo = {
  id: string;
  date: string;
  type: ResearchMemoType;
  title: string;
  content: string;
  importance: Importance;
  createdAt: string;
  updatedAt: string;
};

export type StockProfile = {
  id: string;
  ticker: string;
  companyName: string;
  market: string;
  sector: string;
  region: MarketRegion;
  currency: CurrencyCode;
  priceUnit: NumericUnit;
  financialUnit: NumericUnit;
  displayUnit: DisplayUnit;
  memo: string;
  prices: PriceRow[];
  earnings: EarningsRow[];
  companyInfo: CompanyInfo;
  dataSource: DataSourceInfo;
  priceDataSource: DataSourceInfo;
  fundamentalDataSource: DataSourceInfo;
  priceUpdateHistories: StockPriceUpdateHistory[];
  fundamentalUpdateHistories: FundamentalUpdateHistory[];
  watchlist: WatchlistEntry | null;
  priceReview: PriceReviewNote;
  earningsMemos: EarningsMemo[];
  risks: RiskItem[];
  researchMemos: ResearchMemo[];
  news: NewsItem[];
  earningsCalendar: EarningsCalendarItem[];
  confirmationTasks: ConfirmationTask[];
  createdAt: string;
  updatedAt: string;
};

export type Stock = StockProfile;
export type StockPrice = PriceRow;
export type Fundamental = EarningsRow;
export type FinancialMetric = {
  key: string;
  label: string;
  value: number | null;
  unit: NumericUnit;
  fiscalYear?: string;
  dataSource?: DataSourceInfo;
};
export type WatchlistItem = WatchlistEntry;
export type RiskMemo = RiskItem;

export type LlmContextLimits = {
  news: number;
  researchMemos: number;
  riskMemos: number;
  earningsMemos: number;
  earningsCalendar: number;
  tasks: number;
  fundamentals: number;
};

export type LlmSafeRecord = Record<string, unknown>;

export type LlmStockResearchContext = {
  schemaVersion: "stock-research-context-v1";
  generatedAt: string;
  contextHash: string;
  limits: LlmContextLimits;
  stock: LlmSafeRecord;
  scores?: LlmSafeRecord;
  priceSummary?: LlmSafeRecord;
  trendSignals?: LlmSafeRecord[];
  fundamentalSummary?: LlmSafeRecord;
  fundamentals?: LlmSafeRecord[];
  watchlist?: LlmSafeRecord;
  priceReview?: LlmSafeRecord;
  riskMemos?: LlmSafeRecord[];
  news?: LlmSafeRecord[];
  earningsCalendar?: LlmSafeRecord[];
  confirmationTasks?: LlmSafeRecord[];
  researchMemos?: LlmSafeRecord[];
  earningsMemos?: LlmSafeRecord[];
};

export type LlmOutputType =
  | "銘柄要約"
  | "ニュース要約"
  | "決算要約"
  | "リスク整理"
  | "追加調査ポイント";

export type LlmReportSection = {
  heading: string;
  items: string[];
};

export type StructuredLlmReport = {
  title: string;
  analysisType: string;
  sections: LlmReportSection[];
  disclaimer: string;
};

export type LlmGeneratedOutput = {
  id: string;
  stockId: string;
  type: LlmOutputType;
  content: string;
  structuredReport?: StructuredLlmReport;
  model: string;
  createdAt: string;
  updatedAt: string;
  sourceContextHash: string;
};

export type LlmGenerationModeLabel = "Mock" | "実LLM";

export type LlmSendSettings = {
  includePriceSummary: boolean;
  includeFundamentals: boolean;
  includeNews: boolean;
  includeRiskMemos: boolean;
  includeResearchMemos: boolean;
  includeEarningsMemos: boolean;
  includeTasks: boolean;
};

export type LlmInputSizeSummary = {
  inputSize: number;
  warningLimit: number;
  hardLimit: number;
  isWarning: boolean;
  isBlocked: boolean;
  newsCount: number;
  researchMemoCount: number;
  riskMemoCount: number;
  earningsMemoCount: number;
  taskCount: number;
};

export type LlmUsageLog = {
  id: string;
  stockId: string;
  ticker: string;
  companyName: string;
  analysisType: LlmOutputType;
  mode: LlmGenerationModeLabel;
  model: string;
  requestedAt: string;
  success: boolean;
  errorMessage: string;
  inputSize: number;
  outputSize: number;
  sourceContextHash: string;
};

export type ChartPoint = PriceRow & {
  ma25: number | null;
  ma75: number | null;
  ma200: number | null;
};

export type TrendSignal = {
  key: string;
  label: string;
  passed: boolean | null;
  points: number;
};

export type TrendMetrics = {
  latestClose: number | null;
  latestDate: string | null;
  ma25: number | null;
  ma75: number | null;
  ma200: number | null;
  closeSlope20: number | null;
  volumeAverage20: number | null;
  drawdownFrom52WeekHighPercent: number | null;
  riseFrom52WeekLowPercent: number | null;
  high52Week: number | null;
  low52Week: number | null;
};

export type TrendAnalysis = {
  chartData: ChartPoint[];
  latest: ChartPoint | null;
  score: number;
  scoreLabel: string;
  signals: TrendSignal[];
  metrics: TrendMetrics;
};

export type ScoreSignal = {
  key: string;
  label: string;
  passed: boolean | null;
  points: number;
};

export type FundamentalComputedRow = EarningsRow & {
  revenueGrowthPercent: number | null;
  operatingIncomeGrowthPercent: number | null;
  netIncomeGrowthPercent: number | null;
  epsGrowthPercent: number | null;
  operatingMarginPercent: number | null;
  netMarginPercent: number | null;
  freeCashFlowGrowthPercent: number | null;
};

export type FundamentalMetrics = {
  latestFiscalYear: string | null;
  latestRevenueGrowthPercent: number | null;
  latestOperatingIncomeGrowthPercent: number | null;
  latestNetIncomeGrowthPercent: number | null;
  latestEpsGrowthPercent: number | null;
  latestOperatingMarginPercent: number | null;
  latestNetMarginPercent: number | null;
  latestFreeCashFlowGrowthPercent: number | null;
  latestFreeCashFlow: number | null;
  latestEquityRatio: number | null;
  latestRoe: number | null;
  latestRoic: number | null;
  latestPer: number | null;
  latestPbr: number | null;
  latestPsr: number | null;
  average3YearRevenueGrowthPercent: number | null;
  average3YearOperatingIncomeGrowthPercent: number | null;
  average3YearEpsGrowthPercent: number | null;
  average5YearRevenueGrowthPercent: number | null;
  average5YearOperatingIncomeGrowthPercent: number | null;
  average5YearEpsGrowthPercent: number | null;
};

export type ValuationWarning = {
  key: string;
  label: string;
  status: "warning" | "ok" | "missing";
};

export type FundamentalAnalysis = {
  rows: FundamentalComputedRow[];
  latest: FundamentalComputedRow | null;
  growthScore: number;
  growthScoreLabel: string;
  financialSafetyScore: number;
  financialSafetyScoreLabel: string;
  totalResearchScore: number;
  totalResearchScoreLabel: string;
  growthSignals: ScoreSignal[];
  safetySignals: ScoreSignal[];
  valuationWarnings: ValuationWarning[];
  metrics: FundamentalMetrics;
};
