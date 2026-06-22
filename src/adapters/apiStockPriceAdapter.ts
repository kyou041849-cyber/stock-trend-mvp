import { apiDataSource } from "@/lib/dataSource";
import { formatStockPricePeriod } from "@/lib/updateHistory";
import type { StockPriceApiSettings, StockPriceFetchPeriod } from "@/lib/types";
import type { StockPriceApiFetchResult, StockPriceApiRawRow } from "@/types/api";

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

function extractAlphaVantageRows(payload: Record<string, unknown>): StockPriceApiRawRow[] | null {
  const timeSeriesKey = Object.keys(payload).find((key) => key.toLowerCase().includes("time series"));

  if (!timeSeriesKey) {
    return null;
  }

  const timeSeries = payload[timeSeriesKey];
  if (!timeSeries || typeof timeSeries !== "object" || Array.isArray(timeSeries)) {
    return null;
  }

  return Object.entries(timeSeries as Record<string, unknown>).map(([date, value]) => {
    const row = value && typeof value === "object" ? value as Record<string, unknown> : {};
    return {
      date,
      open: row["1. open"] ?? row.open,
      high: row["2. high"] ?? row.high,
      low: row["3. low"] ?? row.low,
      close: row["4. close"] ?? row.close ?? row["5. adjusted close"],
      volume: row["5. volume"] ?? row.volume ?? row["6. volume"],
    };
  });
}

function extractRows(payload: unknown): StockPriceApiRawRow[] | null {
  if (Array.isArray(payload)) {
    return payload.filter((item): item is StockPriceApiRawRow => item !== null && typeof item === "object" && !Array.isArray(item));
  }

  if (!payload || typeof payload !== "object") {
    return null;
  }

  const row = payload as Record<string, unknown>;
  const alphaRows = extractAlphaVantageRows(row);
  if (alphaRows) {
    return alphaRows;
  }

  const candidates = [row.data, row.prices, row.historical, row.results, row.values];
  const arrayCandidate = candidates.find(Array.isArray);

  if (!arrayCandidate || !Array.isArray(arrayCandidate)) {
    return null;
  }

  return arrayCandidate.filter((item): item is StockPriceApiRawRow => item !== null && typeof item === "object" && !Array.isArray(item));
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
    const url = appendQueryParams(settings.baseUrl, {
      symbol: ticker,
      ticker,
      period,
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
          message: "対象ティッカーの株価データが見つかりませんでした。",
        };
      }

      return {
        ok: true,
        status: "success",
        rawRows,
        dataSource: {
          ...dataSource,
          message: `取得期間：${formatStockPricePeriod(period)} / 取得件数：${rawRows.length}件`,
        },
        message: `APIから株価データを取得しました（${rawRows.length}件）。`,
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
