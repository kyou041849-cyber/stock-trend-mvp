export type CsvImportDataType = "株価" | "業績";

export type CsvImportHistoryItem = {
  id: string;
  stockId: string;
  ticker: string;
  companyName: string;
  dataType: CsvImportDataType;
  importedAt: string;
  fileName: string;
  totalRows: number;
  addedRows: number;
  updatedRows: number;
  errorRows: number;
  warningRows: number;
  success: boolean;
  errorMessage: string;
};

export type CreateCsvImportHistoryInput = Omit<CsvImportHistoryItem, "id" | "importedAt"> & {
  id?: string;
  importedAt?: string;
};

export const CSV_IMPORT_HISTORY_STORAGE_KEY = "stock-trend-mvp:csv-import-history:v1";
const MAX_HISTORY_ITEMS = 200;

function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `csv-import-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function readString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function readNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function normalizeHistoryItem(value: unknown): CsvImportHistoryItem | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const row = value as Record<string, unknown>;
  const dataType = readString(row.dataType);

  if (dataType !== "株価" && dataType !== "業績") {
    return null;
  }

  return {
    id: readString(row.id) || createId(),
    stockId: readString(row.stockId),
    ticker: readString(row.ticker),
    companyName: readString(row.companyName),
    dataType,
    importedAt: readString(row.importedAt) || new Date().toISOString(),
    fileName: readString(row.fileName) || "-",
    totalRows: readNumber(row.totalRows),
    addedRows: readNumber(row.addedRows),
    updatedRows: readNumber(row.updatedRows),
    errorRows: readNumber(row.errorRows),
    warningRows: readNumber(row.warningRows),
    success: typeof row.success === "boolean" ? row.success : false,
    errorMessage: readString(row.errorMessage),
  };
}

export function createCsvImportHistory(input: CreateCsvImportHistoryInput): CsvImportHistoryItem {
  return {
    id: input.id ?? createId(),
    stockId: input.stockId,
    ticker: input.ticker,
    companyName: input.companyName,
    dataType: input.dataType,
    importedAt: input.importedAt ?? new Date().toISOString(),
    fileName: input.fileName || "-",
    totalRows: input.totalRows,
    addedRows: input.addedRows,
    updatedRows: input.updatedRows,
    errorRows: input.errorRows,
    warningRows: input.warningRows,
    success: input.success,
    errorMessage: input.errorMessage,
  };
}

export function sortCsvImportHistories(items: CsvImportHistoryItem[]): CsvImportHistoryItem[] {
  return [...items].sort((a, b) => b.importedAt.localeCompare(a.importedAt));
}

export function loadCsvImportHistories(stockId?: string): CsvImportHistoryItem[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(CSV_IMPORT_HISTORY_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    const normalized = parsed
      .map(normalizeHistoryItem)
      .filter((item): item is CsvImportHistoryItem => item !== null);

    return sortCsvImportHistories(stockId ? normalized.filter((item) => item.stockId === stockId) : normalized);
  } catch {
    return [];
  }
}

export function saveCsvImportHistories(items: CsvImportHistoryItem[]): void {
  if (typeof window === "undefined") {
    return;
  }

  const normalized = sortCsvImportHistories(items)
    .slice(0, MAX_HISTORY_ITEMS)
    .map(({ id, stockId, ticker, companyName, dataType, importedAt, fileName, totalRows, addedRows, updatedRows, errorRows, warningRows, success, errorMessage }) => ({
      id,
      stockId,
      ticker,
      companyName,
      dataType,
      importedAt,
      fileName,
      totalRows,
      addedRows,
      updatedRows,
      errorRows,
      warningRows,
      success,
      errorMessage,
    }));

  window.localStorage.setItem(CSV_IMPORT_HISTORY_STORAGE_KEY, JSON.stringify(normalized));
}

export function appendCsvImportHistory(item: CsvImportHistoryItem): CsvImportHistoryItem[] {
  const histories = loadCsvImportHistories();
  const next = sortCsvImportHistories([item, ...histories]).slice(0, MAX_HISTORY_ITEMS);
  saveCsvImportHistories(next);
  return next;
}
