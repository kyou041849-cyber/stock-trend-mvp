import { MockLlmAdapter } from "../adapters/mockLlmAdapter";
import { buildStockResearchContext } from "../lib/llmContext";
import { createLlmOutputId } from "../lib/llmOutputStorage";
import {
  ensureLlmReportNotice,
  normalizeStructuredLlmReport,
  parseStructuredLlmReportJson,
  structuredLlmReportToMarkdown,
} from "../lib/llmReport";
import type {
  LlmGeneratedOutput,
  LlmOutputType,
  LlmStockResearchContext,
  StockProfile,
} from "../lib/types";

type GenerateMockLlmAnalysisOptions = {
  generatedAt?: string;
  outputId?: string;
  context?: LlmStockResearchContext | null;
};

export type LlmGenerationMode = "mock" | "real";

export type GenerateMockLlmAnalysisResult =
  | {
      ok: true;
      output: LlmGeneratedOutput;
      context: LlmStockResearchContext;
      message: string;
    }
  | {
      ok: false;
      output: null;
      context: null;
      message: string;
    };

export type GenerateRealLlmAnalysisResult = GenerateMockLlmAnalysisResult;

export async function generateMockLlmAnalysis(
  stockId: string,
  type: LlmOutputType,
  stocks: StockProfile[],
  options: GenerateMockLlmAnalysisOptions = {},
): Promise<GenerateMockLlmAnalysisResult> {
  const context = options.context ?? buildStockResearchContext(stockId, stocks, {
    generatedAt: options.generatedAt,
  });

  if (!context) {
    return {
      ok: false,
      output: null,
      context: null,
      message: "AI分析の入力データを作成できませんでした。銘柄データを確認してください。",
    };
  }

  const now = options.generatedAt ?? new Date().toISOString();
  const result = await MockLlmAdapter.generate(context, type);

  return {
    ok: true,
    context,
    output: {
      id: options.outputId ?? createLlmOutputId(),
      stockId,
      type,
      content: result.content,
      structuredReport: result.structuredReport,
      model: result.model,
      createdAt: now,
      updatedAt: now,
      sourceContextHash: context.contextHash,
    },
    message: "Mock LLMでAI分析を生成しました。実LLM APIは呼び出していません。",
  };
}

export async function generateRealLlmAnalysis(
  stockId: string,
  type: LlmOutputType,
  context: LlmStockResearchContext | null,
  options: GenerateMockLlmAnalysisOptions = {},
): Promise<GenerateRealLlmAnalysisResult> {
  if (!context) {
    return {
      ok: false,
      output: null,
      context: null,
      message: "AI分析の入力データを作成できませんでした。銘柄データを確認してください。",
    };
  }

  let response: Response;
  try {
    response = await fetch("/api/llm/analyze", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ type, context }),
    });
  } catch {
    return {
      ok: false,
      output: null,
      context: null,
      message: "実LLM API Routeへの接続に失敗しました。開発サーバーやネットワーク状態を確認してください。",
    };
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    return {
      ok: false,
      output: null,
      context: null,
      message: "実LLM API Routeのレスポンス解析に失敗しました。",
    };
  }

  const row = data && typeof data === "object" ? data as Record<string, unknown> : {};
  if (!response.ok || row.ok !== true) {
    return {
      ok: false,
      output: null,
      context: null,
      message: typeof row.message === "string" ? row.message : "実LLMでのAI分析生成に失敗しました。",
    };
  }

  const rawContent = typeof row.content === "string" ? row.content : "";
  const structuredReport = normalizeStructuredLlmReport(row.structuredReport, type) ?? parseStructuredLlmReportJson(rawContent, type) ?? undefined;
  if (!rawContent && !structuredReport) {
    return {
      ok: false,
      output: null,
      context: null,
      message: "実LLMの出力が空でした。",
    };
  }

  const content = structuredReport ? structuredLlmReportToMarkdown(structuredReport) : ensureLlmReportNotice(rawContent);
  const model = typeof row.model === "string" ? row.model : "openai";
  if (!content) {
    return {
      ok: false,
      output: null,
      context: null,
      message: "実LLMの出力が空でした。",
    };
  }

  const now = options.generatedAt ?? new Date().toISOString();
  return {
    ok: true,
    context,
    output: {
      id: options.outputId ?? createLlmOutputId(),
      stockId,
      type,
      content,
      structuredReport,
      model,
      createdAt: now,
      updatedAt: now,
      sourceContextHash: context.contextHash,
    },
    message: typeof row.message === "string" ? row.message : "実LLMでAI分析を生成しました。",
  };
}
