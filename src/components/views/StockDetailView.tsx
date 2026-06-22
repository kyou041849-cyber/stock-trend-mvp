"use client";

import { useEffect, useMemo, useState } from "react";
import type React from "react";
import type { LucideIcon } from "lucide-react";
import { CheckCircle2, Info, List, Pencil, Plus, RefreshCw, ShieldCheck, Trash2, Upload, XCircle } from "lucide-react";
import { AiAnalysisSection, LlmContextPreview } from "@/components/ai/AiAnalysisSection";
import { ActionButton as DsActionButton, CollapsibleSection, FormField, InfoAlert, MetricCard, PageHeader, SectionCard, StatusBadge, inputClassName as dsInputClassName, type UiTone } from "@/components/ui/design-system";
import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { apiNotImplementedMessage, apiPlannedDataSource, formatDataSource, formatDataSourceDate } from "@/lib/dataSource";
import { daysUntil, todayIsoDate } from "@/lib/date-utils";
import { formatInteger, formatNumber, formatPercent } from "@/lib/format";
import { buildStockResearchContext } from "@/lib/llmContext";
import { calculateRiskItemScore } from "@/lib/risk-math";
import { loadCsvImportHistories, type CsvImportHistoryItem } from "@/lib/csvImportHistory";
import { formatFundamentalPeriod, formatStockPricePeriod } from "@/lib/updateHistory";
import { getCompanyInfoData } from "@/services/companyInfoService";
import { getEarningsCalendarData, type EarningsCalendarUpdateResult } from "@/services/earningsCalendarService";
import { getFundamentalData } from "@/services/fundamentalService";
import type { FundamentalUpdateResult } from "@/services/fundamentalUpdateService";
import { getNewsData, type NewsUpdateResult } from "@/services/newsService";
import { getStockPriceData } from "@/services/stockPriceService";
import type { StockPriceUpdateResult } from "@/services/stockPriceUpdateService";
import { sortConfirmationTasks } from "@/services/taskService";
import type { ChartPoint, CompanyInfo, ConfirmationTask, ConfirmationTaskStatus, ConfirmationTaskType, DataSourceInfo, EarningsCalendarItem, FundamentalAnalysis, FundamentalFetchPeriod, FundamentalComputedRow, FundamentalUpdateHistory, Importance, Impression, NewsCategory, NewsItem, NewsSentiment, Quarter, ResearchMemoType, RiskCategory, RiskImpact, RiskProbability, ScoreSignal, StockPriceFetchPeriod, StockPriceUpdateHistory, StockProfile, TrendAnalysis, TrendSignal, ValuationWarning } from "@/lib/types";

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

function signalStatus(signal: Pick<TrendSignal | ScoreSignal, "passed">) {
  if (signal.passed === null) return { label: "データ不足", className: "bg-slate-100 text-slate-600", icon: Info };
  if (signal.passed) return { label: "該当", className: "bg-teal-50 text-teal-800", icon: CheckCircle2 };
  return { label: "非該当", className: "bg-rose-50 text-rose-800", icon: XCircle };
}

function createId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
function ViewHeader({ title, actions }: { title: string; actions?: React.ReactNode }) {
  return <PageHeader title={title} actions={actions} />;
}

