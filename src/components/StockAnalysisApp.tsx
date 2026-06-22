"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  FileUp,
  Info,
  List,
  Pencil,
  Plus,
  Save,
  ShieldCheck,
  Trash2,
  Upload,
  XCircle,
  RefreshCw,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { AiAnalysisSection, LlmContextPreview } from "@/components/ai/AiAnalysisSection";
import { AiHistoryView } from "@/components/ai/AiHistoryView";
import { StockListView, type SortKey } from "@/components/views/StockListView";
import { StockDetailView } from "@/components/views/StockDetailView";
import { EarningsCsvImportView, PriceCsvImportView } from "@/components/views/CsvImportView";
import { SettingsView } from "@/components/views/SettingsView";
import {
  ActionButton as DsActionButton,
  AppShell,
  CollapsibleSection,
  FormField,
  InfoAlert,
  MetricCard,
  PageHeader,
  SectionCard,
  StatusBadge,
  cx,
  inputClassName as dsInputClassName,
} from "@/components/ui/design-system";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { daysUntil, isPastOrToday, latestDate, todayIsoDate } from "@/lib/date-utils";
import {
  apiNotImplementedMessage,
  apiPlannedDataSource,
  csvDataSource,
  formatDataSource,
  formatDataSourceDate,
  manualDataSource,
} from "@/lib/dataSource";
import {
  loadFundamentalApiSettings,
  loadStockPriceApiSettings,
  maskApiKey,
  saveFundamentalApiSettings,
  saveStockPriceApiSettings,
} from "@/lib/apiSettings";
import {
  appendCsvImportHistory,
  createCsvImportHistory,
  loadCsvImportHistories,
  type CsvImportDataType,
  type CsvImportHistoryItem,
} from "@/lib/csvImportHistory";
import {
  createEarningsCsvTemplate,
  createPriceCsvTemplate,
  previewEarningsCsv,
  previewPriceCsv,
  type CsvPreviewRow,
  type EarningsCsvImportPreview,
  type PriceCsvImportPreview,
} from "@/lib/csvImportWorkflow";
import { parseEarningsCsv, type EarningsCsvImportResult } from "@/lib/earnings-csv";
import { formatInteger, formatNumber, formatPercent } from "@/lib/format";
import {
  calculateFundamentalAnalysis,
  sortEarningsRows,
} from "@/lib/growth-math";
import { buildStockResearchContext } from "@/lib/llmContext";
import { inferCurrency, inferFinancialUnit, inferMarketRegion, inferPriceUnit, normalizeMarket, normalizeTicker } from "@/lib/normalization";
import { parsePriceCsv, type CsvImportResult } from "@/lib/csv";
import { calculateRiskItemScore, calculateRiskScore, getRiskScoreLabel } from "@/lib/risk-math";
import { calculateTrendAnalysis } from "@/lib/stock-math";
import { createStockId, loadStocks, saveStocks } from "@/lib/storage";
import { mergeEarningsCalendarItems } from "@/lib/earningsDeduplication";
import { mergeNewsItems } from "@/lib/newsDeduplication";
import {
  createFundamentalUpdateHistory,
  createStockPriceUpdateHistory,
  formatFundamentalPeriod,
  formatStockPricePeriod,
  prependFundamentalUpdateHistory,
  prependStockPriceUpdateHistory,
} from "@/lib/updateHistory";
import { getCompanyInfoData } from "@/services/companyInfoService";
import { getEarningsCalendarData, updateEarningsCalendarFromMockApi, type EarningsCalendarUpdateResult } from "@/services/earningsCalendarService";
import { getFundamentalData, requestFundamentalUpdate } from "@/services/fundamentalService";
import { checkFundamentalApiConnection, updateFundamentalsFromApi, type FundamentalUpdateResult } from "@/services/fundamentalUpdateService";
import { getNewsData, updateNewsFromMockApi, type NewsUpdateResult } from "@/services/newsService";
import { getStockPriceData } from "@/services/stockPriceService";
import { checkStockPriceApiConnection, updateStockPricesFromApi, type StockPriceUpdateResult } from "@/services/stockPriceUpdateService";
import { createTaskFromEarningsCalendar, sortConfirmationTasks } from "@/services/taskService";
import type {
  ChartPoint,
  ConfirmationTask,
  ConfirmationTaskStatus,
  ConfirmationTaskType,
  CompanyInfo,
  DataSourceInfo,
  EarningsCalendarItem,
  EarningsMemo,
  EarningsRow,
  FundamentalApiSettings,
  FundamentalAnalysis,
  FundamentalComputedRow,
  FundamentalFetchPeriod,
  FundamentalUpdateHistory,
  Impression,
  Importance,
  NewsItem,
  NewsCategory,
  NewsSentiment,
  PriceReviewNote,
  PriceRow,
  Quarter,
  ResearchMemo,
  ResearchMemoType,
  ResearchPriority,
  RiskCategory,
  RiskImpact,
  RiskItem,
  RiskProbability,
  ScoreSignal,
  StockPriceApiSettings,
  StockPriceFetchPeriod,
  StockPriceUpdateHistory,
  StockProfile,
  TrendAnalysis,
  TrendSignal,
  ValuationWarning,
  WatchStatus,
  WatchlistEntry,
} from "@/lib/types";

type View =
  | { name: "list" }
  | { name: "edit"; stockId?: string }
  | { name: "detail"; stockId: string }
  | { name: "priceImport"; stockId?: string }
  | { name: "earnings"; stockId?: string }
  | { name: "watch"; stockId?: string }
  | { name: "earningsMemo"; stockId?: string }
  | { name: "risk"; stockId?: string }
  | { name: "researchMemo"; stockId?: string }
  | { name: "tasks"; stockId?: string }
  | { name: "aiHistory" }
  | { name: "settings" };

type StockFormState = {
  ticker: string;
  companyName: string;
  market: string;
  sector: string;
  memo: string;
};

type EarningsFormState = {
  fiscalYear: string;
  revenue: string;
  operatingIncome: string;
  netIncome: string;
  eps: string;
  operatingCashFlow: string;
  freeCashFlow: string;
  equityRatio: string;
  roe: string;
  roic: string;
  marketCap: string;
  per: string;
  pbr: string;
  psr: string;
  memo: string;
};

type WatchFormState = {
  status: WatchStatus;
  reason: string;
  themes: string;
  trigger: string;
  priority: ResearchPriority;
  nextCheck: string;
  nextReviewDate: string;
  memo: string;
};

type PriceReviewFormState = {
  currentPriceMemo: string;
  reviewPriceLevel: string;
  reviewReason: string;
  dropFromHighPercent: string;
  checkAfterEarnings: boolean;
  checkOnSharpDrop: boolean;
  cautionMemo: string;
};

type EarningsMemoFormState = {
  id?: string;
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
};

type RiskFormState = {
  id?: string;
  category: RiskCategory;
  content: string;
  impact: RiskImpact;
  probability: RiskProbability;
  confirmationMethod: string;
  responseMemo: string;
  lastCheckedDate: string;
};

type ResearchMemoFormState = {
  id?: string;
  date: string;
  type: ResearchMemoType;
  title: string;
  content: string;
  importance: Importance;
};

type NewsFormState = {
  date: string;
  title: string;
  url: string;
  mediaName: string;
  summary: string;
  category: NewsCategory;
  importance: Importance;
  sentiment: NewsSentiment;
  userMemo: string;
  checked: boolean;
};

type EarningsCalendarFormState = {
  earningsDate: string;
  fiscalYear: string;
  fiscalQuarter: Quarter;
  status: EarningsCalendarItem["status"];
  memo: string;
};

type TaskFormState = {
  id?: string;
  stockId: string;
  title: string;
  dueDate: string;
  taskType: ConfirmationTaskType;
  priority: Importance;
  status: ConfirmationTaskStatus;
  memo: string;
};

type ListRow = {
  stock: StockProfile;
  trendAnalysis: TrendAnalysis;
  fundamentalAnalysis: FundamentalAnalysis;
  riskScore: number;
  riskLabel: string;
  latestEarningsMemoDate: string | null;
  latestResearchMemoDate: string | null;
};

