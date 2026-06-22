import { DEFAULT_LLM_SEND_SETTINGS } from "./llmUsage";
import type { LlmOutputType, LlmSendSettings } from "./types";

export const LLM_SEND_SETTINGS_STORAGE_KEY = "stock-trend-mvp:llm-send-settings:v1";
export const LLM_SEND_SETTINGS_SCHEMA_VERSION = "llm-send-settings-v1";

export type LlmSendSettingsEntry = {
  stockId: string;
  analysisType: LlmOutputType;
  settings: LlmSendSettings;
  updatedAt: string;
};

export type LlmSendSettingsStore = {
  schemaVersion: typeof LLM_SEND_SETTINGS_SCHEMA_VERSION;
  updatedAt: string;
  entries: Record<string, LlmSendSettingsEntry>;
};

export type LlmSendSettingsLoadResult = {
  settings: LlmSendSettings;
  source: "saved" | "default";
  updatedAt: string;
};

const SEND_SETTING_KEYS: Array<keyof LlmSendSettings> = [
  "includePriceSummary",
  "includeFundamentals",
  "includeNews",
  "includeRiskMemos",
  "includeResearchMemos",
  "includeEarningsMemos",
  "includeTasks",
];

const FULL_SETTINGS: LlmSendSettings = { ...DEFAULT_LLM_SEND_SETTINGS };

const NEWS_SUMMARY_SETTINGS: LlmSendSettings = {
  includePriceSummary: false,
  includeFundamentals: false,
  includeNews: true,
  includeRiskMemos: true,
  includeResearchMemos: true,
  includeEarningsMemos: false,
  includeTasks: false,
};

const EARNINGS_SUMMARY_SETTINGS: LlmSendSettings = {
  includePriceSummary: false,
  includeFundamentals: true,
  includeNews: true,
  includeRiskMemos: true,
  includeResearchMemos: true,
  includeEarningsMemos: true,
  includeTasks: true,
};

export function getDefaultLlmSendSettings(): LlmSendSettings {
  return { ...DEFAULT_LLM_SEND_SETTINGS };
}

export function normalizeLlmSendSettings(value: unknown): LlmSendSettings {
  const row = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return SEND_SETTING_KEYS.reduce((settings, key) => ({
    ...settings,
    [key]: typeof row[key] === "boolean" ? row[key] : DEFAULT_LLM_SEND_SETTINGS[key],
  }), {} as LlmSendSettings);
}

export function getRecommendedLlmSendSettings(type: LlmOutputType): LlmSendSettings {
  if (type === "ニュース要約") {
    return { ...NEWS_SUMMARY_SETTINGS };
  }

  if (type === "決算要約") {
    return { ...EARNINGS_SUMMARY_SETTINGS };
  }

  return { ...FULL_SETTINGS };
}

export function createLlmSendSettingsKey(stockId: string, analysisType: LlmOutputType): string {
  return `${stockId}::${analysisType}`;
}

export function createEmptyLlmSendSettingsStore(updatedAt = new Date().toISOString()): LlmSendSettingsStore {
  return {
    schemaVersion: LLM_SEND_SETTINGS_SCHEMA_VERSION,
    updatedAt,
    entries: {},
  };
}

function readString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function isLlmOutputType(value: unknown): value is LlmOutputType {
  return value === "銘柄要約"
    || value === "ニュース要約"
    || value === "決算要約"
    || value === "リスク整理"
    || value === "追加調査ポイント";
}

export function normalizeLlmSendSettingsStore(value: unknown): LlmSendSettingsStore {
  if (!value || typeof value !== "object") {
    return createEmptyLlmSendSettingsStore();
  }

  const row = value as Record<string, unknown>;
  const entries = row.entries && typeof row.entries === "object" ? row.entries as Record<string, unknown> : {};
  const normalizedEntries: Record<string, LlmSendSettingsEntry> = {};

  for (const item of Object.values(entries)) {
    if (!item || typeof item !== "object") continue;
    const entry = item as Record<string, unknown>;
    const stockId = readString(entry.stockId);
    const analysisType = entry.analysisType;
    if (!stockId || !isLlmOutputType(analysisType)) continue;
    const key = createLlmSendSettingsKey(stockId, analysisType);
    normalizedEntries[key] = {
      stockId,
      analysisType,
      settings: normalizeLlmSendSettings(entry.settings),
      updatedAt: readString(entry.updatedAt) || new Date().toISOString(),
    };
  }

  return {
    schemaVersion: LLM_SEND_SETTINGS_SCHEMA_VERSION,
    updatedAt: readString(row.updatedAt) || new Date().toISOString(),
    entries: normalizedEntries,
  };
}

