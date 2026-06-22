import { apiDataSource } from "@/lib/dataSource";
import { formatFundamentalPeriod } from "@/lib/updateHistory";
import type { FundamentalApiSettings, FundamentalFetchPeriod } from "@/lib/types";
import type { FundamentalApiFetchResult, FundamentalApiRawRow } from "@/types/fundamentalApi";

function appendQueryParams(baseUrl: string, params: Record<string, string>): string | null {
  try {
    const url = new URL(baseUrl);
    Object.entries(params).forEach(([key, value]) => {
      if (value) {
        url.searchParams.set(key, value);
      }
    });
    return url.toString();
  } catch {
    return null;
  }
}

function asRows(value: unknown): FundamentalApiRawRow[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  return value.filter((item): item is FundamentalApiRawRow => item !== null && typeof item === "object" && !Array.isArray(item));
}

function extractRows(payload: unknown): FundamentalApiRawRow[] | null {
  if (Array.isArray(payload)) {
    return asRows(payload);
  }

  if (!payload || typeof payload !== "object") {
    return null;
  }

  const row = payload as Record<string, unknown>;
  const candidates = [
    row.data,
    row.fundamentals,
    row.financials,
    row.annualReports,
    row.incomeStatement,
    row.incomeStatements,
    row.results,
  ];
  const direct = candidates.map(asRows).find((rows) => rows !== null);
  if (direct) {
    return direct;
  }

  if (row.financials && typeof row.financials === "object" && !Array.isArray(row.financials)) {
    const financials = row.financials as Record<string, unknown>;
    return asRows(financials.annual) ?? asRows(financials.incomeStatement) ?? asRows(financials.results);
  }

  return null;
}

function extractApiMessage(payload: unknown): string {
  if (!payload || typeof payload !== "object") {
    return "";
  }

  const row = payload as Record<string, unknown>;
  const values = [row.message, row.error, row["Error Message"], row.Note, row.Information];
  const message = values.find((value): value is string => typeof value === "string");
  return message ?? "";
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
    const url = appendQueryParams(settings.baseUrl, {
      symbol: ticker,
      ticker,
      period,
      statement: "fundamentals",
      apikey: settings.apiKey,
      apiKey: settings.apiKey,
    });

    if (!url) {
      return {
        ok: false,
        status: "api-not-configured",
        rawRows: [],
        dataSource,
        message: "APIベースURLの形式が不正です。",
      };
    }

    try {
      const response = await fetch(url);

      if (response.status === 429) {
        return {
          ok: false,
          status: "rate-limited",
          rawRows: [],
          dataSource,
          message: "APIのレート制限に達しました。時間を置いて再確認してください。",
        };
      }

      if (!response.ok) {
        return {
          ok: false,
          status: "failed",
          rawRows: [],
          dataSource,
          message: `API取得に失敗しました（HTTP ${response.status}）。`,
        };
      }

      const payload = await response.json() as unknown;
      const apiMessage = extractApiMessage(payload);

      if (apiMessage.toLowerCase().includes("rate limit") || apiMessage.includes("レート")) {
        return {
          ok: false,
          status: "rate-limited",
          rawRows: [],
          dataSource,
          message: "APIのレート制限に達しました。時間を置いて再確認してください。",
        };
      }

      const rawRows = extractRows(payload);

      if (!rawRows) {
        return {
          ok: false,
          status: "invalid-format",
          rawRows: [],
          dataSource,
          message: apiMessage || "APIレスポンス形式が不正です。アダプタ設定を確認してください。",
        };
      }

      if (rawRows.length === 0) {
        return {
          ok: false,
          status: "empty",
          rawRows: [],
          dataSource,
          message: "対象ティッカーの業績データが見つかりませんでした。",
        };
      }

      return {
        ok: true,
        status: "success",
        rawRows,
        dataSource: {
          ...dataSource,
          message: `対象期間：${formatFundamentalPeriod(period)} / 取得件数：${rawRows.length}件`,
        },
        message: `APIから業績データを取得しました（${rawRows.length}件）。`,
      };
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