const WATCH_STATUSES: WatchStatus[] = ["未保有", "監視中", "少額保有中", "保有中", "一時除外"];
const PRIORITIES: ResearchPriority[] = ["高", "中", "低"];
const QUARTERS: Quarter[] = ["Q1", "Q2", "Q3", "Q4", "通期"];
const IMPRESSIONS: Impression[] = ["良い", "普通", "悪い", "未確認"];
const RISK_CATEGORIES: RiskCategory[] = [
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
const RISK_IMPACTS: RiskImpact[] = ["大", "中", "小"];
const RISK_PROBABILITIES: RiskProbability[] = ["高", "中", "低"];
const MEMO_TYPES: ResearchMemoType[] = ["ニュース", "決算", "株価", "事業内容", "競合", "リスク", "その他"];
const IMPORTANCES: Importance[] = ["高", "中", "低"];
const STOCK_PRICE_PERIOD_OPTIONS: StockPriceFetchPeriod[] = ["1m", "3m", "6m", "1y", "3y", "5y", "all"];
const NEWS_CATEGORIES: NewsCategory[] = ["決算", "業績", "新製品", "提携", "M&A", "規制", "訴訟", "マクロ経済", "セクター動向", "その他"];
const NEWS_SENTIMENTS: NewsSentiment[] = ["ポジティブ", "ネガティブ", "中立", "未分類"];
const TASK_TYPES: ConfirmationTaskType[] = ["決算確認", "ニュース確認", "株価確認", "業績確認", "リスク確認", "その他"];
const TASK_STATUSES: ConfirmationTaskStatus[] = ["未着手", "対応中", "完了", "保留"];

const emptyForm: StockFormState = {
  ticker: "",
  companyName: "",
  market: "",
  sector: "",
  memo: "",
};

const emptyEarningsForm: EarningsFormState = {
  fiscalYear: "",
  revenue: "",
  operatingIncome: "",
  netIncome: "",
  eps: "",
  operatingCashFlow: "",
  freeCashFlow: "",
  equityRatio: "",
  roe: "",
  roic: "",
  marketCap: "",
  per: "",
  pbr: "",
  psr: "",
  memo: "",
};

const emptyWatchForm: WatchFormState = {
  status: "監視中",
  reason: "",
  themes: "",
  trigger: "",
  priority: "中",
  nextCheck: "",
  nextReviewDate: "",
  memo: "",
};

const emptyPriceReviewForm: PriceReviewFormState = {
  currentPriceMemo: "",
  reviewPriceLevel: "",
  reviewReason: "",
  dropFromHighPercent: "",
  checkAfterEarnings: false,
  checkOnSharpDrop: false,
  cautionMemo: "",
};

const emptyEarningsMemoForm: EarningsMemoFormState = {
  announcementDate: todayIsoDate(),
  fiscalYear: "",
  quarter: "Q1",
  revenueImpression: "未確認",
  profitImpression: "未確認",
  guidanceImpression: "未確認",
  goodPoints: "",
  badPoints: "",
  nextCheckPoints: "",
  priceReactionMemo: "",
  overallMemo: "",
};

const emptyRiskForm: RiskFormState = {
  category: "競合リスク",
  content: "",
  impact: "中",
  probability: "中",
  confirmationMethod: "",
  responseMemo: "",
  lastCheckedDate: todayIsoDate(),
};

const emptyResearchMemoForm: ResearchMemoFormState = {
  date: todayIsoDate(),
  type: "その他",
  title: "",
  content: "",
  importance: "中",
};

const emptyNewsForm: NewsFormState = {
  date: todayIsoDate(),
  title: "",
  url: "",
  mediaName: "",
  summary: "",
  category: "その他",
  importance: "中",
  sentiment: "未分類",
  userMemo: "",
  checked: false,
};

function Button({
  children,
  icon: Icon,
  variant = "secondary",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  icon?: LucideIcon;
  variant?: "primary" | "secondary" | "ghost" | "danger";
}) {
  return (
    <DsActionButton {...props} icon={Icon} variant={variant} className={className}>
      {children}
    </DsActionButton>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <FormField label={label}>{children}</FormField>;
}

function inputClassName(extra = "") {
  return dsInputClassName(extra);
}

function scoreClassName(score: number) {
  if (score >= 80) return "border-teal-200 bg-teal-50 text-teal-900";
  if (score >= 60) return "border-sky-200 bg-sky-50 text-sky-900";
  if (score >= 40) return "border-slate-200 bg-slate-50 text-slate-800";
  if (score >= 20) return "border-amber-200 bg-amber-50 text-amber-900";
  return "border-rose-200 bg-rose-50 text-rose-900";
}

function riskClassName(score: number) {
  if (score >= 21) return "border-rose-200 bg-rose-50 text-rose-900";
  if (score >= 13) return "border-amber-200 bg-amber-50 text-amber-900";
  if (score >= 6) return "border-sky-200 bg-sky-50 text-sky-900";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

function signalStatus(signal: Pick<TrendSignal | ScoreSignal, "passed">) {
  if (signal.passed === null) return { label: "データ不足", className: "bg-slate-100 text-slate-600", icon: Info };
  if (signal.passed) return { label: "該当", className: "bg-teal-50 text-teal-800", icon: CheckCircle2 };
  return { label: "非該当", className: "bg-rose-50 text-rose-800", icon: XCircle };
}

function createId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function parseRequiredNumber(value: string): number | null {
  if (value.trim() === "") return null;
  const parsed = Number(value.replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function parseOptionalNumber(value: string): number | null {
  if (value.trim() === "") return null;
  return parseRequiredNumber(value);
}

function stockToForm(stock?: StockProfile): StockFormState {
  if (!stock) return emptyForm;
  return {
    ticker: stock.ticker,
    companyName: stock.companyName,
    market: stock.market,
    sector: stock.sector,
    memo: stock.memo,
  };
}

function watchToForm(watchlist: WatchlistEntry | null): WatchFormState {
  if (!watchlist) return emptyWatchForm;
  return {
    status: watchlist.status,
    reason: watchlist.reason,
    themes: watchlist.themes,
    trigger: watchlist.trigger,
    priority: watchlist.priority,
    nextCheck: watchlist.nextCheck,
    nextReviewDate: watchlist.nextReviewDate,
    memo: watchlist.memo,
  };
}

function priceReviewToForm(priceReview: PriceReviewNote): PriceReviewFormState {
  return {
    currentPriceMemo: priceReview.currentPriceMemo,
    reviewPriceLevel: priceReview.reviewPriceLevel,
    reviewReason: priceReview.reviewReason,
    dropFromHighPercent: priceReview.dropFromHighPercent === null ? "" : String(priceReview.dropFromHighPercent),
    checkAfterEarnings: priceReview.checkAfterEarnings,
    checkOnSharpDrop: priceReview.checkOnSharpDrop,
    cautionMemo: priceReview.cautionMemo,
  };
}

function ViewHeader({ title, actions }: { title: string; actions?: React.ReactNode }) {
  return <PageHeader title={title} actions={actions} />;
}

function Disclaimer() {
  return (
    <InfoAlert tone="warning">
      <p>このアプリは調査補助ツールです。スコアやAI分析は機械的な表示であり、投資判断ではありません。APIキーはlocalStorageや利用ログに保存しません。</p>
      このアプリは調査補助ツールです。スコアやメモの集計は機械的な集計であり、投資判断ではありません。
    </InfoAlert>
  );
}

function formatDateTime(value: string): string {
  return value ? value.replace("T", " ").slice(0, 16) : "-";
}

function formatFetchStatus(status: DataSourceInfo["status"]): string {
  const labels: Record<DataSourceInfo["status"], string> = {
    idle: "未取得",
    loading: "読み込み中",
    success: "取得成功",
    empty: "データなし",
    failed: "取得失敗",
    "api-not-configured": "API未設定",
    "rate-limited": "レート制限",
    "invalid-format": "形式不正",
  };

  return labels[status];
}

function DataSourceBadge({ source, testId }: { source: DataSourceInfo; testId?: string }) {
  return (
    <div data-testid={testId} className="grid gap-1 rounded-md border border-line bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">
      <div>
        <span>{formatDataSource(source)}</span>
        <span className="mx-2 text-slate-300">/</span>
        <span>{formatDataSourceDate(source)}</span>
      </div>
      {source.provider ? <span>プロバイダ：{source.provider}</span> : null}
      {source.message ? <span className="text-slate-500">{source.message}</span> : null}
    </div>
  );
}

function ApiUpdateNotice({ message }: { message: string | null }) {
  if (!message) return null;

  return (
    <div data-testid="api-notice" className="rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-semibold text-sky-900">
      {message}
    </div>
  );
}

function ScorePill({ score, testId }: { score: number; testId?: string }) {
  return (
    <StatusBadge testId={testId} className={cx("min-w-14", scoreClassName(score))}>
      {score}
    </StatusBadge>
  );
}

function RiskPill({ score, testId }: { score: number; testId?: string }) {
  return (
    <StatusBadge testId={testId} className={cx("min-w-14", riskClassName(score))}>
      {score}
    </StatusBadge>
  );
}

function MetricTile({ label, value }: { label: string; value: string }) {
  return <MetricCard label={label} value={value} />;
}

function MiniTable({
  title,
  children,
  empty,
}: {
  title: string;
  children: React.ReactNode;
  empty?: boolean;
}) {
  return (
    <SectionCard title={title}>
      {empty ? (
        <p className="text-sm font-semibold text-slate-500">データ不足。登録データはまだありません。</p>
      ) : (
        <div className="overflow-x-auto">{children}</div>
      )}
    </SectionCard>
  );
}

function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
  testId,
}: {
  label: string;
  value: T;
  options: T[];
  onChange: (value: T) => void;
  testId?: string;
}) {
  return (
    <Field label={label}>
      <select data-testid={testId} className={inputClassName()} value={value} onChange={(event) => onChange(event.target.value as T)}>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </Field>
  );
}

function FormView({
  stock,
  onCancel,
  onSubmit,
}: {
  stock?: StockProfile;
  onCancel: () => void;
  onSubmit: (form: StockFormState, stockId?: string) => void;
}) {
  const [form, setForm] = useState<StockFormState>(() => stockToForm(stock));
  const [error, setError] = useState("");
  const updateField = (field: keyof StockFormState, value: string) => setForm((current) => ({ ...current, [field]: value }));

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.ticker.trim()) {
      setError("ティッカーを入力してください。");
      return;
    }
    setError("");
    onSubmit(form, stock?.id);
  };

  return (
    <section className="mx-auto grid max-w-3xl gap-5">
      <ViewHeader title={stock ? "銘柄編集" : "銘柄登録"} actions={<Button icon={List} onClick={onCancel}>一覧へ</Button>} />
      <form onSubmit={handleSubmit} className="rounded-lg border border-line bg-white p-5 shadow-panel">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="ティッカー"><input data-testid="ticker-input" className={inputClassName("uppercase")} value={form.ticker} onChange={(event) => updateField("ticker", event.target.value.toUpperCase())} /></Field>
          <Field label="会社名"><input data-testid="company-name-input" className={inputClassName()} value={form.companyName} onChange={(event) => updateField("companyName", event.target.value)} /></Field>
          <Field label="市場"><input data-testid="market-input" className={inputClassName()} value={form.market} onChange={(event) => updateField("market", event.target.value)} /></Field>
          <Field label="セクター"><input data-testid="sector-input" className={inputClassName()} value={form.sector} onChange={(event) => updateField("sector", event.target.value)} /></Field>
          <Field label="メモ"><textarea data-testid="memo-input" className={inputClassName("min-h-28 sm:col-span-2")} value={form.memo} onChange={(event) => updateField("memo", event.target.value)} /></Field>
        </div>
        {error ? <p className="mt-4 text-sm font-semibold text-decline">{error}</p> : null}
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Button type="button" icon={XCircle} onClick={onCancel}>キャンセル</Button>
          <Button data-testid="save-stock" type="submit" icon={Save} variant="primary">保存</Button>
        </div>
      </form>
    </section>
  );
}

function buildListRows(stocks: StockProfile[]): ListRow[] {
  return stocks.map((stock) => {
    const trendAnalysis = calculateTrendAnalysis(stock.prices);
    const fundamentalAnalysis = calculateFundamentalAnalysis(stock.earnings, trendAnalysis.score);
    const riskScore = calculateRiskScore(stock.risks);
    return {
      stock,
      trendAnalysis,
      fundamentalAnalysis,
      riskScore,
      riskLabel: getRiskScoreLabel(riskScore),
      latestEarningsMemoDate: latestDate(stock.earningsMemos.map((memo) => memo.announcementDate)),
      latestResearchMemoDate: latestDate(stock.researchMemos.map((memo) => memo.date)),
    };
  });
}



function WatchView({ stocks, initialStockId, onBack, onSaveWatch, onRemoveWatch, onSavePriceReview }: { stocks: StockProfile[]; initialStockId?: string; onBack: () => void; onSaveWatch: (stockId: string, form: WatchFormState) => void; onRemoveWatch: (stockId: string) => void; onSavePriceReview: (stockId: string, form: PriceReviewFormState) => void; }) {
  const [stockId, setStockId] = useState(initialStockId ?? stocks[0]?.id ?? "");
  const selectedStock = stocks.find((stock) => stock.id === stockId);
  const [watchForm, setWatchForm] = useState<WatchFormState>(() => watchToForm(selectedStock?.watchlist ?? null));
  const [priceForm, setPriceForm] = useState<PriceReviewFormState>(() => selectedStock ? priceReviewToForm(selectedStock.priceReview) : emptyPriceReviewForm);
  useEffect(() => {
    setWatchForm(watchToForm(selectedStock?.watchlist ?? null));
    setPriceForm(selectedStock ? priceReviewToForm(selectedStock.priceReview) : emptyPriceReviewForm);
  }, [selectedStock]);
  const updateWatch = (field: keyof WatchFormState, value: string) => setWatchForm((current) => ({ ...current, [field]: value }));
  const updatePrice = (field: keyof PriceReviewFormState, value: string | boolean) => setPriceForm((current) => ({ ...current, [field]: value }));
  return (
    <section className="grid gap-5">
      <ViewHeader title="ウォッチリスト / 確認水準" actions={<Button icon={List} onClick={onBack}>一覧へ</Button>} />
      <Disclaimer />
      <div className="rounded-lg border border-line bg-white p-5 shadow-panel">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="銘柄"><select className={inputClassName()} value={stockId} onChange={(event) => setStockId(event.target.value)}>{stocks.map((stock) => <option key={stock.id} value={stock.id}>{stock.ticker} {stock.companyName}</option>)}</select></Field>
          <SelectField label="監視ステータス" value={watchForm.status} options={WATCH_STATUSES} onChange={(value) => updateWatch("status", value)} testId="watch-status" />
          <SelectField label="調査優先度" value={watchForm.priority} options={PRIORITIES} onChange={(value) => updateWatch("priority", value)} testId="watch-priority" />
          <Field label="次回確認日"><input data-testid="watch-next-review-date" type="date" className={inputClassName()} value={watchForm.nextReviewDate} onChange={(event) => updateWatch("nextReviewDate", event.target.value)} /></Field>
          <Field label="監視理由"><textarea data-testid="watch-reason" className={inputClassName("min-h-24")} value={watchForm.reason} onChange={(event) => updateWatch("reason", event.target.value)} /></Field>
          <Field label="注目しているテーマ"><textarea data-testid="watch-themes" className={inputClassName("min-h-24")} value={watchForm.themes} onChange={(event) => updateWatch("themes", event.target.value)} /></Field>
          <Field label="気になったきっかけ"><textarea className={inputClassName("min-h-24")} value={watchForm.trigger} onChange={(event) => updateWatch("trigger", event.target.value)} /></Field>
          <Field label="次に確認すること"><textarea data-testid="watch-next-check" className={inputClassName("min-h-24")} value={watchForm.nextCheck} onChange={(event) => updateWatch("nextCheck", event.target.value)} /></Field>
          <Field label="メモ"><textarea className={inputClassName("min-h-24")} value={watchForm.memo} onChange={(event) => updateWatch("memo", event.target.value)} /></Field>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button data-testid="remove-watch" icon={Trash2} variant="danger" onClick={() => selectedStock && onRemoveWatch(selectedStock.id)} disabled={!selectedStock}>ウォッチ解除</Button>
          <Button data-testid="save-watch" icon={Save} variant="primary" onClick={() => selectedStock && onSaveWatch(selectedStock.id, watchForm)} disabled={!selectedStock}>保存</Button>
        </div>
      </div>
      <div className="rounded-lg border border-line bg-white p-5 shadow-panel">
        <h2 className="text-base font-bold text-ink">確認水準メモ</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Field label="現在価格メモ"><textarea data-testid="price-current-memo" className={inputClassName("min-h-24")} value={priceForm.currentPriceMemo} onChange={(event) => updatePrice("currentPriceMemo", event.target.value)} /></Field>
          <Field label="確認したい価格水準"><input data-testid="price-review-level" className={inputClassName()} value={priceForm.reviewPriceLevel} onChange={(event) => updatePrice("reviewPriceLevel", event.target.value)} /></Field>
          <Field label="その水準で確認したい理由"><textarea data-testid="price-review-reason" className={inputClassName("min-h-24")} value={priceForm.reviewReason} onChange={(event) => updatePrice("reviewReason", event.target.value)} /></Field>
          <Field label="高値から何%下落したら再確認"><input data-testid="price-drop-percent" className={inputClassName()} inputMode="decimal" value={priceForm.dropFromHighPercent} onChange={(event) => updatePrice("dropFromHighPercent", event.target.value)} /></Field>
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-700"><input data-testid="price-check-after-earnings" type="checkbox" checked={priceForm.checkAfterEarnings} onChange={(event) => updatePrice("checkAfterEarnings", event.target.checked)} />決算後に確認する</label>
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-700"><input data-testid="price-check-sharp-drop" type="checkbox" checked={priceForm.checkOnSharpDrop} onChange={(event) => updatePrice("checkOnSharpDrop", event.target.checked)} />急落時に確認する</label>
          <Field label="注意メモ"><textarea data-testid="price-caution-memo" className={inputClassName("min-h-24")} value={priceForm.cautionMemo} onChange={(event) => updatePrice("cautionMemo", event.target.value)} /></Field>
        </div>
        <div className="mt-4 flex justify-end"><Button data-testid="save-price-review" icon={Save} variant="primary" onClick={() => selectedStock && onSavePriceReview(selectedStock.id, priceForm)} disabled={!selectedStock}>確認水準を保存</Button></div>
      </div>
      <MiniTable title="ウォッチリスト一覧" empty={stocks.filter((stock) => stock.watchlist).length === 0}>
        <table className="w-full min-w-[980px] text-sm"><tbody className="divide-y divide-line">{stocks.filter((stock) => stock.watchlist).map((stock) => <tr key={stock.id}><td className="px-4 py-3 font-bold">{stock.ticker}</td><td className="px-4 py-3">{stock.watchlist?.status}</td><td className="px-4 py-3">{stock.watchlist?.priority}</td><td className="px-4 py-3">{stock.watchlist?.nextReviewDate || "-"}</td><td className="px-4 py-3">{stock.watchlist?.nextCheck || "-"}</td></tr>)}</tbody></table>
      </MiniTable>
    </section>
  );
}

function EarningsMemoView({ stocks, initialStockId, onBack, onSave, onDelete }: { stocks: StockProfile[]; initialStockId?: string; onBack: () => void; onSave: (stockId: string, form: EarningsMemoFormState) => void; onDelete: (stockId: string, id: string) => void; }) {
  const [stockId, setStockId] = useState(initialStockId ?? stocks[0]?.id ?? "");
  const [form, setForm] = useState<EarningsMemoFormState>(emptyEarningsMemoForm);
  const selectedStock = stocks.find((stock) => stock.id === stockId);
  const update = (field: keyof EarningsMemoFormState, value: string) => setForm((current) => ({ ...current, [field]: value }));
  return (
    <section className="grid gap-5">
      <ViewHeader title="決算メモ" actions={<Button icon={List} onClick={onBack}>一覧へ</Button>} />
      <div className="rounded-lg border border-line bg-white p-5 shadow-panel">
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="銘柄"><select className={inputClassName()} value={stockId} onChange={(event) => setStockId(event.target.value)}>{stocks.map((stock) => <option key={stock.id} value={stock.id}>{stock.ticker} {stock.companyName}</option>)}</select></Field>
          <Field label="決算発表日"><input data-testid="earnings-memo-date" type="date" className={inputClassName()} value={form.announcementDate} onChange={(event) => update("announcementDate", event.target.value)} /></Field>
          <Field label="対象年度"><input data-testid="earnings-memo-year" className={inputClassName()} value={form.fiscalYear} onChange={(event) => update("fiscalYear", event.target.value)} /></Field>
          <SelectField label="対象四半期" value={form.quarter} options={QUARTERS} onChange={(value) => update("quarter", value)} />
          <SelectField label="売上の印象" value={form.revenueImpression} options={IMPRESSIONS} onChange={(value) => update("revenueImpression", value)} />
          <SelectField label="利益の印象" value={form.profitImpression} options={IMPRESSIONS} onChange={(value) => update("profitImpression", value)} />
          <SelectField label="ガイダンスの印象" value={form.guidanceImpression} options={IMPRESSIONS} onChange={(value) => update("guidanceImpression", value)} />
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Field label="決算で良かった点"><textarea data-testid="earnings-memo-good" className={inputClassName("min-h-24")} value={form.goodPoints} onChange={(event) => update("goodPoints", event.target.value)} /></Field>
          <Field label="決算で悪かった点"><textarea className={inputClassName("min-h-24")} value={form.badPoints} onChange={(event) => update("badPoints", event.target.value)} /></Field>
          <Field label="次回までに確認したい点"><textarea className={inputClassName("min-h-24")} value={form.nextCheckPoints} onChange={(event) => update("nextCheckPoints", event.target.value)} /></Field>
          <Field label="株価反応メモ"><textarea className={inputClassName("min-h-24")} value={form.priceReactionMemo} onChange={(event) => update("priceReactionMemo", event.target.value)} /></Field>
          <Field label="総合メモ"><textarea data-testid="earnings-memo-overall" className={inputClassName("min-h-24")} value={form.overallMemo} onChange={(event) => update("overallMemo", event.target.value)} /></Field>
        </div>
        <div className="mt-4 flex justify-end"><Button data-testid="save-earnings-memo" icon={Save} variant="primary" onClick={() => selectedStock && onSave(selectedStock.id, form)} disabled={!selectedStock}>保存</Button></div>
      </div>
      <MiniTable title="銘柄別の決算メモ一覧" empty={!selectedStock || selectedStock.earningsMemos.length === 0}>
        <table className="w-full min-w-[1100px] text-sm"><tbody className="divide-y divide-line">{selectedStock?.earningsMemos.map((memo) => <tr key={memo.id}><td className="px-4 py-3 font-bold">{memo.announcementDate}</td><td className="px-4 py-3">{memo.fiscalYear} {memo.quarter}</td><td className="px-4 py-3">{memo.overallMemo || "-"}</td><td className="px-4 py-3 text-right"><Button className="h-9 px-2" icon={Pencil} onClick={() => setForm(memo)}>編集</Button><Button className="ml-2 h-9 px-2" icon={Trash2} variant="danger" onClick={() => onDelete(selectedStock.id, memo.id)}>削除</Button></td></tr>)}</tbody></table>
      </MiniTable>
    </section>
  );
}

function RiskView({ stocks, initialStockId, onBack, onSave, onDelete }: { stocks: StockProfile[]; initialStockId?: string; onBack: () => void; onSave: (stockId: string, form: RiskFormState) => void; onDelete: (stockId: string, id: string) => void; }) {
  const [stockId, setStockId] = useState(initialStockId ?? stocks[0]?.id ?? "");
  const [form, setForm] = useState<RiskFormState>(emptyRiskForm);
  const selectedStock = stocks.find((stock) => stock.id === stockId);
  const riskScore = calculateRiskScore(selectedStock?.risks ?? []);
  const update = (field: keyof RiskFormState, value: string) => setForm((current) => ({ ...current, [field]: value }));
  return (
    <section className="grid gap-5">
      <ViewHeader title="リスク管理" actions={<Button icon={List} onClick={onBack}>一覧へ</Button>} />
      <Disclaimer />
      <div className="grid gap-3 md:grid-cols-2"><MetricTile label="リスクスコア" value={`${riskScore}`} /><MetricTile label="リスク判定" value={getRiskScoreLabel(riskScore)} /></div>
      <div className="rounded-lg border border-line bg-white p-5 shadow-panel">
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="銘柄"><select className={inputClassName()} value={stockId} onChange={(event) => setStockId(event.target.value)}>{stocks.map((stock) => <option key={stock.id} value={stock.id}>{stock.ticker} {stock.companyName}</option>)}</select></Field>
          <SelectField label="リスク種類" value={form.category} options={RISK_CATEGORIES} onChange={(value) => update("category", value)} testId="risk-category" />
          <SelectField label="影響度" value={form.impact} options={RISK_IMPACTS} onChange={(value) => update("impact", value)} testId="risk-impact" />
          <SelectField label="発生可能性" value={form.probability} options={RISK_PROBABILITIES} onChange={(value) => update("probability", value)} testId="risk-probability" />
          <Field label="最終確認日"><input data-testid="risk-last-checked" type="date" className={inputClassName()} value={form.lastCheckedDate} onChange={(event) => update("lastCheckedDate", event.target.value)} /></Field>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Field label="リスク内容"><textarea data-testid="risk-content" className={inputClassName("min-h-24")} value={form.content} onChange={(event) => update("content", event.target.value)} /></Field>
          <Field label="確認方法"><textarea data-testid="risk-confirmation" className={inputClassName("min-h-24")} value={form.confirmationMethod} onChange={(event) => update("confirmationMethod", event.target.value)} /></Field>
          <Field label="対応メモ"><textarea data-testid="risk-response" className={inputClassName("min-h-24")} value={form.responseMemo} onChange={(event) => update("responseMemo", event.target.value)} /></Field>
        </div>
        <div className="mt-4 flex justify-end"><Button data-testid="save-risk" icon={Save} variant="primary" onClick={() => selectedStock && onSave(selectedStock.id, form)} disabled={!selectedStock}>保存</Button></div>
      </div>
      <MiniTable title="銘柄別リスク一覧" empty={!selectedStock || selectedStock.risks.length === 0}>
        <table className="w-full min-w-[1200px] text-sm"><tbody className="divide-y divide-line">{selectedStock?.risks.map((risk) => <tr key={risk.id}><td className="px-4 py-3 font-bold">{risk.category}</td><td className="px-4 py-3">{risk.content}</td><td className="px-4 py-3">影響 {risk.impact} / 可能性 {risk.probability} / 点数 {calculateRiskItemScore(risk)}</td><td className="px-4 py-3">{risk.confirmationMethod || "-"}</td><td className="px-4 py-3 text-right"><Button className="h-9 px-2" icon={Pencil} onClick={() => setForm(risk)}>編集</Button><Button className="ml-2 h-9 px-2" icon={Trash2} variant="danger" onClick={() => onDelete(selectedStock.id, risk.id)}>削除</Button></td></tr>)}</tbody></table>
      </MiniTable>
    </section>
  );
}

function ResearchMemoView({ stocks, initialStockId, onBack, onSave, onDelete }: { stocks: StockProfile[]; initialStockId?: string; onBack: () => void; onSave: (stockId: string, form: ResearchMemoFormState) => void; onDelete: (stockId: string, id: string) => void; }) {
  const [stockId, setStockId] = useState(initialStockId ?? stocks[0]?.id ?? "");
  const [form, setForm] = useState<ResearchMemoFormState>(emptyResearchMemoForm);
  const selectedStock = stocks.find((stock) => stock.id === stockId);
  const update = (field: keyof ResearchMemoFormState, value: string) => setForm((current) => ({ ...current, [field]: value }));
  return (
    <section className="grid gap-5">
      <ViewHeader title="調査メモ履歴" actions={<Button icon={List} onClick={onBack}>一覧へ</Button>} />
      <div className="rounded-lg border border-line bg-white p-5 shadow-panel">
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="銘柄"><select className={inputClassName()} value={stockId} onChange={(event) => setStockId(event.target.value)}>{stocks.map((stock) => <option key={stock.id} value={stock.id}>{stock.ticker} {stock.companyName}</option>)}</select></Field>
          <Field label="日付"><input data-testid="research-date" type="date" className={inputClassName()} value={form.date} onChange={(event) => update("date", event.target.value)} /></Field>
          <SelectField label="メモ種別" value={form.type} options={MEMO_TYPES} onChange={(value) => update("type", value)} testId="research-type" />
          <SelectField label="重要度" value={form.importance} options={IMPORTANCES} onChange={(value) => update("importance", value)} testId="research-importance" />
          <Field label="タイトル"><input data-testid="research-title" className={inputClassName()} value={form.title} onChange={(event) => update("title", event.target.value)} /></Field>
        </div>
        <div className="mt-4"><Field label="内容"><textarea data-testid="research-content" className={inputClassName("min-h-32")} value={form.content} onChange={(event) => update("content", event.target.value)} /></Field></div>
        <div className="mt-4 flex justify-end"><Button data-testid="save-research" icon={Save} variant="primary" onClick={() => selectedStock && onSave(selectedStock.id, form)} disabled={!selectedStock}>保存</Button></div>
      </div>
      <MiniTable title="銘柄別メモ一覧" empty={!selectedStock || selectedStock.researchMemos.length === 0}>
        <table className="w-full min-w-[1100px] text-sm"><tbody className="divide-y divide-line">{selectedStock?.researchMemos.map((memo) => <tr key={memo.id}><td className="px-4 py-3 font-bold">{memo.date}</td><td className="px-4 py-3">{memo.type} / {memo.importance}</td><td className="px-4 py-3">{memo.title}</td><td className="px-4 py-3">{memo.content}</td><td className="px-4 py-3 text-right"><Button className="h-9 px-2" icon={Pencil} onClick={() => setForm(memo)}>編集</Button><Button className="ml-2 h-9 px-2" icon={Trash2} variant="danger" onClick={() => onDelete(selectedStock.id, memo.id)}>削除</Button></td></tr>)}</tbody></table>
      </MiniTable>
    </section>
  );
}

function TaskView({
  stocks,
  initialStockId,
  onBack,
  onSave,
  onUpdate,
  onDelete,
}: {
  stocks: StockProfile[];
  initialStockId?: string;
  onBack: () => void;
  onSave: (stockId: string, form: TaskFormState) => void;
  onUpdate: (stockId: string, taskId: string, patch: Partial<Pick<ConfirmationTask, "title" | "dueDate" | "taskType" | "priority" | "status" | "memo">>) => void;
  onDelete: (stockId: string, taskId: string) => void;
}) {
  const defaultStockId = initialStockId ?? stocks[0]?.id ?? "";
  const makeEmptyForm = (stockId = defaultStockId): TaskFormState => ({
    stockId,
    title: "",
    dueDate: todayIsoDate(),
    taskType: "決算確認",
    priority: "中",
    status: "未着手",
    memo: "",
  });
  const [stockId, setStockId] = useState(defaultStockId);
  const [form, setForm] = useState<TaskFormState>(() => makeEmptyForm(defaultStockId));
  const [statusFilter, setStatusFilter] = useState<"すべて" | ConfirmationTaskStatus>("すべて");
  const [priorityFilter, setPriorityFilter] = useState<"すべて" | Importance>("すべて");
  const [typeFilter, setTypeFilter] = useState<"すべて" | ConfirmationTaskType>("すべて");
  const [deadlineFilter, setDeadlineFilter] = useState<"すべて" | "期限切れ" | "今後7日以内">("すべて");
  const [stockFilter, setStockFilter] = useState<"すべて" | string>(initialStockId ?? "すべて");
  const selectedStock = stocks.find((stock) => stock.id === stockId);
  const rows = stocks
    .flatMap((stock) => stock.confirmationTasks.map((task) => ({ stock, task })))
    .filter(({ stock, task }) => stockFilter === "すべて" || stock.id === stockFilter)
    .filter(({ task }) => statusFilter === "すべて" || task.status === statusFilter)
    .filter(({ task }) => priorityFilter === "すべて" || task.priority === priorityFilter)
    .filter(({ task }) => typeFilter === "すべて" || task.taskType === typeFilter)
    .filter(({ task }) => {
      const diff = daysUntil(task.dueDate);
      if (deadlineFilter === "期限切れ") return diff !== null && diff < 0 && task.status !== "完了";
      if (deadlineFilter === "今後7日以内") return diff !== null && diff >= 0 && diff <= 7 && task.status !== "完了";
      return true;
    })
    .sort((a, b) => sortConfirmationTasks([a.task, b.task])[0]?.id === a.task.id ? -1 : 1);
  const updateForm = <K extends keyof TaskFormState>(key: K, value: TaskFormState[K]) => setForm((current) => ({ ...current, [key]: value }));
  const handleStockChange = (value: string) => {
    setStockId(value);
    updateForm("stockId", value);
  };
  const handleSave = () => {
    if (!selectedStock || !form.title.trim()) return;
    onSave(selectedStock.id, form);
    setForm(makeEmptyForm(selectedStock.id));
  };

  return (
    <section className="grid gap-5">
      <ViewHeader title="確認タスク管理" actions={<Button icon={List} onClick={onBack}>一覧へ</Button>} />
      <Disclaimer />
      <div className="rounded-lg border border-line bg-white p-5 shadow-panel">
        <h2 className="text-base font-bold text-ink">タスク作成</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <Field label="銘柄"><select data-testid="task-stock-select" className={inputClassName()} value={stockId} onChange={(event) => handleStockChange(event.target.value)}>{stocks.map((stock) => <option key={stock.id} value={stock.id}>{stock.ticker} {stock.companyName}</option>)}</select></Field>
          <Field label="タイトル"><input data-testid="task-title-input" className={inputClassName()} value={form.title} onChange={(event) => updateForm("title", event.target.value)} /></Field>
          <Field label="期限"><input data-testid="task-due-input" type="date" className={inputClassName()} value={form.dueDate} onChange={(event) => updateForm("dueDate", event.target.value)} /></Field>
          <SelectField label="タスク種別" value={form.taskType} options={TASK_TYPES} onChange={(value) => updateForm("taskType", value)} testId="task-type-input" />
          <SelectField label="優先度" value={form.priority} options={IMPORTANCES} onChange={(value) => updateForm("priority", value)} testId="task-priority-input" />
          <SelectField label="ステータス" value={form.status} options={TASK_STATUSES} onChange={(value) => updateForm("status", value)} testId="task-status-input" />
        </div>
        <div className="mt-4"><Field label="メモ"><textarea data-testid="task-memo-input" className={inputClassName("min-h-24")} value={form.memo} onChange={(event) => updateForm("memo", event.target.value)} /></Field></div>
        <div className="mt-4 flex justify-end"><Button data-testid="save-task" icon={Save} variant="primary" onClick={handleSave} disabled={!selectedStock || !form.title.trim()}>保存</Button></div>
      </div>

      <div className="rounded-lg border border-line bg-white p-5 shadow-panel">
        <h2 className="text-base font-bold text-ink">タスク絞り込み</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-5">
          <Field label="銘柄"><select data-testid="task-stock-filter" className={inputClassName()} value={stockFilter} onChange={(event) => setStockFilter(event.target.value)}><option value="すべて">すべて</option>{stocks.map((stock) => <option key={stock.id} value={stock.id}>{stock.ticker}</option>)}</select></Field>
          <SelectField label="ステータス" value={statusFilter} options={["すべて", ...TASK_STATUSES]} onChange={(value) => setStatusFilter(value)} testId="task-status-filter" />
          <SelectField label="優先度" value={priorityFilter} options={["すべて", ...IMPORTANCES]} onChange={(value) => setPriorityFilter(value)} testId="task-priority-filter" />
          <SelectField label="タスク種別" value={typeFilter} options={["すべて", ...TASK_TYPES]} onChange={(value) => setTypeFilter(value)} testId="task-type-filter" />
          <SelectField label="期限条件" value={deadlineFilter} options={["すべて", "期限切れ", "今後7日以内"]} onChange={(value) => setDeadlineFilter(value)} testId="task-deadline-filter" />
        </div>
      </div>

      <MiniTable title="確認タスク一覧" empty={rows.length === 0}>
        <table data-testid="task-table" className="w-full min-w-[1240px] text-sm">
          <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
            <tr>
              <th className="px-4 py-3">銘柄</th>
              <th className="px-4 py-3">タイトル</th>
              <th className="px-4 py-3">期限</th>
              <th className="px-4 py-3">種別</th>
              <th className="px-4 py-3">優先度</th>
              <th className="px-4 py-3">ステータス</th>
              <th className="px-4 py-3">メモ</th>
              <th className="px-4 py-3 text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map(({ stock, task }) => (
              <tr key={task.id} data-testid="task-row">
                <td className="px-4 py-3 font-bold text-ink">{stock.ticker}</td>
                <td className="px-4 py-3"><input data-testid="task-title-edit" className={inputClassName("min-w-52")} value={task.title} onChange={(event) => onUpdate(stock.id, task.id, { title: event.target.value })} /></td>
                <td className="px-4 py-3"><input data-testid="task-due-edit" type="date" className={inputClassName("min-w-36")} value={task.dueDate} onChange={(event) => onUpdate(stock.id, task.id, { dueDate: event.target.value })} /></td>
                <td className="px-4 py-3"><select data-testid="task-type-edit" className={inputClassName("min-w-32")} value={task.taskType} onChange={(event) => onUpdate(stock.id, task.id, { taskType: event.target.value as ConfirmationTaskType })}>{TASK_TYPES.map((option) => <option key={option} value={option}>{option}</option>)}</select></td>
                <td className="px-4 py-3"><select data-testid="task-priority-edit" className={inputClassName("min-w-24")} value={task.priority} onChange={(event) => onUpdate(stock.id, task.id, { priority: event.target.value as Importance })}>{IMPORTANCES.map((option) => <option key={option} value={option}>{option}</option>)}</select></td>
                <td className="px-4 py-3"><select data-testid="task-status-edit" className={inputClassName("min-w-28")} value={task.status} onChange={(event) => onUpdate(stock.id, task.id, { status: event.target.value as ConfirmationTaskStatus })}>{TASK_STATUSES.map((option) => <option key={option} value={option}>{option}</option>)}</select></td>
                <td className="px-4 py-3"><textarea data-testid="task-memo-edit" className={inputClassName("min-h-16 min-w-64")} value={task.memo} onChange={(event) => onUpdate(stock.id, task.id, { memo: event.target.value })} /></td>
                <td className="px-4 py-3 text-right"><Button data-testid="task-delete" className="h-9 px-2" icon={Trash2} variant="danger" onClick={() => onDelete(stock.id, task.id)}>削除</Button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </MiniTable>
    </section>
  );
}

export function StockAnalysisApp() {
  const [isReady, setIsReady] = useState(false);
  const [stocks, setStocks] = useState<StockProfile[]>([]);
  const [view, setView] = useState<View>({ name: "list" });
  const [sortDirection, setSortDirection] = useState<"desc" | "asc">("desc");
  const [sortKey, setSortKey] = useState<SortKey>("total");
  const [statusFilter, setStatusFilter] = useState<"すべて" | WatchStatus>("すべて");
  const [priorityFilter, setPriorityFilter] = useState<"すべて" | ResearchPriority>("すべて");

  useEffect(() => {
    setStocks(loadStocks());
    setIsReady(true);
  }, []);

  useEffect(() => {
    if (isReady) saveStocks(stocks);
  }, [isReady, stocks]);

  const listRows = useMemo<ListRow[]>(() => {
    const rows = buildListRows(stocks).filter((row) => {
      if (statusFilter !== "すべて" && row.stock.watchlist?.status !== statusFilter) return false;
      if (priorityFilter !== "すべて" && row.stock.watchlist?.priority !== priorityFilter) return false;
      return true;
    });
    const priorityOrder: Record<string, number> = { 高: 3, 中: 2, 低: 1 };
    return rows.sort((a, b) => {
      const getValue = (row: ListRow) => {
        if (sortKey === "trend") return row.trendAnalysis.score;
        if (sortKey === "growth") return row.fundamentalAnalysis.growthScore;
        if (sortKey === "safety") return row.fundamentalAnalysis.financialSafetyScore;
        if (sortKey === "risk") return row.riskScore;
        if (sortKey === "nextReview") return row.stock.watchlist?.nextReviewDate || "9999-12-31";
        if (sortKey === "status") return row.stock.watchlist?.status || "";
        if (sortKey === "priority") return priorityOrder[row.stock.watchlist?.priority || ""] ?? 0;
        return row.fundamentalAnalysis.totalResearchScore;
      };
      const left = getValue(a);
      const right = getValue(b);
      if (typeof left === "number" && typeof right === "number") {
        const diff = sortDirection === "desc" ? right - left : left - right;
        return diff || a.stock.ticker.localeCompare(b.stock.ticker);
      }
      const diff = sortDirection === "desc" ? String(right).localeCompare(String(left)) : String(left).localeCompare(String(right));
      return diff || a.stock.ticker.localeCompare(b.stock.ticker);
    });
  }, [priorityFilter, sortDirection, sortKey, statusFilter, stocks]);

  const updateStock = (stockId: string, updater: (stock: StockProfile) => StockProfile) => {
    setStocks((current) => current.map((stock) => stock.id === stockId ? updater(stock) : stock));
  };

  const handleSubmitStock = (form: StockFormState, stockId?: string) => {
    const now = new Date().toISOString();
    const ticker = normalizeTicker(form.ticker);
    const market = normalizeMarket(form.market, ticker);
    const region = inferMarketRegion(market, ticker);
    const currency = inferCurrency(market, ticker);
    const priceUnit = inferPriceUnit(currency);
    const financialUnit = inferFinancialUnit(currency);
    const dataSource = manualDataSource(now);
    const normalizedForm = {
      ticker,
      companyName: form.companyName.trim(),
      market,
      sector: form.sector.trim(),
      region,
      currency,
      priceUnit,
      financialUnit,
      displayUnit: "raw" as const,
      memo: form.memo.trim(),
    };
    if (stockId) {
      updateStock(stockId, (stock) => ({
        ...stock,
        ...normalizedForm,
        dataSource,
        companyInfo: {
          ...stock.companyInfo,
          stockId,
          ticker,
          companyName: normalizedForm.companyName,
          market,
          sector: normalizedForm.sector,
          region,
          currency,
          priceUnit,
          financialUnit,
          displayUnit: normalizedForm.displayUnit,
          dataSource,
          updatedAt: now,
        },
        updatedAt: now,
      }));
      setView({ name: "detail", stockId });
      return;
    }
    const id = createStockId();
    const newStock: StockProfile = {
      id,
      ...normalizedForm,
      prices: [],
      earnings: [],
      companyInfo: {
        stockId: id,
        ticker,
        companyName: normalizedForm.companyName,
        market,
        sector: normalizedForm.sector,
        region,
        currency,
        priceUnit,
        financialUnit,
        displayUnit: normalizedForm.displayUnit,
        description: "",
        website: "",
        dataSource,
        updatedAt: now,
      },
      dataSource,
      priceDataSource: apiPlannedDataSource(now),
      fundamentalDataSource: apiPlannedDataSource(now),
      priceUpdateHistories: [],
      fundamentalUpdateHistories: [],
      watchlist: null,
      priceReview: { ...emptyPriceReviewForm, dropFromHighPercent: null, updatedAt: now },
      earningsMemos: [],
      risks: [],
      researchMemos: [],
      news: [],
      earningsCalendar: [],
      confirmationTasks: [],
      createdAt: now,
      updatedAt: now,
    };
    setStocks((current) => [...current, newStock]);
    setView({ name: "detail", stockId: newStock.id });
  };

  const handleDeleteStock = (stockId: string) => {
    const stock = stocks.find((item) => item.id === stockId);
    if (!stock) return;
    if (!window.confirm(`${stock.ticker} を削除しますか？`)) return;
    setStocks((current) => current.filter((item) => item.id !== stockId));
  };

  const saveWatch = (stockId: string, form: WatchFormState) => {
    const now = new Date().toISOString();
    updateStock(stockId, (stock) => ({ ...stock, watchlist: { ...form, stockId, createdAt: stock.watchlist?.createdAt ?? now, updatedAt: now }, updatedAt: now }));
  };
  const removeWatch = (stockId: string) => updateStock(stockId, (stock) => ({ ...stock, watchlist: null, updatedAt: new Date().toISOString() }));
  const savePriceReview = (stockId: string, form: PriceReviewFormState) => updateStock(stockId, (stock) => ({ ...stock, priceReview: { ...form, dropFromHighPercent: parseOptionalNumber(form.dropFromHighPercent), updatedAt: new Date().toISOString() }, updatedAt: new Date().toISOString() }));
  const saveEarningsMemo = (stockId: string, form: EarningsMemoFormState) => updateStock(stockId, (stock) => {
    const now = new Date().toISOString();
    const row: EarningsMemo = { ...form, id: form.id ?? createId("earnings-memo"), createdAt: stock.earningsMemos.find((item) => item.id === form.id)?.createdAt ?? now, updatedAt: now };
    return { ...stock, earningsMemos: [row, ...stock.earningsMemos.filter((item) => item.id !== row.id)].sort((a, b) => b.announcementDate.localeCompare(a.announcementDate)), updatedAt: now };
  });
  const deleteEarningsMemo = (stockId: string, id: string) => updateStock(stockId, (stock) => ({ ...stock, earningsMemos: stock.earningsMemos.filter((item) => item.id !== id), updatedAt: new Date().toISOString() }));
  const saveRisk = (stockId: string, form: RiskFormState) => updateStock(stockId, (stock) => {
    const now = new Date().toISOString();
    const row: RiskItem = { ...form, id: form.id ?? createId("risk"), createdAt: stock.risks.find((item) => item.id === form.id)?.createdAt ?? now, updatedAt: now };
    return { ...stock, risks: [row, ...stock.risks.filter((item) => item.id !== row.id)], updatedAt: now };
  });
  const deleteRisk = (stockId: string, id: string) => updateStock(stockId, (stock) => ({ ...stock, risks: stock.risks.filter((item) => item.id !== id), updatedAt: new Date().toISOString() }));
  const saveResearchMemo = (stockId: string, form: ResearchMemoFormState) => updateStock(stockId, (stock) => {
    const now = new Date().toISOString();
    const row: ResearchMemo = { ...form, id: form.id ?? createId("research"), createdAt: stock.researchMemos.find((item) => item.id === form.id)?.createdAt ?? now, updatedAt: now };
    return { ...stock, researchMemos: [row, ...stock.researchMemos.filter((item) => item.id !== row.id)].sort((a, b) => b.date.localeCompare(a.date)), updatedAt: now };
  });
  const deleteResearchMemo = (stockId: string, id: string) => updateStock(stockId, (stock) => ({ ...stock, researchMemos: stock.researchMemos.filter((item) => item.id !== id), updatedAt: new Date().toISOString() }));
  const saveEarnings = (stockId: string, row: EarningsRow) => updateStock(stockId, (stock) => {
    const now = new Date().toISOString();
    const dataSource = manualDataSource(now);
    const rowWithSource: EarningsRow = {
      ...row,
      periodType: row.periodType ?? "annual",
      fiscalQuarter: row.fiscalQuarter ?? "fullYear",
      currency: row.currency ?? stock.currency,
      unit: row.unit ?? stock.financialUnit,
      source: dataSource,
      updatedAt: now,
    };
    const history = createFundamentalUpdateHistory({
      stockId,
      method: "手入力",
      period: "annual",
      fetchedCount: 1,
      success: true,
      dataSource,
      updatedAt: now,
    });
    return {
      ...stock,
      earnings: sortEarningsRows([...stock.earnings.filter((item) => item.fiscalYear !== rowWithSource.fiscalYear), rowWithSource]),
      fundamentalDataSource: dataSource,
      fundamentalUpdateHistories: prependFundamentalUpdateHistory(stock.fundamentalUpdateHistories, history),
      updatedAt: now,
    };
  });
  const importEarnings = (stockId: string, rows: EarningsRow[]) => updateStock(stockId, (stock) => {
    const now = new Date().toISOString();
    const dataSource = csvDataSource(now);
    const rowsWithSource = rows.map((row) => ({
      ...row,
      periodType: row.periodType ?? "annual",
      fiscalQuarter: row.fiscalQuarter ?? "fullYear",
      currency: row.currency ?? stock.currency,
      unit: row.unit ?? stock.financialUnit,
      source: dataSource,
      updatedAt: now,
    }));
    const history = createFundamentalUpdateHistory({
      stockId,
      method: "CSV",
      period: "annual",
      fetchedCount: rowsWithSource.length,
      success: true,
      dataSource,
      updatedAt: now,
    });
    return {
      ...stock,
      earnings: sortEarningsRows(rowsWithSource),
      fundamentalDataSource: dataSource,
      fundamentalUpdateHistories: prependFundamentalUpdateHistory(stock.fundamentalUpdateHistories, history),
      updatedAt: now,
    };
  });
  const importPrices = (stockId: string, rows: PriceRow[]) => updateStock(stockId, (stock) => {
    const now = new Date().toISOString();
    const dataSource = csvDataSource(now);
    const rowsWithSource = rows.map((row) => ({ ...row, source: dataSource, updatedAt: now }));
    const history = createStockPriceUpdateHistory({
      stockId,
      method: "CSV",
      period: "all",
      fetchedCount: rowsWithSource.length,
      success: true,
      dataSource,
      updatedAt: now,
    });
    return {
      ...stock,
      prices: rowsWithSource,
      priceDataSource: dataSource,
      priceUpdateHistories: prependStockPriceUpdateHistory(stock.priceUpdateHistories, history),
      updatedAt: now,
    };
  });

  const clearPriceData = (stockId: string) => updateStock(stockId, (stock) => {
    const now = new Date().toISOString();
    return {
      ...stock,
      prices: [],
      priceDataSource: apiPlannedDataSource(now),
      updatedAt: now,
    };
  });

  const clearEarningsData = (stockId: string) => updateStock(stockId, (stock) => {
    const now = new Date().toISOString();
    return {
      ...stock,
      earnings: [],
      fundamentalDataSource: apiPlannedDataSource(now),
      updatedAt: now,
    };
  });

  const updatePricesFromApi = async (stockId: string, period: StockPriceFetchPeriod): Promise<StockPriceUpdateResult> => {
    const stock = stocks.find((item) => item.id === stockId);
    if (!stock) {
      throw new Error("Stock not found");
    }

    const settings = loadStockPriceApiSettings();
    const result = await updateStockPricesFromApi(stock, settings, period);
    setStocks((current) => current.map((item) => item.id === stockId ? result.stock : item));
    return result;
  };

  const updateFundamentalsFromApiForStock = async (stockId: string, period: FundamentalFetchPeriod): Promise<FundamentalUpdateResult> => {
    const stock = stocks.find((item) => item.id === stockId);
    if (!stock) {
      throw new Error("Stock not found");
    }

    const settings = loadFundamentalApiSettings();
    const result = await updateFundamentalsFromApi(stock, settings, period);
    setStocks((current) => current.map((item) => item.id === stockId ? result.stock : item));
    return result;
  };

  const updateNewsFromMockForStock = async (stockId: string): Promise<NewsUpdateResult> => {
    const stock = stocks.find((item) => item.id === stockId);
    if (!stock) {
      throw new Error("Stock not found");
    }

    const result = await updateNewsFromMockApi(stock);
    setStocks((current) => current.map((item) => item.id === stockId ? result.stock : item));
    return result;
  };

  const addNews = (stockId: string, form: NewsFormState) => updateStock(stockId, (stock) => {
    const now = new Date().toISOString();
    const dataSource = manualDataSource(now);
    const news: NewsItem = {
      id: createId("news"),
      stockId,
      ticker: stock.ticker,
      companyName: stock.companyName,
      date: form.date,
      title: form.title.trim(),
      url: form.url.trim(),
      mediaName: form.mediaName.trim(),
      summary: form.summary.trim(),
      category: form.category,
      relatedStockIds: [stockId],
      importance: form.importance,
      sentiment: form.sentiment,
      source: "手入力",
      fetchedAt: now,
      userMemo: form.userMemo.trim(),
      checked: form.checked,
      dataSource,
      createdAt: now,
      updatedAt: now,
    };
    const merged = mergeNewsItems(stock.news, [news]);
    return { ...stock, news: merged.items, updatedAt: now };
  });

  const updateNews = (stockId: string, newsId: string, patch: Pick<NewsItem, "importance" | "sentiment" | "userMemo" | "checked">) => updateStock(stockId, (stock) => {
    const now = new Date().toISOString();
    return {
      ...stock,
      news: stock.news.map((item) => item.id === newsId ? { ...item, ...patch, updatedAt: now } : item),
      updatedAt: now,
    };
  });

  const deleteNews = (stockId: string, newsId: string) => updateStock(stockId, (stock) => ({
    ...stock,
    news: stock.news.filter((item) => item.id !== newsId),
    updatedAt: new Date().toISOString(),
  }));

  const updateEarningsCalendarFromMockForStock = async (stockId: string): Promise<EarningsCalendarUpdateResult> => {
    const stock = stocks.find((item) => item.id === stockId);
    if (!stock) {
      throw new Error("Stock not found");
    }

    const result = await updateEarningsCalendarFromMockApi(stock);
    setStocks((current) => current.map((item) => item.id === stockId ? result.stock : item));
    return result;
  };

  const addEarningsCalendar = (stockId: string, form: EarningsCalendarFormState) => updateStock(stockId, (stock) => {
    const now = new Date().toISOString();
    const dataSource = manualDataSource(now);
    const item: EarningsCalendarItem = {
      id: createId("earnings-calendar"),
      stockId,
      ticker: stock.ticker,
      companyName: stock.companyName,
      earningsDate: form.earningsDate,
      scheduledDate: form.earningsDate,
      fiscalYear: form.fiscalYear.trim(),
      fiscalQuarter: form.fiscalQuarter,
      quarter: form.fiscalQuarter,
      status: form.status,
      source: "手入力",
      memo: form.memo.trim(),
      dataSource,
      createdAt: now,
      updatedAt: now,
    };
    const merged = mergeEarningsCalendarItems(stock.earningsCalendar, [item]);
    return { ...stock, earningsCalendar: merged.items, updatedAt: now };
  });

  const updateEarningsCalendar = (stockId: string, calendarId: string, patch: Pick<EarningsCalendarItem, "status" | "memo">) => updateStock(stockId, (stock) => {
    const now = new Date().toISOString();
    return {
      ...stock,
      earningsCalendar: stock.earningsCalendar.map((item) => item.id === calendarId ? { ...item, ...patch, updatedAt: now } : item),
      updatedAt: now,
    };
  });

  const deleteEarningsCalendar = (stockId: string, calendarId: string) => updateStock(stockId, (stock) => ({
    ...stock,
    earningsCalendar: stock.earningsCalendar.filter((item) => item.id !== calendarId),
    updatedAt: new Date().toISOString(),
  }));

  const saveTask = (stockId: string, form: TaskFormState) => updateStock(stockId, (stock) => {
    const now = new Date().toISOString();
    const existing = form.id ? stock.confirmationTasks.find((item) => item.id === form.id) : undefined;
    const task: ConfirmationTask = {
      id: form.id ?? createId("task"),
      stockId,
      ticker: stock.ticker,
      companyName: stock.companyName,
      title: form.title.trim(),
      dueDate: form.dueDate,
      taskType: form.taskType,
      priority: form.priority,
      status: form.status,
      memo: form.memo.trim(),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    return {
      ...stock,
      confirmationTasks: sortConfirmationTasks([task, ...stock.confirmationTasks.filter((item) => item.id !== task.id)]),
      updatedAt: now,
    };
  });

  const updateTask = (stockId: string, taskId: string, patch: Partial<Pick<ConfirmationTask, "title" | "dueDate" | "taskType" | "priority" | "status" | "memo">>) => updateStock(stockId, (stock) => {
    const now = new Date().toISOString();
    return {
      ...stock,
      confirmationTasks: sortConfirmationTasks(stock.confirmationTasks.map((item) => item.id === taskId ? { ...item, ...patch, updatedAt: now } : item)),
      updatedAt: now,
    };
  });

  const deleteTask = (stockId: string, taskId: string) => updateStock(stockId, (stock) => ({
    ...stock,
    confirmationTasks: stock.confirmationTasks.filter((item) => item.id !== taskId),
    updatedAt: new Date().toISOString(),
  }));

  const createTaskForCalendar = (stockId: string, calendarId: string, mode: "before" | "after") => updateStock(stockId, (stock) => {
    const item = stock.earningsCalendar.find((calendar) => calendar.id === calendarId);
    if (!item) return stock;
    const task = createTaskFromEarningsCalendar(stock, item, mode);
    return {
      ...stock,
      confirmationTasks: sortConfirmationTasks([task, ...stock.confirmationTasks]),
      updatedAt: new Date().toISOString(),
    };
  });

  const selectedStock = "stockId" in view && view.stockId ? stocks.find((stock) => stock.id === view.stockId) : undefined;
  let content: React.ReactNode;
  if (!isReady) content = <div className="grid min-h-96 place-items-center text-sm font-semibold text-slate-500">読み込み中</div>;
  else if (view.name === "settings") content = <SettingsView onBack={() => setView({ name: "list" })} />;
  else if (view.name === "aiHistory") content = <AiHistoryView stocks={stocks} onBack={() => setView({ name: "list" })} />;
  else if (view.name === "edit") content = <FormView stock={selectedStock} onCancel={() => setView(selectedStock ? { name: "detail", stockId: selectedStock.id } : { name: "list" })} onSubmit={handleSubmitStock} />;
  else if (view.name === "detail" && selectedStock) {
    const trendAnalysis = calculateTrendAnalysis(selectedStock.prices);
    content = <StockDetailView stock={selectedStock} trendAnalysis={trendAnalysis} fundamentalAnalysis={calculateFundamentalAnalysis(selectedStock.earnings, trendAnalysis.score)} riskScore={calculateRiskScore(selectedStock.risks)} onBack={() => setView({ name: "list" })} onEdit={() => setView({ name: "edit", stockId: selectedStock.id })} onPriceImport={() => setView({ name: "priceImport", stockId: selectedStock.id })} onEarnings={() => setView({ name: "earnings", stockId: selectedStock.id })} onWatch={() => setView({ name: "watch", stockId: selectedStock.id })} onEarningsMemo={() => setView({ name: "earningsMemo", stockId: selectedStock.id })} onRisk={() => setView({ name: "risk", stockId: selectedStock.id })} onResearchMemo={() => setView({ name: "researchMemo", stockId: selectedStock.id })} onTasks={() => setView({ name: "tasks", stockId: selectedStock.id })} onDeleteStock={() => handleDeleteStock(selectedStock.id)} onStockPriceUpdate={(period) => updatePricesFromApi(selectedStock.id, period)} onFundamentalUpdate={(period) => updateFundamentalsFromApiForStock(selectedStock.id, period)} onNewsUpdate={() => updateNewsFromMockForStock(selectedStock.id)} onAddNews={(form) => addNews(selectedStock.id, form)} onUpdateNews={(newsId, patch) => updateNews(selectedStock.id, newsId, patch)} onDeleteNews={(newsId) => deleteNews(selectedStock.id, newsId)} onEarningsCalendarUpdate={() => updateEarningsCalendarFromMockForStock(selectedStock.id)} onAddEarningsCalendar={(form) => addEarningsCalendar(selectedStock.id, form)} onUpdateEarningsCalendar={(calendarId, patch) => updateEarningsCalendar(selectedStock.id, calendarId, patch)} onDeleteEarningsCalendar={(calendarId) => deleteEarningsCalendar(selectedStock.id, calendarId)} onCreateTaskFromCalendar={(calendarId, mode) => createTaskForCalendar(selectedStock.id, calendarId, mode)} onUpdateTask={(taskId, patch) => updateTask(selectedStock.id, taskId, patch)} onDeleteTask={(taskId) => deleteTask(selectedStock.id, taskId)} onClearPrices={() => clearPriceData(selectedStock.id)} onClearEarnings={() => clearEarningsData(selectedStock.id)} />;
  } else if (view.name === "priceImport") content = stocks.length === 0 ? <FormView onCancel={() => setView({ name: "list" })} onSubmit={handleSubmitStock} /> : <PriceCsvImportView stocks={stocks} initialStockId={selectedStock?.id ?? stocks[0]?.id} onBack={() => setView({ name: "list" })} onImported={importPrices} />;
  else if (view.name === "earnings") content = stocks.length === 0 ? <FormView onCancel={() => setView({ name: "list" })} onSubmit={handleSubmitStock} /> : <EarningsCsvImportView stocks={stocks} initialStockId={selectedStock?.id ?? stocks[0]?.id} onBack={() => setView({ name: "list" })} onSaved={saveEarnings} onImported={importEarnings} />;
  else if (view.name === "watch") content = stocks.length === 0 ? <FormView onCancel={() => setView({ name: "list" })} onSubmit={handleSubmitStock} /> : <WatchView stocks={stocks} initialStockId={selectedStock?.id ?? stocks[0]?.id} onBack={() => setView({ name: "list" })} onSaveWatch={saveWatch} onRemoveWatch={removeWatch} onSavePriceReview={savePriceReview} />;
  else if (view.name === "earningsMemo") content = stocks.length === 0 ? <FormView onCancel={() => setView({ name: "list" })} onSubmit={handleSubmitStock} /> : <EarningsMemoView stocks={stocks} initialStockId={selectedStock?.id ?? stocks[0]?.id} onBack={() => setView({ name: "list" })} onSave={saveEarningsMemo} onDelete={deleteEarningsMemo} />;
  else if (view.name === "risk") content = stocks.length === 0 ? <FormView onCancel={() => setView({ name: "list" })} onSubmit={handleSubmitStock} /> : <RiskView stocks={stocks} initialStockId={selectedStock?.id ?? stocks[0]?.id} onBack={() => setView({ name: "list" })} onSave={saveRisk} onDelete={deleteRisk} />;
  else if (view.name === "researchMemo") content = stocks.length === 0 ? <FormView onCancel={() => setView({ name: "list" })} onSubmit={handleSubmitStock} /> : <ResearchMemoView stocks={stocks} initialStockId={selectedStock?.id ?? stocks[0]?.id} onBack={() => setView({ name: "list" })} onSave={saveResearchMemo} onDelete={deleteResearchMemo} />;
  else if (view.name === "tasks") content = stocks.length === 0 ? <FormView onCancel={() => setView({ name: "list" })} onSubmit={handleSubmitStock} /> : <TaskView stocks={stocks} initialStockId={selectedStock?.id ?? view.stockId ?? stocks[0]?.id} onBack={() => setView({ name: "list" })} onSave={saveTask} onUpdate={updateTask} onDelete={deleteTask} />;
  else content = <StockListView rows={listRows} sortDirection={sortDirection} sortKey={sortKey} statusFilter={statusFilter} priorityFilter={priorityFilter} onToggleSort={() => setSortDirection((current) => current === "desc" ? "asc" : "desc")} onSetSortKey={setSortKey} onSetStatusFilter={setStatusFilter} onSetPriorityFilter={setPriorityFilter} onCreate={() => setView({ name: "edit" })} onEdit={(stockId) => setView({ name: "edit", stockId })} onDetail={(stockId) => setView({ name: "detail", stockId })} onPriceImport={(stockId) => setView({ name: "priceImport", stockId })} onEarnings={(stockId) => setView({ name: "earnings", stockId })} onWatch={(stockId) => setView({ name: "watch", stockId })} onEarningsMemo={(stockId) => setView({ name: "earningsMemo", stockId })} onRisk={(stockId) => setView({ name: "risk", stockId })} onResearchMemo={(stockId) => setView({ name: "researchMemo", stockId })} onTasks={(stockId) => setView({ name: "tasks", stockId })} onAiHistory={() => setView({ name: "aiHistory" })} onSettings={() => setView({ name: "settings" })} onDelete={handleDeleteStock} />;
  return <AppShell>{content}</AppShell>;
}
