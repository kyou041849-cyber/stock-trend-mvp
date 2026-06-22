import { buildLlmSystemPrompt, buildLlmUserPrompt } from "../lib/llmPrompt";
import { ensureLlmReportNotice, parseStructuredLlmReportJson, structuredLlmReportToMarkdown } from "../lib/llmReport";
import { findForbiddenLlmPhrases } from "../lib/llmSafety";
import type { LlmOutputType, LlmStockResearchContext, StructuredLlmReport } from "../lib/types";

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";

type OpenAiEnv = {
  [key: string]: string | undefined;
  OPENAI_API_KEY?: string;
  OPENAI_MODEL?: string;
};

export type OpenAiLlmGenerateResult =
  | {
      ok: true;
      content: string;
      structuredReport?: StructuredLlmReport;
      model: string;
    }
  | {
      ok: false;
      message: string;
      status: "api-not-configured" | "network-error" | "api-error" | "rate-limited" | "invalid-format" | "forbidden-phrase";
    };

export function getOpenAiLlmConfig(env: OpenAiEnv = process.env): { ok: true; apiKey: string; model: string } | { ok: false; message: string } {
  const apiKey = env.OPENAI_API_KEY?.trim() ?? "";
  const model = env.OPENAI_MODEL?.trim() ?? "";

  if (!apiKey) {
    return { ok: false, message: "OPENAI_API_KEY が未設定です。.env.local を確認してください。" };
  }

  if (!model) {
    return { ok: false, message: "OPENAI_MODEL が未設定です。.env.local を確認してください。" };
  }

  return { ok: true, apiKey, model };
}

function extractOutputText(value: unknown): string {
  if (!value || typeof value !== "object") {
    return "";
  }

  const response = value as Record<string, unknown>;
  if (typeof response.output_text === "string") {
    return response.output_text.trim();
  }

  const output = Array.isArray(response.output) ? response.output : [];
  const texts: string[] = [];

  for (const item of output) {
    if (!item || typeof item !== "object") continue;
    const content = (item as Record<string, unknown>).content;
    if (!Array.isArray(content)) continue;

    for (const contentItem of content) {
      if (!contentItem || typeof contentItem !== "object") continue;
      const row = contentItem as Record<string, unknown>;
      if (typeof row.text === "string") {
        texts.push(row.text);
      }
    }
  }

  return texts.join("\n").trim();
}

function createOpenAiRequestBody(model: string, type: LlmOutputType, context: LlmStockResearchContext) {
  return {
    model,
    input: [
      {
        role: "developer",
        content: [
          {
            type: "input_text",
            text: buildLlmSystemPrompt(type),
          },
        ],
      },
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: buildLlmUserPrompt(context),
          },
        ],
      },
    ],
    max_output_tokens: 1400,
  };
}

export const OpenAiLlmAdapter = {
  async generate(context: LlmStockResearchContext, type: LlmOutputType, env: OpenAiEnv = process.env): Promise<OpenAiLlmGenerateResult> {
    const config = getOpenAiLlmConfig(env);
    if (!config.ok) {
      return {
        ok: false,
        status: "api-not-configured",
        message: config.message,
      };
    }

    if (!context || !context.contextHash) {
      return {
        ok: false,
        status: "invalid-format",
        message: "LLM入力データが不足しています。",
      };
    }

    let response: Response;
    try {
      response = await fetch(OPENAI_RESPONSES_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify(createOpenAiRequestBody(config.model, type, context)),
      });
    } catch {
      return {
        ok: false,
        status: "network-error",
        message: "LLM APIへの接続に失敗しました。ネットワーク状態を確認してください。",
      };
    }

    let json: unknown;
    try {
      json = await response.json();
    } catch {
      return {
        ok: false,
        status: "invalid-format",
        message: "LLM APIレスポンスのJSON解析に失敗しました。",
      };
    }

    if (!response.ok) {
      const row = json && typeof json === "object" ? json as Record<string, unknown> : {};
      const error = row.error && typeof row.error === "object" ? row.error as Record<string, unknown> : {};
      const errorMessage = typeof error.message === "string" ? error.message : "LLM APIでエラーが発生しました。";

      return {
        ok: false,
        status: response.status === 429 ? "rate-limited" : "api-error",
        message: response.status === 429 ? "LLM APIのレート制限に達しました。時間をおいて再試行してください。" : errorMessage,
      };
    }

    const content = extractOutputText(json);
    if (!content) {
      return {
        ok: false,
        status: "invalid-format",
        message: "LLM APIの出力が空でした。",
      };
    }

    const structuredReport = parseStructuredLlmReportJson(content, type) ?? undefined;
    const safeContent = structuredReport
      ? structuredLlmReportToMarkdown(structuredReport)
      : ensureLlmReportNotice(content);
    const forbiddenPhrases = findForbiddenLlmPhrases(safeContent);
    if (forbiddenPhrases.length > 0) {
      return {
        ok: false,
        status: "forbidden-phrase",
        message: "LLM出力に禁止表現が含まれていたため表示しません。条件を見直して再生成してください。",
      };
    }

    return {
      ok: true,
      content: safeContent,
      structuredReport,
      model: config.model,
    };
  },
};
