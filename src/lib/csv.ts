import { sortPriceRows } from "./stock-math";
import type { PriceRow } from "./types";

export const PRICE_CSV_REQUIRED_COLUMNS = ["date", "open", "high", "low", "close", "volume"] as const;

export type CsvImportSummary = {
  validRows: number;
  insertedRows: number;
  updatedRows: number;
  duplicateDatesInCsv: number;
};

export type CsvImportResult = {
  ok: boolean;
  rows: PriceRow[];
  errors: string[];
  summary: CsvImportSummary;
};

export function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === "\"" && inQuotes && next === "\"") {
      current += "\"";
      index += 1;
      continue;
    }

    if (char === "\"") {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      cells.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  cells.push(current.trim());
  return cells;
}

function parseIsoDate(value: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());

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

  return `${match[1]}-${match[2]}-${match[3]}`;
}

function parseNumberCell(value: string): number | null {
  const normalized = value.replace(/,/g, "").trim();

  if (normalized === "") {
    return null;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function createEmptySummary(): CsvImportSummary {
  return {
    validRows: 0,
    insertedRows: 0,
    updatedRows: 0,
    duplicateDatesInCsv: 0,
  };
}

export function parsePriceCsv(text: string, existingRows: PriceRow[] = []): CsvImportResult {
  const errors: string[] = [];
  const normalizedText = text.replace(/^\uFEFF/, "");
  const lines = normalizedText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) {
    return {
      ok: false,
      rows: sortPriceRows(existingRows),
      errors: ["CSVが空です"],
      summary: createEmptySummary(),
    };
  }

  const headers = parseCsvLine(lines[0]).map((header) => header.trim().toLowerCase());
  const indexes = new Map(headers.map((header, index) => [header, index]));
  const missingColumns = PRICE_CSV_REQUIRED_COLUMNS.filter((column) => !indexes.has(column));

  if (missingColumns.length > 0) {
    return {
      ok: false,
      rows: sortPriceRows(existingRows),
      errors: [`1行目：必須列 ${missingColumns.join(", ")} がありません`],
      summary: createEmptySummary(),
    };
  }

  const existingByDate = new Map(existingRows.map((row) => [row.date, row]));
  const parsedByDate = new Map<string, PriceRow>();
  let validRows = 0;
  let duplicateDatesInCsv = 0;

  for (let lineIndex = 1; lineIndex < lines.length; lineIndex += 1) {
    const lineNumber = lineIndex + 1;
    const cells = parseCsvLine(lines[lineIndex]);
    const getCell = (column: (typeof PRICE_CSV_REQUIRED_COLUMNS)[number]) => cells[indexes.get(column) ?? -1] ?? "";
    const date = parseIsoDate(getCell("date"));
    const open = parseNumberCell(getCell("open"));
    const high = parseNumberCell(getCell("high"));
    const low = parseNumberCell(getCell("low"));
    const close = parseNumberCell(getCell("close"));
    const volume = parseNumberCell(getCell("volume"));

    if (!date) {
      errors.push(`${lineNumber}行目：date が不正です。YYYY-MM-DD形式で入力してください`);
      continue;
    }

    const numericValues = { open, high, low, close, volume };
    const invalidColumns = Object.entries(numericValues)
      .filter(([, value]) => value === null)
      .map(([column]) => column);

    if (invalidColumns.length > 0) {
      errors.push(`${lineNumber}行目：${invalidColumns.join(", ")} が数値ではありません`);
      continue;
    }

    if (
      open === null ||
      high === null ||
      low === null ||
      close === null ||
      volume === null
    ) {
      continue;
    }

    if (open <= 0 || high <= 0 || low <= 0 || close <= 0 || volume < 0) {
      errors.push(`${lineNumber}行目：価格は0より大きく、volumeは0以上にしてください`);
      continue;
    }

    if (parsedByDate.has(date)) {
      duplicateDatesInCsv += 1;
    }

    parsedByDate.set(date, {
      date,
      open,
      high,
      low,
      close,
      volume,
    });
    validRows += 1;
  }

  const updatedRows = [...parsedByDate.keys()].filter((date) => existingByDate.has(date)).length;
  const insertedRows = parsedByDate.size - updatedRows;
  const summary: CsvImportSummary = {
    validRows,
    insertedRows,
    updatedRows,
    duplicateDatesInCsv,
  };

  if (errors.length > 0) {
    return {
      ok: false,
      rows: sortPriceRows(existingRows),
      errors,
      summary,
    };
  }

  const mergedByDate = new Map(existingByDate);
  parsedByDate.forEach((row, date) => {
    mergedByDate.set(date, row);
  });

  return {
    ok: true,
    rows: sortPriceRows([...mergedByDate.values()]),
    errors: [],
    summary,
  };
}
