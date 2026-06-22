export function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function daysUntil(dateText: string, baseDate = new Date()): number | null {
  if (!dateText) {
    return null;
  }

  const date = new Date(`${dateText}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const base = new Date(baseDate);
  base.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);

  return Math.round((date.getTime() - base.getTime()) / 86_400_000);
}

export function isUpcomingDate(dateText: string, days = 14): boolean {
  const diff = daysUntil(dateText);
  return diff !== null && diff >= 0 && diff <= days;
}

export function isPastOrToday(dateText: string): boolean {
  const diff = daysUntil(dateText);
  return diff !== null && diff <= 0;
}

export function latestDate(values: string[]): string | null {
  const validValues = values.filter(Boolean).sort((a, b) => b.localeCompare(a));
  return validValues.at(0) ?? null;
}
