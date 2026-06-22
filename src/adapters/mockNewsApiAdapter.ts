import { mockApiDataSource } from "@/lib/dataSource";
import type { NewsCategory, NewsItem, NewsSentiment, StockProfile } from "@/lib/types";

const CATEGORIES: NewsCategory[] = ["決算", "業績", "新製品", "提携", "M&A", "規制", "訴訟", "マクロ経済", "セクター動向", "その他"];
const SENTIMENTS: NewsSentiment[] = ["ポジティブ", "ネガティブ", "中立", "未分類"];

function createNewsId(stockId: string, index: number): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `mock-news-${stockId}-${Date.now()}-${index}-${Math.random().toString(16).slice(2)}`;
}

function tickerSeed(ticker: string): number {
  return ticker
    .trim()
    .toUpperCase()
    .split("")
    .reduce((sum, char, index) => sum + char.charCodeAt(0) * (index + 7), 149);
}

function dateDaysAgo(daysAgo: number): string {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().slice(0, 10);
}

function titleFor(stock: StockProfile, category: NewsCategory, index: number): string {
  const base = stock.companyName || stock.ticker;
  const templates: Record<NewsCategory, string[]> = {
    決算: [`${base}、四半期決算の確認ポイントを公表`, `${base}、通期見通しに関する資料を更新`],
    業績: [`${base}、売上動向に関する説明資料を公開`, `${base}、利益率の変化について補足`],
    新製品: [`${base}、新サービスの提供計画を発表`, `${base}、新製品ラインの展開を案内`],
    提携: [`${base}、事業パートナーとの連携を発表`, `${base}、共同開発に関する取り組みを公表`],
    "M&A": [`${base}、事業取得に関する検討状況を発表`, `${base}、子会社再編に関する資料を公開`],
    規制: [`${base}、規制変更への対応方針を説明`, `${base}、当局対応に関する更新を公表`],
    訴訟: [`${base}、係争案件に関する進捗を公表`, `${base}、法務関連の確認事項を開示`],
    マクロ経済: [`${base}、為替や金利環境の影響を説明`, `${base}、市場環境に関する見解を更新`],
    セクター動向: [`${stock.sector || "関連セクター"}の需要動向に関する報道`, `${stock.sector || "関連セクター"}で競争環境の変化が報じられる`],
    その他: [`${base}、事業概況に関するニュース`, `${base}、調査メモ向けの確認材料`],
  };

  const choices = templates[category];
  return choices[index % choices.length];
}

export const MockNewsApiAdapter = {
  async fetchNews(stock: StockProfile): Promise<{ items: NewsItem[]; message: string }> {
    const seed = tickerSeed(stock.ticker);
    const count = 5 + (seed % 6);
    const now = new Date().toISOString();
    const dataSource = mockApiDataSource(now, `取得件数：${count}件`);
    const items: NewsItem[] = Array.from({ length: count }, (_, index) => {
      const category = CATEGORIES[(seed + index) % CATEGORIES.length];
      const sentiment = SENTIMENTS[(seed + index * 2) % SENTIMENTS.length];
      const importance = index % 5 === 0 ? "高" : index % 2 === 0 ? "中" : "低";
      const date = dateDaysAgo(index * 3 + (seed % 3));

      return {
        id: createNewsId(stock.id, index),
        stockId: stock.id,
        ticker: stock.ticker,
        companyName: stock.companyName,
        date,
        title: titleFor(stock, category, index),
        url: `mock://news/${stock.ticker}/${date}/${index}`,
        mediaName: "Mock News",
        summary: "Mock APIが生成したニュース材料です。内容は調査補助用のダミーデータです。",
        category,
        relatedStockIds: [stock.id],
        importance,
        sentiment,
        source: "Mock API",
        fetchedAt: now,
        userMemo: "",
        checked: false,
        dataSource,
        createdAt: now,
        updatedAt: now,
      };
    });

    return {
      items,
      message: `Mock APIからニュースを取得しました（${items.length}件）。`,
    };
  },
};
