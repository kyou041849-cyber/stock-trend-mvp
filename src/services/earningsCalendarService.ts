import { LocalEarningsCalendarAdapter } from "@/adapters/localEarningsCalendarAdapter";
import { MockEarningsCalendarAdapter } from "@/adapters/mockEarningsCalendarAdapter";
import type { DataResult } from "@/lib/dataSource";
import { mergeEarningsCalendarItems, sortEarningsCalendarItems } from "@/lib/earningsDeduplication";
import type { EarningsCalendarItem, StockProfile } from "@/lib/types";

export function getEarningsCalendarData(stock: StockProfile): DataResult<EarningsCalendarItem[]> {
  return LocalEarningsCalendarAdapter.getCalendar(stock);
}

export function getAllEarningsCalendarItems(stocks: StockProfile[]): Array<{ stock: StockProfile; item: EarningsCalendarItem }> {
  return stocks
    .flatMap((stock) => stock.earningsCalendar.map((item) => ({ stock, item })))
    .sort((a, b) => a.item.earningsDate.localeCompare(b.item.earningsDate));
}

export function requestEarningsCalendarUpdate(): DataResult<null> {
  return LocalEarningsCalendarAdapter.refresh();
}

export type EarningsCalendarUpdateResult = {
  stock: StockProfile;
  addedCount: number;
  updatedCount: number;
  fetchedCount: number;
  message: string;
};

export async function updateEarningsCalendarFromMockApi(stock: StockProfile): Promise<EarningsCalendarUpdateResult> {
  const result = await MockEarningsCalendarAdapter.fetchCalendar(stock);
  const merged = mergeEarningsCalendarItems(stock.earningsCalendar, result.items);
  const updatedAt = new Date().toISOString();
  const updatedStock: StockProfile = {
    ...stock,
    earningsCalendar: merged.items,
    updatedAt,
  };

  return {
    stock: updatedStock,
    addedCount: merged.addedCount,
    updatedCount: merged.updatedCount,
    fetchedCount: result.items.length,
    message: `決算予定更新：${result.items.length}件取得、${merged.addedCount}件追加、${merged.updatedCount}件更新しました。`,
  };
}

export function sortCalendarForDisplay(items: EarningsCalendarItem[]): EarningsCalendarItem[] {
  return sortEarningsCalendarItems(items);
}
