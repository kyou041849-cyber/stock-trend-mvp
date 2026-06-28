import { apiDataSource } from "../lib/dataSource";
import type { StockPriceApiSettings, StockPriceFetchPeriod } from "../lib/types";
import { formatStockPricePeriod } from "../lib/updateHistory";
import type { StockPriceApiFetchResult } from "../types/api";

function isStockPriceApiFetchResult(value: unknown): value is StockPriceApiFetchResult {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const row = value as Partial<StockPriceApiFetchResult>;
  return typeof row.ok === "boolean"
    && typeof row.status === "string"
    && Array.isArray(row.rawRows)
    && row.dataSource !== undefined
    && typeof row.message === "string";
}

export const ApiStockPriceAdapter = {
  async fetchPrices(
    ticker: string,
    period: StockPriceFetchPeriod,
    settings: StockPriceApiSettings,
  ): Promise<StockPriceApiFetchResult> {
    const now = new Date().toISOString();
    const dataSource = apiDataSource(
      settings.providerName,
      now,
      `取得期間：${formatStockPricePeriod(period)}`,
    );

    try {
      const response = await fetch("/api/stock-prices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticker,
          period,
          providerName: settings.providerName,
        }),
      });
      const payload = await response.json().catch(() => null) as unknown;

      if (!isStockPriceApiFetchResult(payload)) {
        return {
          ok: false,
          status: "invalid-format",
          rawRows: [],
          dataSource,
          message: response.ok
            ? "サーバー側APIルートのレスポンス形式が不正です。"
            : `サーバー側APIルートで取得に失敗しました（HTTP ${response.status}）。`,
        };
      }

      return payload;
    } catch {
      return {
        ok: false,
        status: "failed",
        rawRows: [],
        dataSource,
        message: "ネットワークエラーまたはAPI取得失敗が発生しました。",
      };
    }
  },
};
