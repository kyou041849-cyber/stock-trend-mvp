import { apiPlannedDataSource, emptyDataResult, successDataResult, type DataResult } from "@/lib/dataSource";
import { sortEarningsCalendarItems } from "@/lib/earningsDeduplication";
import type { EarningsCalendarItem, StockProfile } from "@/lib/types";

export const LocalEarningsCalendarAdapter = {
  getCalendar(stock: StockProfile): DataResult<EarningsCalendarItem[]> {
    const items = sortEarningsCalendarItems(stock.earningsCalendar);
    return items.length > 0
      ? successDataResult(items, items[0].dataSource)
      : emptyDataResult<EarningsCalendarItem[]>(apiPlannedDataSource());
  },

  refresh(): DataResult<null> {
    return {
      status: "api-not-configured",
      data: null,
      dataSource: apiPlannedDataSource(),
      message: "外部API連携は未実装です。現在は手入力またはCSVデータを使用しています。",
    };
  },
};
