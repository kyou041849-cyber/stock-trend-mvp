import type { CurrencyCode, FetchStatus, MarketRegion, StockPriceFetchPeriod } from "./types";

export type MarketApiKind = "stock-price" | "fundamental";
export type ServerMarketApiProvider = "generic" | "alpha-vantage";

export type ServerMarketApiConfig = {
  apiKey: string;
  baseUrl: string;
  provider?: ServerMarketApiProvider;
};

export type ServerMarketApiConfigResult =
  | { ok: true; config: ServerMarketApiConfig }
  | { ok: false; missing: string[]; message: string };

export type ServerMarketApiFetchResult =
  | { ok: true; payload: unknown }
  | { ok: false; status: FetchStatus; httpStatus: number; message: string };

const MARKET_API_ENV = {
  "stock-price": {
    apiKey: "STOCK_PRICE_API_KEY",
    baseUrl: "STOCK_PRICE_API_BASE_URL",
    provider: "STOCK_PRICE_API_PROVIDER",
    label: "株価データAPI",
  },
  fundamental: {
    apiKey: "FUNDAMENTAL_API_KEY",
    baseUrl: "FUNDAMENTAL_API_BASE_URL",
    provider: "",
    label: "業績データAPI",
  },
} as const satisfies Record<MarketApiKind, { apiKey: string; baseUrl: string; provider: string; label: string }>;

export function normalizeServerMarketApiProvider(value: string | undefined): ServerMarketApiProvider {
  return value?.trim().toLowerCase() === "alpha-vantage" ? "alpha-vantage" : "generic";
}

export function mapAlphaVantageOutputSize(period: StockPriceFetchPeriod): "compact" | "full" {
  return period === "1m" || period === "3m" || period === "6m" ? "compact" : "full";
}

export function buildStockPriceServerMarketApiParams(input: {
  provider: ServerMarketApiProvider;
  symbol: string;
  period: StockPriceFetchPeriod;
  marketRegion: MarketRegion;
  currency: CurrencyCode;
}): Record<string, string> {
  if (input.provider === "alpha-vantage") {
    return {
      function: "TIME_SERIES_DAILY",
      symbol: input.symbol,
      outputsize: mapAlphaVantageOutputSize(input.period),
    };
  }

  return {
    symbol: input.symbol,
    ticker: input.symbol,
    period: input.period,
    region: input.marketRegion,
    marketRegion: input.marketRegion,
    currency: input.currency,
  };
}

export function getServerMarketApiConfig(
  kind: MarketApiKind,
  env: Record<string, string | undefined> = process.env,
): ServerMarketApiConfigResult {
  const names = MARKET_API_ENV[kind];
  const apiKey = env[names.apiKey]?.trim() ?? "";
  const baseUrl = env[names.baseUrl]?.trim() ?? "";
  const provider = kind === "stock-price" ? normalizeServerMarketApiProvider(env[names.provider]) : "generic";
  const missing = [
    apiKey ? "" : names.apiKey,
    baseUrl ? "" : names.baseUrl,
  ].filter(Boolean);

  if (missing.length > 0) {
    return {
      ok: false,
      missing,
      message: `${names.label}のサーバー側設定が未設定です。.env.local.example を確認してください。`,
    };
  }

  return {
    ok: true,
    config: { apiKey, baseUrl, provider },
  };
}

export function buildServerMarketApiUrl(baseUrl: string, params: Record<string, string>): string | null {
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

export function createServerMarketApiHeaders(apiKey: string): HeadersInit {
  return {
    Accept: "application/json",
    Authorization: `Bearer ${apiKey}`,
    "X-API-Key": apiKey,
  };
}

export function createServerMarketApiRequest(input: {
  config: ServerMarketApiConfig;
  params: Record<string, string>;
}): { url: string; headers: HeadersInit } | null {
  const provider = input.config.provider ?? "generic";
  const params = provider === "alpha-vantage"
    ? { ...input.params, apikey: input.config.apiKey }
    : input.params;
  const url = buildServerMarketApiUrl(input.config.baseUrl, params);

  if (!url) {
    return null;
  }

  return {
    url,
    headers: provider === "alpha-vantage"
      ? { Accept: "application/json" }
      : createServerMarketApiHeaders(input.config.apiKey),
  };
}

export async function fetchServerMarketApiJson(input: {
  config: ServerMarketApiConfig;
  params: Record<string, string>;
}): Promise<ServerMarketApiFetchResult> {
  const request = createServerMarketApiRequest(input);
  if (!request) {
    return {
      ok: false,
      status: "api-not-configured",
      httpStatus: 503,
      message: "APIベースURLのサーバー側設定が不正です。",
    };
  }

  try {
    const response = await fetch(request.url, {
      cache: "no-store",
      headers: request.headers,
    });

    if (response.status === 429) {
      return {
        ok: false,
        status: "rate-limited",
        httpStatus: 429,
        message: "APIのレート制限に達しました。時間を置いて再確認してください。",
      };
    }

    if (!response.ok) {
      return {
        ok: false,
        status: "failed",
        httpStatus: 502,
        message: `API取得に失敗しました（HTTP ${response.status}）。`,
      };
    }

    try {
      return {
        ok: true,
        payload: await response.json() as unknown,
      };
    } catch {
      return {
        ok: false,
        status: "invalid-format",
        httpStatus: 502,
        message: "APIレスポンスのJSON形式が不正です。",
      };
    }
  } catch {
    return {
      ok: false,
      status: "failed",
      httpStatus: 502,
      message: "ネットワークエラーまたはAPI取得失敗が発生しました。",
    };
  }
}
