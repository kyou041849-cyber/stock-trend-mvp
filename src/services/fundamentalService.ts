import { LocalFundamentalAdapter } from "@/adapters/localFundamentalAdapter";
import type { DataResult } from "@/lib/dataSource";
import type { EarningsRow, StockProfile } from "@/lib/types";

export function getFundamentalData(stock: StockProfile): DataResult<EarningsRow[]> {
  return LocalFundamentalAdapter.getFundamentals(stock);
}

export function requestFundamentalUpdate(): DataResult<null> {
  return LocalFundamentalAdapter.refresh();
}