export function readLlmSendSettingsFromStore(
  store: LlmSendSettingsStore,
  stockId: string,
  analysisType: LlmOutputType,
): LlmSendSettingsLoadResult {
  const entry = store.entries[createLlmSendSettingsKey(stockId, analysisType)];
  if (!entry) {
    return {
      settings: getDefaultLlmSendSettings(),
      source: "default",
      updatedAt: "",
    };
  }

  return {
    settings: normalizeLlmSendSettings(entry.settings),
    source: "saved",
    updatedAt: entry.updatedAt,
  };
}

export function upsertLlmSendSettingsInStore(
  store: LlmSendSettingsStore,
  stockId: string,
  analysisType: LlmOutputType,
  settings: LlmSendSettings,
  updatedAt = new Date().toISOString(),
): LlmSendSettingsStore {
  const key = createLlmSendSettingsKey(stockId, analysisType);
  return {
    schemaVersion: LLM_SEND_SETTINGS_SCHEMA_VERSION,
    updatedAt,
    entries: {
      ...store.entries,
      [key]: {
        stockId,
        analysisType,
        settings: normalizeLlmSendSettings(settings),
        updatedAt,
      },
    },
  };
}

export function removeLlmSendSettingsFromStore(
  store: LlmSendSettingsStore,
  stockId: string,
  analysisType: LlmOutputType,
  updatedAt = new Date().toISOString(),
): LlmSendSettingsStore {
  const key = createLlmSendSettingsKey(stockId, analysisType);
  const { [key]: _removed, ...entries } = store.entries;
  return {
    schemaVersion: LLM_SEND_SETTINGS_SCHEMA_VERSION,
    updatedAt,
    entries,
  };
}

export function exportLlmSendSettingsStoreToJson(store: LlmSendSettingsStore): string {
  return JSON.stringify(normalizeLlmSendSettingsStore(store), null, 2);
}

export function parseLlmSendSettingsStoreJson(json: string): LlmSendSettingsStore | null {
  try {
    return normalizeLlmSendSettingsStore(JSON.parse(json));
  } catch {
    return null;
  }
}

export function loadLlmSendSettingsStore(): LlmSendSettingsStore {
  if (typeof window === "undefined") {
    return createEmptyLlmSendSettingsStore();
  }

  try {
    const raw = window.localStorage.getItem(LLM_SEND_SETTINGS_STORAGE_KEY);
    if (!raw) {
      return createEmptyLlmSendSettingsStore();
    }
    return normalizeLlmSendSettingsStore(JSON.parse(raw));
  } catch {
    return createEmptyLlmSendSettingsStore();
  }
}

function saveLlmSendSettingsStore(store: LlmSendSettingsStore): { ok: boolean; message: string } {
  if (typeof window === "undefined") {
    return { ok: false, message: "ブラウザ上でのみ保存できます。" };
  }

  try {
    window.localStorage.setItem(LLM_SEND_SETTINGS_STORAGE_KEY, exportLlmSendSettingsStoreToJson(store));
    return { ok: true, message: "LLM送信設定を保存しました。" };
  } catch {
    return { ok: false, message: "LLM送信設定の保存に失敗しました。localStorageの状態を確認してください。" };
  }
}

export function loadLlmSendSettings(
  stockId: string,
  analysisType: LlmOutputType,
): LlmSendSettingsLoadResult {
  return readLlmSendSettingsFromStore(loadLlmSendSettingsStore(), stockId, analysisType);
}

export function saveLlmSendSettings(
  stockId: string,
  analysisType: LlmOutputType,
  settings: LlmSendSettings,
): { ok: boolean; message: string; updatedAt: string } {
  const updatedAt = new Date().toISOString();
  const result = saveLlmSendSettingsStore(
    upsertLlmSendSettingsInStore(loadLlmSendSettingsStore(), stockId, analysisType, settings, updatedAt),
  );
  return { ...result, updatedAt };
}

export function resetLlmSendSettings(
  stockId: string,
  analysisType: LlmOutputType,
): { ok: boolean; message: string } {
  const result = saveLlmSendSettingsStore(
    removeLlmSendSettingsFromStore(loadLlmSendSettingsStore(), stockId, analysisType),
  );
  return result.ok
    ? { ok: true, message: "この銘柄・分析タイプのLLM送信設定をデフォルトに戻しました。" }
    : result;
}

export function exportStoredLlmSendSettingsJson(): string {
  return exportLlmSendSettingsStoreToJson(loadLlmSendSettingsStore());
}

export function importStoredLlmSendSettingsJson(json: string): { ok: boolean; message: string } {
  const parsed = parseLlmSendSettingsStoreJson(json);
  if (!parsed) {
    return { ok: false, message: "LLM送信設定JSONの形式が不正です。" };
  }

  return saveLlmSendSettingsStore({
    ...parsed,
    updatedAt: new Date().toISOString(),
  });
}
