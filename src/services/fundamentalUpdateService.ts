import { ApiFundamentalAdapter } from "@/adapters/apiFundamentalAdapter";
import { MockFundamentalApiAdapter } from "@/adapters/mockFundamentalApiAdapter";
import { apiPlannedDataSource } from "@/lib/dataSource";
import {
  filterFundamentalRowsByPeriod,
  mergeFundamentalRows,
  normalizeApiFundamentalRows,
} from "@/lib/fundamentalNormalizer";
import {
  createFundamentalUpdateHistory,
  formatFundamentalPeriod,
  prependFundamentalUpdateHistory,
} from "@/lib/updateHistory";
import type {
  DataSourceInfo,
  FundamentalApiSettings,
  FundamentalFetchPeriod,
  FundamentalUpdateHistory,
  StockProfile,
} from "@/lib/types";

export type FundamentalUpdateResult = {
  ok: boolean;
  stock: StockProfile;
  history: FundamentalUpdateHistory;
  message: string;
};

export type FundamentalConnectionCheckResult = {
  ok: boolean;
  message: string;
  checkedAt: string;
};

function createFailureResult(input: {
  stock: StockProfile;
  message: string;
  period: FundamentalFetchPeriod;
  dataSource?: DataSourceInfo;
  updatedAt?: string;
}): FundamentalUpdateResult {
  const updatedAt = input.updatedAt ?? new Date().toISOString();
  const dataSource = input.dataSource ?? apiPlannedDataSource(updatedAt);
  const history = createFundamentalUpdateHistory({
    stockId: input.stock.id,
    method: dataSource.type === "mock-api" ? "Mock API" : "API",
    period: input.period,
    fetchedCount: 0,
    success: false,
    errorMessage: input.message,
    dataSource,
    updatedAt,
  });

  return {
    ok: false,
    stock: {
      ...input.stock,
      fundamentalUpdateHistories: prependFundamentalUpdateHistory(input.stock.fundamentalUpdateHistories, history),
      updatedAt,
    },
    history,
    message: `更新失敗：${input.message}`,
  };
}

function validateRealApiSettings(settings: FundamentalApiSettings): string | null {
  if (!settings.enabled) {
    return "業績データAPIが無効です。設定画面で有効にするか、Mock APIモードを使用してください。";
  }

  if (!settings.providerName.trim()) {
    return "APIプロバイダ名が未設定です。";
  }

  return null;
}

export async function updateFundamentalsFromApi(
  stock: StockProfile,
  settings: FundamentalApiSettings,
  period: FundamentalFetchPeriod = "annual",
): Promise<FundamentalUpdateResult> {
  const updatedAt = new Date().toISOString();

  if (!stock.ticker.trim()) {
    return createFailureResult({
      stock,
      period,
      updatedAt,
      message: "対象銘柄のティッカーが未設定です。",
    });
  }

  const useMockApi = settings.mockMode;

  if (!useMockApi) {
    const validationMessage = validateRealApiSettings(settings);
    if (validationMessage) {
      return createFailureResult({
        stock,
        period,
        updatedAt,
        message: validationMessage,
      });
    }
  }

  const fetchResult = useMockApi
    ? await MockFundamentalApiAdapter.fetchFundamentals(stock.ticker, period, stock.currency, stock.financialUnit)
    : await ApiFundamentalAdapter.fetchFundamentals(stock.ticker, period, settings);

  if (!fetchResult.ok) {
    return createFailureResult({
      stock,
      period,
      updatedAt,
      dataSource: fetchResult.dataSource,
      message: fetchResult.message,
    });
  }

  const normalized = normalizeApiFundamentalRows(fetchResult.rawRows, {
    stockId: stock.id,
    currency: stock.currency,
    unit: stock.financialUnit,
    dataSource: fetchResult.dataSource,
    updatedAt,
  });

  if (!normalized.ok) {
    return createFailureResult({
      stock,
      period,
      updatedAt,
      dataSource: {
        ...fetchResult.dataSource,
        status: "invalid-format",
      },
      message: normalized.errors.slice(0, 3).join(" / ") || "APIレスポンス形式が不正です。",
    });
  }

  const incomingRows = filterFundamentalRowsByPeriod(normalized.rows, period);

  if (incomingRows.length === 0) {
    return createFailureResult({
      stock,
      period,
      updatedAt,
      dataSource: {
        ...fetchResult.dataSource,
        status: "empty",
      },
      message: "取得件数0件です。対象ティッカーや対象期間を確認してください。",
    });
  }

  const dataSource: DataSourceInfo = {
    ...fetchResult.dataSource,
    updatedAt,
    status: "success",
    message: `対象期間：${formatFundamentalPeriod(period)} / 取得件数：${incomingRows.length}件 / 単位：${stock.financialUnit}`,
  };
  const rowsWithSource = incomingRows.map((row) => ({
    ...row,
    source: dataSource,
    updatedAt,
  }));
  const history = createFundamentalUpdateHistory({
    stockId: stock.id,
    method: useMockApi ? "Mock API" : "API",
    period,
    fetchedCount: rowsWithSource.length,
    success: true,
    dataSource,
    updatedAt,
  });
  const updatedStock: StockProfile = {
    ...stock,
    earnings: mergeFundamentalRows(stock.earnings, rowsWithSource),
    fundamentalDataSource: dataSource,
    fundamentalUpdateHistories: prependFundamentalUpdateHistory(stock.fundamentalUpdateHistories, history),
    updatedAt,
  };

  return {
    ok: true,
    stock: updatedStock,
    history,
    message: `更新成功：${dataSource.provider}から業績データを取得しました（${rowsWithSource.length}件）。`,
  };
}

export async function checkFundamentalApiConnection(settings: FundamentalApiSettings): Promise<FundamentalConnectionCheckResult> {
  const checkedAt = new Date().toISOString();

  if (settings.mockMode) {
    const mockResult = await MockFundamentalApiAdapter.fetchFundamentals("MOCK", "annual", "USD", "百万ドル");
    return {
      ok: mockResult.ok,
      checkedAt,
      message: mockResult.ok
        ? "Mock APIモードで業績データの接続確認ができました。"
        : mockResult.message,
    };
  }

  const validationMessage = validateRealApiSettings(settings);
  if (validationMessage) {
    return {
      ok: false,
      checkedAt,
      message: validationMessage,
    };
  }

  return {
    ok: false,
    checkedAt,
    message: "実APIはサーバー側API Route経由で取得します。サーバー環境変数が未設定の場合は、更新時に安全な未設定エラーを表示します。",
  };
}
