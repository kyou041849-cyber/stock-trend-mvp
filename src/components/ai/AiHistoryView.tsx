"use client";

import { useMemo, useState } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Copy, Download, Eye, FileJson, List, Search, Trash2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  ActionButton as DsActionButton,
  CollapsibleSection,
  FormField,
  InfoAlert,
  MetricCard,
  SectionCard,
  StatusBadge,
  Toolbar,
  inputClassName as dsInputClassName,
} from "@/components/ui/design-system";
import { buildStockResearchContext } from "@/lib/llmContext";
import { deleteLlmOutput, loadLlmOutputs } from "@/lib/llmOutputStorage";
import {
  buildAiHistoryRows,
  createAiComparisonData,
  createAiComparisonJsonExport,
  createAiComparisonMarkdown,
  createAiHistoryFullMarkdown,
  createAiHistoryJsonExport,
  createAiHistoryListMarkdown,
  createAiHistoryMarkdown,
  filterAiHistoryRows,
  sortAiHistoryRows,
  type AiComparisonData,
  type AiHistoryFilters,
  type AiHistoryFreshnessFilter,
  type AiHistoryRow,
  type AiHistorySortKey,
} from "@/lib/llmHistory";
import type { LlmOutputType, StockProfile } from "@/lib/types";

const LLM_ANALYSIS_TYPES: LlmOutputType[] = [
  "銘柄要約",
  "ニュース要約",
  "決算要約",
  "リスク整理",
  "追加調査ポイント",
];

const SORT_OPTIONS: Array<{ value: AiHistorySortKey; label: string }> = [
  { value: "newest", label: "生成日時 新しい順" },
  { value: "oldest", label: "生成日時 古い順" },
  { value: "company", label: "銘柄名順" },
  { value: "analysisType", label: "分析タイプ順" },
  { value: "staleFirst", label: "古い分析優先" },
];

function Button({
  children,
  icon: Icon,
  variant = "secondary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  icon?: LucideIcon;
  variant?: "primary" | "secondary" | "ghost" | "danger";
}) {
  return (
    <DsActionButton {...props} icon={Icon} variant={variant} className={className}>
      {children}
    </DsActionButton>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <FormField label={label}>{children}</FormField>;
}

function inputClassName(extra = "") {
  return dsInputClassName(extra);
}

function formatDateTime(value: string): string {
  return value ? value.replace("T", " ").slice(0, 16) : "-";
}

function sanitizeFilename(value: string): string {
  return value
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, "-")
    .slice(0, 80) || "ai-history";
}

function downloadText(filename: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function rowTitle(row: AiHistoryRow): string {
  const ticker = row.stock?.ticker ? `_${row.stock.ticker}` : "";
  return sanitizeFilename(`${row.stock?.companyName ?? row.output.stockId}${ticker}_${row.output.type}_${row.output.createdAt.slice(0, 10)}`);
}

function ReportPreview({ row }: { row: AiHistoryRow }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-black text-ink">{row.report.title}</p>
        <StatusBadge>{row.output.type}</StatusBadge>
      </div>
      <div className="mt-3 grid gap-3">
        {row.report.sections.map((section) => (
          <details
            key={`${row.output.id}-${section.heading}`}
            open={section.heading.includes("注意")}
            className="border-t border-slate-200 pt-3 first:border-t-0 first:pt-0"
          >
            <summary className="cursor-pointer text-sm font-black text-ink">{section.heading}</summary>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-slate-700">
              {section.items.map((item, index) => <li key={`${section.heading}-${index}`}>{item}</li>)}
            </ul>
          </details>
        ))}
      </div>
      <p className="mt-3 text-xs font-bold text-slate-600">{row.report.disclaimer}</p>
    </div>
  );
}

function diffStatusLabel(status: AiComparisonData["sections"][number]["status"]): string {
  return {
    added: "追加あり",
    removed: "削除あり",
    "possible-change": "変更候補あり",
    unchanged: "変化なし",
  }[status];
}

