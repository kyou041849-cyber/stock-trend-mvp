import { buildLlmSystemPrompt, buildLlmUserPrompt } from "../lib/llmPrompt";
import { ensureLlmReportNotice, parseStructuredLlmReportJson, structuredLlmReportToMarkdown } from "../lib/llmReport";
import { findForbiddenLlmPhrases } from "../lib/llmSafety";
import type { LlmOutputType, LlmStockResearchContext, StructuredLlmReport } from "../lib/types";

const DEFAULT_LLM_API_BASE_URL = "https://api.openai.com";
const DEFAULT_LLM_API_FORMAT = "responses";
const RESPONSES_PATH = "/v1/responses";
const CHAT_COMPLETIONS_PATH = "/chat/completions";

export type LlmApiFormat = "responses" | "chat-completions";

type OpenAiEnv = {
  [key: string]: string | undefined;
  LLM_API_KEY?: string;
  LLM_API_BASE_URL?: string;
  LLM_API_FORMAT?: string;
  DEEPSEEK_API_KEY?: string;
  OPENAI_API_KEY?: string;
  OPENAI_MODEL?: string;
};

export type OpenAiLlmConfig = {
  ok: true;
  apiKey: string;
  apiKeySource: "LLM_API_KEY" | "OPENAI_API_KEY" | "DEEPSEEK_API_KEY";
  model: string;
  baseUrl: string;
  format: LlmApiFormat;
  endpointUrl: string;
};

type OpenAiLlmConfigError = {
  ok: false;
  message: string;
  status: "api-not-configured" | "invalid-format";
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

function normalizeBaseUrl(baseUrl: string | undefined): string {
  return (baseUrl?.trim() || DEFAULT_LLM_API_BASE_URL).replace(/\/+$/, "");
}

function normalizeFormat(format: string | undefined): LlmApiFormat | null {
  const normalized = (format?.trim() || DEFAULT_LLM_API_FORMAT).toLowerCase();
  if (normalized === "responses" || normalized === "chat-completions") {
    return normalized;
  }

  return null;
}

function buildEndpointUrl(baseUrl: string, format: LlmApiFormat): string {
  return `${baseUrl}${format === "chat-completions" ? CHAT_COMPLETIONS_PATH : RESPONSES_PATH}`;
}

export function getOpenAiLlmConfig(env: OpenAiEnv = process.env): OpenAiLlmConfig | OpenAiLlmConfigError {
  const format = normalizeFormat(env.LLM_API_FORMAT);
  if (!format) {
    return {
      ok: false,
      status: "invalid-format",
      message: "LLM_API_FORMAT は responses または chat-completions を指定してください。",
    };
  }

  const baseUrl = normalizeBaseUrl(env.LLM_API_BASE_URL);
  const model = env.OPENAI_MODEL?.trim() ?? "";
  const genericApiKey = env.LLM_API_KEY?.trim() ?? "";
  const providerApiKey = format === "chat-completions"
    ? env.DEEPSEEK_API_KEY?.trim() ?? ""
    : env.OPENAI_API_KEY?.trim() ?? "";
  const apiKey = genericApiKey || providerApiKey;
  const apiKeySource = genericApiKey
    ? "LLM_API_KEY"
    : format === "chat-completions"
      ? "DEEPSEEK_API_KEY"
      : "OPENAI_API_KEY";

  if (!apiKey) {
    return {
      ok: false,
      status: "api-not-configured",
      message: `${apiKeySource} が未設定です。サーバー側環境変数を確認してください。`,
    };
  }

  if (!model) {
    return {
      ok: false,
      status: "api-not-configured",
      message: "OPENAI_MODEL が未設定です。サーバー側環境変数を確認してください。",
    };
  }

  return {
    ok: true,
    apiKey,
    apiKeySource,
    model,
    baseUrl,
    format,
    endpointUrl: buildEndpointUrl(baseUrl, format),
  };
}

export function extractResponsesOutputText(value: unknown): string {
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

export function extractChatCompletionsOutputText(value: unknown): string {
  if (!value || typeof value !== "object") {
    return "";
  }

  const response = value as Record<string, unknown>;
  const choices = Array.isArray(response.choices) ? response.choices : [];
  const firstChoice = choices[0];
  if (!firstChoice || typeof firstChoice !== "object") {
    return "";
  }

  const message = (firstChoice as Record<string, unknown>).message;
  if (!message || typeof message !== "object") {
    return "";
  }

  const content = (message as Record<string, unknown>).content;
  if (typeof content === "string") {
    return content.trim();
  }

  return "";
}

export function createOpenAiResponsesRequestBody(model: string, type: LlmOutputType, context: LlmStockResearchContext) {
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

export function createOpenAiChatCompletionsRequestBody(model: string, type: LlmOutputType, context: LlmStockResearchContext) {
  return {
    model,
    messages: [
      {
        role: "system",
        content: buildLlmSystemPrompt(type),
      },
      {
        role: "user",
        content: buildLlmUserPrompt(context),
      },
    ],
    temperature: 0.2,
    max_tokens: 1400,
  };
}

function createRequestBody(config: OpenAiLlmConfig, type: LlmOutputType, context: LlmStockResearchContext) {
  return config.format === "chat-completions"
    ? createOpenAiChatCompletionsRequestBody(config.model, type, context)
    : createOpenAiResponsesRequestBody(config.model, type, context);
}

function extractOutputText(config: OpenAiLlmConfig, value: unknown): string {
  return config.format === "chat-completions"
    ? extractChatCompletionsOutputText(value)
    : extractResponsesOutputText(value);
}

export const OpenAiLlmAdapter = {
  async generate(context: LlmStockResearchContext, type: LlmOutputType, env: OpenAiEnv = process.env): Promise<OpenAiLlmGenerateResult> {
    const config = getOpenAiLlmConfig(env);
    if (!config.ok) {
      return {
        ok: false,
        status: config.status,
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
      response = await fetch(config.endpointUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify(createRequestBody(config, type, context)),
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
      if (response.status === 429) {
        return {
          ok: false,
          status: "rate-limited",
          message: "LLM APIのレート制限に達しました。時間をおいて再試行してください。",
        };
      }

      if (!response.ok) {
        return {
          ok: false,
          status: "api-error",
          message: "LLM APIでエラーが発生しました。",
        };
      }

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

    const content = extractOutputText(config, json);
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
