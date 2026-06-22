import type { NewsItem } from "./types";

function normalizeUrl(url: string): string {
  return url.trim().replace(/\/$/, "").toLowerCase();
}

function normalizeText(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

export function getNewsDeduplicationKey(news: Pick<NewsItem, "url" | "title" | "date">): string {
  const url = normalizeUrl(news.url);

  if (url) {
    return `url:${url}`;
  }

  return `title-date:${normalizeText(news.title)}:${news.date}`;
}

export function mergeNewsItems(
  existingItems: NewsItem[],
  incomingItems: NewsItem[],
): {
  items: NewsItem[];
  addedCount: number;
  skippedCount: number;
} {
  const existingKeys = new Set(existingItems.map(getNewsDeduplicationKey));
  const merged = [...existingItems];
  let addedCount = 0;
  let skippedCount = 0;

  incomingItems.forEach((item) => {
    const key = getNewsDeduplicationKey(item);

    if (existingKeys.has(key)) {
      skippedCount += 1;
      return;
    }

    existingKeys.add(key);
    merged.push(item);
    addedCount += 1;
  });

  return {
    items: sortNewsItems(merged),
    addedCount,
    skippedCount,
  };
}

export function sortNewsItems(items: NewsItem[]): NewsItem[] {
  return [...items].sort((a, b) => {
    const dateDiff = b.date.localeCompare(a.date);
    if (dateDiff !== 0) return dateDiff;
    return b.updatedAt.localeCompare(a.updatedAt);
  });
}
