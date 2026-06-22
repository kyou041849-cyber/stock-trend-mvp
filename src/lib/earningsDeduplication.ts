import type { EarningsCalendarItem } from "./types";

function calendarKey(item: Pick<EarningsCalendarItem, "stockId" | "earningsDate" | "fiscalYear" | "fiscalQuarter">): string {
  return [item.stockId, item.earningsDate, item.fiscalYear, item.fiscalQuarter].map((value) => value.trim()).join("|");
}

export function sortEarningsCalendarItems(items: EarningsCalendarItem[]): EarningsCalendarItem[] {
  return [...items].sort((a, b) => {
    const dateDiff = a.earningsDate.localeCompare(b.earningsDate);
    if (dateDiff !== 0) return dateDiff;
    return a.fiscalQuarter.localeCompare(b.fiscalQuarter);
  });
}

export function mergeEarningsCalendarItems(
  existingItems: EarningsCalendarItem[],
  incomingItems: EarningsCalendarItem[],
): {
  items: EarningsCalendarItem[];
  addedCount: number;
  updatedCount: number;
} {
  const merged = new Map<string, EarningsCalendarItem>();
  for (const item of existingItems) {
    merged.set(calendarKey(item), item);
  }

  let addedCount = 0;
  let updatedCount = 0;
  for (const item of incomingItems) {
    const key = calendarKey(item);
    if (merged.has(key)) {
      updatedCount += 1;
    } else {
      addedCount += 1;
    }
    merged.set(key, item);
  }

  return {
    items: sortEarningsCalendarItems([...merged.values()]),
    addedCount,
    updatedCount,
  };
}
