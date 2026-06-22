import { apiPlannedDataSource, emptyDataResult, successDataResult, type DataResult } from "@/lib/dataSource";
import type { PriceRow, StockProfile } from "@/lib/types";

export const LocalStockPriceAdapter = {
  getPrices(stock: StockProfile): DataResult<PriceRow[]> {
    return stock.prices.length > 0
      ? successDataResult(stock.prices, stock.priceDataSource)
      : emptyDataResult<PriceRow[]>(stock.priceDataSource);
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
