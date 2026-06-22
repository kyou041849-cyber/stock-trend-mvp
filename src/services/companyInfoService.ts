import { LocalCompanyInfoAdapter } from "@/adapters/localCompanyInfoAdapter";
import type { DataResult } from "@/lib/dataSource";
import type { CompanyInfo, StockProfile } from "@/lib/types";

export function getCompanyInfoData(stock: StockProfile): DataResult<CompanyInfo> {
  return LocalCompanyInfoAdapter.getCompanyInfo(stock);
}

export function requestCompanyInfoUpdate(): DataResult<null> {
  return LocalCompanyInfoAdapter.refresh();
}
