import { mockApiDataSource } from "@/lib/dataSource";
import type { EarningsCalendarItem, Quarter, StockProfile } from "@/lib/types";

const QUARTERS: Quarter[] = ["Q1", "Q2", "Q3", "Q4", "通期"];

function createCalendarId(stockId: string, index: number): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `mock-calendar-${stockId}-${Date.now()}-${index}-${Math.random().toString(16).slice(2)}`;
}

function tickerSeed(ticker: string): number {
  return ticker
    .trim()
    .toUpperCase()
    .split("")
    .reduce((sum, char, index) => sum + char.charCodeAt(0) * (index + 5), 97);
}

function dateDaysAhead(daysAhead: number): string {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + daysAhead);
  return date.toISOString().slice(0, 10);
}

export const MockEarningsCalendarAdapter = {
  async fetchCalendar(stock: StockProfile): Promise<{ items: EarningsCalendarItem[]; message: string }> {
    const seed = tickerSeed(stock.ticker);
    const count = 1 + (seed % 4);
    const now = new Date().toISOString();
    const dataSource = mockApiDataSource(now, `取得件数：${count}件`);
    const baseYear = new Date().getFullYear();

    const items: EarningsCalendarItem[] = Array.from({ length: count }, (_, index) => {
      const quarter = QUARTERS[(seed + index) % QUARTERS.length];
      const earningsDate = dateDaysAhead(7 + index * 35 + (seed % 9));

      return {
        id: createCalendarId(stock.id, index),
        stockId: stock.id,
        ticker: stock.ticker,
        companyName: stock.companyName,
        earningsDate,
        scheduledDate: earningsDate,
        fiscalYear: String(baseYear + Math.floor((index + (seed % 2)) / 4)),
        fiscalQuarter: quarter,
        quarter,
        status: index === 0 ? "確認予定" : "未確認",
        source: "Mock API",
        memo: "Mock APIが生成した決算予定です。外部API連携前の動作確認用データです。",
        dataSource,
        createdAt: now,
        updatedAt: now,
      };
    });

    return {
      items,
      message: `Mock APIから決算予定を取得しました（${items.length}件）。`,
    };
  },
};
