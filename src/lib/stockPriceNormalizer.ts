import { sortPriceRows } from "./stock-math";
import type { DataSourceInfo, PriceRow, StockPriceFetchPeriod } from "./types";

export type ApiStockPriceRawRow = Record<string, unknown>;

export type StockPriceNormalizeResult = {
  ok: boolean;
  rows: PriceRow[];
  errors: string[];
};

function readRawValue(row: ApiStockPriceRawRow, keys: string[]): unknown {
  for (const key of keys) {
    if (key in row) {
      return row[key];
    }
  }

  return undefined;
}

function parseIsoDate(value: unknown): string | null {
  if (value instanceof Date && Number.isFinite(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }

  if (typeof value !== "string" && typeof value !== "number") {
    return null;
  }

  const raw = String(value).trim();
  const dateText = /^\d{8}$/.test(raw)
    ? `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`
    : raw.slice(0, 10);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateText);

  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return dateText;
}

function parseNumber(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.replace(/,/g, "").trim();

  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function normalizeApiStockPriceRows(
  rawRows: ApiStockPriceRawRow[],
  source: DataSourceInfo,
  updatedAt = new Date().toISOString(),
): StockPriceNormalizeResult {
  const errors: string[] = [];
  const rowsByDate = new Map<string, PriceRow>();

  rawRows.forEach((row, index) => {
    const rowNumber = index + 1;
    const date = parseIsoDate(readRawValue(row, ["date", "timestamp", "time", "day"]));
    const open = parseNumber(readRawValue(row, ["open", "o", "Open"]));
    const high = parseNumber(readRawValue(row, ["high", "h", "High"]));
    const low = parseNumber(readRawValue(row, ["low", "l", "Low"]));
    const close = parseNumber(readRawValue(row, ["close", "c", "Close", "adjClose", "adjustedClose"]));
    const volume = parseNumber(readRawValue(row, ["volume", "v", "Volume"]));

    if (!date) {
      errors.push(`${rowNumber}行目: 日付形式が不正です。`);
      return;
    }

    const invalidColumns = Object.entries({ open, high, low, close, volume })
      .filter(([, value]) => value === null)
      .map(([key]) => key);

    if (invalidColumns.length > 0) {
      errors.push(`${rowNumber}行目: 数値変換に失敗しました (${invalidColumns.join(", ")})。`);
      return;
    }

    if (
      open === null ||
      high === null ||
      low === null ||
      close === null ||
      volume === null
    ) {
      return;
    }

    if (open <= 0 || high <= 0 || low <= 0 || close <= 0 || volume < 0) {
      errors.push(`${rowNumber}行目: 価格は0より大きく、出来高は0以上にしてください。`);
      return;
    }

    rowsByDate.set(date, {
      date,
      open,
      high,
      low,
      close,
      volume,
      source,
      updatedAt,
    });
  });

  const rows = sortPriceRows([...rowsByDate.values()]);

  return {
    ok: errors.length === 0,
    rows,
    errors,
  };
}

export function mergeStockPriceRows(existingRows: PriceRow[], incomingRows: PriceRow[]): PriceRow[] {
  const rowsByDate = new Map<string, PriceRow>();

  existingRows.forEach((row) => rowsByDate.set(row.date, row));
  incomingRows.forEach((row) => rowsByDate.set(row.date, row));

  return sortPriceRows([...rowsByDate.values()]);
}

export function filterRowsByPeriod(rows: PriceRow[], period: StockPriceFetchPeriod): PriceRow[] {
  if (period === "all" || rows.length === 0) {
    return sortPriceRows(rows);
  }

  const sortedRows = sortPriceRows(rows);
  const latest = sortedRows.at(-1);

  if (!latest) {
    return [];
  }

  const endDate = new Date(`${latest.date}T00:00:00.000Z`);
  const startDate = new Date(endDate);

  if (period === "1m") startDate.setUTCDate(startDate.getUTCDate() - 45);
  if (period === "3m") startDate.setUTCMonth(startDate.getUTCMonth() - 3);
  if (period === "6m") startDate.setUTCMonth(startDate.getUTCMonth() - 6);
  if (period === "1y") startDate.setUTCFullYear(startDate.getUTCFullYear() - 1);
  if (period === "3y") startDate.setUTCFullYear(startDate.getUTCFullYear() - 3);
  if (period === "5y") startDate.setUTCFullYear(startDate.getUTCFullYear() - 5);

  const startIso = startDate.toISOString().slice(0, 10);
  return sortedRows.filter((row) => row.date >= startIso);
}
