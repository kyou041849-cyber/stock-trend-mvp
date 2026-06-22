"use client";

import {
  ArrowDownWideNarrow,
  ArrowUpWideNarrow,
  BarChart3,
  CheckCircle2,
  List,
  Pencil,
  Plus,
  Settings,
  ShieldCheck,
  Trash2,
  Upload,
} from "lucide-react";
import { daysUntil, latestDate } from "@/lib/date-utils";
import { formatNumber } from "@/lib/format";
import { formatValuationWarningLabels } from "@/lib/growth-math";
import { getIncompleteTasks } from "@/services/taskService";
import type {
  ConfirmationTask,
  EarningsCalendarItem,
  FundamentalAnalysis,
  NewsItem,
  ResearchPriority,
  StockProfile,
  TrendAnalysis,
  WatchStatus,
} from "@/lib/types";
import {
  ActionButton,
  EmptyState,
  FormField,
  PageHeader,
  StatusBadge,
  inputClassName,
} from "@/components/ui/design-system";
import { DashboardView } from "./DashboardView";

export type SortKey = "total" | "trend" | "growth" | "safety" | "risk" | "nextReview" | "status" | "priority";

type StockListRow = {
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

function formatDateTime(value: string): string {
  return value ? value.replace("T", " ").slice(0, 16) : "-";
}

function formatFetchStatus(status: StockProfile["priceDataSource"]["status"]): string {
  const labels: Record<StockProfile["priceDataSource"]["status"], string> = {
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

function ScorePill({ score, testId }: { score: number; testId?: string }) {
  return <StatusBadge testId={testId} className={`min-w-14 ${scoreClassName(score)}`}>{score}</StatusBadge>;
}

function RiskPill({ score, testId }: { score: number; testId?: string }) {
  return <StatusBadge testId={testId} className={`min-w-14 ${riskClassName(score)}`}>{score}</StatusBadge>;
}

function getLatestNewsDate(news: NewsItem[]): string | null {
  return latestDate(news.map((item) => item.date));
}

function countUncheckedNews(news: NewsItem[]): number {
  return news.filter((item) => !item.checked).length;
}

function countHighImportanceNews(news: NewsItem[]): number {
  return news.filter((item) => item.importance === "高").length;
}

function countNegativeNews(news: NewsItem[]): number {
  return news.filter((item) => item.sentiment === "ネガティブ").length;
}

function getNextEarningsCalendarItem(items: EarningsCalendarItem[]): EarningsCalendarItem | null {
  const upcoming = [...items]
    .filter((item) => {
      const diff = daysUntil(item.earningsDate);
      return diff !== null && diff >= 0;
    })
    .sort((a, b) => a.earningsDate.localeCompare(b.earningsDate));
  return upcoming.at(0) ?? null;
}

function countIncompleteTasks(tasks: ConfirmationTask[]): number {
  return getIncompleteTasks(tasks).length;
}

function countHighPriorityOpenTasks(tasks: ConfirmationTask[]): number {
  return getIncompleteTasks(tasks).filter((task) => task.priority === "高").length;
}

export function StockListView({
  rows,
  sortDirection,
  sortKey,
  statusFilter,
  priorityFilter,
  onToggleSort,
  onSetSortKey,
  onSetStatusFilter,
  onSetPriorityFilter,
  onCreate,
  onEdit,
  onDetail,
  onPriceImport,
  onEarnings,
  onWatch,
  onEarningsMemo,
  onRisk,
  onResearchMemo,
  onTasks,
  onAiHistory,
  onSettings,
  onDelete,
}: {
  rows: StockListRow[];
  sortDirection: "desc" | "asc";
  sortKey: SortKey;
  statusFilter: "すべて" | WatchStatus;
  priorityFilter: "すべて" | ResearchPriority;
  onToggleSort: () => void;
  onSetSortKey: (key: SortKey) => void;
  onSetStatusFilter: (value: "すべて" | WatchStatus) => void;
  onSetPriorityFilter: (value: "すべて" | ResearchPriority) => void;
  onCreate: () => void;
  onEdit: (stockId: string) => void;
  onDetail: (stockId: string) => void;
  onPriceImport: (stockId?: string) => void;
  onEarnings: (stockId?: string) => void;
  onWatch: (stockId?: string) => void;
  onEarningsMemo: (stockId?: string) => void;
  onRisk: (stockId?: string) => void;
  onResearchMemo: (stockId?: string) => void;
  onTasks: (stockId?: string) => void;
  onAiHistory: () => void;
  onSettings: () => void;
  onDelete: (stockId: string) => void;
}) {
  return (
    <section className="grid gap-5">
      <PageHeader
        title="ダッシュボード / 銘柄一覧"
        actions={(
          <>
            <ActionButton data-testid="list-watch" icon={ShieldCheck} onClick={() => onWatch()} disabled={rows.length === 0}>ウォッチ</ActionButton>
            <ActionButton data-testid="list-risk" icon={ShieldCheck} onClick={() => onRisk()} disabled={rows.length === 0}>リスク</ActionButton>
            <ActionButton data-testid="list-earnings-memo" icon={Pencil} onClick={() => onEarningsMemo()} disabled={rows.length === 0}>決算メモ</ActionButton>
            <ActionButton data-testid="list-research-memo" icon={Pencil} onClick={() => onResearchMemo()} disabled={rows.length === 0}>調査メモ</ActionButton>
            <ActionButton data-testid="list-tasks" icon={CheckCircle2} onClick={() => onTasks()} disabled={rows.length === 0}>タスク</ActionButton>
            <ActionButton data-testid="list-earnings" icon={Plus} onClick={() => onEarnings()} disabled={rows.length === 0}>業績</ActionButton>
            <ActionButton data-testid="list-ai-history" icon={BarChart3} onClick={onAiHistory}>AI履歴</ActionButton>
            <ActionButton data-testid="list-settings" icon={Settings} onClick={onSettings}>設定</ActionButton>
            <ActionButton data-testid="create-stock" icon={Plus} variant="primary" onClick={onCreate}>銘柄登録</ActionButton>
          </>
        )}
      />

      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-950">
        このアプリは調査補助ツールです。スコアやメモの集計は機械的な集計であり、投資判断ではありません。
      </div>

      <DashboardView rows={rows} />

      <div data-testid="stock-list" className="overflow-hidden rounded-lg border border-line bg-white shadow-panel">
        <div className="grid gap-3 border-b border-line px-4 py-3 lg:grid-cols-[1fr_auto]">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <FormField label="監視ステータス">
              <select data-testid="status-filter" className={inputClassName()} value={statusFilter} onChange={(event) => onSetStatusFilter(event.target.value as "すべて" | WatchStatus)}>
                {["すべて", ...WATCH_STATUSES].map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            </FormField>
            <FormField label="調査優先度">
              <select data-testid="priority-filter" className={inputClassName()} value={priorityFilter} onChange={(event) => onSetPriorityFilter(event.target.value as "すべて" | ResearchPriority)}>
                {["すべて", ...PRIORITIES].map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            </FormField>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            {[
              ["total", "総合"],
              ["risk", "リスク"],
              ["nextReview", "確認日"],
              ["status", "ステータス"],
              ["priority", "優先度"],
              ["trend", "トレンド"],
              ["growth", "成長性"],
              ["safety", "安全性"],
            ].map(([key, label]) => (
              <ActionButton key={key} data-testid={`sort-${key}`} variant={sortKey === key ? "primary" : "secondary"} onClick={() => onSetSortKey(key as SortKey)}>
                {label}
              </ActionButton>
            ))}
            <ActionButton icon={sortDirection === "desc" ? ArrowDownWideNarrow : ArrowUpWideNarrow} onClick={onToggleSort}>方向</ActionButton>
          </div>
        </div>

        <div className="border-b border-line bg-slate-50/70 px-4 py-2 text-xs font-semibold text-slate-600">
          一覧では比較に必要な情報だけを表示します。詳細なスコア、履歴、削除操作は詳細画面または「その他」にまとめています。
        </div>

        {rows.length === 0 ? (
          <EmptyState title="銘柄が未登録です" icon={BarChart3} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1280px] border-collapse text-sm">
              <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
                <tr>
                  <th className="px-4 py-3">銘柄</th>
                  <th className="px-4 py-3">主要スコア</th>
                  <th className="px-4 py-3">監視状態</th>
                  <th className="px-4 py-3">ニュース / 決算</th>
                  <th className="px-4 py-3">タスク / リスク</th>
                  <th className="px-4 py-3">データ更新</th>
                  <th className="px-4 py-3 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map(({ stock, trendAnalysis, fundamentalAnalysis, riskScore, riskLabel, latestEarningsMemoDate, latestResearchMemoDate }) => (
                  <tr key={stock.id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3">
                      <p className="font-bold text-ink">{stock.ticker}</p>
                      <p className="mt-1 text-sm text-slate-700">{stock.companyName || "-"}</p>
                      <p className="mt-1 text-xs font-semibold text-slate-500">{stock.market || "-"} / {stock.sector || "-"}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <ScorePill score={fundamentalAnalysis.totalResearchScore} testId="list-total-score" />
                        <ScorePill score={trendAnalysis.score} testId="list-score" />
                        <ScorePill score={fundamentalAnalysis.growthScore} testId="list-growth-score" />
                        <ScorePill score={fundamentalAnalysis.financialSafetyScore} testId="list-safety-score" />
                      </div>
                      <p className="mt-2 text-xs font-semibold text-slate-500">総合 / トレンド / 成長性 / 安全性</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <StatusBadge testId="list-watch-status">{stock.watchlist?.status ?? "-"}</StatusBadge>
                        <StatusBadge testId="list-priority" tone={stock.watchlist?.priority === "高" ? "warning" : "neutral"}>{stock.watchlist?.priority ?? "-"}</StatusBadge>
                      </div>
                      <p data-testid="list-next-review" className="mt-2 text-xs font-semibold text-slate-600">次回確認: {stock.watchlist?.nextReviewDate || "-"}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      <p data-testid="list-latest-news-date" className="font-semibold">最新ニュース: {getLatestNewsDate(stock.news) ?? "-"}</p>
                      <p className="mt-1 text-xs font-semibold text-slate-500">
                        未確認 <span data-testid="list-unchecked-news-count">{countUncheckedNews(stock.news)}</span> / 重要 <span data-testid="list-important-news-count">{countHighImportanceNews(stock.news)}</span> / ネガティブ <span data-testid="list-negative-news-count">{countNegativeNews(stock.news)}</span>
                      </p>
                      <p data-testid="list-next-earnings-date" className="mt-1 text-xs font-semibold text-slate-600">次回決算: {getNextEarningsCalendarItem(stock.earningsCalendar)?.earningsDate ?? "-"}</p>
                      <p data-testid="list-earnings-calendar-status" className="mt-1 text-xs font-semibold text-slate-500">決算状態: {getNextEarningsCalendarItem(stock.earningsCalendar)?.status ?? "-"}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <RiskPill score={riskScore} testId="list-risk-score" />
                        <StatusBadge tone={riskScore >= 13 ? "warning" : "neutral"}>{riskLabel}</StatusBadge>
                      </div>
                      <p className="mt-2 text-xs font-semibold text-slate-600">未完了 <span data-testid="list-incomplete-task-count">{countIncompleteTasks(stock.confirmationTasks)}</span> / 高優先度 <span data-testid="list-high-task-count">{countHighPriorityOpenTasks(stock.confirmationTasks)}</span></p>
                    </td>
                    <td className="px-4 py-3 text-xs font-semibold text-slate-600">
                      <p data-testid="list-price-updated-at">株価: {stock.priceDataSource.updatedAt ? formatDateTime(stock.priceDataSource.updatedAt) : "-"}</p>
                      <p data-testid="list-price-status" className="mt-1">{formatFetchStatus(stock.priceDataSource.status)} / <span data-testid="list-price-source">{stock.priceDataSource.label}</span></p>
                      <p data-testid="list-fundamental-updated-at" className="mt-2">業績: {stock.fundamentalDataSource.updatedAt ? formatDateTime(stock.fundamentalDataSource.updatedAt) : "-"}</p>
                      <p data-testid="list-growth-status" className="mt-1">{fundamentalAnalysis.rows.length > 0 ? formatFetchStatus(stock.fundamentalDataSource.status) : "データ不足"} / <span data-testid="list-fundamental-source">{stock.fundamentalDataSource.label}</span></p>
                      <span data-testid="list-safety-status" className="sr-only">{fundamentalAnalysis.rows.length > 0 ? formatFetchStatus(stock.fundamentalDataSource.status) : "データ不足"}</span>
                      <span data-testid="list-earnings-memo-date" className="sr-only">{latestEarningsMemoDate ?? "-"}</span>
                      <span data-testid="list-research-memo-date" className="sr-only">{latestResearchMemoDate ?? "-"}</span>
                      <span className="sr-only">{formatNumber(fundamentalAnalysis.metrics.latestPer)} {formatNumber(fundamentalAnalysis.metrics.latestPsr)} {formatValuationWarningLabels(fundamentalAnalysis.valuationWarnings)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex min-w-48 flex-col items-end gap-2">
                        <ActionButton data-testid="detail-stock" className="h-9 w-full px-2" icon={BarChart3} variant="primary" onClick={() => onDetail(stock.id)}>詳細</ActionButton>
                        <ActionButton data-testid="edit-stock" className="h-9 w-full px-2" icon={Pencil} onClick={() => onEdit(stock.id)}>編集</ActionButton>
                        <details className="w-full rounded-md border border-line bg-slate-50 px-2 py-1 text-xs font-bold text-slate-700">
                          <summary className="cursor-pointer py-1 text-center">その他</summary>
                          <div className="mt-2 grid gap-2">
                            <ActionButton data-testid="row-watch" className="h-9 w-full px-2" icon={ShieldCheck} onClick={() => onWatch(stock.id)}>ウォッチ</ActionButton>
                            <ActionButton data-testid="row-risk" className="h-9 w-full px-2" icon={ShieldCheck} onClick={() => onRisk(stock.id)}>リスク</ActionButton>
                            <ActionButton data-testid="row-research" className="h-9 w-full px-2" icon={Pencil} onClick={() => onResearchMemo(stock.id)}>メモ</ActionButton>
                            <ActionButton data-testid="row-tasks" className="h-9 w-full px-2" icon={CheckCircle2} onClick={() => onTasks(stock.id)}>タスク</ActionButton>
                            <ActionButton data-testid="row-price-import" className="h-9 w-full px-2" icon={Upload} onClick={() => onPriceImport(stock.id)}>株価</ActionButton>
                            <ActionButton className="h-9 w-full px-2" icon={Trash2} variant="danger" onClick={() => onDelete(stock.id)}>削除</ActionButton>
                          </div>
                        </details>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
