"use client";

import { daysUntil, isUpcomingDate } from "@/lib/date-utils";
import type { FundamentalAnalysis, NewsItem, StockProfile } from "@/lib/types";
import { getAllEarningsCalendarItems } from "@/services/earningsCalendarService";
import { getRecentNews } from "@/services/newsService";
import { getHighPriorityOpenTasks, getOverdueTasks, getUpcomingTasks } from "@/services/taskService";
import { EmptyState, MetricCard, SectionCard } from "@/components/ui/design-system";

type DashboardRow = {
  stock: StockProfile;
  fundamentalAnalysis: FundamentalAnalysis;
  riskScore: number;
};

function MetricTile({ label, value }: { label: string; value: string }) {
  return <MetricCard label={label} value={value} />;
}

function DashboardList({ title, rows }: { title: string; rows: string[] }) {
  return (
    <SectionCard title={title}>
      {rows.length === 0 ? (
        <EmptyState title="該当なし" />
      ) : (
        <ul className="grid gap-2 text-sm font-semibold text-slate-700">
          {rows.slice(0, 6).map((row) => <li key={row}>{row}</li>)}
        </ul>
      )}
    </SectionCard>
  );
}

export function DashboardView({ rows }: { rows: DashboardRow[] }) {
  const stocks = rows.map((row) => row.stock);
  const watchRows = rows.filter((row) => row.stock.watchlist);
  const highPriorityRows = watchRows.filter((row) => row.stock.watchlist?.priority === "高");
  const upcomingRows = watchRows.filter((row) => isUpcomingDate(row.stock.watchlist?.nextReviewDate ?? ""));
  const earningsCheckRows = rows.filter((row) => row.stock.priceReview.checkAfterEarnings || row.stock.watchlist?.nextCheck.includes("決算"));
  const highRiskRows = rows.filter((row) => row.riskScore >= 13);
  const highScoreHighRiskRows = rows.filter((row) => row.fundamentalAnalysis.totalResearchScore >= 80 && row.riskScore >= 13);
  const calendarItems = getAllEarningsCalendarItems(stocks);
  const upcomingEarnings = calendarItems.filter(({ item }) => isUpcomingDate(item.earningsDate, 45));
  const uncheckedEarnings = calendarItems.filter(({ item }) => item.status === "未確認");
  const checkedEarnings = calendarItems.filter(({ item }) => item.status === "確認済み");
  const overdueTasks = getOverdueTasks(stocks);
  const upcomingTasks = getUpcomingTasks(stocks, 7);
  const highPriorityTasks = getHighPriorityOpenTasks(stocks);
  const recentNews = getRecentNews(stocks, 5);
  const allNewsRows = rows.flatMap((row) => row.stock.news.map((news: NewsItem) => ({ stock: row.stock, news })));
  const uncheckedNews = allNewsRows.filter(({ news }) => !news.checked);
  const highImportanceNews = allNewsRows.filter(({ news }) => news.importance === "高");
  const negativeNews = allNewsRows.filter(({ news }) => news.sentiment === "ネガティブ");
  const recentPriceUpdates = rows
    .flatMap((row) => row.stock.priceUpdateHistories.slice(0, 3).map((history) => ({ stock: row.stock, history })))
    .sort((a, b) => b.history.updatedAt.localeCompare(a.history.updatedAt))
    .slice(0, 5);
  const dataUpdateRows = recentPriceUpdates.length > 0
    ? recentPriceUpdates.map(({ stock, history }) => `${stock.ticker} ${history.method} ${history.success ? "更新成功" : "更新失敗"} / ${history.updatedAt.replace("T", " ").slice(0, 16)}`)
    : ["株価データAPI：Mock API対応", "財務データAPI：API未実装", "ニュースAPI：API未実装", "決算カレンダーAPI：API未実装"];
  const recentResearchMemos = rows
    .flatMap((row) => row.stock.researchMemos.map((memo) => ({ memo, stock: row.stock })))
    .sort((a, b) => b.memo.date.localeCompare(a.memo.date))
    .slice(0, 5);
  const dataShortageRows = rows
    .filter((row) => row.stock.prices.length === 0 || row.stock.earnings.length === 0)
    .slice(0, 6)
    .map((row) => `${row.stock.ticker} ${row.stock.prices.length === 0 ? "株価データ不足" : ""}${row.stock.earnings.length === 0 ? " 業績データ不足" : ""}`.trim());
  const todayFocusRows = [
    ...overdueTasks.slice(0, 3).map(({ stock, task }) => `${stock.ticker} 期限切れタスク: ${task.title}`),
    ...upcomingTasks.slice(0, 3).map(({ stock, task }) => `${stock.ticker} 7日以内: ${task.title}`),
    ...upcomingEarnings.slice(0, 3).map(({ stock, item }) => `${stock.ticker} 決算予定: ${item.earningsDate}`),
  ].slice(0, 6);
  const alertRows = [
    ...dataShortageRows,
    ...negativeNews.slice(0, 3).map(({ stock, news }) => `${stock.ticker} ネガティブ材料: ${news.title}`),
    ...highRiskRows.slice(0, 3).map((row) => `${row.stock.ticker} リスクスコア ${row.riskScore}`),
  ].slice(0, 6);

  return (
    <section className="grid gap-4">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <SectionCard title="今日の要確認" description="期限、近日決算、未確認ニュースなど、先に見る候補です。">
          {todayFocusRows.length === 0 ? (
            <EmptyState title="直近の要確認は少なめです" />
          ) : (
            <ul className="grid gap-2 text-sm font-semibold text-slate-700">
              {todayFocusRows.map((row) => <li key={row} className="rounded-md border border-line px-3 py-2">{row}</li>)}
            </ul>
          )}
        </SectionCard>
        <SectionCard title="重要アラート" description="データ不足やリスク高めの確認候補です。">
          {alertRows.length === 0 ? (
            <EmptyState title="目立つアラートはありません" />
          ) : (
            <ul className="grid gap-2 text-sm font-semibold text-slate-700">
              {alertRows.map((row) => <li key={row} className="rounded-md border border-line px-3 py-2">{row}</li>)}
            </ul>
          )}
        </SectionCard>
      </div>
      <SectionCard title="銘柄概要" description="全体の登録状況です。スコアは機械的な表示であり、投資判断ではありません。">
        <div className="grid gap-3 md:grid-cols-4">
        <MetricTile label="ウォッチリスト銘柄数" value={`${watchRows.length}`} />
        <MetricTile label="優先度 高" value={`${highPriorityRows.length}`} />
        <MetricTile label="確認日が近い" value={`${upcomingRows.length}`} />
        <MetricTile label="リスク要確認" value={`${highRiskRows.length}`} />
        </div>
      </SectionCard>
      <div className="grid gap-3 md:grid-cols-4">
        <MetricTile label="近日中の決算予定" value={`${upcomingEarnings.length}`} />
        <MetricTile label="未確認の決算" value={`${uncheckedEarnings.length}`} />
        <MetricTile label="確認済みの決算" value={`${checkedEarnings.length}`} />
        <MetricTile label="最近のニュース" value={`${recentNews.length}`} />
      </div>
      <div className="grid gap-3 md:grid-cols-4">
        <MetricTile label="未確認ニュース" value={`${uncheckedNews.length}`} />
        <MetricTile label="重要度 高のニュース" value={`${highImportanceNews.length}`} />
        <MetricTile label="ネガティブ材料" value={`${negativeNews.length}`} />
        <MetricTile label="ニュース確認優先" value={`${uncheckedNews.filter(({ news }) => news.importance === "高" || news.sentiment === "ネガティブ").length}`} />
      </div>
      <div className="grid gap-3 md:grid-cols-4">
        <MetricTile label="期限切れタスク" value={`${overdueTasks.length}`} />
        <MetricTile label="7日以内タスク" value={`${upcomingTasks.length}`} />
        <MetricTile label="高優先度 未完了" value={`${highPriorityTasks.length}`} />
        <MetricTile label="確認タスク総数" value={`${stocks.reduce((sum, stock) => sum + stock.confirmationTasks.length, 0)}`} />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <DashboardList title="次回確認日が近い銘柄" rows={upcomingRows.map((row) => `${row.stock.ticker} ${row.stock.watchlist?.nextReviewDate || ""}`)} />
        <DashboardList title="決算確認が必要な銘柄" rows={earningsCheckRows.map((row) => `${row.stock.ticker} ${row.stock.watchlist?.nextCheck || "要確認"}`)} />
        <DashboardList title="総合調査スコア高め + リスク高め" rows={highScoreHighRiskRows.map((row) => `${row.stock.ticker} 総合${row.fundamentalAnalysis.totalResearchScore} / リスク${row.riskScore}`)} />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <DashboardList
          title="近日中に確認する決算"
          rows={upcomingEarnings.map(({ stock, item }) => {
            const diff = daysUntil(item.earningsDate);
            return `${stock.ticker} ${item.earningsDate} ${item.fiscalQuarter}${diff === null ? "" : ` / あと${diff}日`}`;
          })}
        />
        <DashboardList title="未確認の決算" rows={uncheckedEarnings.map(({ stock, item }) => `${stock.ticker} ${item.earningsDate} ${item.memo || "要確認"}`)} />
        <DashboardList title="データ更新状況" rows={dataUpdateRows} />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <DashboardList title="期限切れタスク" rows={overdueTasks.slice(0, 6).map(({ stock, task }) => `${stock.ticker} ${task.dueDate} ${task.title}`)} />
        <DashboardList title="今後7日以内のタスク" rows={upcomingTasks.slice(0, 6).map(({ stock, task }) => `${stock.ticker} ${task.dueDate} ${task.title}`)} />
        <DashboardList title="優先度 高の未完了タスク" rows={highPriorityTasks.slice(0, 6).map(({ stock, task }) => `${stock.ticker} ${task.dueDate} ${task.title}`)} />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <DashboardList title="未確認ニュース" rows={uncheckedNews.slice(0, 6).map(({ stock, news }) => `${stock.ticker} ${news.date} ${news.title}`)} />
        <DashboardList title="重要度 高のニュース" rows={highImportanceNews.slice(0, 6).map(({ stock, news }) => `${stock.ticker} ${news.date} ${news.title}`)} />
        <DashboardList title="ネガティブ材料のニュース" rows={negativeNews.slice(0, 6).map(({ stock, news }) => `${stock.ticker} ${news.date} ${news.title}`)} />
      </div>
      <SectionCard title="最近のニュース">
        {recentNews.length === 0 ? (
          <EmptyState title="ニュースはまだありません" />
        ) : (
          <div className="grid gap-2">
            {recentNews.map(({ stock, news }) => (
              <div key={news.id} className="rounded-md border border-line px-3 py-2 text-sm">
                <p className="font-bold text-ink">{stock.ticker} / {news.date} / {news.title}</p>
                <p className="mt-1 text-slate-600">{news.summary || "要確認"}</p>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
      <SectionCard title="最近追加した調査メモ">
        {recentResearchMemos.length === 0 ? (
          <EmptyState title="調査メモはまだありません" />
        ) : (
          <div className="grid gap-2">
            {recentResearchMemos.map(({ memo, stock }) => (
              <div key={memo.id} className="rounded-md border border-line px-3 py-2 text-sm">
                <p className="font-bold text-ink">{stock.ticker} / {memo.date} / {memo.title || memo.type}</p>
                <p className="mt-1 text-slate-600">{memo.content || "-"}</p>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </section>
  );
}
