import { apiDataSource } from "../lib/dataSource";
import type { FundamentalApiSettings, FundamentalFetchPeriod } from "../lib/types";
import { formatFundamentalPeriod } from "../lib/updateHistory";
import type { FundamentalApiFetchResult } from "../types/fundamentalApi";

function isFundamentalApiFetchResult(value: unknown): value is FundamentalApiFetchResult {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const row = value as Partial<FundamentalApiFetchResult>;
  return typeof row.ok === "boolean"
    && typeof row.status === "string"
    && Array.isArray(row.rawRows)
    && row.dataSource !== undefined
    && typeof row.message === "string";
}

export const ApiFundamentalAdapter = {
  async fetchFundamentals(
    ticker: string,
    period: FundamentalFetchPeriod,
    settings: FundamentalApiSettings,
  ): Promise<FundamentalApiFetchResult> {
    const now = new Date().toISOString();
    const dataSource = apiDataSource(
      settings.providerName,
      now,
      `対象期間：${formatFundamentalPeriod(period)}`,
    );

    try {
      const response = await fetch("/api/fundamentals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticker,
          period,
          providerName: settings.providerName,
        }),
      });
      const payload = await response.json().catch(() => null) as unknown;

      if (!isFundamentalApiFetchResult(payload)) {
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
