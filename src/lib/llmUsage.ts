import type {
  LlmGenerationModeLabel,
  LlmInputSizeSummary,
  LlmOutputType,
  LlmSafeRecord,
  LlmSendSettings,
  LlmStockResearchContext,
  LlmUsageLog,
} from "./types";

const LLM_USAGE_LOG_STORAGE_KEY = "stock-trend-mvp:llm-usage-logs:v1";
export const LLM_DAILY_LIMIT = 20;
export const LLM_DAILY_STOCK_LIMIT = 5;
export const LLM_INPUT_WARNING_LIMIT = 30_000;
export const LLM_INPUT_HARD_LIMIT = 50_000;

export const DEFAULT_LLM_SEND_SETTINGS: LlmSendSettings = {
  includePriceSummary: true,
  includeFundamentals: true,
  includeNews: true,
  includeRiskMemos: true,
  includeResearchMemos: true,
  includeEarningsMemos: true,
  includeTasks: true,
};

function todayKey(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

function readString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function readNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function readBoolean(value: unknown): boolean {
  return typeof value === "boolean" ? value : false;
}

function isMode(value: unknown): value is LlmGenerationModeLabel {
  return value === "Mock" || value === "実LLM";
}

function isAnalysisType(value: unknown): value is LlmOutputType {
  return value === "銘柄要約" || value === "ニュース要約" || value === "決算要約" || value === "リスク整理" || value === "追加調査ポイント";
}

export function createLlmUsageLogId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `llm-usage-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function normalizeLlmUsageLog(value: unknown): LlmUsageLog | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const row = value as Record<string, unknown>;
  const stockId = readString(row.stockId);
  const analysisType = row.analysisType;
  const mode = row.mode;
  const requestedAt = readString(row.requestedAt);

  if (!stockId || !isAnalysisType(analysisType) || !isMode(mode) || !requestedAt) {
    return null;
  }

  return {
    id: readString(row.id) || createLlmUsageLogId(),
    stockId,
    ticker: readString(row.ticker),
    companyName: readString(row.companyName),
    analysisType,
    mode,
    model: readString(row.model),
    requestedAt,
    success: readBoolean(row.success),
    errorMessage: readString(row.errorMessage),
    inputSize: readNumber(row.inputSize),
    outputSize: readNumber(row.outputSize),
    sourceContextHash: readString(row.sourceContextHash),
  };
}

export function sortLlmUsageLogs(logs: LlmUsageLog[]): LlmUsageLog[] {
  return [...logs].sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));
}

export function filterLlmContextForSend(
  context: LlmStockResearchContext,
  settings: LlmSendSettings = DEFAULT_LLM_SEND_SETTINGS,
): LlmStockResearchContext {
  const filtered: LlmStockResearchContext = {
    schemaVersion: context.schemaVersion,
    generatedAt: context.generatedAt,
    contextHash: context.contextHash,
    limits: context.limits,
    stock: context.stock,
    scores: context.scores,
    watchlist: context.watchlist,
    priceReview: context.priceReview,
    earningsCalendar: context.earningsCalendar,
  };

  if (settings.includePriceSummary) {
    filtered.priceSummary = context.priceSummary;
    filtered.trendSignals = context.trendSignals;
  }

  if (settings.includeFundamentals) {
    filtered.fundamentalSummary = context.fundamentalSummary;
    filtered.fundamentals = context.fundamentals;
  }

  if (settings.includeNews) {
    filtered.news = context.news;
  }

  if (settings.includeRiskMemos) {
    filtered.riskMemos = context.riskMemos;
  }

  if (settings.includeResearchMemos) {
    filtered.researchMemos = context.researchMemos;
  }

  if (settings.includeEarningsMemos) {
    filtered.earningsMemos = context.earningsMemos;
  }

  if (settings.includeTasks) {
    filtered.confirmationTasks = context.confirmationTasks;
  }

  return filtered;
}

function countItems(items: LlmSafeRecord[] | undefined): number {
  return items?.length ?? 0;
}

export function getLlmInputSizeSummary(
  context: LlmStockResearchContext | null,
  warningLimit = LLM_INPUT_WARNING_LIMIT,
  hardLimit = LLM_INPUT_HARD_LIMIT,
): LlmInputSizeSummary {
  const inputSize = context ? JSON.stringify(context).length : 0;

  return {
    inputSize,
    warningLimit,
    hardLimit,
    isWarning: inputSize > warningLimit,
    isBlocked: inputSize > hardLimit,
    newsCount: countItems(context?.news),
    researchMemoCount: countItems(context?.researchMemos),
    riskMemoCount: countItems(context?.riskMemos),
    earningsMemoCount: countItems(context?.earningsMemos),
    taskCount: countItems(context?.confirmationTasks),
  };
}

export function checkLlmUsageLimit(
  logs: LlmUsageLog[],
  stockId: string,
  now = new Date(),
): { ok: true; dailyCount: number; stockDailyCount: number } | { ok: false; dailyCount: number; stockDailyCount: number; message: string } {
  const key = todayKey(now);
  const todaysRealLogs = logs.filter((log) => log.mode === "実LLM" && log.requestedAt.slice(0, 10) === key);
  const dailyCount = todaysRealLogs.length;
  const stockDailyCount = todaysRealLogs.filter((log) => log.stockId === stockId).length;

  if (dailyCount >= LLM_DAILY_LIMIT) {
    return {
      ok: false,
      dailyCount,
      stockDailyCount,
      message: `本日の実LLM利用上限（${LLM_DAILY_LIMIT}回）に達しています。Mockを使うか、明日以降に再試行してください。`,
    };
  }

  if (stockDailyCount >= LLM_DAILY_STOCK_LIMIT) {
    return {
      ok: false,
      dailyCount,
      stockDailyCount,
      message: `この銘柄の本日の実LLM利用上限（${LLM_DAILY_STOCK_LIMIT}回）に達しています。Mockを使うか、明日以降に再試行してください。`,
    };
  }

  return { ok: true, dailyCount, stockDailyCount };
}

export function loadLlmUsageLogs(): LlmUsageLog[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(LLM_USAGE_LOG_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return sortLlmUsageLogs(
      parsed
        .map(normalizeLlmUsageLog)
        .filter((log): log is LlmUsageLog => log !== null),
    );
  } catch {
    return [];
  }
}

export function saveLlmUsageLogs(logs: LlmUsageLog[]): { ok: boolean; message: string } {
  if (typeof window === "undefined") {
    return { ok: false, message: "ブラウザ上でのみ保存できます。" };
  }

  try {
    window.localStorage.setItem(LLM_USAGE_LOG_STORAGE_KEY, JSON.stringify(sortLlmUsageLogs(logs)));
    return { ok: true, message: "実LLM利用ログを保存しました。" };
  } catch {
    return {
      ok: false,
      message: "実LLM利用ログの保存に失敗しました。localStorageの空き容量やブラウザ設定を確認してください。",
    };
  }
}

export function appendLlmUsageLog(log: LlmUsageLog): { ok: boolean; message: string } {
  return saveLlmUsageLogs([log, ...loadLlmUsageLogs()]);
}

export function createLlmUsageLog(input: Omit<LlmUsageLog, "id"> & { id?: string }): LlmUsageLog {
  return {
    id: input.id ?? createLlmUsageLogId(),
    stockId: input.stockId,
    ticker: input.ticker,
    companyName: input.companyName,
    analysisType: input.analysisType,
    mode: input.mode,
    model: input.model,
    requestedAt: input.requestedAt,
    success: input.success,
    errorMessage: input.errorMessage,
    inputSize: input.inputSize,
    outputSize: input.outputSize,
    sourceContextHash: input.sourceContextHash,
  };
}
