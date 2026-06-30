import { NextResponse } from "next/server";
import { getOpenAiLlmPublicConfig } from "@/adapters/openAiLlmAdapter";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(getOpenAiLlmPublicConfig());
}
