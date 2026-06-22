import { isLlmOutputCurrent } from "./llmOutputStorage";
import {
  createLlmReportCopyText,
  resolveStructuredLlmReport,
} from "./llmReport";
import type { LlmGeneratedOutput, LlmOutputType, StockProfile, StructuredLlmReport } from "./types";

export type AiHistoryFreshnessFilter = "all" | "current" | "stale";

export type AiHistorySortKey =
  | "newest"
  | "oldest"
  | "company"
  | "analysisType"
  | "staleFirst";

export type AiHistoryFilters = {
  stockQuery?: string;
  analysisType?: LlmOutputType | "all";
  model?: string;
  generatedDate?: string;
  freshness?: AiHistoryFreshnessFilter;
  keyword?: string;
};

export type AiHistoryRow = {
  output: LlmGeneratedOutput;
  stock: StockProfile | null;
  report: StructuredLlmReport;
  currentContextHash: string;
  isCurrent: boolean;
  searchableText: string;
};

export type AiComparisonSection = {
  heading: string;
  leftItems: string[];
  rightItems: string[];
  addedItems: string[];
  removedItems: string[];
  unchangedItems: string[];
  possibleChangedItems: Array<{
    before: string;
    after: string;
  }>;
  status: "added" | "removed" | "possible-change" | "unchanged";
};

export type AiComparisonSummary = {
  sameContextHash: boolean;
  contextMessage: string;
  addedCount: number;
  removedCount: number;
  possibleChangeCount: number;
  unchangedCount: number;
  metadataChanges: string[];
};

export type AiComparisonData = {
  left: AiHistoryRow;
  right: AiHistoryRow;
  sameStock: boolean;
  sameContextHash: boolean;
  summary: AiComparisonSummary;
  sections: AiComparisonSection[];
};

export type AiHistoryJsonExport = {
  exportedAt: string;
  count: number;
  items: Array<{
    id: string;
    stockId: string;
    ticker: string;
    companyName: string;
    analysisType: LlmOutputType;
    createdAt: string;
    updatedAt: string;
    model: string;
    sourceContextHash: string;
    currentContextHash: string;
    isCurrent: boolean;
    title: string;
    disclaimer: string;
    structuredReport: StructuredLlmReport;
    content: string;
  }>;
};

export type AiComparisonJsonExport = {
  exportedAt: string;
  sameStock: boolean;
  sameContextHash: boolean;
  summary: AiComparisonSummary;
  left: AiHistoryJsonExport["items"][number];
  right: AiHistoryJsonExport["items"][number];
  sections: AiComparisonSection[];
};