function diffStatusTone(status: AiComparisonData["sections"][number]["status"]): "success" | "danger" | "warning" | "neutral" {
  if (status === "added") return "success";
  if (status === "removed") return "danger";
  if (status === "possible-change") return "warning";
  return "neutral";
}

function hasActionableDiff(section: AiComparisonData["sections"][number]): boolean {
  return section.addedItems.length > 0 || section.removedItems.length > 0 || section.possibleChangedItems.length > 0;
}

function DiffList({
  title,
  items,
  tone,
  testId,
}: {
  title: string;
  items: string[];
  tone: "success" | "danger" | "warning" | "neutral";
  testId?: string;
}) {
  if (items.length === 0) return null;

  const toneClass = {
    success: "border-emerald-200 bg-emerald-50 text-emerald-900",
    danger: "border-rose-200 bg-rose-50 text-rose-900",
    warning: "border-amber-200 bg-amber-50 text-amber-950",
    neutral: "border-slate-200 bg-slate-50 text-slate-700",
  }[tone];

  return (
    <div data-testid={testId} className={`rounded-md border p-3 ${toneClass}`}>
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge tone={tone}>{title}</StatusBadge>
        <span className="text-xs font-black">{items.length}件</span>
      </div>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6">
        {items.map((item, index) => <li key={`${title}-${index}`}>{item}</li>)}
      </ul>
    </div>
  );
}

function PossibleChangesList({
  items,
}: {
  items: AiComparisonData["sections"][number]["possibleChangedItems"];
}) {
  if (items.length === 0) return null;

  return (
    <div data-testid="ai-diff-possible-change-items" className="rounded-md border border-amber-200 bg-amber-50 p-3 text-amber-950">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge tone="warning">変更候補</StatusBadge>
        <span className="text-xs font-black">{items.length}件</span>
      </div>
      <ul className="mt-2 grid gap-2 text-sm leading-6">
        {items.map((item, index) => (
          <li key={`changed-${index}`} className="rounded-md bg-white/70 p-2">
            <span className="font-bold">旧:</span> {item.before}<br />
            <span className="font-bold">新:</span> {item.after}
          </li>
        ))}
      </ul>
    </div>
  );
}

function OriginalSectionComparison({
  section,
}: {
  section: AiComparisonData["sections"][number];
}) {
  return (
    <details className="rounded-md border border-slate-200 bg-slate-50 p-3">
      <summary className="cursor-pointer text-sm font-black text-ink">元レポートの該当セクション</summary>
      <div className="mt-3 grid gap-4 lg:grid-cols-2">
        <div>
          <p className="text-xs font-bold text-slate-500">古い分析</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-slate-700">
            {(section.leftItems.length ? section.leftItems : ["データ不足"]).map((item, index) => <li key={`left-${section.heading}-${index}`}>{item}</li>)}
          </ul>
        </div>
        <div>
          <p className="text-xs font-bold text-slate-500">新しい分析</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-slate-700">
            {(section.rightItems.length ? section.rightItems : ["データ不足"]).map((item, index) => <li key={`right-${section.heading}-${index}`}>{item}</li>)}
          </ul>
        </div>
      </div>
    </details>
  );
}

