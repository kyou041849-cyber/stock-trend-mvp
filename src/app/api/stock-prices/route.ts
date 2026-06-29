import { NextResponse } from "next/server";
import { apiDataSource } from "@/lib/dataSource";
import { extractMarketApiMessage, extractStockPriceApiRows } from "@/lib/marketApiParsing";
import { currencyForMarketRegion, normalizeTickerForMarket, resolveMarketRegion } from "@/lib/normalization";
import { fetchServerMarketApiJson, getServerMarketApiConfig } from "@/lib/serverMarketApi";
import { formatStockPricePeriod } from "@/lib/updateHistory";
import type { CurrencyCode, MarketRegion, StockPriceFetchPeriod } from "@/lib/types";
import type { StockPriceApiFetchResult } from "@/types/api";

export const runtime = "nodejs";

const STOCK_PRICE_PERIODS: StockPriceFetchPeriod[] = ["1m", "3m", "6m", "1y", "3y", "5y", "all"];

function isStockPricePeriod(value: unknown): value is StockPriceFetchPeriod {
  return typeof value === "string" && STOCK_PRICE_PERIODS.includes(value as StockPriceFetchPeriod);
}

function errorResult(input: {
  providerName: string;
  period: StockPriceFetchPeriod;
  status: StockPriceApiFetchResult["status"];
  message: string;
  normalizedTicker?: string;
  marketRegion?: MarketRegion;
  currency?: CurrencyCode;
}): StockPriceApiFetchResult {
  return {
    ok: false,
    status: input.status,
    rawRows: [],
    dataSource: {
      ...apiDataSource(input.providerName || "株価データAPI", new Date().toISOString(), `取得期間：${formatStockPricePeriod(input.period)}`),
      status: input.status,
      message: input.message,
    },
    message: input.message,
    normalizedTicker: input.normalizedTicker,
    marketRegion: input.marketRegion,
    currency: input.currency,
  };
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const ticker = typeof body?.ticker === "string" ? body.ticker.trim() : "";
  const providerName = typeof body?.providerName === "string" ? body.providerName.trim() : "";
  const period = isStockPricePeriod(body?.period) ? body.period : "1m";
  const marketRegion = resolveMarketRegion({ ticker, region: body?.marketRegion });
  const normalizedTicker = normalizeTickerForMarket(ticker, marketRegion);
  const currency = currencyForMarketRegion(marketRegion);
  const requestSummary = `取得期間：${formatStockPricePeriod(period)} / 市場：${marketRegion} / 通貨：${currency} / 取得ティッカー：${normalizedTicker || "-"}`;
  const dataSource = apiDataSource(providerName || "株価データAPI", new Date().toISOString(), requestSummary);

  if (!ticker) {
    return NextResponse.json(errorResult({
      providerName,
      period,
      status: "invalid-format",
      message: "対象銘柄のティッカーが未設定です。",
      marketRegion,
      currency,
    }), { status: 400 });
  }

  const config = getServerMarketApiConfig("stock-price");
  if (!config.ok) {
    return NextResponse.json(errorResult({
      providerName,
      period,
      status: "api-not-configured",
      message: config.message,
      normalizedTicker,
      marketRegion,
      currency,
    }), { status: 503 });
  }

  const fetchResult = await fetchServerMarketApiJson({
    config: config.config,
    params: {
      symbol: normalizedTicker,
      ticker: normalizedTicker,
      period,
      region: marketRegion,
      marketRegion,
      currency,
    },
  });

  if (!fetchResult.ok) {
    return NextResponse.json(errorResult({
      providerName,
      period,
      status: fetchResult.status,
      message: fetchResult.message,
      normalizedTicker,
      marketRegion,
      currency,
    }), { status: fetchResult.httpStatus });
  }

  const apiMessage = extractMarketApiMessage(fetchResult.payload);
  if (apiMessage.toLowerCase().includes("rate limit") || apiMessage.includes("レート")) {
    return NextResponse.json(errorResult({
      providerName,
      period,
      status: "rate-limited",
      message: "APIのレート制限に達しました。時間を置いて再確認してください。",
      normalizedTicker,
      marketRegion,
      currency,
    }), { status: 429 });
  }

  const rawRows = extractStockPriceApiRows(fetchResult.payload);

  if (!rawRows) {
    return NextResponse.json(errorResult({
      providerName,
      period,
      status: "invalid-format",
      message: apiMessage || "APIレスポンス形式が不正です。アダプタ設定を確認してください。",
      normalizedTicker,
      marketRegion,
      currency,
    }), { status: 502 });
  }

  if (rawRows.length === 0) {
    return NextResponse.json(errorResult({
      providerName,
      period,
      status: "empty",
      message: "対象ティッカーの株価データが見つかりませんでした。",
      normalizedTicker,
      marketRegion,
      currency,
    }), { status: 404 });
  }

  const result: StockPriceApiFetchResult = {
    ok: true,
    status: "success",
    rawRows,
    dataSource: {
      ...dataSource,
      message: `${requestSummary} / 取得件数：${rawRows.length}件`,
    },
    message: `APIから株価データを取得しました（${rawRows.length}件）。`,
    normalizedTicker,
    marketRegion,
    currency,
  };

  return NextResponse.json(result);
}