function normalizeSearchText(value: string | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function getGeneratedAt(output: LlmGeneratedOutput): string {
  return output.createdAt || output.updatedAt;
}

function compareGeneratedAtDesc(a: AiHistoryRow, b: AiHistoryRow): number {
  const dateDiff = getGeneratedAt(b.output).localeCompare(getGeneratedAt(a.output));
  if (dateDiff !== 0) return dateDiff;
  return b.output.updatedAt.localeCompare(a.output.updatedAt);
}

function stockName(row: AiHistoryRow): string {
  return row.stock?.companyName || row.output.stockId;
}

function stockTicker(row: AiHistoryRow): string {
  return row.stock?.ticker || "";
}

function createSearchableText(row: {
  output: LlmGeneratedOutput;
  stock: StockProfile | null;
  report: StructuredLlmReport;
}): string {
  const sectionText = row.report.sections
    .flatMap((section) => [section.heading, ...section.items])
    .join("\n");

  return [
    row.stock?.companyName,
    row.stock?.ticker,
    row.output.type,
    row.output.model,
    row.report.title,
    sectionText,
    row.report.disclaimer,
    row.output.content,
  ]
    .filter((item): item is string => Boolean(item))
    .join("\n")
    .toLowerCase();
}

export function buildAiHistoryRows(
  stocks: StockProfile[],
  outputs: LlmGeneratedOutput[],
  contextHashes: Record<string, string> | Map<string, string> = {},
): AiHistoryRow[] {
  const stockById = new Map(stocks.map((stock) => [stock.id, stock]));
  const contextHashByStock = contextHashes instanceof Map ? contextHashes : new Map(Object.entries(contextHashes));

  return outputs.map((output) => {
    const stock = stockById.get(output.stockId) ?? null;
    const currentContextHash = contextHashByStock.get(output.stockId) ?? "";
    const report = resolveStructuredLlmReport(output.content, output.type, output.structuredReport);
    const row = {
      output,
      stock,
      report,
      currentContextHash,
      isCurrent: isLlmOutputCurrent(output, currentContextHash),
      searchableText: "",
    };

    return {
      ...row,
      searchableText: createSearchableText(row),
    };
  });
}

export function filterAiHistoryRows(
  rows: AiHistoryRow[],
  filters: AiHistoryFilters = {},
): AiHistoryRow[] {
  const stockQuery = normalizeSearchText(filters.stockQuery);
  const model = normalizeSearchText(filters.model);
  const keyword = normalizeSearchText(filters.keyword);
  const generatedDate = filters.generatedDate?.trim();
  const freshness = filters.freshness ?? "all";
  const analysisType = filters.analysisType ?? "all";

  return rows.filter((row) => {
    if (stockQuery) {
      const stockText = `${row.stock?.companyName ?? ""}\n${row.stock?.ticker ?? ""}`.toLowerCase();
      if (!stockText.includes(stockQuery)) return false;
    }

    if (analysisType !== "all" && row.output.type !== analysisType) {
      return false;
    }

    if (model && !row.output.model.toLowerCase().includes(model)) {
      return false;
    }

    if (generatedDate && getGeneratedAt(row.output).slice(0, 10) !== generatedDate) {
      return false;
    }

    if (freshness === "current" && !row.isCurrent) {
      return false;
    }

    if (freshness === "stale" && row.isCurrent) {
      return false;
    }

    if (keyword && !row.searchableText.includes(keyword)) {
      return false;
    }

    return true;
  });
}

export function sortAiHistoryRows(
  rows: AiHistoryRow[],
  sortKey: AiHistorySortKey = "newest",
): AiHistoryRow[] {
  return [...rows].sort((a, b) => {
    if (sortKey === "oldest") {
      const dateDiff = getGeneratedAt(a.output).localeCompare(getGeneratedAt(b.output));
      if (dateDiff !== 0) return dateDiff;
      return a.output.updatedAt.localeCompare(b.output.updatedAt);
    }

    if (sortKey === "company") {
      const nameDiff = stockName(a).localeCompare(stockName(b));
      if (nameDiff !== 0) return nameDiff;
      return stockTicker(a).localeCompare(stockTicker(b));
    }

    if (sortKey === "analysisType") {
      const typeDiff = a.output.type.localeCompare(b.output.type);
      if (typeDiff !== 0) return typeDiff;
      return compareGeneratedAtDesc(a, b);
    }

    if (sortKey === "staleFirst") {
      if (a.isCurrent !== b.isCurrent) {
        return a.isCurrent ? 1 : -1;
      }
      return compareGeneratedAtDesc(a, b);
    }

    return compareGeneratedAtDesc(a, b);
  });
}

export function createAiHistoryMarkdown(row: AiHistoryRow): string {
  const metadata = [
    `銘柄: ${row.stock?.companyName ?? "データ不足"}${row.stock?.ticker ? ` (${row.stock.ticker})` : ""}`,
    `分析タイプ: ${row.output.type}`,
    `生成日時: ${getGeneratedAt(row.output) || "データ不足"}`,
    `モデル: ${row.output.model || "データ不足"}`,
    `鮮度: ${row.isCurrent ? "最新データに基づく分析" : "元データが更新されている可能性があります"}`,
  ].join("\n");

  return `${metadata}\n\n${createLlmReportCopyText(row.output.content, row.output.type, row.output.structuredReport)}`;
}

export function createAiHistoryListMarkdown(rows: AiHistoryRow[], title = "AI分析履歴"): string {
  if (rows.length === 0) {
    return `# ${title}\n\n- データ不足`;
  }

  const blocks = rows.map((row, index) => {
    return [
      `## ${index + 1}. ${row.stock?.companyName ?? row.output.stockId} ${row.stock?.ticker ? `(${row.stock.ticker})` : ""}`,
      `- 分析タイプ: ${row.output.type}`,
      `- 生成日時: ${getGeneratedAt(row.output) || "データ不足"}`,
      `- モデル: ${row.output.model || "データ不足"}`,
      `- 鮮度: ${row.isCurrent ? "最新データに基づく分析" : "元データが更新されている可能性があります"}`,
      `- レポート: ${row.report.title}`,
    ].join("\n");
  });

  return [`# ${title}`, ...blocks].join("\n\n");
}

export function createAiHistoryJsonExport(rows: AiHistoryRow[], exportedAt = new Date().toISOString()): AiHistoryJsonExport {
  return {
    exportedAt,
    count: rows.length,
    items: rows.map((row) => ({
      id: row.output.id,
      stockId: row.output.stockId,
      ticker: row.stock?.ticker ?? "",
      companyName: row.stock?.companyName ?? "",
      analysisType: row.output.type,
      createdAt: row.output.createdAt,
      updatedAt: row.output.updatedAt,
      model: row.output.model,
      sourceContextHash: row.output.sourceContextHash,
      currentContextHash: row.currentContextHash,
      isCurrent: row.isCurrent,
      title: row.report.title,
      disclaimer: row.report.disclaimer,
      structuredReport: row.report,
      content: row.output.content,
    })),
  };
}

function findSectionItems(report: StructuredLlmReport, heading: string): string[] {
  return report.sections.find((section) => section.heading === heading)?.items ?? [];
}

function normalizeDiffItem(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function uniqueItems(items: string[]): string[] {
  const seen = new Set<string>();
  const results: string[] = [];

  for (const item of items) {
    const trimmed = item.trim();
    const key = normalizeDiffItem(trimmed);
    if (!trimmed || seen.has(key)) continue;
    seen.add(key);
    results.push(trimmed);
  }

  return results;
}

function createItemDiff(leftItems: string[], rightItems: string[]): Pick<
  AiComparisonSection,
  "addedItems" | "removedItems" | "unchangedItems" | "possibleChangedItems" | "status"
> {
  const left = uniqueItems(leftItems);
  const right = uniqueItems(rightItems);
  const leftKeys = new Set(left.map(normalizeDiffItem));
  const rightKeys = new Set(right.map(normalizeDiffItem));
  const unchangedItems = left.filter((item) => rightKeys.has(normalizeDiffItem(item)));
  const rawRemoved = left.filter((item) => !rightKeys.has(normalizeDiffItem(item)));
  const rawAdded = right.filter((item) => !leftKeys.has(normalizeDiffItem(item)));
  const possibleChangeCount = Math.min(rawRemoved.length, rawAdded.length);
  const possibleChangedItems = Array.from({ length: possibleChangeCount }, (_, index) => ({
    before: rawRemoved[index],
    after: rawAdded[index],
  }));
  const removedItems = rawRemoved.slice(possibleChangeCount);
  const addedItems = rawAdded.slice(possibleChangeCount);
  const status = possibleChangedItems.length > 0
    ? "possible-change"
    : addedItems.length > 0
      ? "added"
      : removedItems.length > 0
        ? "removed"
        : "unchanged";

  return {
    addedItems,
    removedItems,
    unchangedItems,
    possibleChangedItems,
    status,
  };
}

function getContextMessage(sameContextHash: boolean): string {
  return sameContextHash
    ? "同じ入力データに基づくAI分析です。内容の違いは、生成モードやモデル差による可能性があります。"
    : "元データが更新されている可能性があります。ニュース、業績、リスクメモ、タスクなどの変更により、AI分析内容が変わった可能性があります。";
}

function getMetadataChanges(left: AiHistoryRow, right: AiHistoryRow): string[] {
  const changes: string[] = [];

  if (left.report.title !== right.report.title) {
    changes.push("レポートタイトルが異なります");
  }
  if (left.output.type !== right.output.type) {
    changes.push("分析タイプが異なります");
  }
  if (left.output.model !== right.output.model) {
    changes.push("モデルが異なります");
  }
  if (left.output.createdAt !== right.output.createdAt) {
    changes.push("生成日時が異なります");
  }
  if (left.output.sourceContextHash !== right.output.sourceContextHash) {
    changes.push("contextHashが異なります");
  }
  if (left.report.disclaimer !== right.report.disclaimer) {
    changes.push("注意文が異なります");
  }

  return changes;
}

function createComparisonSummary(
  left: AiHistoryRow,
  right: AiHistoryRow,
  sameContextHash: boolean,
  sections: AiComparisonSection[],
): AiComparisonSummary {
  return {
    sameContextHash,
    contextMessage: getContextMessage(sameContextHash),
    addedCount: sections.reduce((total, section) => total + section.addedItems.length, 0),
    removedCount: sections.reduce((total, section) => total + section.removedItems.length, 0),
    possibleChangeCount: sections.reduce((total, section) => total + section.possibleChangedItems.length, 0),
    unchangedCount: sections.reduce((total, section) => total + section.unchangedItems.length, 0),
    metadataChanges: getMetadataChanges(left, right),
  };
}

export function createAiComparisonData(left: AiHistoryRow, right: AiHistoryRow): AiComparisonData {
  const [older, newer] = [left, right].sort((a, b) => getGeneratedAt(a.output).localeCompare(getGeneratedAt(b.output)));
  const headings = Array.from(new Set([
    ...older.report.sections.map((section) => section.heading),
    ...newer.report.sections.map((section) => section.heading),
  ]));
  const sections = headings.map((heading) => {
    const leftItems = findSectionItems(older.report, heading);
    const rightItems = findSectionItems(newer.report, heading);

    return {
      heading,
      leftItems,
      rightItems,
      ...createItemDiff(leftItems, rightItems),
    };
  });
  const sameContextHash = Boolean(older.output.sourceContextHash && older.output.sourceContextHash === newer.output.sourceContextHash);

  return {
    left: older,
    right: newer,
    sameStock: older.output.stockId === newer.output.stockId,
    sameContextHash,
    summary: createComparisonSummary(older, newer, sameContextHash, sections),
    sections,
  };
}

export function createAiComparisonMarkdown(comparison: AiComparisonData): string {
  const leftTitle = `${comparison.left.stock?.companyName ?? comparison.left.output.stockId} / ${comparison.left.output.type}`;
  const rightTitle = `${comparison.right.stock?.companyName ?? comparison.right.output.stockId} / ${comparison.right.output.type}`;
  const metadata = [
    "# AI分析差分",
    `- 古い分析: ${leftTitle} (${getGeneratedAt(comparison.left.output) || "データ不足"})`,
    `- 新しい分析: ${rightTitle} (${getGeneratedAt(comparison.right.output) || "データ不足"})`,
    `- contextHash: ${comparison.sameContextHash ? "一致" : "不一致"}`,
    `- 元データ: ${comparison.summary.contextMessage}`,
    `- 追加項目数: ${comparison.summary.addedCount}`,
    `- 削除項目数: ${comparison.summary.removedCount}`,
    `- 変更候補数: ${comparison.summary.possibleChangeCount}`,
    `- 変化なし項目数: ${comparison.summary.unchangedCount}`,
    `- メタ情報の違い: ${comparison.summary.metadataChanges.length > 0 ? comparison.summary.metadataChanges.join(" / ") : "なし"}`,
  ].join("\n");

  const sections = comparison.sections.map((section) => {
    const leftItems = section.leftItems.length > 0 ? section.leftItems.map((item) => `- ${item}`).join("\n") : "- データ不足";
    const rightItems = section.rightItems.length > 0 ? section.rightItems.map((item) => `- ${item}`).join("\n") : "- データ不足";
    const addedItems = section.addedItems.length > 0 ? section.addedItems.map((item) => `- ${item}`).join("\n") : "- なし";
    const removedItems = section.removedItems.length > 0 ? section.removedItems.map((item) => `- ${item}`).join("\n") : "- なし";
    const changedItems = section.possibleChangedItems.length > 0
      ? section.possibleChangedItems.map((item) => `- 変更候補: ${item.before} -> ${item.after}`).join("\n")
      : "- なし";
    const unchangedItems = section.unchangedItems.length > 0 ? section.unchangedItems.map((item) => `- ${item}`).join("\n") : "- なし";

    return [
      `## ${section.heading}`,
      "### 古い分析",
      leftItems,
      "### 新しい分析",
      rightItems,
      "### 差分メモ",
      `- 状態: ${section.status}`,
      "#### 追加された項目",
      addedItems,
      "#### 削除された項目",
      removedItems,
      "#### 変更された可能性がある項目",
      changedItems,
      "#### 変化なし",
      unchangedItems,
    ].join("\n");
  });

  return [metadata, ...sections, comparison.left.report.disclaimer].join("\n\n");
}

export function createAiComparisonJsonExport(
  comparison: AiComparisonData,
  exportedAt = new Date().toISOString(),
): AiComparisonJsonExport {
  return {
    exportedAt,
    sameStock: comparison.sameStock,
    sameContextHash: comparison.sameContextHash,
    summary: comparison.summary,
    left: createAiHistoryJsonExport([comparison.left], exportedAt).items[0],
    right: createAiHistoryJsonExport([comparison.right], exportedAt).items[0],
    sections: comparison.sections,
  };
}

export function createAiHistoryFullMarkdown(rows: AiHistoryRow[], title = "AI分析履歴エクスポート"): string {
  if (rows.length === 0) {
    return `# ${title}\n\n- データ不足`;
  }

  return [
    `# ${title}`,
    ...rows.map((row, index) => [
      `## ${index + 1}. ${row.stock?.companyName ?? row.output.stockId} ${row.stock?.ticker ? `(${row.stock.ticker})` : ""}`,
      createAiHistoryMarkdown(row),
    ].join("\n\n")),
  ].join("\n\n");
}
