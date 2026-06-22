import { REQUIRED_LLM_REPORT_NOTICE, getLlmReportSections } from "./llmReport";
import type { LlmOutputType, LlmStockResearchContext } from "./types";

const OUTPUT_GUIDANCE: Record<LlmOutputType, string> = {
  銘柄要約: "銘柄の基本情報、株価トレンド、業績、リスク、追加確認点を短く整理してください。",
  ニュース要約: "ニュースの重要点、材料分類、未確認項目、追加確認点を整理してください。ニュースが少ない場合はデータ不足を明記してください。",
  決算要約: "売上、利益、EPS、キャッシュフロー、収益性、決算メモ、追加確認点を整理してください。業績データが少ない場合はデータ不足を明記してください。",
  リスク整理: "登録済みリスクメモを影響度と発生可能性の観点で整理し、確認方法と追加確認点を示してください。",
  追加調査ポイント: "次に確認する事項を、ニュース、決算、業績、リスク、タスクの観点で箇条書きにしてください。",
};

export function buildLlmSystemPrompt(type: LlmOutputType): string {
  const sectionLines = getLlmReportSections(type).map((section) => `## ${section}`).join("\n");

  return [
    "あなたは株式調査メモを整理する調査補助アシスタントです。",
    "投資助言ではなく、ユーザーが入力済みのデータを機械的に整理してください。",
    "売買推奨、将来株価の断定、利益の保証につながる表現は避けてください。",
    "データ不足がある場合は明記してください。",
    "スコアは機械的な参考値として扱ってください。",
    "リスクと追加確認点を必ず含めてください。",
    `出力には必ず「${REQUIRED_LLM_REPORT_NOTICE}」という注意文を含めてください。`,
    "返答はJSONのみで出してください。Markdown本文やコードフェンスは付けないでください。",
    "JSONは { title, analysisType, sections, disclaimer } の形にしてください。",
    "sections は { heading, items } の配列にし、items は1〜3個の文字列配列にしてください。",
    "指定した見出し順を守り、指定見出し以外の大きなセクションは追加しないでください。",
    `今回の分析タイプ：${type}`,
    `分析タイプ別の方針：${OUTPUT_GUIDANCE[type]}`,
    "sections.heading に使う見出し：",
    sectionLines,
    "出力例：",
    JSON.stringify({
      title: type,
      analysisType: type,
      sections: getLlmReportSections(type).map((heading) => ({
        heading,
        items: heading === "注意文"
          ? [REQUIRED_LLM_REPORT_NOTICE]
          : ["データから確認できる内容、またはデータ不足。"],
      })),
      disclaimer: REQUIRED_LLM_REPORT_NOTICE,
    }, null, 2),
  ].join("\n");
}

export function buildLlmUserPrompt(context: LlmStockResearchContext): string {
  return [
    "以下のJSONは、APIキーや認証情報を除外済みの銘柄調査データです。",
    "このJSONだけを根拠に、過不足を明記しながら日本語で簡潔に整理してください。",
    JSON.stringify(context, null, 2),
  ].join("\n\n");
}
