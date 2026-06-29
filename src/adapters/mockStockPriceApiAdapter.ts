import { mockApiDataSource } from "../lib/dataSource";
import { formatStockPricePeriod } from "../lib/updateHistory";
import type { StockPriceFetchPeriod } from "../lib/types";
import type { StockPriceApiFetchResult, StockPriceApiRawRow } from "../types/api";

const PERIOD_TRADING_DAY_COUNTS: Record<StockPriceFetchPeriod, number> = {
  "1m": 34,
  "3m": 70,
  "6m": 135,
  "1y": 252,
  "3y": 756,
  "5y": 1260,
  all: 1260,
};

function tickerSeed(ticker: string): number {
  return ticker
    .trim()
    .toUpperCase()
    .split("")
    .reduce((sum, char, index) => sum + char.charCodeAt(0) * (index + 3), 97);
}

function isBusinessDay(date: Date): boolean {
  const day = date.getUTCDay();
  return day !== 0 && day !== 6;
}

function roundPrice(value: number): number {
  return Math.max(0.01, Number(value.toFixed(2)));
}

function makeMockRows(ticker: string, period: StockPriceFetchPeriod): StockPriceApiRawRow[] {
  const count = PERIOD_TRADING_DAY_COUNTS[period];
  const seed = tickerSeed(ticker);
  const rows: StockPriceApiRawRow[] = [];
  const cursor = new Date();
  cursor.setUTCHours(0, 0, 0, 0);

  const businessDates: string[] = [];
  while (businessDates.length < count) {
    if (isBusinessDay(cursor)) {
      businessDates.push(cursor.toISOString().slice(0, 10));
    }
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  businessDates.reverse();

  let close = 80 + (seed % 220);
  const trend = ((seed % 17) - 7) / 500;
  const waveScale = 0.012 + (seed % 8) / 1000;

  businessDates.forEach((date, index) => {
    const wave = Math.sin((index + seed) / 11) * waveScale;
    const drift = trend + wave;
    const previousClose = close;
    close = roundPrice(Math.max(1, close * (1 + drift)));
    const open = roundPrice(previousClose * (1 + Math.sin((index + seed) / 7) * 0.006));
    const high = roundPrice(Math.max(open, close) * (1.008 + (index % 5) * 0.001));
    const low = roundPrice(Math.min(open, close) * (0.992 - (index % 3) * 0.001));
    const volume = Math.round(600000 + (seed % 900000) + index * 1200 + (index % 19 === 0 ? 240000 : 0));

    rows.push({
      date,
      open,
      high,
      low,
      close,
      volume,
    });
  });

  return rows;
}

export const MockStockPriceApiAdapter = {
  async fetchPrices(ticker: string, period: StockPriceFetchPeriod): Promise<StockPriceApiFetchResult> {
    const now = new Date().toISOString();
    const rawRows = makeMockRows(ticker, period);
    const dataSource = mockApiDataSource(now, `取得期間：${formatStockPricePeriod(period)} / 取得件数：${rawRows.length}件`);

    return {
      ok: true,
      status: rawRows.length > 0 ? "success" : "empty",
      rawRows,
      dataSource,
      message: `Mock APIから株価データを取得しました（${rawRows.length}件）。`,
    };
  },
};
