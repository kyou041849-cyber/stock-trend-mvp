import { apiPlannedDataSource, emptyDataResult, successDataResult, type DataResult } from "@/lib/dataSource";
import { sortNewsItems } from "@/lib/newsDeduplication";
import type { NewsItem, StockProfile } from "@/lib/types";

export const LocalNewsAdapter = {
  getNews(stock: StockProfile): DataResult<NewsItem[]> {
    const news = sortNewsItems(stock.news);
    return news.length > 0
      ? successDataResult(news, news[0].dataSource)
      : emptyDataResult<NewsItem[]>(apiPlannedDataSource());
  },

  refresh(): DataResult<null> {
    return {
      status: "api-not-configured",
      data: null,
      dataSource: apiPlannedDataSource(),
      message: "外部API連携は未実装です。現在は手入力またはCSVデータを使用しています。",
    };
  },
};
