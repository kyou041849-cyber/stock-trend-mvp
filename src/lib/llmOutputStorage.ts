import { normalizeStructuredLlmReport } from "./llmReport";
import type { LlmGeneratedOutput, LlmOutputType } from "./types";

const LLM_OUTPUT_STORAGE_KEY = "stock-trend-mvp:llm-outputs:v1";

const LLM_OUTPUT_TYPES: LlmOutputType[] = [
  "銘柄要約",
  "ニュース要約",
  "決算要約",
  "リスク整理",
  "追加調査ポイント",
];

function readString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function isLlmOutputType(value: unknown): value is LlmOutputType {
  return typeof value === "string" && LLM_OUTPUT_TYPES.includes(value as LlmOutputType);
}

export function createLlmOutputId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `llm-output-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function normalizeLlmOutput(value: unknown): LlmGeneratedOutput | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const row = value as Record<string, unknown>;
  const stockId = readString(row.stockId);
  const type = row.type;
  const content = readString(row.content);
  const createdAt = readString(row.createdAt);
  const updatedAt = readString(row.updatedAt) || createdAt;

  if (!stockId || !isLlmOutputType(type) || !content || !createdAt) {
    return null;
  }

  return {
    id: readString(row.id) || createLlmOutputId(),
    stockId,
    type,
    content,
    structuredReport: normalizeStructuredLlmReport(row.structuredReport, type) ?? undefined,
    model: readString(row.model) || "mock-llm-v1",
    createdAt,
    updatedAt,
    sourceContextHash: readString(row.sourceContextHash),
  };
}

export function sortLlmOutputs(outputs: LlmGeneratedOutput[]): LlmGeneratedOutput[] {
  return [...outputs].sort((a, b) => {
    const dateDiff = b.updatedAt.localeCompare(a.updatedAt);
    if (dateDiff !== 0) return dateDiff;
    return b.createdAt.localeCompare(a.createdAt);
  });
}

export function upsertLlmOutput(
  outputs: LlmGeneratedOutput[],
  output: LlmGeneratedOutput,
): LlmGeneratedOutput[] {
  return sortLlmOutputs([output, ...outputs.filter((item) => item.id !== output.id)]);
}

export function deleteLlmOutputFromList(
  outputs: LlmGeneratedOutput[],
  outputId: string,
): LlmGeneratedOutput[] {
  return outputs.filter((item) => item.id !== outputId);
}

export function isLlmOutputCurrent(
  output: Pick<LlmGeneratedOutput, "sourceContextHash">,
  currentContextHash: string | null | undefined,
): boolean {
  return Boolean(output.sourceContextHash && currentContextHash && output.sourceContextHash === currentContextHash);
}

export function loadLlmOutputs(): LlmGeneratedOutput[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(LLM_OUTPUT_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return sortLlmOutputs(
      parsed
        .map(normalizeLlmOutput)
        .filter((output): output is LlmGeneratedOutput => output !== null),
    );
  } catch {
    return [];
  }
}

export function loadLlmOutputsForStock(stockId: string): LlmGeneratedOutput[] {
  return loadLlmOutputs().filter((output) => output.stockId === stockId);
}

export function saveLlmOutputs(outputs: LlmGeneratedOutput[]): { ok: boolean; message: string } {
  if (typeof window === "undefined") {
    return { ok: false, message: "ブラウザ上でのみ保存できます。" };
  }

  try {
    window.localStorage.setItem(LLM_OUTPUT_STORAGE_KEY, JSON.stringify(sortLlmOutputs(outputs)));
    return { ok: true, message: "AI分析履歴を保存しました。" };
  } catch {
    return {
      ok: false,
      message: "AI分析履歴の保存に失敗しました。localStorageの空き容量やブラウザ設定を確認してください。",
    };
  }
}

export function saveLlmOutput(output: LlmGeneratedOutput): { ok: boolean; message: string } {
  return saveLlmOutputs(upsertLlmOutput(loadLlmOutputs(), output));
}

export function deleteLlmOutput(outputId: string): { ok: boolean; message: string } {
  return saveLlmOutputs(deleteLlmOutputFromList(loadLlmOutputs(), outputId));
}
