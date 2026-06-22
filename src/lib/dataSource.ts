import type { DataSourceInfo, DataSourceType, FetchStatus } from "./types";

export type DataResult<T> = {
  status: FetchStatus;
  data: T | null;
  dataSource: DataSourceInfo;
  message?: string;
};

const DATA_SOURCE_LABELS: Record<DataSourceType, string> = {
  manual: "手入力データ",
  csv: "CSVデータ",
  sample: "サンプルデータ",
  api: "API",
  "mock-api": "Mock API",
  "external-api-planned": "外部API予定",
};

export function createDataSourceInfo(
  type: DataSourceType,
  updatedAt: string,
  options: {
    provider?: string;
    status?: FetchStatus;
    message?: string;
  } = {},
): DataSourceInfo {
  return {
    type,
    label: DATA_SOURCE_LABELS[type],
    provider: options.provider ?? DATA_SOURCE_LABELS[type],
    updatedAt,
    status: options.status ?? "success",
    message: options.message,
  };
}

export function manualDataSource(updatedAt = new Date().toISOString()): DataSourceInfo {
  return createDataSourceInfo("manual", updatedAt, { provider: "手入力" });
}

export function csvDataSource(updatedAt = new Date().toISOString()): DataSourceInfo {
  return createDataSourceInfo("csv", updatedAt, { provider: "CSVインポート" });
}

export function sampleDataSource(updatedAt = "2026-06-15T00:00:00.000Z"): DataSourceInfo {
  return createDataSourceInfo("sample", updatedAt, { provider: "開発用サンプル" });
}

export function apiDataSource(
  provider: string,
  updatedAt = new Date().toISOString(),
  message?: string,
): DataSourceInfo {
  return createDataSourceInfo("api", updatedAt, {
    provider: provider.trim() || "株価データAPI",
    message,
  });
}

export function mockApiDataSource(updatedAt = new Date().toISOString(), message?: string): DataSourceInfo {
  return createDataSourceInfo("mock-api", updatedAt, {
    provider: "Mock API",
    message,
  });
}

export function apiPlannedDataSource(updatedAt = new Date().toISOString()): DataSourceInfo {
  return createDataSourceInfo("external-api-planned", updatedAt, {
    provider: "外部API未設定",
    status: "api-not-configured",
    message: "外部API連携は未実装です。現在は手入力またはCSVデータを使用しています。",
  });
}

export function emptyDataResult<T>(dataSource = apiPlannedDataSource()): DataResult<T> {
  return {
    status: "empty",
    data: null,
    dataSource,
    message: "データなし",
  };
}

export function successDataResult<T>(data: T, dataSource: DataSourceInfo): DataResult<T> {
  const isEmpty = Array.isArray(data) && data.length === 0;

  return {
    status: isEmpty ? "empty" : "success",
    data,
    dataSource,
    message: isEmpty ? "データなし" : undefined,
  };
}

export function apiNotImplementedMessage(): string {
  return "外部API連携は未実装です。現在は手入力またはCSVデータを使用しています。";
}

export function formatDataSource(source: DataSourceInfo): string {
  return `データソース：${source.label}`;
}

export function formatDataSourceDate(source: DataSourceInfo): string {
  return source.updatedAt ? `最終更新日：${source.updatedAt.slice(0, 10)}` : "最終更新日：-";
}

export function normalizeDataSource(value: unknown, fallback: DataSourceInfo): DataSourceInfo {
  if (!value || typeof value !== "object") {
    return fallback;
  }

  const row = value as Record<string, unknown>;
  const type = typeof row.type === "string" ? row.type : fallback.type;
  const status = typeof row.status === "string" ? row.status : fallback.status;

  if (!["manual", "csv", "sample", "api", "mock-api", "external-api-planned"].includes(type)) {
    return fallback;
  }

  return {
    type: type as DataSourceType,
    label: typeof row.label === "string" ? row.label : DATA_SOURCE_LABELS[type as DataSourceType],
    provider: typeof row.provider === "string" ? row.provider : fallback.provider,
    updatedAt: typeof row.updatedAt === "string" ? row.updatedAt : fallback.updatedAt,
    status: ["idle", "loading", "success", "empty", "failed", "api-not-configured", "rate-limited", "invalid-format"].includes(status)
      ? status as FetchStatus
      : fallback.status,
    message: typeof row.message === "string" ? row.message : fallback.message,
  };
}
