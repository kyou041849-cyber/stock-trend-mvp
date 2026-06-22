import { sortEarningsRows } from "./growth-math";
import { normalizeNumericUnit } from "./normalization";
import type {
  CurrencyCode,
  DataSourceInfo,
  EarningsRow,
  FundamentalFetchPeriod,
  FundamentalFiscalQuarter,
  FundamentalPeriodType,
  NumericUnit,
} from "./types";

export type FundamentalApiRawRow = Record<string, unknown>;

export type FundamentalNormalizeContext = {
  stockId: string;
  currency: CurrencyCode;
  unit: NumericUnit;
  dataSource: DataSourceInfo;
  updatedAt: string;
};

export type FundamentalNormalizeResult = {
  ok: boolean;
  rows: EarningsRow[];
  errors: string[];
};

function createEarningsId(stockId: string, fiscalYear: string, fiscalQuarter: FundamentalFiscalQuarter): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `earnings-${stockId}-${fiscalYear}-${fiscalQuarter}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function readRawValue(row: FundamentalApiRawRow, keys: string[]): unknown {
  for (const key of keys) {
    if (key in row) {
      return row[key];
    }
  }

  return undefined;
}

function parseFiscalYear(value: unknown): string | null {
  if (typeof value === "number" && Number.isInteger(value)) {
    return String(value);
  }

  if (typeof value !== "string") {
    return null;
  }

  const raw = value.trim();
  const match = /(\d{4})/.exec(raw);

  if (!match) {
    return null;
  }

  return match[1];
}

function parseNumber(value: unknown): { value: number | null; invalid: boolean } {
  if (value === null || value === undefined || value === "") {
    return { value: null, invalid: false };
  }

  if (typeof value === "number") {
    return { value: Number.isFinite(value) ? value : null, invalid: !Number.isFinite(value) };
  }

  if (typeof value !== "string") {
    return { value: null, invalid: true };
  }

  const normalized = value.replace(/,/g, "").trim();

  if (!normalized) {
    return { value: null, invalid: false };
  }

  const parsed = Number(normalized);
  return { value: Number.isFinite(parsed) ? parsed : null, invalid: !Number.isFinite(parsed) };
}

function parseCurrency(value: unknown, fallback: CurrencyCode): CurrencyCode {
  const raw = typeof value === "string" ? value.toUpperCase().trim() : "";
  return ["JPY", "USD", "UNKNOWN"].includes(raw) ? raw as CurrencyCode : fallback;
}

function parsePeriodType(row: FundamentalApiRawRow): FundamentalPeriodType {
  const raw = String(readRawValue(row, ["periodType", "period", "frequency"]) ?? "").toLowerCase();
  if (raw.includes("quarter")) return "quarterly";
  return "annual";
}

function parseFiscalQuarter(row: FundamentalApiRawRow, periodType: FundamentalPeriodType): FundamentalFiscalQuarter {
  const raw = String(readRawValue(row, ["fiscalQuarter", "quarter", "period"]) ?? "").toUpperCase();
  if (["Q1", "Q2", "Q3", "Q4"].includes(raw)) return raw as FundamentalFiscalQuarter;
  return periodType === "quarterly" ? "Q4" : "fullYear";
}

export function normalizeApiFundamentalRows(
  rawRows: FundamentalApiRawRow[],
  context: FundamentalNormalizeContext,
): FundamentalNormalizeResult {
  const errors: string[] = [];
  const rowsByYear = new Map<string, EarningsRow>();

  rawRows.forEach((row, index) => {
    const rowNumber = index + 1;
    const fiscalYear = parseFiscalYear(readRawValue(row, ["fiscalYear", "year", "period", "fiscalDateEnding", "date"]));
    const periodType = parsePeriodType(row);
    const fiscalQuarter = parseFiscalQuarter(row, periodType);
    const revenue = parseNumber(readRawValue(row, ["revenue", "sales", "totalRevenue"]));
    const operatingIncome = parseNumber(readRawValue(row, ["operatingIncome", "operatingProfit", "operatingEarnings", "operatingIncomeLoss"]));
    const netIncome = parseNumber(readRawValue(row, ["netIncome", "netProfit", "netEarnings"]));
    const eps = parseNumber(readRawValue(row, ["eps", "EPS", "dilutedEPS"]));
    const operatingCashFlow = parseNumber(readRawValue(row, ["operatingCashFlow", "cashFlowFromOperations", "operatingCF"]));
    const freeCashFlow = parseNumber(readRawValue(row, ["freeCashFlow", "fcf", "freeCF"]));
    const equityRatio = parseNumber(readRawValue(row, ["equityRatio", "equityToAssetRatio"]));
    const roe = parseNumber(readRawValue(row, ["roe", "ROE", "returnOnEquity"]));
    const roic = parseNumber(readRawValue(row, ["roic", "ROIC", "returnOnInvestedCapital"]));
    const marketCap = parseNumber(readRawValue(row, ["marketCap", "marketCapitalization"]));
    const per = parseNumber(readRawValue(row, ["per", "PER", "peRatio"]));
    const pbr = parseNumber(readRawValue(row, ["pbr", "PBR", "pbRatio"]));
    const psr = parseNumber(readRawValue(row, ["psr", "PSR", "priceToSalesRatio"]));

    if (!fiscalYear) {
      errors.push(`${rowNumber}行目: 会計年度形式が不正です。`);
      return;
    }

    const requiredValues = { revenue, operatingIncome, netIncome };
    const missingRequired = Object.entries(requiredValues)
      .filter(([, result]) => result.value === null)
      .map(([key]) => key);

    if (missingRequired.length > 0) {
      errors.push(`${rowNumber}行目: 必須値が不足しています (${missingRequired.join(", ")})。`);
      return;
    }

    const numericValues = { revenue, operatingIncome, netIncome, eps, operatingCashFlow, freeCashFlow, equityRatio, roe, roic, marketCap, per, pbr, psr };
    const invalidColumns = Object.entries(numericValues)
      .filter(([, result]) => result.invalid)
      .map(([key]) => key);

    if (invalidColumns.length > 0) {
      errors.push(`${rowNumber}行目: 数値変換に失敗しました (${invalidColumns.join(", ")})。`);
      return;
    }

    if (revenue.value === null || operatingIncome.value === null || netIncome.value === null) {
      return;
    }

    if (revenue.value <= 0) {
      errors.push(`${rowNumber}行目: 売上高は0より大きい数値にしてください。`);
      return;
    }

    const currency = parseCurrency(readRawValue(row, ["currency"]), context.currency);
    const unit = normalizeNumericUnit(readRawValue(row, ["unit", "numericUnit", "financialUnit"]), context.unit);

    rowsByYear.set(fiscalYear, {
      id: createEarningsId(context.stockId, fiscalYear, fiscalQuarter),
      periodType,
      fiscalYear,
      fiscalQuarter,
      revenue: revenue.value,
      operatingIncome: operatingIncome.value,
      netIncome: netIncome.value,
      eps: eps.value,
      operatingCashFlow: operatingCashFlow.value,
      freeCashFlow: freeCashFlow.value,
      equityRatio: equityRatio.value,
      roe: roe.value,
      roic: roic.value,
      marketCap: marketCap.value,
      per: per.value,
      pbr: pbr.value,
      psr: psr.value,
      currency,
      unit,
      source: context.dataSource,
      updatedAt: context.updatedAt,
      memo: "API取得データ",
    });
  });

  const rows = sortEarningsRows([...rowsByYear.values()]);

  return {
    ok: errors.length === 0,
    rows,
    errors,
  };
}

export function mergeFundamentalRows(existingRows: EarningsRow[], incomingRows: EarningsRow[]): EarningsRow[] {
  const rowsByYear = new Map<string, EarningsRow>();

  existingRows.forEach((row) => rowsByYear.set(row.fiscalYear, row));
  incomingRows.forEach((row) => {
    rowsByYear.set(row.fiscalYear, {
      ...row,
      id: existingRows.find((existing) => existing.fiscalYear === row.fiscalYear)?.id ?? row.id,
      memo: row.memo || existingRows.find((existing) => existing.fiscalYear === row.fiscalYear)?.memo || "",
    });
  });

  return sortEarningsRows([...rowsByYear.values()]);
}

export function filterFundamentalRowsByPeriod(rows: EarningsRow[], period: FundamentalFetchPeriod): EarningsRow[] {
  if (period === "all") {
    return sortEarningsRows(rows);
  }

  if (period === "quarterly") {
    return sortEarningsRows(rows.filter((row) => row.periodType === "quarterly"));
  }

  return sortEarningsRows(rows.filter((row) => (row.periodType ?? "annual") === "annual"));
}
