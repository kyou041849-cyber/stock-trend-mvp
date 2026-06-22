import { NextResponse } from "next/server";
import { OpenAiLlmAdapter } from "@/adapters/openAiLlmAdapter";
import { getLlmInputSizeSummary } from "@/lib/llmUsage";
import type { LlmOutputType, LlmStockResearchContext } from "@/lib/types";

const LLM_OUTPUT_TYPES: LlmOutputType[] = ["銘柄要約", "ニュース要約", "決算要約", "リスク整理", "追加調査ポイント"];

function isLlmOutputType(value: unknown): value is LlmOutputType {
  return typeof value === "string" && LLM_OUTPUT_TYPES.includes(value as LlmOutputType);
}

function isContext(value: unknown): value is LlmStockResearchContext {
  return Boolean(
    value &&
    typeof value === "object" &&
    typeof (value as Record<string, unknown>).contextHash === "string" &&
    (value as Record<string, unknown>).stock &&
    typeof (value as Record<string, unknown>).stock === "object",
  );
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, message: "リクエストJSONを読み取れませんでした。" },
      { status: 400 },
    );
  }

  const row = body && typeof body === "object" ? body as Record<string, unknown> : {};
  const type = row.type;
  const context = row.context;

  if (!isLlmOutputType(type)) {
    return NextResponse.json(
      { ok: false, message: "分析タイプが不正です。" },
      { status: 400 },
    );
  }

  if (!isContext(context)) {
    return NextResponse.json(
      { ok: false, message: "LLM入力データが不足しています。" },
      { status: 400 },
    );
  }

  const inputSummary = getLlmInputSizeSummary(context);
  if (inputSummary.isBlocked) {
    return NextResponse.json(
      { ok: false, message: "LLM入力サイズが上限を超えています。送信項目を減らしてください。" },
      { status: 413 },
    );
  }

  const result = await OpenAiLlmAdapter.generate(context, type);
  if (!result.ok) {
    const status =
      result.status === "api-not-configured" ? 503 :
      result.status === "rate-limited" ? 429 :
      result.status === "invalid-format" || result.status === "forbidden-phrase" ? 422 :
      502;

    return NextResponse.json(
      { ok: false, message: result.message, status: result.status },
      { status },
    );
  }

  return NextResponse.json({
    ok: true,
    content: result.content,
    structuredReport: result.structuredReport,
    model: result.model,
    message: "実LLMでAI分析を生成しました。",
  });
}
