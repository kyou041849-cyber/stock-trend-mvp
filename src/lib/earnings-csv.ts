import { sortEarningsRows } from "./growth-math";
import type { EarningsRow } from "./types";
import { parseCsvLine } from "./csv";

export const EARNINGS_CSV_REQUIRED_COLUMNS = [
  "fiscalYear",
  "revenue",
  "operatingIncome",
  "netIncome",
  "eps",
  "operatingCashFlow",
  "freeCashFlow",
  "equityRatio",
  "roe",
  "roic",
  "marketCap",
  "per",
  "pbr",
  "psr",
] as const;

type RequiredColumn = (typeof EARNINGS_CSV_REQUIRED_COLUMNS)[number];

const REQUIRED_VALUE_COLUMNS: RequiredColumn[] = ["fiscalYear", "revenue", "operatingIncome", "netIncome"];

export type EarningsCsvImportSummary = {
  validRows: number;
  insertedRows: number;
  updatedRows: number;
  duplicateFiscalYearsInCsv: number;
};

export type EarningsCsvImportResult = {
  ok: boolean;
  rows: EarningsRow[];
  errors: string[];
  summary: EarningsCsvImportSummary;
};

function parseRequiredNumber(value: string): number | null {
  if (value.trim() === "") {
    return null;
  }

  const parsed = Number(value.replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function parseOptionalNumber(value: string): number | null {
  if (value.trim() === "") {
    return null;
  }

  return parseRequiredNumber(value);
}

function createEarningsId(fiscalYear: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `earnings-${fiscalYear}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function emptySummary(): EarningsCsvImportSummary {
  return {
    validRows: 0,
    insertedRows: 0,
    updatedRows: 0,
    duplicateFiscalYearsInCsv: 0,
  };
}

export function parseEarningsCsv(text: string, existingRows: EarningsRow[] = []): EarningsCsvImportResult {
  const errors: string[] = [];
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) {
    return {
      ok: false,
      rows: sortEarningsRows(existingRows),
      errors: ["CSVが空です"],
      summary: emptySummary(),
    };
  }

  const headers = parseCsvLine(lines[0]);
  const indexes = new Map(headers.map((header, index) => [header.trim(), index]));
  const missingColumns = EARNINGS_CSV_REQUIRED_COLUMNS.filter((column) => !indexes.has(column));

  if (missingColumns.length > 0) {
    return {
      ok: false,
      rows: sortEarningsRows(existingRows),
      errors: [`1行目：必須列 ${missingColumns.join(", ")} がありません`],
      summary: emptySummary(),
    };
  }

  const existingByYear = new Map(existingRows.map((row) => [row.fiscalYear, row]));
  const parsedByYear = new Map<string, EarningsRow>();
  let validRows = 0;
  let duplicateFiscalYearsInCsv = 0;

  for (let lineIndex = 1; lineIndex < lines.length; lineIndex += 1) {
    const lineNumber = lineIndex + 1;
    const cells = parseCsvLine(lines[lineIndex]);
    const getCell = (column: RequiredColumn) => cells[indexes.get(column) ?? -1] ?? "";
    const fiscalYear = getCell("fiscalYear").trim();

    if (!fiscalYear) {
      errors.push(`${lineNumber}行目：fiscalYear が未入力です`);
      continue;
    }

    const missingValueColumns = REQUIRED_VALUE_COLUMNS.filter((column) => getCell(column).trim() === "");
    if (missingValueColumns.length > 0) {
      errors.push(`${lineNumber}行目：必須値 ${missingValueColumns.join(", ")} がありません`);
      continue;
    }

    const revenue = parseRequiredNumber(getCell("revenue"));
    const operatingIncome = parseRequiredNumber(getCell("operatingIncome"));
    const netIncome = parseRequiredNumber(getCell("netIncome"));
    const eps = parseOptionalNumber(getCell("eps"));
    const operatingCashFlow = parseOptionalNumber(getCell("operatingCashFlow"));
    const freeCashFlow = parseOptionalNumber(getCell("freeCashFlow"));
    const equityRatio = parseOptionalNumber(getCell("equityRatio"));
    const roe = parseOptionalNumber(getCell("roe"));
    const roic = parseOptionalNumber(getCell("roic"));
    const marketCap = parseOptionalNumber(getCell("marketCap"));
    const per = parseOptionalNumber(getCell("per"));
    const pbr = parseOptionalNumber(getCell("pbr"));
    const psr = parseOptionalNumber(getCell("psr"));

    const parsedValues = {
      revenue,
      operatingIncome,
      netIncome,
      eps,
      operatingCashFlow,
      freeCashFlow,
      equityRatio,
      roe,
      roic,
      marketCap,
      per,
      pbr,
      psr,
    };
    const invalidColumns = Object.entries(parsedValues)
      .filter(([column, value]) => getCell(column as RequiredColumn).trim() !== "" && value === null)
      .map(([column]) => column);

    if (invalidColumns.length > 0) {
      errors.push(`${lineNumber}行目：${invalidColumns.join(", ")} が数値ではありません`);
      continue;
    }

    if (revenue === null || operatingIncome === null || netIncome === null) {
      continue;
    }

    if (revenue <= 0) {
      errors.push(`${lineNumber}行目：revenue は0より大きい数値にしてください`);
      continue;
    }

    if (parsedByYear.has(fiscalYear)) {
      duplicateFiscalYearsInCsv += 1;
    }

    parsedByYear.set(fiscalYear, {
      id: existingByYear.get(fiscalYear)?.id ?? createEarningsId(fiscalYear),
      fiscalYear,
      revenue,
      operatingIncome,
      netIncome,
      eps,
      operatingCashFlow,
      freeCashFlow,
      equityRatio,
      roe,
      roic,
      marketCap,
      per,
      pbr,
      psr,
      memo: existingByYear.get(fiscalYear)?.memo ?? "",
    });
    validRows += 1;
  }

  const updatedRows = [...parsedByYear.keys()].filter((fiscalYear) => existingByYear.has(fiscalYear)).length;
  const insertedRows = parsedByYear.size - updatedRows;
  const summary: EarningsCsvImportSummary = {
    validRows,
    insertedRows,
    updatedRows,
    duplicateFiscalYearsInCsv,
  };

  if (errors.length > 0) {
    return {
      ok: false,
      rows: sortEarningsRows(existingRows),
      errors,
      summary,
    };
  }

  const mergedByYear = new Map(existingByYear);
  parsedByYear.forEach((row, fiscalYear) => {
    mergedByYear.set(fiscalYear, row);
  });

  return {
    ok: true,
    rows: sortEarningsRows([...mergedByYear.values()]),
    errors: [],
    summary,
  };
}
