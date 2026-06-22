import type { FundamentalApiSettings, StockPriceApiSettings } from "./types";

const STOCK_PRICE_API_SETTINGS_KEY = "stock-trend-mvp:stock-price-api-settings:v1";
const FUNDAMENTAL_API_SETTINGS_KEY = "stock-trend-mvp:fundamental-api-settings:v1";

export function getDefaultStockPriceApiSettings(): StockPriceApiSettings {
  return {
    providerName: "",
    apiKey: "",
    baseUrl: "",
    enabled: false,
    mockMode: true,
    lastConnectionCheckedAt: "",
  };
}

export function getDefaultFundamentalApiSettings(): FundamentalApiSettings {
  return {
    providerName: "",
    apiKey: "",
    baseUrl: "",
    enabled: false,
    mockMode: true,
    lastConnectionCheckedAt: "",
  };
}

function readString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function readBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

export function normalizeStockPriceApiSettings(value: unknown): StockPriceApiSettings {
  const fallback = getDefaultStockPriceApiSettings();

  if (!value || typeof value !== "object") {
    return fallback;
  }

  const row = value as Record<string, unknown>;

  return {
    providerName: readString(row.providerName),
    apiKey: "",
    baseUrl: readString(row.baseUrl),
    enabled: readBoolean(row.enabled, fallback.enabled),
    mockMode: readBoolean(row.mockMode, fallback.mockMode),
    lastConnectionCheckedAt: readString(row.lastConnectionCheckedAt),
  };
}

export function normalizeFundamentalApiSettings(value: unknown): FundamentalApiSettings {
  const fallback = getDefaultFundamentalApiSettings();

  if (!value || typeof value !== "object") {
    return fallback;
  }

  const row = value as Record<string, unknown>;

  return {
    providerName: readString(row.providerName),
    apiKey: "",
    baseUrl: readString(row.baseUrl),
    enabled: readBoolean(row.enabled, fallback.enabled),
    mockMode: readBoolean(row.mockMode, fallback.mockMode),
    lastConnectionCheckedAt: readString(row.lastConnectionCheckedAt),
  };
}

export function loadStockPriceApiSettings(): StockPriceApiSettings {
  if (typeof window === "undefined") {
    return getDefaultStockPriceApiSettings();
  }

  try {
    const raw = window.localStorage.getItem(STOCK_PRICE_API_SETTINGS_KEY);
    return raw ? normalizeStockPriceApiSettings(JSON.parse(raw)) : getDefaultStockPriceApiSettings();
  } catch {
    return getDefaultStockPriceApiSettings();
  }
}

export function loadFundamentalApiSettings(): FundamentalApiSettings {
  if (typeof window === "undefined") {
    return getDefaultFundamentalApiSettings();
  }

  try {
    const raw = window.localStorage.getItem(FUNDAMENTAL_API_SETTINGS_KEY);
    return raw ? normalizeFundamentalApiSettings(JSON.parse(raw)) : getDefaultFundamentalApiSettings();
  } catch {
    return getDefaultFundamentalApiSettings();
  }
}

export function saveStockPriceApiSettings(settings: StockPriceApiSettings): { ok: boolean; message: string } {
  if (typeof window === "undefined") {
    return { ok: false, message: "ブラウザ上でのみ保存できます。" };
  }

  try {
    window.localStorage.setItem(STOCK_PRICE_API_SETTINGS_KEY, JSON.stringify({ ...normalizeStockPriceApiSettings(settings), apiKey: "" }));
    return { ok: true, message: "株価API設定を保存しました。APIキーは安全のため保存していません。" };
  } catch {
    return { ok: false, message: "株価API設定の保存に失敗しました。localStorageの空き容量やブラウザ設定を確認してください。" };
  }
}

export function saveFundamentalApiSettings(settings: FundamentalApiSettings): { ok: boolean; message: string } {
  if (typeof window === "undefined") {
    return { ok: false, message: "ブラウザ上でのみ保存できます。" };
  }

  try {
    window.localStorage.setItem(FUNDAMENTAL_API_SETTINGS_KEY, JSON.stringify({ ...normalizeFundamentalApiSettings(settings), apiKey: "" }));
    return { ok: true, message: "業績API設定を保存しました。APIキーは安全のため保存していません。" };
  } catch {
    return { ok: false, message: "業績API設定の保存に失敗しました。localStorageの空き容量やブラウザ設定を確認してください。" };
  }
}

export function maskApiKey(apiKey: string): string {
  const trimmed = apiKey.trim();

  if (!trimmed) {
    return "---";
  }

  if (trimmed.length <= 4) {
    return "****";
  }

  return `${"*".repeat(Math.max(trimmed.length - 4, 4))}${trimmed.slice(-4)}`;
}
