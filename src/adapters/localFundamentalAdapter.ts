import { apiPlannedDataSource, emptyDataResult, successDataResult, type DataResult } from "@/lib/dataSource";
import type { EarningsRow, StockProfile } from "@/lib/types";

export const LocalFundamentalAdapter = {
  getFundamentals(stock: StockProfile): DataResult<EarningsRow[]> {
    return stock.earnings.length > 0
      ? successDataResult(stock.earnings, stock.fundamentalDataSource)
      : emptyDataResult<EarningsRow[]>(stock.fundamentalDataSource);
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
