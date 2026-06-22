import { apiPlannedDataSource, successDataResult, type DataResult } from "@/lib/dataSource";
import type { CompanyInfo, StockProfile } from "@/lib/types";

export const LocalCompanyInfoAdapter = {
  getCompanyInfo(stock: StockProfile): DataResult<CompanyInfo> {
    return successDataResult(stock.companyInfo, stock.companyInfo.dataSource);
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
