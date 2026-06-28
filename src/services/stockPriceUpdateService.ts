import { ApiStockPriceAdapter } from "@/adapters/apiStockPriceAdapter";
import { MockStockPriceApiAdapter } from "@/adapters/mockStockPriceApiAdapter";
import { apiPlannedDataSource, mockApiDataSource } from "@/lib/dataSource";
import {
  filterRowsByPeriod,
  mergeStockPriceRows,
  normalizeApiStockPriceRows,
} from "@/lib/stockPriceNormalizer";
import {
  createStockPriceUpdateHistory,
  formatStockPricePeriod,
  prependStockPriceUpdateHistory,
} from "@/lib/updateHistory";
import type {
  DataSourceInfo,
  StockPriceApiSettings,
  StockPriceFetchPeriod,
  StockPriceUpdateHistory,
  StockProfile,
} from "@/lib/types";

export type StockPriceUpdateResult = {
  ok: boolean;
  stock: StockProfile;
  history: StockPriceUpdateHistory;
  message: string;
};

export type StockPriceConnectionCheckResult = {
  ok: boolean;
  message: string;
  checkedAt: string;
};

function createFailureResult(input: {
  stock: StockProfile;
  message: string;
  period: StockPriceFetchPeriod;
  dataSource?: DataSourceInfo;
  updatedAt?: string;
}): StockPriceUpdateResult {
  const updatedAt = input.updatedAt ?? new Date().toISOString();
  const dataSource = input.dataSource ?? apiPlannedDataSource(updatedAt);
  const history = createStockPriceUpdateHistory({
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
      priceUpdateHistories: prependStockPriceUpdateHistory(input.stock.priceUpdateHistories, history),
      updatedAt,
    },
    history,
    message: `更新失敗：${input.message}`,
  };
}

function validateRealApiSettings(settings: StockPriceApiSettings): string | null {
  if (!settings.enabled) {
    return "株価データAPIが無効です。設定画面で有効にするか、Mock APIモードを使用してください。";
  }

  if (!settings.providerName.trim()) {
    return "APIプロバイダ名が未設定です。";
  }

  return null;
}

export async function updateStockPricesFromApi(
  stock: StockProfile,
  settings: StockPriceApiSettings,
  period: StockPriceFetchPeriod,
): Promise<StockPriceUpdateResult> {
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
    ? await MockStockPriceApiAdapter.fetchPrices(stock.ticker, period)
    : await ApiStockPriceAdapter.fetchPrices(stock.ticker, period, settings);

  if (!fetchResult.ok) {
    return createFailureResult({
      stock,
      period,
      updatedAt,
      dataSource: fetchResult.dataSource,
      message: fetchResult.message,
    });
  }

  const normalized = normalizeApiStockPriceRows(fetchResult.rawRows, fetchResult.dataSource, updatedAt);

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

  const incomingRows = filterRowsByPeriod(normalized.rows, period);

  if (incomingRows.length === 0) {
    return createFailureResult({
      stock,
      period,
      updatedAt,
      dataSource: {
        ...fetchResult.dataSource,
        status: "empty",
      },
      message: "取得件数0件です。対象ティッカーや取得期間を確認してください。",
    });
  }

  const dataSource: DataSourceInfo = {
    ...fetchResult.dataSource,
    updatedAt,
    status: "success",
    message: `取得期間：${formatStockPricePeriod(period)} / 取得件数：${incomingRows.length}件`,
  };
  const rowsWithSource = incomingRows.map((row) => ({
    ...row,
    source: dataSource,
    updatedAt,
  }));
  const history = createStockPriceUpdateHistory({
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
    prices: mergeStockPriceRows(stock.prices, rowsWithSource),
    priceDataSource: dataSource,
    priceUpdateHistories: prependStockPriceUpdateHistory(stock.priceUpdateHistories, history),
    updatedAt,
  };

  return {
    ok: true,
    stock: updatedStock,
    history,
    message: `更新成功：${dataSource.provider}から株価データを取得しました（${rowsWithSource.length}件）。`,
  };
}

export async function checkStockPriceApiConnection(settings: StockPriceApiSettings): Promise<StockPriceConnectionCheckResult> {
  const checkedAt = new Date().toISOString();

  if (settings.mockMode) {
    const mockResult = await MockStockPriceApiAdapter.fetchPrices("MOCK", "1m");
    return {
      ok: mockResult.ok,
      checkedAt,
      message: mockResult.ok
        ? "Mock APIモードで接続確認ができました。"
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

export function getDefaultMockPriceDataSource(): DataSourceInfo {
  return mockApiDataSource(new Date().toISOString(), "Mock APIモードで動作確認できます。");
}
