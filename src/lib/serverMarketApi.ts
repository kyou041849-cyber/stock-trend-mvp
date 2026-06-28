import type { FetchStatus } from "./types";

export type MarketApiKind = "stock-price" | "fundamental";

export type ServerMarketApiConfig = {
  apiKey: string;
  baseUrl: string;
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
    label: "株価データAPI",
  },
  fundamental: {
    apiKey: "FUNDAMENTAL_API_KEY",
    baseUrl: "FUNDAMENTAL_API_BASE_URL",
    label: "業績データAPI",
  },
} as const satisfies Record<MarketApiKind, { apiKey: string; baseUrl: string; label: string }>;

export function getServerMarketApiConfig(
  kind: MarketApiKind,
  env: Record<string, string | undefined> = process.env,
): ServerMarketApiConfigResult {
  const names = MARKET_API_ENV[kind];
  const apiKey = env[names.apiKey]?.trim() ?? "";
  const baseUrl = env[names.baseUrl]?.trim() ?? "";
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
    config: { apiKey, baseUrl },
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

export async function fetchServerMarketApiJson(input: {
  config: ServerMarketApiConfig;
  params: Record<string, string>;
}): Promise<ServerMarketApiFetchResult> {
  const url = buildServerMarketApiUrl(input.config.baseUrl, input.params);
  if (!url) {
    return {
      ok: false,
      status: "api-not-configured",
      httpStatus: 503,
      message: "APIベースURLのサーバー側設定が不正です。",
    };
  }

  try {
    const response = await fetch(url, {
      cache: "no-store",
      headers: createServerMarketApiHeaders(input.config.apiKey),
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
