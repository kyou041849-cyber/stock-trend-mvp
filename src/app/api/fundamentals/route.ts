import { NextResponse } from "next/server";
import { apiDataSource } from "@/lib/dataSource";
import { extractFundamentalApiRows, extractMarketApiMessage } from "@/lib/marketApiParsing";
import { fetchServerMarketApiJson, getServerMarketApiConfig } from "@/lib/serverMarketApi";
import { formatFundamentalPeriod } from "@/lib/updateHistory";
import type { FundamentalFetchPeriod } from "@/lib/types";
import type { FundamentalApiFetchResult } from "@/types/fundamentalApi";

export const runtime = "nodejs";

const FUNDAMENTAL_PERIODS: FundamentalFetchPeriod[] = ["annual", "quarterly", "all"];

function isFundamentalPeriod(value: unknown): value is FundamentalFetchPeriod {
  return typeof value === "string" && FUNDAMENTAL_PERIODS.includes(value as FundamentalFetchPeriod);
}

function errorResult(input: {
  providerName: string;
  period: FundamentalFetchPeriod;
  status: FundamentalApiFetchResult["status"];
  message: string;
}): FundamentalApiFetchResult {
  return {
    ok: false,
    status: input.status,
    rawRows: [],
    dataSource: {
      ...apiDataSource(input.providerName || "業績データAPI", new Date().toISOString(), `対象期間：${formatFundamentalPeriod(input.period)}`),
      status: input.status,
      message: input.message,
    },
    message: input.message,
  };
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const ticker = typeof body?.ticker === "string" ? body.ticker.trim() : "";
  const providerName = typeof body?.providerName === "string" ? body.providerName.trim() : "";
  const period = isFundamentalPeriod(body?.period) ? body.period : "annual";
  const dataSource = apiDataSource(providerName || "業績データAPI", new Date().toISOString(), `対象期間：${formatFundamentalPeriod(period)}`);

  if (!ticker) {
    return NextResponse.json(errorResult({
      providerName,
      period,
      status: "invalid-format",
      message: "対象銘柄のティッカーが未設定です。",
    }), { status: 400 });
  }

  const config = getServerMarketApiConfig("fundamental");
  if (!config.ok) {
    return NextResponse.json(errorResult({
      providerName,
      period,
      status: "api-not-configured",
      message: config.message,
    }), { status: 503 });
  }

  const fetchResult = await fetchServerMarketApiJson({
    config: config.config,
    params: {
      symbol: ticker,
      ticker,
      period,
      statement: "fundamentals",
    },
  });

  if (!fetchResult.ok) {
    return NextResponse.json(errorResult({
      providerName,
      period,
      status: fetchResult.status,
      message: fetchResult.message,
    }), { status: fetchResult.httpStatus });
  }

  const apiMessage = extractMarketApiMessage(fetchResult.payload);
  if (apiMessage.toLowerCase().includes("rate limit") || apiMessage.includes("レート")) {
    return NextResponse.json(errorResult({
      providerName,
      period,
      status: "rate-limited",
      message: "APIのレート制限に達しました。時間を置いて再確認してください。",
    }), { status: 429 });
  }

  const rawRows = extractFundamentalApiRows(fetchResult.payload);

  if (!rawRows) {
    return NextResponse.json(errorResult({
      providerName,
      period,
      status: "invalid-format",
      message: apiMessage || "APIレスポンス形式が不正です。アダプタ設定を確認してください。",
    }), { status: 502 });
  }

  if (rawRows.length === 0) {
    return NextResponse.json(errorResult({
      providerName,
      period,
      status: "empty",
      message: "対象ティッカーの業績データが見つかりませんでした。",
    }), { status: 404 });
  }

  const result: FundamentalApiFetchResult = {
    ok: true,
    status: "success",
    rawRows,
    dataSource: {
      ...dataSource,
      message: `対象期間：${formatFundamentalPeriod(period)} / 取得件数：${rawRows.length}件`,
    },
    message: `APIから業績データを取得しました（${rawRows.length}件）。`,
  };

  return NextResponse.json(result);
}