function ComparisonPanel({
  comparison,
  showUnchanged,
  onToggleUnchanged,
}: {
  comparison: AiComparisonData;
  showUnchanged: boolean;
  onToggleUnchanged: () => void;
}) {
  const left = comparison.left;
  const right = comparison.right;
  const changedSections = comparison.sections.filter(hasActionableDiff);
  const visibleSections = showUnchanged ? comparison.sections : changedSections;
  const unchangedSectionCount = comparison.sections.length - changedSections.length;
  const stockLabel = left.stock?.companyName ?? right.stock?.companyName ?? left.output.stockId;
  const tickerLabel = left.stock?.ticker ?? right.stock?.ticker;
  const analysisTypeLabel = left.output.type === right.output.type ? left.output.type : `${left.output.type} / ${right.output.type}`;

  return (
    <SectionCard
      data-testid="ai-comparison-view"
      title="AI分析差分サマリー"
      description="変わった項目を先に表示します。変化なし項目と元レポート全文は必要な時だけ開いて確認できます。"
      actions={(
        <div className="flex flex-wrap gap-2">
          <StatusBadge tone={comparison.sameContextHash ? "success" : "warning"}>
            contextHash: {comparison.sameContextHash ? "一致" : "不一致"}
          </StatusBadge>
          <StatusBadge>{comparison.sameContextHash ? "同じ入力データ" : "元データ更新の可能性あり"}</StatusBadge>
        </div>
      )}
    >

      <InfoAlert testId="ai-comparison-summary" tone={comparison.sameContextHash ? "success" : "warning"}>
        {comparison.summary.contextMessage}
      </InfoAlert>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard testId="ai-diff-added-count" label="追加項目数" value={comparison.summary.addedCount} tone="success" />
        <MetricCard testId="ai-diff-removed-count" label="削除項目数" value={comparison.summary.removedCount} tone="danger" />
        <MetricCard testId="ai-diff-possible-count" label="変更候補数" value={comparison.summary.possibleChangeCount} tone="warning" />
        <MetricCard testId="ai-diff-unchanged-count" label="変化なし項目数" value={comparison.summary.unchangedCount} tone="neutral" />
      </div>

      <div className="mt-4 grid gap-3 rounded-lg border border-line bg-slate-50 p-4 text-sm font-semibold text-slate-700 md:grid-cols-2 xl:grid-cols-4">
        <div>
          <p className="text-xs font-bold text-slate-500">比較対象の銘柄</p>
          <p className="mt-1 text-ink">{stockLabel}{tickerLabel ? ` (${tickerLabel})` : ""}</p>
        </div>
        <div>
          <p className="text-xs font-bold text-slate-500">分析タイプ</p>
          <p className="mt-1 text-ink">{analysisTypeLabel}</p>
        </div>
        <div>
          <p className="text-xs font-bold text-slate-500">古い分析日時</p>
          <p className="mt-1 text-ink">{formatDateTime(left.output.createdAt)}</p>
        </div>
        <div>
          <p className="text-xs font-bold text-slate-500">新しい分析日時</p>
          <p className="mt-1 text-ink">{formatDateTime(right.output.createdAt)}</p>
        </div>
      </div>

      {comparison.summary.metadataChanges.length > 0 ? (
        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-black text-ink">メタ情報の違い</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm font-semibold text-slate-700">
            {comparison.summary.metadataChanges.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </div>
      ) : null}

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {[left, right].map((row, index) => (
          <div key={row.output.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">{index === 0 ? "古い分析" : "新しい分析"}</p>
            <h3 className="mt-1 text-base font-black text-ink">{row.report.title}</h3>
            <div className="mt-2 grid gap-1 text-xs font-semibold text-slate-600">
              <span>{row.stock?.companyName ?? row.output.stockId} {row.stock?.ticker ? `(${row.stock.ticker})` : ""}</span>
              <span>{row.output.type} / {row.output.model}</span>
              <span>生成日時：{formatDateTime(row.output.createdAt)}</span>
              <span>contextHash：{row.output.sourceContextHash || "-"}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-col gap-3 rounded-lg border border-line bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-black text-ink">差分の表示範囲</p>
          <p className="mt-1 text-sm font-semibold text-slate-600">
            初期表示は追加・削除・変更候補のみです。変化なしの{comparison.summary.unchangedCount}件は必要な時だけ表示します。
          </p>
        </div>
        <Button data-testid="toggle-unchanged-diff" onClick={onToggleUnchanged}>
          {showUnchanged ? "変化なしを隠す" : `変化なしも表示 (${unchangedSectionCount}セクション)`}
        </Button>
      </div>

      {changedSections.length === 0 && !showUnchanged ? (
        <InfoAlert tone="info" className="mt-4">
          追加・削除・変更候補はありません。必要に応じて「変化なしも表示」から全文に近い確認へ進めます。
        </InfoAlert>
      ) : null}

      <div data-testid="ai-diff-section-list" className="mt-4 grid gap-3">
        {visibleSections.map((section) => {
          const hasDiff = hasActionableDiff(section);
          return (
            <CollapsibleSection
              key={section.heading}
              testId={hasDiff ? "ai-diff-changed-section" : "ai-diff-unchanged-section"}
              title={section.heading}
              description={hasDiff ? "このセクションには確認すべき差分があります。" : "このセクションは変化なしです。"}
              defaultOpen={hasDiff}
              className={hasDiff ? "shadow-none" : "bg-slate-50 shadow-none"}
            >
              <div className="flex flex-wrap gap-2">
                <StatusBadge tone={diffStatusTone(section.status)}>{diffStatusLabel(section.status)}</StatusBadge>
                <StatusBadge tone="success">追加 {section.addedItems.length}</StatusBadge>
                <StatusBadge tone="danger">削除 {section.removedItems.length}</StatusBadge>
                <StatusBadge tone="warning">変更候補 {section.possibleChangedItems.length}</StatusBadge>
                <StatusBadge tone="neutral">変化なし {section.unchangedItems.length}</StatusBadge>
              </div>

              <div className="mt-4 grid gap-3">
                <DiffList title="追加" items={section.addedItems} tone="success" testId="ai-diff-added-items" />
                <DiffList title="削除" items={section.removedItems} tone="danger" testId="ai-diff-removed-items" />
                <PossibleChangesList items={section.possibleChangedItems} />
                {showUnchanged ? (
                  <DiffList title="変化なし" items={section.unchangedItems} tone="neutral" testId="ai-diff-unchanged-items" />
                ) : null}
                <OriginalSectionComparison section={section} />
              </div>
            </CollapsibleSection>
          );
        })}
      </div>
    </SectionCard>
  );
}

export function AiHistoryView({ stocks, onBack }: { stocks: StockProfile[]; onBack: () => void }) {
  const [outputs, setOutputs] = useState(() => loadLlmOutputs());
  const [filters, setFilters] = useState<AiHistoryFilters>({ analysisType: "all", freshness: "all" });
  const [sortKey, setSortKey] = useState<AiHistorySortKey>("newest");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [showUnchangedDiff, setShowUnchangedDiff] = useState(false);
  const [message, setMessage] = useState("");

  const contextHashes = useMemo(() => {
    return new Map(
      stocks.map((stock) => [
        stock.id,
        buildStockResearchContext(stock.id, stocks)?.contextHash ?? "",
      ]),
    );
  }, [stocks]);

  const rows = useMemo(() => buildAiHistoryRows(stocks, outputs, contextHashes), [stocks, outputs, contextHashes]);
  const models = useMemo(() => Array.from(new Set(rows.map((row) => row.output.model).filter(Boolean))).sort(), [rows]);
  const filteredRows = useMemo(
    () => sortAiHistoryRows(filterAiHistoryRows(rows, filters), sortKey),
    [rows, filters, sortKey],
  );
  const selectedRows = compareIds
    .map((id) => rows.find((row) => row.output.id === id))
    .filter((row): row is AiHistoryRow => Boolean(row));
  const comparison = selectedRows.length === 2 ? createAiComparisonData(selectedRows[0], selectedRows[1]) : null;

  const updateFilter = <K extends keyof AiHistoryFilters>(key: K, value: AiHistoryFilters[K]) => {
    setFilters((current) => ({ ...current, [key]: value }));
  };

  const refreshOutputs = () => setOutputs(loadLlmOutputs());

  const copyText = async (text: string, successMessage: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setMessage(successMessage);
    } catch {
      setMessage("コピーに失敗しました。ブラウザの権限やクリップボード設定を確認してください。");
    }
  };

  const exportRowMarkdown = (row: AiHistoryRow) => {
    downloadText(`${rowTitle(row)}.md`, createAiHistoryMarkdown(row), "text/markdown;charset=utf-8");
    setMessage("Markdownをエクスポートしました。");
  };

  const exportRowJson = (row: AiHistoryRow) => {
    downloadText(`${rowTitle(row)}.json`, JSON.stringify(createAiHistoryJsonExport([row]), null, 2), "application/json;charset=utf-8");
    setMessage("JSONをエクスポートしました。");
  };

  const exportFilteredMarkdown = () => {
    downloadText("ai-history-filtered.md", createAiHistoryFullMarkdown(filteredRows), "text/markdown;charset=utf-8");
    setMessage("検索結果をMarkdownでエクスポートしました。");
  };

  const exportFilteredJson = () => {
    downloadText("ai-history-filtered.json", JSON.stringify(createAiHistoryJsonExport(filteredRows), null, 2), "application/json;charset=utf-8");
    setMessage("検索結果をJSONでエクスポートしました。");
  };

  const exportComparisonMarkdown = () => {
    if (!comparison) return;
    downloadText("ai-history-comparison.md", createAiComparisonMarkdown(comparison), "text/markdown;charset=utf-8");
    setMessage("比較結果をMarkdownでエクスポートしました。");
  };

  const exportComparisonJson = () => {
    if (!comparison) return;
    downloadText("ai-history-comparison.json", JSON.stringify(createAiComparisonJsonExport(comparison), null, 2), "application/json;charset=utf-8");
    setMessage("比較結果をJSONでエクスポートしました。");
  };

  const deleteOutput = (row: AiHistoryRow) => {
    const result = deleteLlmOutput(row.output.id);
    setMessage(result.message);
    if (result.ok) {
      refreshOutputs();
      setCompareIds((current) => current.filter((id) => id !== row.output.id));
      if (expandedId === row.output.id) {
        setExpandedId(null);
      }
    }
  };

  const toggleCompare = (row: AiHistoryRow) => {
    setShowUnchangedDiff(false);
    setCompareIds((current) => {
      if (current.includes(row.output.id)) {
        setMessage("");
        return current.filter((id) => id !== row.output.id);
      }

      if (current.length >= 2) {
        setMessage("比較できるAI分析は2件までです。");
        return current;
      }

      const first = current.length > 0 ? rows.find((item) => item.output.id === current[0]) : null;
      if (first && first.output.stockId !== row.output.stockId) {
        setMessage("同じ銘柄のAI分析を2件選んでください。");
        return current;
      }

      setMessage("");
      return [...current, row.output.id];
    });
  };

  return (
    <section data-testid="ai-history-view" className="grid gap-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-black text-ink">AI分析履歴</h1>
          <p className="mt-1 text-sm font-semibold text-slate-600">
            保存済みAI分析を全銘柄横断で検索・比較・エクスポートします。表示は調査補助であり、投資判断ではありません。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button data-testid="ai-history-back" icon={List} onClick={onBack}>一覧へ</Button>
          <Button data-testid="ai-history-export-markdown" icon={Download} onClick={exportFilteredMarkdown} disabled={filteredRows.length === 0}>検索結果Markdown</Button>
          <Button data-testid="ai-history-export-json" icon={FileJson} onClick={exportFilteredJson} disabled={filteredRows.length === 0}>検索結果JSON</Button>
        </div>
      </div>

      <Toolbar>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-lg font-bold text-ink">検索・絞り込み</h2>
            <p className="mt-1 text-sm font-semibold text-slate-600">
              銘柄名、ティッカー、分析タイプ、モデル、生成日、鮮度、キーワードで絞り込みできます。
            </p>
          </div>
          <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700">
            表示 {filteredRows.length}件 / 全{rows.length}件
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Field label="銘柄名・ティッカー">
            <div className="relative">
              <Search aria-hidden className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <input
                data-testid="ai-history-stock-query"
                className={inputClassName("w-full pl-9")}
                value={filters.stockQuery ?? ""}
                onChange={(event) => updateFilter("stockQuery", event.target.value)}
                placeholder="例: TEST / サンプル"
              />
            </div>
          </Field>
          <Field label="分析タイプ">
            <select
              data-testid="ai-history-type-filter"
              className={inputClassName()}
              value={filters.analysisType ?? "all"}
              onChange={(event) => updateFilter("analysisType", event.target.value as LlmOutputType | "all")}
            >
              <option value="all">すべて</option>
              {LLM_ANALYSIS_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
          </Field>
          <Field label="モデル">
            <select
              data-testid="ai-history-model-filter"
              className={inputClassName()}
              value={filters.model ?? ""}
              onChange={(event) => updateFilter("model", event.target.value)}
            >
              <option value="">すべて</option>
              {models.map((model) => <option key={model} value={model}>{model}</option>)}
            </select>
          </Field>
          <Field label="生成日">
            <input
              data-testid="ai-history-date-filter"
              className={inputClassName()}
              type="date"
              value={filters.generatedDate ?? ""}
              onChange={(event) => updateFilter("generatedDate", event.target.value)}
            />
          </Field>
          <Field label="鮮度">
            <select
              data-testid="ai-history-freshness-filter"
              className={inputClassName()}
              value={filters.freshness ?? "all"}
              onChange={(event) => updateFilter("freshness", event.target.value as AiHistoryFreshnessFilter)}
            >
              <option value="all">すべて</option>
              <option value="current">最新データに基づく</option>
              <option value="stale">古い分析</option>
            </select>
          </Field>
          <Field label="キーワード">
            <input
              data-testid="ai-history-keyword-filter"
              className={inputClassName()}
              value={filters.keyword ?? ""}
              onChange={(event) => updateFilter("keyword", event.target.value)}
              placeholder="見出し・本文・注意文を検索"
            />
          </Field>
          <Field label="並び替え">
            <select
              data-testid="ai-history-sort"
              className={inputClassName()}
              value={sortKey}
              onChange={(event) => setSortKey(event.target.value as AiHistorySortKey)}
            >
              {SORT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </Field>
          <div className="flex items-end">
            <Button
              data-testid="ai-history-reset-filters"
              icon={Search}
              className="w-full"
              onClick={() => {
                setFilters({ analysisType: "all", freshness: "all" });
                setSortKey("newest");
                setMessage("");
              }}
            >
              条件リセット
            </Button>
          </div>
        </div>
      </Toolbar>

      {message ? (
        <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700">
          {message}
        </div>
      ) : null}

      {comparison ? (
        <>
          <div className="flex flex-wrap gap-2">
            <Button data-testid="ai-history-copy-comparison" icon={Copy} onClick={() => copyText(createAiComparisonMarkdown(comparison), "比較結果をコピーしました。")}>比較をコピー</Button>
            <Button data-testid="ai-history-export-comparison-markdown" icon={Download} onClick={exportComparisonMarkdown}>比較Markdown</Button>
            <Button data-testid="ai-history-export-comparison-json" icon={FileJson} onClick={exportComparisonJson}>比較JSON</Button>
          </div>
          <ComparisonPanel
            comparison={comparison}
            showUnchanged={showUnchangedDiff}
            onToggleUnchanged={() => setShowUnchangedDiff((current) => !current)}
          />
        </>
      ) : compareIds.length === 1 ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-950">
          比較するAI分析をもう1件選んでください。同じ銘柄の履歴のみ比較できます。
        </div>
      ) : null}

      <CollapsibleSection
        key={comparison ? "comparison-history-list" : "plain-history-list"}
        testId="ai-history-list-panel"
        title={comparison ? "履歴一覧・比較対象を変更する" : "履歴一覧"}
        description={comparison ? "比較結果に集中するため、履歴一覧は閉じています。開くと比較対象を変更できます。" : "2件を選ぶと比較できます。旧content形式の履歴も表示・コピーできます。"}
        defaultOpen={!comparison}
      >
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-600">
              比較対象を変える場合は、チェックを外して別の履歴を選び直してください。
            </p>
          </div>
          <Button
            data-testid="ai-history-copy-summary"
            icon={Copy}
            onClick={() => copyText(createAiHistoryListMarkdown(filteredRows, "AI分析履歴 検索結果"), "検索結果の概要をコピーしました。")}
            disabled={filteredRows.length === 0}
          >
            概要コピー
          </Button>
        </div>

        {filteredRows.length === 0 ? (
          <p className="p-6 text-sm font-semibold text-slate-500">データ不足</p>
        ) : (
          <div data-testid="ai-history-list" className="mt-4 grid gap-3">
            {filteredRows.map((row) => {
              const isExpanded = expandedId === row.output.id;
              const isSelected = compareIds.includes(row.output.id);

              return (
                <article key={row.output.id} className="rounded-lg border border-slate-200 bg-white p-4">
                  <div className="grid gap-3 xl:grid-cols-[1.1fr_1fr_auto] xl:items-start">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <label className="inline-flex items-center gap-2 text-sm font-bold text-slate-700">
                          <input
                            data-testid={`ai-history-compare-${row.output.id}`}
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleCompare(row)}
                          />
                          比較
                        </label>
                        <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-bold text-slate-700">{row.output.type}</span>
                        <span className={`rounded-md px-2 py-1 text-xs font-bold ${row.isCurrent ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900"}`}>
                          {row.isCurrent ? "最新データに基づく分析" : "古い分析"}
                        </span>
                      </div>
                      <h3 className="mt-2 text-base font-black text-ink">{row.stock?.companyName ?? "銘柄データ不足"}</h3>
                      <p className="mt-1 text-sm font-semibold text-slate-600">{row.stock?.ticker ?? row.output.stockId}</p>
                      <p className="mt-2 text-sm font-bold text-ink">{row.report.title}</p>
                    </div>

                    <div className="grid gap-1 text-sm font-semibold text-slate-600">
                      <span>生成日時：{formatDateTime(row.output.createdAt)}</span>
                      <span>更新日時：{formatDateTime(row.output.updatedAt)}</span>
                      <span>モデル：{row.output.model || "-"}</span>
                      <span>contextHash：{row.output.sourceContextHash || "-"}</span>
                      <span className="text-xs text-slate-500">{row.report.disclaimer}</span>
                    </div>

                    <div className="flex flex-wrap gap-2 xl:justify-end">
                      <Button data-testid={`ai-history-detail-${row.output.id}`} icon={Eye} onClick={() => setExpandedId(isExpanded ? null : row.output.id)}>
                        {isExpanded ? "閉じる" : "詳細表示"}
                      </Button>
                      <Button data-testid={`ai-history-copy-${row.output.id}`} icon={Copy} onClick={() => copyText(createAiHistoryMarkdown(row), "AI分析をコピーしました。")}>コピー</Button>
                      <Button data-testid={`ai-history-export-md-${row.output.id}`} icon={Download} onClick={() => exportRowMarkdown(row)}>Markdown</Button>
                      <Button data-testid={`ai-history-export-json-${row.output.id}`} icon={FileJson} onClick={() => exportRowJson(row)}>JSON</Button>
                      <Button data-testid={`ai-history-delete-${row.output.id}`} icon={Trash2} variant="danger" onClick={() => deleteOutput(row)}>削除</Button>
                    </div>
                  </div>

                  {isExpanded ? (
                    <div className="mt-4">
                      <ReportPreview row={row} />
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}
      </CollapsibleSection>
    </section>
  );
}
