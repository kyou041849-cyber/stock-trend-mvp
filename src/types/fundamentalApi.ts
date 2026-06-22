export type {
  DataSourceInfo,
  FetchStatus,
  FundamentalApiSettings,
  FundamentalFetchPeriod,
} from "@/lib/types";

import type { DataSourceInfo, FetchStatus } from "@/lib/types";

export type FundamentalApiRawRow = Record<string, unknown>;

export type FundamentalApiFetchResult = {
  ok: boolean;
  status: FetchStatus;
  rawRows: FundamentalApiRawRow[];
  dataSource: DataSourceInfo;
  message: string;
};
