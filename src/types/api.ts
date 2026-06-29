export type {
  CurrencyCode,
  DataSourceInfo,
  FetchStatus,
  FundamentalApiSettings,
  FundamentalFetchPeriod,
  MarketRegion,
  StockPriceApiSettings,
  StockPriceFetchPeriod,
} from "@/lib/types";

import type { CurrencyCode, DataSourceInfo, FetchStatus, MarketRegion } from "@/lib/types";

export type StockPriceApiRawRow = Record<string, unknown>;

export type StockPriceApiFetchResult = {
  ok: boolean;
  status: FetchStatus;
  rawRows: StockPriceApiRawRow[];
  dataSource: DataSourceInfo;
  message: string;
  normalizedTicker?: string;
  marketRegion?: MarketRegion;
  currency?: CurrencyCode;
};
