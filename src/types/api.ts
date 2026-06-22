export type {
  DataSourceInfo,
  FetchStatus,
  FundamentalApiSettings,
  FundamentalFetchPeriod,
  StockPriceApiSettings,
  StockPriceFetchPeriod,
} from "@/lib/types";

import type { DataSourceInfo, FetchStatus } from "@/lib/types";

export type StockPriceApiRawRow = Record<string, unknown>;

export type StockPriceApiFetchResult = {
  ok: boolean;
  status: FetchStatus;
  rawRows: StockPriceApiRawRow[];
  dataSource: DataSourceInfo;
  message: string;
};
