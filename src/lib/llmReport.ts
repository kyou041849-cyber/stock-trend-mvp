import type { LlmOutputType, LlmReportSection, StructuredLlmReport } from "./types";

export const REQUIRED_LLM_REPORT_NOTICE = "この分析は入力データをもとにした調査補助であり、投資判断ではありません。";

export type ParsedLlmReport = StructuredLlmReport;

const LLM_REPORT_SECTIONS: Record<LlmOutputType, string[]> = {
  銘柄要約: [
    "概要",
    "注目ポイント",
    "株価トレンド",
    "業績の見方",
    "財務安全性",
    "主なリスク",
    "追加確認ポイント",
    "データ不足の点",
    "注意文",
  ],
  ニュース要約: [
    "直近ニュースの概要",
    "重要ニュース",
    "ポジティブ材料",
    "ネガティブ材料",
    "未確認ニュース",
    "追加確認ポイント",
    "注意文",
  ],
  決算要約: [
    "直近決算の概要",
    "売上・利益の見方",
    "ガイダンスや見通しメモ",
    "市場反応メモ",
    "次回決算で確認する点",
    "データ不足の点",
    "注意文",
  ],
  リスク整理: [
    "主要リスク",
    "影響度が高いリスク",
    "発生可能性が高いリスク",
    "監視すべき指標",
    "リスク低減の確認ポイント",
    "注意文",
  ],
  追加調査ポイント: [
    "優先度高",
    "優先度中",
    "優先度低",
    "次に見るべき決算項目",
    "次に見るべきニュース",
    "次に確認するリスク",
    "注意文",
  ],
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function normalizeItem(item: string): string {
  return item.replace(/^[-*・]\s*/, "").trim();
}

function normalizeItems(items: string[] | undefined, fallback = "データ不足"): string[] {
  const normalized = (items ?? []).map(normalizeItem).filter(Boolean);
  return normalized.length > 0 ? normalized : [fallback];
}

export function getLlmReportSections(type: LlmOutputType): string[] {
  return [...LLM_REPORT_SECTIONS[type]];
}

function ensureNoticeSection(sections: LlmReportSection[]): LlmReportSection[] {
  const normalized = sections.map((section) => ({
    heading: section.heading.trim() || "分析結果",
    items: normalizeItems(section.items),
  }));
  const noticeSection = normalized.find((section) => section.heading === "注意文");

  if (!noticeSection) {
    return [...normalized, { heading: "注意文", items: [REQUIRED_LLM_REPORT_NOTICE] }];
  }

  if (!noticeSection.items.some((item) => item.includes(REQUIRED_LLM_REPORT_NOTICE))) {
    noticeSection.items.unshift(REQUIRED_LLM_REPORT_NOTICE);
  }

  return normalized;
}

export function ensureLlmReportNotice(content: string): string {
  const trimmed = content.trim();
  if (trimmed.includes(REQUIRED_LLM_REPORT_NOTICE)) {
    return trimmed;
  }

  if (!trimmed) {
    return `## 注意文\n- ${REQUIRED_LLM_REPORT_NOTICE}`;
  }

  return `${trimmed}\n\n## 注意文\n- ${REQUIRED_LLM_REPORT_NOTICE}`;
}

export function formatStructuredLlmReport(
  type: LlmOutputType,
  sectionsByHeading: Partial<Record<string, string[]>>,
  title: string = type,
): string {
  return structuredLlmReportToMarkdown(buildStructuredLlmReport(type, sectionsByHeading, title));
}

export function buildStructuredLlmReport(
  type: LlmOutputType,
  sectionsByHeading: Partial<Record<string, string[]>>,
  title: string = type,
): StructuredLlmReport {
  const sections: LlmReportSection[] = [];

  for (const heading of getLlmReportSections(type)) {
    const items = heading === "注意文"
      ? normalizeItems(sectionsByHeading[heading], REQUIRED_LLM_REPORT_NOTICE)
      : normalizeItems(sectionsByHeading[heading]);
    const withNotice = heading === "注意文" && !items.some((item) => item.includes(REQUIRED_LLM_REPORT_NOTICE))
      ? [REQUIRED_LLM_REPORT_NOTICE, ...items]
      : items;

    sections.push({ heading, items: withNotice });
  }

  return {
    title,
    analysisType: type,
    sections: ensureNoticeSection(sections),
    disclaimer: REQUIRED_LLM_REPORT_NOTICE,
  };
}

export function structuredLlmReportToMarkdown(report: StructuredLlmReport): string {
  const normalized = normalizeStructuredLlmReport(report) ?? {
    title: report.title || "AI分析",
    analysisType: report.analysisType || "AI分析",
    sections: ensureNoticeSection(report.sections ?? []),
    disclaimer: REQUIRED_LLM_REPORT_NOTICE,
  };
  const blocks = [`# ${normalized.title}`];

  for (const section of normalized.sections) {
    blocks.push(`## ${section.heading}\n${section.items.map((item) => `- ${item}`).join("\n")}`);
  }

  return ensureLlmReportNotice(blocks.join("\n\n"));
}

export function normalizeStructuredLlmReport(
  value: unknown,
  fallbackType?: LlmOutputType,
  fallbackTitle?: string,
): StructuredLlmReport | null {
  if (!isRecord(value)) {
    return null;
  }

  const title = typeof value.title === "string" && value.title.trim()
    ? value.title.trim()
    : fallbackTitle ?? fallbackType ?? "AI分析";
  const analysisType = typeof value.analysisType === "string" && value.analysisType.trim()
    ? value.analysisType.trim()
    : fallbackType ?? "AI分析";
  const rawSections = Array.isArray(value.sections) ? value.sections : [];
  const sections = rawSections
    .filter(isRecord)
    .map((section) => ({
      heading: typeof section.heading === "string" && section.heading.trim() ? section.heading.trim() : "分析結果",
      items: Array.isArray(section.items)
        ? normalizeItems(section.items.filter((item): item is string => typeof item === "string"))
        : normalizeItems([]),
    }))
    .filter((section) => section.items.length > 0);

  if (sections.length === 0) {
    return null;
  }

  const disclaimer = typeof value.disclaimer === "string" && value.disclaimer.includes(REQUIRED_LLM_REPORT_NOTICE)
    ? value.disclaimer
    : REQUIRED_LLM_REPORT_NOTICE;

  return {
    title,
    analysisType,
    sections: ensureNoticeSection(sections),
    disclaimer,
  };
}

function stripJsonFence(content: string): string {
  const trimmed = content.trim();
  if (!trimmed.startsWith("```")) {
    return trimmed;
  }

  return trimmed
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
}

export function parseStructuredLlmReportJson(content: string, type?: LlmOutputType): StructuredLlmReport | null {
  const candidates = [stripJsonFence(content)];
  const firstBrace = content.indexOf("{");
  const lastBrace = content.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    candidates.push(content.slice(firstBrace, lastBrace + 1));
  }

  for (const candidate of candidates) {
    if (!candidate) continue;
    try {
      const parsed = JSON.parse(candidate) as unknown;
      const normalized = normalizeStructuredLlmReport(parsed, type);
      if (normalized) {
        return normalized;
      }
    } catch {
      // Try the next candidate.
    }
  }

  return null;
}

