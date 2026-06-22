import { LocalNewsAdapter } from "@/adapters/localNewsAdapter";
import { MockNewsApiAdapter } from "@/adapters/mockNewsApiAdapter";
import type { DataResult } from "@/lib/dataSource";
import { mergeNewsItems, sortNewsItems } from "@/lib/newsDeduplication";
import type { NewsItem, StockProfile } from "@/lib/types";

export function getNewsData(stock: StockProfile): DataResult<NewsItem[]> {
  return LocalNewsAdapter.getNews(stock);
}

export function getRecentNews(stocks: StockProfile[], limit = 5): Array<{ stock: StockProfile; news: NewsItem }> {
  return stocks
    .flatMap((stock) => stock.news.map((news) => ({ stock, news })))
    .sort((a, b) => b.news.date.localeCompare(a.news.date))
    .slice(0, limit);
}

export function requestNewsUpdate(): DataResult<null> {
  return LocalNewsAdapter.refresh();
}

export type NewsUpdateResult = {
  stock: StockProfile;
  addedCount: number;
  skippedCount: number;
  fetchedCount: number;
  message: string;
};

export async function updateNewsFromMockApi(stock: StockProfile): Promise<NewsUpdateResult> {
  const result = await MockNewsApiAdapter.fetchNews(stock);
  const merged = mergeNewsItems(stock.news, result.items);
  const now = new Date().toISOString();

  return {
    stock: {
      ...stock,
      news: merged.items,
      updatedAt: now,
    },
    addedCount: merged.addedCount,
    skippedCount: merged.skippedCount,
    fetchedCount: result.items.length,
    message: `ニュース更新：${result.items.length}件取得、${merged.addedCount}件追加、${merged.skippedCount}件重複スキップ。`,
  };
}

export function sortNewsForDisplay(news: NewsItem[]): NewsItem[] {
  return sortNewsItems(news);
}