function Disclaimer() {
  return (
    <InfoAlert tone="warning">
      <p>このアプリは調査補助ツールです。スコアやAI分析は機械的な表示であり、投資判断ではありません。APIキーはlocalStorageや利用ログに保存しません。</p>
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

function MetricTile({ label, value }: { label: string; value: string }) {
  return <MetricCard label={label} value={value} />;
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
function priceTooltipFormatter(value: unknown, name: unknown) {
  const numericValue = typeof value === "number" ? value : Number(value);
  const label = String(name);
  if (label === "出来高") return [formatInteger(numericValue), label];
  return [formatNumber(numericValue), label];
}

function PriceChart({ data }: { data: ChartPoint[] }) {
  if (data.length === 0) {
    return <div className="grid h-[420px] place-items-center rounded-lg border border-line bg-white text-sm font-semibold text-slate-500">CSVデータなし</div>;
  }
  return (
    <div data-testid="price-chart" className="h-[420px] rounded-lg border border-line bg-white p-3">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 12, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="#e5eaf0" strokeDasharray="3 3" />
          <XAxis dataKey="date" minTickGap={32} tick={{ fill: "#64748b", fontSize: 12 }} tickLine={false} />
          <YAxis yAxisId="price" domain={["auto", "auto"]} tick={{ fill: "#64748b", fontSize: 12 }} tickLine={false} width={64} />
          <YAxis yAxisId="volume" orientation="right" hide domain={[0, "auto"]} />
          <Tooltip formatter={priceTooltipFormatter} labelStyle={{ color: "#17202a", fontWeight: 700 }} />
          <Legend verticalAlign="top" height={36} />
          <Bar yAxisId="volume" dataKey="volume" name="出来高" fill="#94a3b8" opacity={0.28} barSize={4} />
          <Line yAxisId="price" type="monotone" dataKey="close" name="終値" stroke="#0f766e" strokeWidth={2.4} dot={false} />
          <Line yAxisId="price" type="monotone" dataKey="ma25" name="25日MA" stroke="#2563eb" strokeWidth={1.8} dot={false} connectNulls />
          <Line yAxisId="price" type="monotone" dataKey="ma75" name="75日MA" stroke="#b7791f" strokeWidth={1.8} dot={false} connectNulls />
          <Line yAxisId="price" type="monotone" dataKey="ma200" name="200日MA" stroke="#be123c" strokeWidth={1.8} dot={false} connectNulls />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

function fundamentalTooltipFormatter(value: unknown, name: unknown) {
  const numericValue = typeof value === "number" ? value : Number(value);
  const label = String(name);
  const percentLabels = ["営業利益率", "純利益率", "ROE", "ROIC", "自己資本比率"];
  return [percentLabels.includes(label) ? formatPercent(numericValue) : formatNumber(numericValue), label];
}

function FundamentalChart({
  title,
  data,
  lines,
}: {
  title: string;
  data: FundamentalComputedRow[];
  lines: Array<{ key: keyof FundamentalComputedRow; name: string; stroke: string }>;
}) {
  if (data.length === 0) return <div className="grid h-72 place-items-center rounded-lg border border-line bg-white text-sm font-semibold text-slate-500">業績データなし</div>;
  return (
    <div className="rounded-lg border border-line bg-white p-3">
      <h3 className="px-1 pb-2 text-sm font-bold text-ink">{title}</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="#e5eaf0" strokeDasharray="3 3" />
            <XAxis dataKey="fiscalYear" tick={{ fill: "#64748b", fontSize: 12 }} tickLine={false} />
            <YAxis domain={["auto", "auto"]} tick={{ fill: "#64748b", fontSize: 12 }} tickLine={false} width={72} />
            <Tooltip formatter={fundamentalTooltipFormatter} labelStyle={{ color: "#17202a", fontWeight: 700 }} />
            <Legend verticalAlign="top" height={30} />
            {lines.map((line) => (
              <Line key={String(line.key)} type="monotone" dataKey={String(line.key)} name={line.name} stroke={line.stroke} strokeWidth={2} dot={{ r: 2 }} connectNulls />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function SignalTable({ title, signals }: { title: string; signals: Array<TrendSignal | ScoreSignal> }) {
  return (
    <div className="overflow-hidden rounded-lg border border-line bg-white">
      <div className="border-b border-line px-4 py-3"><h2 className="text-base font-bold text-ink">{title}</h2></div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[680px] border-collapse text-sm">
          <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
            <tr><th className="px-4 py-3">判定項目</th><th className="px-4 py-3">状態</th><th className="px-4 py-3 text-right">加点</th></tr>
          </thead>
          <tbody className="divide-y divide-line">
            {signals.map((signal) => {
              const status = signalStatus(signal);
              const Icon = status.icon;
              return (
                <tr key={signal.key}>
                  <td className="px-4 py-3 font-semibold text-slate-700">{signal.label}</td>
                  <td className="px-4 py-3"><span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${status.className}`}><Icon aria-hidden className="h-3.5 w-3.5" />{status.label}</span></td>
                  <td className="px-4 py-3 text-right font-bold text-ink">{signal.passed ? `+${signal.points}` : "0"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ValuationWarnings({ warnings }: { warnings: ValuationWarning[] }) {
  return (
    <div className="rounded-lg border border-line bg-white p-4">
      <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">バリュエーション注意</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {warnings.map((warning) => (
          <span key={warning.key} className={`rounded-full px-3 py-1 text-sm font-bold ${warning.status === "warning" ? "bg-amber-100 text-amber-950" : warning.status === "missing" ? "bg-slate-100 text-slate-600" : "bg-teal-50 text-teal-800"}`}>
            {warning.label}
          </span>
        ))}
      </div>
      <p className="mt-3 text-sm font-medium text-slate-600">PER、PBR、PSRに基づく機械的な目安であり、投資判断ではありません。</p>
    </div>
  );
}

function EarningsTable({ rows }: { rows: FundamentalComputedRow[] }) {
  return (
    <div className="overflow-hidden rounded-lg border border-line bg-white">
      <div className="border-b border-line px-4 py-3"><h2 className="text-base font-bold text-ink">年度別業績テーブル</h2></div>
      {rows.length === 0 ? (
        <div className="grid min-h-32 place-items-center p-6 text-sm font-semibold text-slate-500">業績データなし</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1900px] border-collapse text-sm">
            <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
              <tr>
                {["年度", "売上高", "売上成長率", "営業利益", "営業利益成長率", "営業利益率", "純利益", "純利益率", "EPS", "EPS成長率", "営業CF", "FCF", "FCF前年比", "自己資本比率", "ROE", "ROIC", "時価総額", "PER", "PBR", "PSR", "メモ"].map((heading, index) => (
                  <th key={heading} className={`px-4 py-3 ${index > 0 && index < 20 ? "text-right" : ""}`}>{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="px-4 py-3 font-bold text-ink">{row.fiscalYear}</td>
                  <td className="px-4 py-3 text-right">{formatInteger(row.revenue)}</td>
                  <td className="px-4 py-3 text-right">{formatPercent(row.revenueGrowthPercent)}</td>
                  <td className="px-4 py-3 text-right">{formatInteger(row.operatingIncome)}</td>
                  <td className="px-4 py-3 text-right">{formatPercent(row.operatingIncomeGrowthPercent)}</td>
                  <td className="px-4 py-3 text-right">{formatPercent(row.operatingMarginPercent)}</td>
                  <td className="px-4 py-3 text-right">{formatInteger(row.netIncome)}</td>
                  <td className="px-4 py-3 text-right">{formatPercent(row.netMarginPercent)}</td>
                  <td className="px-4 py-3 text-right">{formatNumber(row.eps)}</td>
                  <td className="px-4 py-3 text-right">{formatPercent(row.epsGrowthPercent)}</td>
                  <td className="px-4 py-3 text-right">{formatInteger(row.operatingCashFlow)}</td>
                  <td className="px-4 py-3 text-right">{formatInteger(row.freeCashFlow)}</td>
                  <td className="px-4 py-3 text-right">{formatPercent(row.freeCashFlowGrowthPercent)}</td>
                  <td className="px-4 py-3 text-right">{formatPercent(row.equityRatio)}</td>
                  <td className="px-4 py-3 text-right">{formatPercent(row.roe)}</td>
                  <td className="px-4 py-3 text-right">{formatPercent(row.roic)}</td>
                  <td className="px-4 py-3 text-right">{formatInteger(row.marketCap)}</td>
                  <td className="px-4 py-3 text-right">{formatNumber(row.per)}</td>
                  <td className="px-4 py-3 text-right">{formatNumber(row.pbr)}</td>
                  <td className="px-4 py-3 text-right">{formatNumber(row.psr)}</td>
                  <td className="px-4 py-3 text-slate-700">{row.memo || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function MiniTable({
  title,
  empty,
  children,
}: {
  title: string;
  empty: boolean;
  children: React.ReactNode;
}) {
  return (
    <SectionCard title={title} className="overflow-hidden" contentClassName="overflow-x-auto">
      {empty ? <div className="p-5 text-sm font-semibold text-slate-500">データ不足</div> : <div className="overflow-x-auto">{children}</div>}
    </SectionCard>
  );
}

function DetailDisclosure({
  title,
  description,
  children,
  defaultOpen = false,
  testId,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  testId?: string;
}) {
  return (
    <CollapsibleSection title={title} description={description} defaultOpen={defaultOpen} testId={testId}>
      {children}
    </CollapsibleSection>
  );
}

function latestDate(values: Array<string | undefined | null>): string {
  const dates = values.filter((value): value is string => Boolean(value));
  if (dates.length === 0) return "-";
  return dates.sort((a, b) => b.localeCompare(a))[0] || "-";
}

function taskIsIncomplete(task: ConfirmationTask): boolean {
  return task.status !== "完了";
}

function taskIsOverdue(task: ConfirmationTask): boolean {
  const diff = daysUntil(task.dueDate);
  return taskIsIncomplete(task) && diff !== null && diff < 0;
}

function riskReviewStatus(risk: StockProfile["risks"][number]): "確認済み" | "未確認" {
  return risk.lastCheckedDate ? "確認済み" : "未確認";
}

function riskTone(score: number): UiTone {
  if (score >= 9) return "danger";
  if (score >= 6) return "warning";
  return "neutral";
}

function CompanyInfoPanel({ companyInfo }: { companyInfo: CompanyInfo }) {
  return (
    <section className="rounded-lg border border-line bg-white p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-base font-bold text-ink">企業概要</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">{companyInfo.description || "企業概要データはまだありません。"}</p>
        </div>
        <DataSourceBadge source={companyInfo.dataSource} testId="company-source" />
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-5">
        <MetricTile label="市場" value={companyInfo.market || "-"} />
        <MetricTile label="地域" value={companyInfo.region} />
        <MetricTile label="通貨" value={companyInfo.currency} />
        <MetricTile label="株価単位" value={companyInfo.priceUnit} />
        <MetricTile label="財務単位" value={companyInfo.financialUnit} />
      </div>
    </section>
  );
}

function NewsSection({
  stock,
  items,
  onAdd,
  onUpdate,
  onDelete,
}: {
  stock: StockProfile;
  items: NewsItem[];
  onAdd: (form: NewsFormState) => void;
  onUpdate: (newsId: string, patch: Pick<NewsItem, "importance" | "sentiment" | "userMemo" | "checked">) => void;
  onDelete: (newsId: string) => void;
}) {
  const [form, setForm] = useState<NewsFormState>(emptyNewsForm);
  const [error, setError] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [expandedNewsId, setExpandedNewsId] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<"すべて" | NewsCategory>("すべて");
  const [importanceFilter, setImportanceFilter] = useState<"すべて" | Importance>("すべて");
  const [sentimentFilter, setSentimentFilter] = useState<"すべて" | NewsSentiment>("すべて");
  const [checkedFilter, setCheckedFilter] = useState<"すべて" | "確認済み" | "未確認">("すべて");
  const updateForm = <K extends keyof NewsFormState,>(key: K, value: NewsFormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };
  const filteredItems = items.filter((item) => {
    if (categoryFilter !== "すべて" && item.category !== categoryFilter) return false;
    if (importanceFilter !== "すべて" && item.importance !== importanceFilter) return false;
    if (sentimentFilter !== "すべて" && item.sentiment !== sentimentFilter) return false;
    if (checkedFilter === "確認済み" && !item.checked) return false;
    if (checkedFilter === "未確認" && item.checked) return false;
    return true;
  });
  const handleAdd = () => {
    if (!form.date || !form.title.trim()) {
      setError("日付とタイトルを入力してください。");
      return;
    }

    setError("");
    onAdd(form);
    setForm(emptyNewsForm);
    setIsAddOpen(false);
  };
  const uncheckedCount = items.filter((item) => !item.checked).length;
  const importantCount = items.filter((item) => item.importance === "高").length;
  const negativeCount = items.filter((item) => item.sentiment === "ネガティブ").length;
  const newestDate = latestDate(items.map((item) => item.date));

  return (
    <SectionCard
      title="ニュース・材料メモ"
      description={`${stock.ticker} のニュース確認状況です。詳細と編集は必要な項目だけ開きます。`}
      actions={items[0] ? <DataSourceBadge source={items[0].dataSource} testId="news-source" /> : <DataSourceBadge source={apiPlannedDataSource()} testId="news-source" />}
    >
      <div data-testid="detail-news-summary" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="未確認ニュース" value={`${uncheckedCount}`} tone={uncheckedCount > 0 ? "warning" : "success"} />
        <MetricCard label="重要ニュース" value={`${importantCount}`} tone={importantCount > 0 ? "warning" : "neutral"} />
        <MetricCard label="ネガティブ材料" value={`${negativeCount}`} tone={negativeCount > 0 ? "danger" : "neutral"} />
        <MetricCard label="最新ニュース日" value={newestDate} />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button data-testid="toggle-news-add-form" icon={Plus} variant={isAddOpen ? "secondary" : "primary"} onClick={() => setIsAddOpen((current) => !current)}>
          {isAddOpen ? "ニュース入力を閉じる" : "ニュースを手入力"}
        </Button>
      </div>

      {isAddOpen ? (
        <div className="mt-4 rounded-lg border border-line bg-slate-50 p-4">
          <h3 className="text-sm font-bold text-ink">ニュース手入力</h3>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <Field label="日付"><input data-testid="news-date-input" type="date" className={inputClassName()} value={form.date} onChange={(event) => updateForm("date", event.target.value)} /></Field>
            <Field label="タイトル"><input data-testid="news-title-input" className={inputClassName()} value={form.title} onChange={(event) => updateForm("title", event.target.value)} /></Field>
            <Field label="URL"><input data-testid="news-url-input" className={inputClassName()} value={form.url} onChange={(event) => updateForm("url", event.target.value)} /></Field>
            <Field label="メディア名"><input data-testid="news-media-input" className={inputClassName()} value={form.mediaName} onChange={(event) => updateForm("mediaName", event.target.value)} /></Field>
            <SelectField label="カテゴリ" value={form.category} options={NEWS_CATEGORIES} onChange={(value) => updateForm("category", value)} testId="news-category-input" />
            <SelectField label="重要度" value={form.importance} options={IMPORTANCES} onChange={(value) => updateForm("importance", value)} testId="news-importance-input" />
            <SelectField label="材料分類" value={form.sentiment} options={NEWS_SENTIMENTS} onChange={(value) => updateForm("sentiment", value)} testId="news-sentiment-input" />
            <label className="flex items-center gap-2 pt-7 text-sm font-bold text-slate-700"><input data-testid="news-checked-input" type="checkbox" checked={form.checked} onChange={(event) => updateForm("checked", event.target.checked)} />確認済み</label>
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <Field label="要約"><textarea data-testid="news-summary-input" className={inputClassName("min-h-24")} value={form.summary} onChange={(event) => updateForm("summary", event.target.value)} /></Field>
            <Field label="ユーザーメモ"><textarea data-testid="news-user-memo-input" className={inputClassName("min-h-24")} value={form.userMemo} onChange={(event) => updateForm("userMemo", event.target.value)} /></Field>
          </div>
          {error ? <p className="mt-3 text-sm font-semibold text-decline">{error}</p> : null}
          <div className="mt-3 flex flex-wrap justify-end gap-2">
            <Button onClick={() => setIsAddOpen(false)}>キャンセル</Button>
            <Button data-testid="add-news-submit" icon={Plus} variant="primary" onClick={handleAdd}>ニュース追加</Button>
          </div>
        </div>
      ) : null}

      <DetailDisclosure title="ニュース詳細一覧" description="フィルター、本文、URL、メモ編集はここを開いて確認します。" testId="news-detail-list">
        <div className="grid gap-3 md:grid-cols-4">
          <Field label="カテゴリ">
            <select data-testid="news-category-filter" className={inputClassName()} value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value as "すべて" | NewsCategory)}>
              {["すべて", ...NEWS_CATEGORIES].map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </Field>
          <Field label="重要度">
            <select data-testid="news-importance-filter" className={inputClassName()} value={importanceFilter} onChange={(event) => setImportanceFilter(event.target.value as "すべて" | Importance)}>
              {["すべて", ...IMPORTANCES].map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </Field>
          <Field label="材料分類">
            <select data-testid="news-sentiment-filter" className={inputClassName()} value={sentimentFilter} onChange={(event) => setSentimentFilter(event.target.value as "すべて" | NewsSentiment)}>
              {["すべて", ...NEWS_SENTIMENTS].map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </Field>
          <Field label="確認状態">
            <select data-testid="news-checked-filter" className={inputClassName()} value={checkedFilter} onChange={(event) => setCheckedFilter(event.target.value as "すべて" | "確認済み" | "未確認")}>
              {["すべて", "確認済み", "未確認"].map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </Field>
        </div>
        {filteredItems.length === 0 ? (
          <p data-testid="news-empty" className="mt-3 text-sm font-semibold text-slate-500">データ不足。条件に合うニュースはありません。</p>
        ) : (
          <div className="mt-3 grid gap-3">
            {filteredItems.map((item) => {
              const expanded = expandedNewsId === item.id;
              return (
                <article key={item.id} data-testid="news-item" className="rounded-md border border-line px-3 py-3 text-sm">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="font-bold text-ink">{item.date || "-"} / {item.title}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <StatusBadge tone={item.importance === "高" ? "warning" : "neutral"}>{item.importance}</StatusBadge>
                        <StatusBadge tone={item.sentiment === "ネガティブ" ? "danger" : item.sentiment === "ポジティブ" ? "success" : "neutral"}>{item.sentiment}</StatusBadge>
                        <StatusBadge tone={item.checked ? "success" : "warning"}>{item.checked ? "確認済み" : "未確認"}</StatusBadge>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button data-testid="news-detail-toggle" className="h-9 px-2" onClick={() => setExpandedNewsId(expanded ? null : item.id)}>{expanded ? "詳細を閉じる" : "詳細"}</Button>
                    </div>
                  </div>
                  {expanded ? (
                    <div data-testid="news-detail-panel" className="mt-3 rounded-md bg-slate-50 p-3">
                      <p className="text-slate-600">{item.summary || "要確認"}</p>
                      <p className="mt-2 text-xs font-semibold text-slate-500">{item.mediaName || "-"} / {item.category} / {item.source} / 取得 {formatDateTime(item.fetchedAt)} / データソース：{item.dataSource.label}</p>
                      {item.url ? <a className="mt-2 inline-flex text-sm font-semibold text-accent" href={item.url} target="_blank" rel="noreferrer">ニュースURL</a> : null}
                      <div className="mt-3 grid gap-3 md:grid-cols-4">
                        <SelectField label="重要度" value={item.importance} options={IMPORTANCES} onChange={(value) => onUpdate(item.id, { importance: value, sentiment: item.sentiment, userMemo: item.userMemo, checked: item.checked })} />
                        <SelectField label="材料分類" value={item.sentiment} options={NEWS_SENTIMENTS} onChange={(value) => onUpdate(item.id, { importance: item.importance, sentiment: value, userMemo: item.userMemo, checked: item.checked })} />
                        <label className="flex items-center gap-2 pt-7 text-sm font-bold text-slate-700"><input type="checkbox" checked={item.checked} onChange={(event) => onUpdate(item.id, { importance: item.importance, sentiment: item.sentiment, userMemo: item.userMemo, checked: event.target.checked })} />確認済み</label>
                        <div className="pt-7"><Button className="h-9 px-2" icon={Trash2} variant="danger" onClick={() => onDelete(item.id)}>削除</Button></div>
                      </div>
                      <Field label="ユーザーメモ">
                        <textarea data-testid="news-user-memo-edit" className={inputClassName("mt-2 min-h-20")} value={item.userMemo} onChange={(event) => onUpdate(item.id, { importance: item.importance, sentiment: item.sentiment, userMemo: event.target.value, checked: item.checked })} />
                      </Field>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}
      </DetailDisclosure>
    </SectionCard>
  );
}

function PriceUpdateHistorySection({ histories }: { histories: StockPriceUpdateHistory[] }) {
  return (
    <DetailDisclosure title="株価データ更新履歴" description="APIやMock APIの更新履歴です。必要なときだけ開いて確認します。">
      <MiniTable title="直近履歴" empty={histories.length === 0}>
      <table data-testid="price-update-history" className="w-full min-w-[920px] text-sm">
        <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
          <tr>
            <th className="px-4 py-3">更新日時</th>
            <th className="px-4 py-3">更新方法</th>
            <th className="px-4 py-3">取得期間</th>
            <th className="px-4 py-3 text-right">取得件数</th>
            <th className="px-4 py-3">結果</th>
            <th className="px-4 py-3">データソース</th>
            <th className="px-4 py-3">メッセージ</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {histories.slice(0, 8).map((history) => (
            <tr key={history.id}>
              <td className="px-4 py-3 font-bold text-ink">{formatDateTime(history.updatedAt)}</td>
              <td className="px-4 py-3">{history.method}</td>
              <td className="px-4 py-3">{formatStockPricePeriod(history.period)}</td>
              <td className="px-4 py-3 text-right">{history.fetchedCount}</td>
              <td className="px-4 py-3 font-semibold">{history.success ? "更新成功" : "更新失敗"}</td>
              <td className="px-4 py-3">{history.dataSource.label} / {history.dataSource.provider}</td>
              <td className="px-4 py-3">{history.errorMessage || history.dataSource.message || "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </MiniTable>
    </DetailDisclosure>
  );
}

function FundamentalUpdateHistorySection({ histories }: { histories: FundamentalUpdateHistory[] }) {
  return (
    <DetailDisclosure title="業績データ更新履歴" description="業績Mock APIやAPI取得の履歴です。必要なときだけ開いて確認します。">
      <MiniTable title="直近履歴" empty={histories.length === 0}>
      <table data-testid="fundamental-update-history" className="w-full min-w-[920px] text-sm">
        <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
          <tr>
            <th className="px-4 py-3">更新日時</th>
            <th className="px-4 py-3">更新方法</th>
            <th className="px-4 py-3">対象期間</th>
            <th className="px-4 py-3 text-right">取得件数</th>
            <th className="px-4 py-3">結果</th>
            <th className="px-4 py-3">データソース</th>
            <th className="px-4 py-3">メッセージ</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {histories.slice(0, 8).map((history) => (
            <tr key={history.id}>
              <td className="px-4 py-3 font-bold text-ink">{formatDateTime(history.updatedAt)}</td>
              <td className="px-4 py-3">{history.method}</td>
              <td className="px-4 py-3">{formatFundamentalPeriod(history.period)}</td>
              <td className="px-4 py-3 text-right">{history.fetchedCount}</td>
              <td className="px-4 py-3 font-semibold">{history.success ? "更新成功" : "更新失敗"}</td>
              <td className="px-4 py-3">{history.dataSource.label} / {history.dataSource.provider}</td>
              <td className="px-4 py-3">{history.errorMessage || history.dataSource.message || "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </MiniTable>
    </DetailDisclosure>
  );
}

function EarningsCalendarSection({
  stock,
  items,
  onAdd,
  onUpdate,
  onDelete,
  onCreateTask,
}: {
  stock: StockProfile;
  items: EarningsCalendarItem[];
  onAdd: (form: EarningsCalendarFormState) => void;
  onUpdate: (calendarId: string, patch: Pick<EarningsCalendarItem, "status" | "memo">) => void;
  onDelete: (calendarId: string) => void;
  onCreateTask: (calendarId: string, mode: "before" | "after") => void;
}) {
  const [form, setForm] = useState<EarningsCalendarFormState>({
    earningsDate: todayIsoDate(),
    fiscalYear: String(new Date().getFullYear()),
    fiscalQuarter: "Q1",
    status: "未確認",
    memo: "",
  });
  const [error, setError] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [expandedCalendarId, setExpandedCalendarId] = useState<string | null>(null);
  const updateForm = <K extends keyof EarningsCalendarFormState>(key: K, value: EarningsCalendarFormState[K]) => setForm((current) => ({ ...current, [key]: value }));
  const handleAdd = () => {
    if (!form.earningsDate || !form.fiscalYear.trim()) {
      setError("決算予定日と対象年度を入力してください。");
      return;
    }
    setError("");
    onAdd(form);
    setForm({ earningsDate: todayIsoDate(), fiscalYear: String(new Date().getFullYear()), fiscalQuarter: "Q1", status: "未確認", memo: "" });
    setIsAddOpen(false);
  };
  const nextEarnings = getNextEarningsItem(items);
  const uncheckedMemoCount = stock.earningsMemos.filter((memo) => (
    memo.revenueImpression === "未確認" ||
    memo.profitImpression === "未確認" ||
    memo.guidanceImpression === "未確認"
  )).length;

  return (
    <SectionCard
      title="決算予定情報"
      description={`${stock.ticker} の決算予定と確認タスクの起点です。編集は詳細を開いた時だけ表示します。`}
      actions={items[0] ? <DataSourceBadge source={items[0].dataSource} testId="calendar-source" /> : <DataSourceBadge source={apiPlannedDataSource()} testId="calendar-source" />}
    >
      <div data-testid="detail-earnings-calendar-summary" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <MetricCard label="次回決算日" value={nextEarnings?.earningsDate ?? "-"} tone={nextEarnings ? "warning" : "neutral"} />
        <MetricCard label="決算確認ステータス" value={nextEarnings?.status ?? "-"} />
        <MetricCard label="未確認決算メモ" value={`${uncheckedMemoCount}`} tone={uncheckedMemoCount > 0 ? "warning" : "success"} />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button data-testid="toggle-earnings-calendar-add-form" icon={Plus} variant={isAddOpen ? "secondary" : "primary"} onClick={() => setIsAddOpen((current) => !current)}>
          {isAddOpen ? "決算予定入力を閉じる" : "決算予定を手入力"}
        </Button>
      </div>

      {isAddOpen ? (
        <div className="mt-4 rounded-lg border border-line bg-slate-50 p-4">
          <h3 className="text-sm font-bold text-ink">決算予定手入力</h3>
          <div className="mt-3 grid gap-3 md:grid-cols-5">
            <Field label="決算予定日"><input data-testid="earnings-calendar-date" type="date" className={inputClassName()} value={form.earningsDate} onChange={(event) => updateForm("earningsDate", event.target.value)} /></Field>
            <Field label="対象年度"><input data-testid="earnings-calendar-year" className={inputClassName()} value={form.fiscalYear} onChange={(event) => updateForm("fiscalYear", event.target.value)} /></Field>
            <SelectField label="対象四半期" value={form.fiscalQuarter} options={QUARTERS} onChange={(value) => updateForm("fiscalQuarter", value)} testId="earnings-calendar-quarter" />
            <SelectField label="ステータス" value={form.status} options={["未確認", "確認予定", "確認済み"]} onChange={(value) => updateForm("status", value)} testId="earnings-calendar-status" />
            <Field label="メモ"><input data-testid="earnings-calendar-memo" className={inputClassName()} value={form.memo} onChange={(event) => updateForm("memo", event.target.value)} /></Field>
          </div>
          {error ? <p className="mt-3 text-sm font-semibold text-decline">{error}</p> : null}
          <div className="mt-3 flex flex-wrap justify-end gap-2">
            <Button onClick={() => setIsAddOpen(false)}>キャンセル</Button>
            <Button data-testid="add-earnings-calendar" icon={Plus} variant="primary" onClick={handleAdd}>決算予定追加</Button>
          </div>
        </div>
      ) : null}

      <DetailDisclosure title="決算予定詳細一覧" description="予定ごとのステータス変更、タスク作成、削除はここを開いて行います。" testId="earnings-calendar-detail-list">
        {items.length === 0 ? (
          <p data-testid="calendar-empty" className="mt-3 text-sm font-semibold text-slate-500">データなし。決算カレンダーAPIはAPI未実装です。</p>
        ) : (
          <div data-testid="earnings-calendar-table" className="grid gap-3">
            {items.map((item) => {
              const expanded = expandedCalendarId === item.id;
              return (
                <article key={item.id} data-testid="earnings-calendar-item" className="rounded-md border border-line px-3 py-3 text-sm">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="font-bold text-ink">{item.earningsDate || "-"} / {item.fiscalYear || "-"} {item.fiscalQuarter}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <StatusBadge tone={item.status === "確認済み" ? "success" : "warning"}>{item.status}</StatusBadge>
                        <StatusBadge tone="neutral">{item.source}</StatusBadge>
                      </div>
                    </div>
                    <Button data-testid="earnings-calendar-detail-toggle" className="h-9 px-2" onClick={() => setExpandedCalendarId(expanded ? null : item.id)}>{expanded ? "詳細を閉じる" : "詳細"}</Button>
                  </div>
                  {expanded ? (
                    <div className="mt-3 rounded-md bg-slate-50 p-3">
                      <div className="grid gap-3 md:grid-cols-[160px_minmax(0,1fr)]">
                        <Field label="確認ステータス">
                          <select data-testid="earnings-calendar-status-edit" className={inputClassName()} value={item.status} onChange={(event) => onUpdate(item.id, { status: event.target.value as EarningsCalendarItem["status"], memo: item.memo })}>
                            {["未確認", "確認予定", "確認済み"].map((option) => <option key={option} value={option}>{option}</option>)}
                          </select>
                        </Field>
                        <Field label="メモ"><input data-testid="earnings-calendar-memo-edit" className={inputClassName()} value={item.memo} onChange={(event) => onUpdate(item.id, { status: item.status, memo: event.target.value })} /></Field>
                      </div>
                      <p className="mt-2 text-xs font-semibold text-slate-500">データソース：{item.source} / {item.dataSource.label}</p>
                      <div className="mt-3 flex flex-wrap justify-end gap-2">
                        <Button data-testid="calendar-create-before-task" className="h-9 px-2" icon={CheckCircle2} onClick={() => onCreateTask(item.id, "before")}>前日タスク</Button>
                        <Button data-testid="calendar-create-after-task" className="h-9 px-2" icon={CheckCircle2} onClick={() => onCreateTask(item.id, "after")}>翌日タスク</Button>
                        <Button data-testid="calendar-delete" className="h-9 px-2" icon={Trash2} variant="danger" onClick={() => onDelete(item.id)}>削除</Button>
                      </div>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}
      </DetailDisclosure>
    </SectionCard>
  );
}

function ConfirmationTasksSection({
  stock,
  tasks,
  onTasks,
  onUpdate,
  onDelete,
}: {
  stock: StockProfile;
  tasks: ConfirmationTask[];
  onTasks: () => void;
  onUpdate: (taskId: string, patch: Partial<Pick<ConfirmationTask, "title" | "dueDate" | "taskType" | "priority" | "status" | "memo">>) => void;
  onDelete: (taskId: string) => void;
}) {
  const sortedTasks = sortConfirmationTasks(tasks);
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const incompleteCount = sortedTasks.filter(taskIsIncomplete).length;
  const highPriorityCount = sortedTasks.filter((task) => task.priority === "高" && taskIsIncomplete(task)).length;
  const overdueCount = sortedTasks.filter(taskIsOverdue).length;
  const nextTask = sortedTasks.find((task) => taskIsIncomplete(task)) ?? null;

  return (
    <SectionCard
      title="関連確認タスク"
      description={`${stock.ticker} の未完了タスクや確認予定です。編集は詳細を開いたタスクだけ表示します。`}
      actions={<Button data-testid="detail-task-add" icon={Plus} variant="primary" onClick={onTasks}>タスク追加</Button>}
    >
      <div data-testid="detail-task-summary" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="未完了タスク" value={`${incompleteCount}`} tone={incompleteCount > 0 ? "warning" : "success"} />
        <MetricCard label="高優先度タスク" value={`${highPriorityCount}`} tone={highPriorityCount > 0 ? "warning" : "neutral"} />
        <MetricCard label="期限切れタスク" value={`${overdueCount}`} tone={overdueCount > 0 ? "danger" : "neutral"} />
        <MetricCard label="次の期限" value={nextTask?.dueDate || "-"} />
      </div>

      <DetailDisclosure title="確認タスク詳細一覧" description="タスクの内容、期限、優先度、メモを必要なときだけ確認します。" testId="task-detail-list">
        {sortedTasks.length === 0 ? (
          <p data-testid="detail-task-empty" className="mt-3 text-sm font-semibold text-slate-500">確認タスクはまだありません。</p>
        ) : (
          <div className="mt-3 grid gap-3">
            {sortedTasks.map((task) => {
              const expanded = expandedTaskId === task.id;
              return (
                <div key={task.id} data-testid="detail-task-item" className="rounded-md border border-line px-3 py-3 text-sm">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="font-bold text-ink">{task.title || "無題のタスク"}</p>
                      <p className="mt-1 text-xs font-semibold text-slate-500">期限 {task.dueDate || "-"} / {task.taskType}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <StatusBadge tone={task.priority === "高" ? "warning" : "neutral"}>{task.priority}</StatusBadge>
                        <StatusBadge tone={task.status === "完了" ? "success" : taskIsOverdue(task) ? "danger" : "warning"}>{task.status}</StatusBadge>
                      </div>
                    </div>
                    <Button data-testid="task-detail-toggle" className="h-9 px-2" onClick={() => setExpandedTaskId(expanded ? null : task.id)}>{expanded ? "詳細を閉じる" : "詳細"}</Button>
                  </div>
                  {expanded ? (
                    <div className="mt-3 rounded-md bg-slate-50 p-3">
                      <div className="grid gap-3 md:grid-cols-[1.2fr_160px_140px_140px_auto] md:items-end">
                        <Field label="タイトル"><input data-testid="detail-task-title-edit" className={inputClassName()} value={task.title} onChange={(event) => onUpdate(task.id, { title: event.target.value })} /></Field>
                        <Field label="期限"><input data-testid="detail-task-due-edit" type="date" className={inputClassName()} value={task.dueDate} onChange={(event) => onUpdate(task.id, { dueDate: event.target.value })} /></Field>
                        <SelectField label="優先度" value={task.priority} options={IMPORTANCES} onChange={(value) => onUpdate(task.id, { priority: value })} />
                        <SelectField label="ステータス" value={task.status} options={TASK_STATUSES} onChange={(value) => onUpdate(task.id, { status: value })} />
                        <Button data-testid="detail-task-delete" className="h-10 px-2" icon={Trash2} variant="danger" onClick={() => onDelete(task.id)}>削除</Button>
                      </div>
                      <textarea data-testid="detail-task-memo-edit" className={inputClassName("mt-3 min-h-20 w-full")} value={task.memo} onChange={(event) => onUpdate(task.id, { memo: event.target.value })} />
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </DetailDisclosure>
    </SectionCard>
  );
}

function CsvImportHistorySection({ stockId }: { stockId: string }) {
  const [histories, setHistories] = useState<CsvImportHistoryItem[]>([]);

  useEffect(() => {
    setHistories(loadCsvImportHistories(stockId));
  }, [stockId]);

  return (
    <DetailDisclosure title="CSVインポート履歴" description="CSV本文は保存せず、取り込み件数と成否のみを記録します。">
      {histories.length === 0 ? (
        <p data-testid="csv-import-history-empty" className="mt-3 text-sm font-semibold text-slate-500">CSVインポート履歴はまだありません。</p>
      ) : (
        <div className="mt-3 overflow-x-auto rounded-md border border-line">
          <table className="w-full min-w-[920px] text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-4 py-3">日時</th>
                <th className="px-4 py-3">銘柄</th>
                <th className="px-4 py-3">データ種別</th>
                <th className="px-4 py-3">ファイル名</th>
                <th className="px-4 py-3">追加</th>
                <th className="px-4 py-3">更新</th>
                <th className="px-4 py-3">エラー</th>
                <th className="px-4 py-3">結果</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {histories.map((history) => (
                <tr key={history.id} data-testid="csv-import-history-row">
                  <td className="px-4 py-3">{formatDateTime(history.importedAt)}</td>
                  <td className="px-4 py-3 font-bold text-ink">{history.ticker} {history.companyName}</td>
                  <td className="px-4 py-3">{history.dataType}</td>
                  <td className="px-4 py-3">{history.fileName}</td>
                  <td className="px-4 py-3">{history.addedRows}</td>
                  <td className="px-4 py-3">{history.updatedRows}</td>
                  <td className="px-4 py-3">{history.errorRows}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-1 text-xs font-bold ${history.success ? "bg-teal-50 text-teal-800" : "bg-rose-50 text-rose-800"}`}>
                      {history.success ? "成功" : "失敗"}
                    </span>
                    {history.errorMessage ? <p className="mt-1 text-xs text-rose-700">{history.errorMessage}</p> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </DetailDisclosure>
  );
}

function DataMaintenanceSection({
  stock,
  onDeleteStock,
  onClearPrices,
  onClearEarnings,
}: {
  stock: StockProfile;
  onDeleteStock: () => void;
  onClearPrices: () => void;
  onClearEarnings: () => void;
}) {
  const handleClearPrices = () => {
    if (window.confirm(`${stock.ticker} の株価データだけを削除します。銘柄情報、業績、ニュース、AI分析などは残ります。実行しますか？`)) {
      onClearPrices();
    }
  };
  const handleClearEarnings = () => {
    if (window.confirm(`${stock.ticker} の業績データだけを削除します。銘柄情報、株価、ニュース、AI分析などは残ります。実行しますか？`)) {
      onClearEarnings();
    }
  };

  return (
    <DetailDisclosure title="データ削除・リセット補助" description="CSVやAPIで入れ直す前に、銘柄ごとの株価データまたは業績データだけを削除できます。">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <p className="text-sm font-semibold text-slate-600">
          銘柄情報、ニュース、AI分析、リスクメモなどは削除しません。
        </p>
        <div className="flex flex-wrap gap-2">
          <Button data-testid="delete-stock-danger" icon={Trash2} variant="danger" onClick={onDeleteStock}>銘柄削除</Button>
          <Button data-testid="clear-price-data" icon={Trash2} variant="danger" onClick={handleClearPrices} disabled={stock.prices.length === 0}>株価データだけ削除</Button>
          <Button data-testid="clear-earnings-data" icon={Trash2} variant="danger" onClick={handleClearEarnings} disabled={stock.earnings.length === 0}>業績データだけ削除</Button>
        </div>
      </div>
    </DetailDisclosure>
  );
}

function getNextEarningsItem(items: EarningsCalendarItem[]): EarningsCalendarItem | null {
  return [...items]
    .filter((item) => {
      const diff = daysUntil(item.earningsDate);
      return diff !== null && diff >= 0;
    })
    .sort((a, b) => a.earningsDate.localeCompare(b.earningsDate))
    .at(0) ?? null;
}

function DetailSummary({
  stock,
  trendAnalysis,
  fundamentalAnalysis,
  riskScore,
  newsItems,
  earningsCalendarItems,
}: {
  stock: StockProfile;
  trendAnalysis: TrendAnalysis;
  fundamentalAnalysis: FundamentalAnalysis;
  riskScore: number;
  newsItems: NewsItem[];
  earningsCalendarItems: EarningsCalendarItem[];
}) {
  const uncheckedNewsCount = newsItems.filter((item) => !item.checked).length;
  const incompleteTaskCount = stock.confirmationTasks.filter((task) => task.status !== "完了").length;
  const nextEarnings = getNextEarningsItem(earningsCalendarItems);
  const checks: string[] = [];

  if (stock.prices.length === 0) checks.push("株価データが未登録です。CSVまたはMock APIで取り込みを確認してください。");
  if (stock.earnings.length === 0) checks.push("業績データが未登録です。手入力、CSV、Mock APIのいずれかで補完できます。");
  if (uncheckedNewsCount > 0) checks.push(`未確認ニュースが ${uncheckedNewsCount} 件あります。重要度と材料分類を確認してください。`);
  if (incompleteTaskCount > 0) checks.push(`未完了タスクが ${incompleteTaskCount} 件あります。期限が近いものから確認してください。`);
  if (riskScore >= 13) checks.push("リスクメモの集計上、要確認の項目があります。内容と確認方法を見直してください。");

  const nextEarningsDiff = nextEarnings ? daysUntil(nextEarnings.earningsDate) : null;
  if (nextEarnings && nextEarningsDiff !== null && nextEarningsDiff <= 30) {
    checks.push(`次回決算予定が ${nextEarningsDiff} 日以内です。確認タスクとメモを準備してください。`);
  }

  if (checks.length === 0) {
    checks.push("直近の要確認項目は少なめです。必要に応じてニュース、業績、タスクを更新してください。");
  }

  return (
    <SectionCard
      title="要点サマリー"
      description="最初に見るべきスコア、確認日、未確認項目だけを集約しています。"
      actions={<StatusBadge tone={checks.length > 1 ? "warning" : "success"}>{checks.length > 1 ? "要確認あり" : "確認項目少なめ"}</StatusBadge>}
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="総合調査スコア" value={<span data-testid="detail-total-score">{fundamentalAnalysis.totalResearchScore}</span>} />
        <MetricCard label="トレンドスコア" value={<span data-testid="detail-score">{trendAnalysis.score}</span>} />
        <MetricCard label="成長性スコア" value={<span data-testid="detail-growth-score">{fundamentalAnalysis.growthScore}</span>} />
        <MetricCard label="財務安全性スコア" value={<span data-testid="detail-safety-score">{fundamentalAnalysis.financialSafetyScore}</span>} />
        <MetricCard label="リスクスコア" value={<span data-testid="detail-risk-score">{riskScore}</span>} />
        <MetricCard label="次回決算日" value={nextEarnings?.earningsDate ?? "-"} />
        <MetricCard label="未確認ニュース" value={`${uncheckedNewsCount}`} />
        <MetricCard label="未完了タスク" value={`${incompleteTaskCount}`} />
      </div>
      <div className="mt-4 rounded-lg border border-line bg-slate-50 p-4">
        <h3 className="text-sm font-black text-ink">次に確認すること</h3>
        <ul className="mt-3 grid gap-2 text-sm font-semibold text-slate-700">
          {checks.map((check) => (
            <li key={check} className="rounded-md bg-white px-3 py-2">{check}</li>
          ))}
        </ul>
      </div>
    </SectionCard>
  );
}

export function StockDetailView({
  stock,
  trendAnalysis,
  fundamentalAnalysis,
  riskScore,
  onBack,
  onEdit,
  onPriceImport,
  onEarnings,
  onWatch,
  onEarningsMemo,
  onRisk,
  onResearchMemo,
  onTasks,
  onDeleteStock,
  onStockPriceUpdate,
  onFundamentalUpdate,
  onNewsUpdate,
  onAddNews,
  onUpdateNews,
  onDeleteNews,
  onEarningsCalendarUpdate,
  onAddEarningsCalendar,
  onUpdateEarningsCalendar,
  onDeleteEarningsCalendar,
  onCreateTaskFromCalendar,
  onUpdateTask,
  onDeleteTask,
  onClearPrices,
  onClearEarnings,
}: {
  stock: StockProfile;
  trendAnalysis: TrendAnalysis;
  fundamentalAnalysis: FundamentalAnalysis;
  riskScore: number;
  onBack: () => void;
  onEdit: () => void;
  onPriceImport: () => void;
  onEarnings: () => void;
  onWatch: () => void;
  onEarningsMemo: () => void;
  onRisk: () => void;
  onResearchMemo: () => void;
  onTasks: () => void;
  onDeleteStock: () => void;
  onStockPriceUpdate: (period: StockPriceFetchPeriod) => Promise<StockPriceUpdateResult>;
  onFundamentalUpdate: (period: FundamentalFetchPeriod) => Promise<FundamentalUpdateResult>;
  onNewsUpdate: () => Promise<NewsUpdateResult>;
  onAddNews: (form: NewsFormState) => void;
  onUpdateNews: (newsId: string, patch: Pick<NewsItem, "importance" | "sentiment" | "userMemo" | "checked">) => void;
  onDeleteNews: (newsId: string) => void;
  onEarningsCalendarUpdate: () => Promise<EarningsCalendarUpdateResult>;
  onAddEarningsCalendar: (form: EarningsCalendarFormState) => void;
  onUpdateEarningsCalendar: (calendarId: string, patch: Pick<EarningsCalendarItem, "status" | "memo">) => void;
  onDeleteEarningsCalendar: (calendarId: string) => void;
  onCreateTaskFromCalendar: (calendarId: string, mode: "before" | "after") => void;
  onUpdateTask: (taskId: string, patch: Partial<Pick<ConfirmationTask, "title" | "dueDate" | "taskType" | "priority" | "status" | "memo">>) => void;
  onDeleteTask: (taskId: string) => void;
  onClearPrices: () => void;
  onClearEarnings: () => void;
}) {
  const metrics = fundamentalAnalysis.metrics;
  const [apiNotice, setApiNotice] = useState<string | null>(null);
  const [pricePeriod, setPricePeriod] = useState<StockPriceFetchPeriod>("1m");
  const [isUpdatingPrice, setIsUpdatingPrice] = useState(false);
  const [isUpdatingFundamental, setIsUpdatingFundamental] = useState(false);
  const [isUpdatingNews, setIsUpdatingNews] = useState(false);
  const [isUpdatingCalendar, setIsUpdatingCalendar] = useState(false);
  const companyInfoResult = getCompanyInfoData(stock);
  const priceResult = getStockPriceData(stock);
  const fundamentalResult = getFundamentalData(stock);
  const newsResult = getNewsData(stock);
  const earningsCalendarResult = getEarningsCalendarData(stock);
  const companyInfo = companyInfoResult.data ?? stock.companyInfo;
  const newsItems = newsResult.data ?? [];
  const earningsCalendarItems = earningsCalendarResult.data ?? [];
  const llmContext = useMemo(() => buildStockResearchContext(stock.id, [stock]), [stock]);
  const showApiNotice = (message?: string) => setApiNotice(message ?? apiNotImplementedMessage());
  const handleStockPriceUpdate = async () => {
    setIsUpdatingPrice(true);
    setApiNotice("株価データを更新中です。");
    try {
      const result = await onStockPriceUpdate(pricePeriod);
      setApiNotice(result.message);
    } catch {
      setApiNotice("更新失敗：株価データ更新中に予期しないエラーが発生しました。");
    } finally {
      setIsUpdatingPrice(false);
    }
  };
  const handleFundamentalUpdate = async () => {
    setIsUpdatingFundamental(true);
    setApiNotice("業績データを更新中です。");
    try {
      const result = await onFundamentalUpdate("annual");
      setApiNotice(result.message);
    } catch {
      setApiNotice("更新失敗：業績データ更新中に予期しないエラーが発生しました。");
    } finally {
      setIsUpdatingFundamental(false);
    }
  };
  const handleNewsUpdate = async () => {
    setIsUpdatingNews(true);
    setApiNotice("ニュースを更新中です。");
    try {
      const result = await onNewsUpdate();
      setApiNotice(result.message);
    } catch {
      setApiNotice("更新失敗：ニュース更新中に予期しないエラーが発生しました。");
    } finally {
      setIsUpdatingNews(false);
    }
  };
  const handleCalendarUpdate = async () => {
    setIsUpdatingCalendar(true);
    setApiNotice("決算予定を更新中です。");
    try {
      const result = await onEarningsCalendarUpdate();
      setApiNotice(result.message);
    } catch {
      setApiNotice("更新失敗：決算予定更新中に予期しないエラーが発生しました。");
    } finally {
      setIsUpdatingCalendar(false);
    }
  };

  return (
    <section data-testid="stock-detail" className="grid gap-5">
      <ViewHeader
        title={`${stock.ticker} ${stock.companyName || ""}`.trim()}
        actions={
          <>
            <Button data-testid="detail-back" icon={List} onClick={onBack}>一覧へ</Button>
            <Button icon={Pencil} variant="primary" onClick={onEdit}>編集</Button>
          </>
        }
      />
      <Disclaimer />
      <ApiUpdateNotice message={apiNotice} />
      <DetailSummary
        stock={stock}
        trendAnalysis={trendAnalysis}
        fundamentalAnalysis={fundamentalAnalysis}
        riskScore={riskScore}
        newsItems={newsItems}
        earningsCalendarItems={earningsCalendarItems}
      />
      <SectionCard title="主操作" description="よく使う更新、登録、メモ操作をここにまとめています。詳細履歴や削除系は下部に分離しています。">
        <div className="grid gap-4 xl:grid-cols-[260px_minmax(0,1fr)]">
          <Field label="株価データ取得期間">
            <select data-testid="price-update-period" className={inputClassName()} value={pricePeriod} onChange={(event) => setPricePeriod(event.target.value as StockPriceFetchPeriod)}>
              {STOCK_PRICE_PERIOD_OPTIONS.map((period) => (
                <option key={period} value={period}>{formatStockPricePeriod(period)}</option>
              ))}
            </select>
          </Field>
          <div className="flex flex-wrap items-end gap-2">
            <Button data-testid="refresh-prices" icon={RefreshCw} variant="primary" onClick={handleStockPriceUpdate} disabled={isUpdatingPrice}>{isUpdatingPrice ? "更新中" : "株価データ更新"}</Button>
            <Button data-testid="refresh-fundamentals" icon={RefreshCw} onClick={handleFundamentalUpdate} disabled={isUpdatingFundamental}>{isUpdatingFundamental ? "更新中" : "業績データ更新"}</Button>
            <Button data-testid="refresh-news" icon={RefreshCw} onClick={handleNewsUpdate} disabled={isUpdatingNews}>{isUpdatingNews ? "更新中" : "ニュース更新"}</Button>
            <Button data-testid="refresh-calendar" icon={RefreshCw} onClick={handleCalendarUpdate} disabled={isUpdatingCalendar}>{isUpdatingCalendar ? "更新中" : "決算予定更新"}</Button>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button data-testid="detail-price-import" icon={Upload} onClick={onPriceImport}>株価CSV</Button>
          <Button data-testid="detail-earnings" icon={Plus} onClick={onEarnings}>業績</Button>
          <Button data-testid="detail-watch" icon={ShieldCheck} onClick={onWatch}>ウォッチ</Button>
          <Button data-testid="detail-risk" icon={ShieldCheck} onClick={onRisk}>リスク</Button>
          <Button data-testid="detail-research-memo" icon={Pencil} onClick={onResearchMemo}>調査メモ</Button>
          <Button data-testid="detail-tasks" icon={CheckCircle2} onClick={onTasks}>タスク</Button>
          <Button data-testid="detail-earnings-memo" icon={Pencil} onClick={onEarningsMemo}>決算メモ</Button>
        </div>
      </SectionCard>
      <CompanyInfoPanel companyInfo={companyInfo} />
      <ValuationWarnings warnings={fundamentalAnalysis.valuationWarnings} />
      <SectionCard title="株価チャート" description="終値、出来高、移動平均線をまとめて確認します。">
        <PriceChart data={trendAnalysis.chartData} />
      </SectionCard>
      <div className="grid gap-3 md:grid-cols-4">
        <MetricTile label="監視ステータス" value={stock.watchlist?.status ?? "-"} />
        <MetricTile label="調査優先度" value={stock.watchlist?.priority ?? "-"} />
        <MetricTile label="次回確認日" value={stock.watchlist?.nextReviewDate || "-"} />
        <MetricTile label="再調査ライン" value={stock.priceReview.reviewPriceLevel || "-"} />
        <MetricTile label="確認水準理由" value={stock.priceReview.reviewReason || "-"} />
        <MetricTile label="急落時確認" value={stock.priceReview.checkOnSharpDrop ? "要確認" : "-"} />
        <MetricTile label="決算後確認" value={stock.priceReview.checkAfterEarnings ? "要確認" : "-"} />
        <MetricTile label="高値からの再確認%" value={formatPercent(stock.priceReview.dropFromHighPercent)} />
      </div>
      <div className="grid gap-3 md:grid-cols-5">
        <MetricTile label="売上成長率" value={formatPercent(metrics.latestRevenueGrowthPercent)} />
        <MetricTile label="営業利益率" value={formatPercent(metrics.latestOperatingMarginPercent)} />
        <MetricTile label="ROE" value={formatPercent(metrics.latestRoe)} />
        <MetricTile label="PER" value={formatNumber(metrics.latestPer)} />
        <MetricTile label="PSR" value={formatNumber(metrics.latestPsr)} />
      </div>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <SignalTable title="成長性スコア判定" signals={fundamentalAnalysis.growthSignals} />
        <SignalTable title="財務安全性スコア判定" signals={fundamentalAnalysis.safetySignals} />
      </div>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <FundamentalChart title="売上高の推移" data={fundamentalAnalysis.rows} lines={[{ key: "revenue", name: "売上高", stroke: "#0f766e" }]} />
        <FundamentalChart title="営業利益の推移" data={fundamentalAnalysis.rows} lines={[{ key: "operatingIncome", name: "営業利益", stroke: "#2563eb" }]} />
        <FundamentalChart title="EPSの推移" data={fundamentalAnalysis.rows} lines={[{ key: "eps", name: "EPS", stroke: "#b7791f" }]} />
        <FundamentalChart title="フリーキャッシュフローの推移" data={fundamentalAnalysis.rows} lines={[{ key: "freeCashFlow", name: "FCF", stroke: "#7c3aed" }]} />
      </div>
      <EarningsTable rows={fundamentalAnalysis.rows} />
      <NewsSection stock={stock} items={newsItems} onAdd={onAddNews} onUpdate={onUpdateNews} onDelete={onDeleteNews} />
      <EarningsCalendarSection stock={stock} items={earningsCalendarItems} onAdd={onAddEarningsCalendar} onUpdate={onUpdateEarningsCalendar} onDelete={onDeleteEarningsCalendar} onCreateTask={onCreateTaskFromCalendar} />
      <ConfirmationTasksSection stock={stock} tasks={stock.confirmationTasks} onTasks={onTasks} onUpdate={onUpdateTask} onDelete={onDeleteTask} />
      <AiAnalysisSection stock={stock} context={llmContext} />
      <ResearchSections stock={stock} />
      <SectionCard title="履歴・補助情報" description="更新履歴、CSV履歴、データ削除補助は通常利用の下にまとめています。">
        <div className="grid gap-4">
          <DetailDisclosure title="データソース詳細" description="各データの取得元と更新日時です。普段は必要なときだけ確認します。" testId="detail-data-source-disclosure">
            <div className="grid gap-3 md:grid-cols-4">
              <DataSourceBadge source={stock.dataSource} testId="detail-source" />
              <DataSourceBadge source={priceResult.dataSource} testId="price-source" />
              <DataSourceBadge source={fundamentalResult.dataSource} testId="fundamental-source" />
              <DataSourceBadge source={newsResult.dataSource} testId="detail-news-source" />
            </div>
          </DetailDisclosure>
          <LlmContextPreview context={llmContext} />
          <PriceUpdateHistorySection histories={stock.priceUpdateHistories} />
          <FundamentalUpdateHistorySection histories={stock.fundamentalUpdateHistories} />
          <CsvImportHistorySection stockId={stock.id} />
        </div>
      </SectionCard>
      <SectionCard data-testid="detail-danger-zone" title="Danger Zone（危険操作）" description="データを入れ直すときだけ使う操作です。確認ダイアログの後に実行されます。">
        <DataMaintenanceSection stock={stock} onDeleteStock={onDeleteStock} onClearPrices={onClearPrices} onClearEarnings={onClearEarnings} />
      </SectionCard>
    </section>
  );
}

function ResearchSections({ stock }: { stock: StockProfile }) {
  const [expandedRiskId, setExpandedRiskId] = useState<string | null>(null);
  const riskScores = stock.risks.map((risk) => calculateRiskItemScore(risk));
  const highRiskCount = riskScores.filter((score) => score >= 6).length;
  const unresolvedRiskCount = stock.risks.filter((risk) => riskReviewStatus(risk) === "未確認").length;
  const maxRiskScore = riskScores.length > 0 ? Math.max(...riskScores) : 0;
  const latestRiskUpdatedAt = latestDate(stock.risks.flatMap((risk) => [risk.updatedAt, risk.lastCheckedDate]));

  return (
    <SectionCard title="リスク・メモ詳細" description="リスク要約を先に表示し、長文メモや履歴は必要なときだけ開きます。">
      <div data-testid="detail-risk-summary" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="高リスク件数" value={`${highRiskCount}`} tone={highRiskCount > 0 ? "warning" : "success"} />
        <MetricCard label="未対応リスク" value={`${unresolvedRiskCount}`} tone={unresolvedRiskCount > 0 ? "warning" : "success"} />
        <MetricCard label="最新更新日" value={latestRiskUpdatedAt} />
        <MetricCard label="最大リスクスコア" value={`${maxRiskScore}`} tone={riskTone(maxRiskScore)} />
      </div>

      <div className="mt-4 grid gap-4">
        <DetailDisclosure title="リスク詳細一覧" description="確認方法、対応メモ、長文内容は詳細を開いた項目だけ表示します。" testId="risk-detail-list">
          {stock.risks.length === 0 ? (
            <p className="mt-3 text-sm font-semibold text-slate-500">リスクメモはまだありません。</p>
          ) : (
            <div className="mt-3 grid gap-3">
              {stock.risks.map((risk) => {
                const score = calculateRiskItemScore(risk);
                const status = riskReviewStatus(risk);
                const expanded = expandedRiskId === risk.id;
                return (
                  <article key={risk.id} data-testid="risk-item" className="rounded-md border border-line px-3 py-3 text-sm">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <p className="font-bold text-ink">{risk.category}</p>
                        <p className="mt-1 line-clamp-2 text-slate-600">{risk.content || "内容未入力"}</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <StatusBadge tone={risk.impact === "大" ? "warning" : "neutral"}>影響 {risk.impact}</StatusBadge>
                          <StatusBadge tone={risk.probability === "高" ? "warning" : "neutral"}>可能性 {risk.probability}</StatusBadge>
                          <StatusBadge tone={riskTone(score)}>点数 {score}</StatusBadge>
                          <StatusBadge tone={status === "確認済み" ? "success" : "warning"}>{status}</StatusBadge>
                        </div>
                      </div>
                      <Button data-testid="risk-detail-toggle" className="h-9 px-2" onClick={() => setExpandedRiskId(expanded ? null : risk.id)}>{expanded ? "詳細を閉じる" : "詳細"}</Button>
                    </div>
                    {expanded ? (
                      <div data-testid="risk-detail-panel" className="mt-3 grid gap-3 rounded-md bg-slate-50 p-3 text-slate-700">
                        <p><span className="font-bold text-ink">リスク内容：</span>{risk.content || "-"}</p>
                        <p><span className="font-bold text-ink">確認方法：</span>{risk.confirmationMethod || "-"}</p>
                        <p><span className="font-bold text-ink">対応メモ：</span>{risk.responseMemo || "-"}</p>
                        <p className="text-xs font-semibold text-slate-500">最終確認日：{risk.lastCheckedDate || "-"} / 更新：{formatDateTime(risk.updatedAt)}</p>
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          )}
        </DetailDisclosure>

        <DetailDisclosure title="決算メモ詳細" description="決算メモの全文は必要なときだけ確認します。">
          <MiniTable title="決算メモ一覧" empty={stock.earningsMemos.length === 0}>
            <table className="w-full min-w-[960px] text-sm">
              <tbody className="divide-y divide-line">
                {stock.earningsMemos.map((memo) => (
                  <tr key={memo.id}>
                    <td className="px-4 py-3 font-bold">{memo.announcementDate}</td>
                    <td className="px-4 py-3">{memo.fiscalYear} {memo.quarter}</td>
                    <td className="px-4 py-3">売上 {memo.revenueImpression} / 利益 {memo.profitImpression} / ガイダンス {memo.guidanceImpression}</td>
                    <td className="px-4 py-3">{memo.overallMemo || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </MiniTable>
        </DetailDisclosure>

        <DetailDisclosure title="調査メモ履歴" description="ニュース、決算、リスクなどの自由メモ履歴です。">
          <MiniTable title="調査メモ履歴" empty={stock.researchMemos.length === 0}>
            <table className="w-full min-w-[920px] text-sm">
              <tbody className="divide-y divide-line">
                {stock.researchMemos.map((memo) => (
                  <tr key={memo.id}>
                    <td className="px-4 py-3 font-bold">{memo.date}</td>
                    <td className="px-4 py-3">{memo.type} / {memo.importance}</td>
                    <td className="px-4 py-3">{memo.title}</td>
                    <td className="px-4 py-3">{memo.content}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </MiniTable>
        </DetailDisclosure>
      </div>
    </SectionCard>
  );
}