export function parseLlmReport(content: string, type?: LlmOutputType): ParsedLlmReport {
  const jsonReport = parseStructuredLlmReportJson(content, type);
  if (jsonReport) {
    return jsonReport;
  }

  const text = ensureLlmReportNotice(content);
  const lines = text.split(/\r?\n/);
  const sections: LlmReportSection[] = [];
  const fallbackTitle = type ?? "AI分析";
  let title = fallbackTitle;
  let current: LlmReportSection | null = null;

  const pushFallback = (line: string) => {
    if (!current) {
      current = { heading: "分析結果", items: [] };
      sections.push(current);
    }
    current.items.push(line);
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    if (line.startsWith("# ") && !line.startsWith("## ")) {
      title = line.replace(/^#\s*/, "").trim() || fallbackTitle;
      current = null;
      continue;
    }

    if (line.startsWith("## ")) {
      current = {
        heading: line.replace(/^##\s*/, "").trim() || "分析結果",
        items: [],
      };
      sections.push(current);
      continue;
    }

    const item = normalizeItem(line);
    if (!item) continue;

    if (!current) {
      pushFallback(item);
      continue;
    }
    current.items.push(item);
  }

  const filledSections = sections
    .map((section) => ({ ...section, items: normalizeItems(section.items) }))
    .filter((section) => section.items.length > 0);

  const reportSections = ensureNoticeSection(
    filledSections.length > 0 ? filledSections : [{ heading: "注意文", items: [REQUIRED_LLM_REPORT_NOTICE] }],
  );

  return {
    title,
    analysisType: type ?? title,
    sections: reportSections,
    disclaimer: REQUIRED_LLM_REPORT_NOTICE,
  };
}

export function resolveStructuredLlmReport(
  content: string,
  type?: LlmOutputType,
  structuredReport?: unknown,
): StructuredLlmReport {
  return normalizeStructuredLlmReport(structuredReport, type) ?? parseLlmReport(content, type);
}

export function createLlmReportCopyText(
  content: string,
  type?: LlmOutputType,
  structuredReport?: unknown,
): string {
  return structuredLlmReportToMarkdown(resolveStructuredLlmReport(content, type, structuredReport));
}
