import { EARNINGS_CSV_REQUIRED_COLUMNS, parseEarningsCsv, type EarningsCsvImportResult } from "./earnings-csv";
import { PRICE_CSV_REQUIRED_COLUMNS, parseCsvLine, parsePriceCsv, type CsvImportResult } from "./csv";
import type { EarningsRow, PriceRow } from "./types";

export type CsvPreviewRow = {
  rowNumber: number;
  values: Record<string, string>;
};

export type CsvImportPreview<T> = {
  ok: boolean;
  result: T;
  totalRows: number;
  addedRows: number;
  updatedRows: number;
  errorRows: number;
  warningRows: number;
  warnings: string[];
  previewRows: CsvPreviewRow[];
};

export type PriceCsvImportPreview = CsvImportPreview<CsvImportResult>;
export type EarningsCsvImportPreview = CsvImportPreview<EarningsCsvImportResult>;

const PRICE_TEMPLATE_ROWS = [
  "2026-01-05,100,105,98,103,1200000",
  "2026-01-06,103,108,102,107,1500000",
  "2026-01-07,107,110,104,109,1300000",
];

const EARNINGS_TEMPLATE_ROWS = [
  "2022,100000,10000,7000,70,12000,8000,55,12,9,500000,30,3,5",
  "2023,120000,14000,9000,90,15000,10000,58,14,10,650000,35,4,5.4",
  "2024,150000,20000,13000,130,22000,16000,60,16,12,900000,40,5,6",
];

export function createPriceCsvTemplate(): string {
  return [PRICE_CSV_REQUIRED_COLUMNS.join(","), ...PRICE_TEMPLATE_ROWS].join("\n");
}

export function createEarningsCsvTemplate(): string {
  return [EARNINGS_CSV_REQUIRED_COLUMNS.join(","), ...EARNINGS_TEMPLATE_ROWS].join("\n");
}

function getNonEmptyLines(text: string): string[] {
  return text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function createPreviewRows(text: string, maxRows = 10): CsvPreviewRow[] {
  const lines = getNonEmptyLines(text);

  if (lines.length <= 1) {
    return [];
  }

  const headers = parseCsvLine(lines[0]).map((header) => header.trim());

  return lines.slice(1, maxRows + 1).map((line, index) => {
    const cells = parseCsvLine(line);
    const values = headers.reduce<Record<string, string>>((accumulator, header, cellIndex) => {
      accumulator[header || `column${cellIndex + 1}`] = cells[cellIndex] ?? "";
      return accumulator;
    }, {});

    return {
      rowNumber: index + 2,
      values,
    };
  });
}

function countUniqueErrorRows(errors: string[]): number {
  const rows = new Set<number>();
  let rowlessErrors = 0;

  errors.forEach((error) => {
    const match = /^(\d+)行目/.exec(error);
    if (match) {
      rows.add(Number(match[1]));
      return;
    }
    rowlessErrors += 1;
  });

  return rows.size + rowlessErrors;
}

export function previewPriceCsv(text: string, existingRows: PriceRow[] = []): PriceCsvImportPreview {
  const result = parsePriceCsv(text, existingRows);
  const duplicateCount = result.summary.duplicateDatesInCsv;
  const warnings = duplicateCount > 0
    ? [`CSV内に同じ日付が${duplicateCount}件あります。同じ日付は後から読み込んだ行で更新します。`]
    : [];

  return {
    ok: result.ok,
    result,
    totalRows: Math.max(0, getNonEmptyLines(text).length - 1),
    addedRows: result.summary.insertedRows,
    updatedRows: result.summary.updatedRows,
    errorRows: countUniqueErrorRows(result.errors),
    warningRows: duplicateCount,
    warnings,
    previewRows: createPreviewRows(text),
  };
}

export function previewEarningsCsv(text: string, existingRows: EarningsRow[] = []): EarningsCsvImportPreview {
  const result = parseEarningsCsv(text, existingRows);
  const duplicateCount = result.summary.duplicateFiscalYearsInCsv;
  const warnings = duplicateCount > 0
    ? [`CSV内に同じ会計年度が${duplicateCount}件あります。同じ会計年度は後から読み込んだ行で更新します。`]
    : [];

  return {
    ok: result.ok,
    result,
    totalRows: Math.max(0, getNonEmptyLines(text).length - 1),
    addedRows: result.summary.insertedRows,
    updatedRows: result.summary.updatedRows,
    errorRows: countUniqueErrorRows(result.errors),
    warningRows: duplicateCount,
    warnings,
    previewRows: createPreviewRows(text),
  };
}
