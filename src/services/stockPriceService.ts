import { LocalStockPriceAdapter } from "@/adapters/localStockPriceAdapter";
import type { PriceRow, StockProfile } from "@/lib/types";
import type { DataResult } from "@/lib/dataSource";

export function getStockPriceData(stock: StockProfile): DataResult<PriceRow[]> {
  return LocalStockPriceAdapter.getPrices(stock);
}

export function requestStockPriceUpdate(): DataResult<null> {
  return LocalStockPriceAdapter.refresh();
}
