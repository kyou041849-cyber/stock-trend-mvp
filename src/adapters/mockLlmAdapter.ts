import { FORBIDDEN_LLM_PHRASES, replaceForbiddenLlmPhrases } from "../lib/llmSafety";
import { ensureLlmReportNotice, formatStructuredLlmReport, parseLlmReport } from "../lib/llmReport";
import type { LlmOutputType, LlmSafeRecord, LlmStockResearchContext, StructuredLlmReport } from "../lib/types";

export const MOCK_LLM_MODEL = "mock-llm-v1";
export const FORBIDDEN_MOCK_LLM_PHRASES = FORBIDDEN_LLM_PHRASES;

export type MockLlmGenerateResult = {
  content: string;
  structuredReport: StructuredLlmReport;
  model: string;
};

function textValue(record: LlmSafeRecord | undefined, key: string, fallback = "データ不足"): string {
  const value = record?.[key];
  return typeof value === "string" && value.trim() ? value : fallback;
}

function numberValue(record: LlmSafeRecord | undefined, key: string): string {
  const value = record?.[key];
  return typeof value === "number" && Number.isFinite(value) ? String(value) : "データ不足";
}

function countValue(items: unknown[] | undefined): string {
  return String(items?.length ?? 0);
}

function firstText(items: LlmSafeRecord[] | undefined, key: string): string {
  const value = items?.[0]?.[key];
  return typeof value === "string" && value.trim() ? value : "データ不足";
}

function reportTitle(context: LlmStockResearchContext, type: string): string {
  const ticker = textValue(context.stock, "ticker", "対象銘柄");
  const companyName = textValue(context.stock, "companyName", "");
  return `${type}：${ticker}${companyName ? ` ${companyName}` : ""}`;
}

function stockSummary(context: LlmStockResearchContext): string {
  return formatStructuredLlmReport("銘柄要約", {
    "概要": [
      `総合調査スコアは ${numberValue(context.scores, "totalResearch")}、トレンドスコアは ${numberValue(context.scores, "trend")} です。`,
      `業績データは ${numberValue(context.fundamentalSummary, "rowCount")} 件、ニュースは ${countValue(context.news)} 件あります。`,
    ],
    "注目ポイント": [
      "スコアやメモに注目点がある場合でも、機械的な表示として扱ってください。",
      `直近の調査メモ：${firstText(context.researchMemos, "title")}`,
    ],
    "株価トレンド": [
      `最新株価日は ${textValue(context.priceSummary, "latestDate")}、最新終値は ${numberValue(context.priceSummary, "latestClose")} です。`,
      `トレンドスコアは ${numberValue(context.scores, "trend")} です。`,
    ],
    "業績の見方": [
      `成長性スコアは ${numberValue(context.scores, "growth")} です。`,
      "売上、利益率、EPS、キャッシュフローの推移を追加確認してください。",
    ],
    "財務安全性": [
      `財務安全性スコアは ${numberValue(context.scores, "financialSafety")} です。`,
      "自己資本比率、FCF、ROE、ROICの直近値と推移を分けて確認してください。",
    ],
    "主なリスク": [
      `リスクスコアは ${numberValue(context.scores, "risk")}、リスクメモは ${countValue(context.riskMemos)} 件です。`,
      `主なリスク内容：${firstText(context.riskMemos, "content")}`,
    ],
    "追加確認ポイント": [
      `次回確認日：${textValue(context.watchlist, "nextReviewDate")}`,
      `未完了タスク候補：${firstText(context.confirmationTasks, "title")}`,
    ],
    "データ不足の点": [
      countValue(context.news) === "0" ? "ニュースデータが不足しています。" : "ニュースは件数と重要度の偏りを確認してください。",
      numberValue(context.fundamentalSummary, "rowCount") === "データ不足" || numberValue(context.fundamentalSummary, "rowCount") === "0" ? "業績データが不足しています。" : "業績データは入力単位と更新日を確認してください。",
    ],
  }, reportTitle(context, "銘柄要約"));
}

function newsSummary(context: LlmStockResearchContext): string {
  return formatStructuredLlmReport("ニュース要約", {
    "直近ニュースの概要": [
      `ニュース件数は ${countValue(context.news)} 件です。`,
      `直近の見出し：${firstText(context.news, "title")}`,
    ],
    "重要ニュース": [
      `重要度が高い可能性のあるニュース：${firstText(context.news, "title")}`,
      "重要度は手入力やMock分類を含むため、一次情報で確認してください。",
    ],
    "ポジティブ材料": [
      "ポジティブ分類のニュースがある場合は、業績への影響時期と持続性を確認してください。",
    ],
    "ネガティブ材料": [
      `直近ニュースの材料分類：${firstText(context.news, "sentiment")}`,
      "ネガティブ材料は影響範囲と一時要因かどうかを分けて確認してください。",
    ],
    "未確認ニュース": [
      "未確認ニュースは、内容と一次情報の確認が必要です。",
    ],
    "追加確認ポイント": [
      "ニュースの発生日、媒体、会社発表との整合性を確認してください。",
    ],
  }, reportTitle(context, "ニュース要約"));
}

function earningsSummary(context: LlmStockResearchContext): string {
  return formatStructuredLlmReport("決算要約", {
    "直近決算の概要": [
      `業績データ件数は ${numberValue(context.fundamentalSummary, "rowCount")} 件です。`,
      `直近の決算メモ：${firstText(context.earningsMemos, "overallMemo")}`,
    ],
    "売上・利益の見方": [
      `成長性スコアは ${numberValue(context.scores, "growth")} です。`,
      "売上、営業利益、純利益、EPSの伸び方を年度別に確認してください。",
    ],
    "ガイダンスや見通しメモ": [
      `次回までに確認したい点：${firstText(context.earningsMemos, "nextCheckPoints")}`,
    ],
    "市場反応メモ": [
      `株価反応メモ：${firstText(context.earningsMemos, "priceReactionMemo")}`,
    ],
    "次回決算で確認する点": [
      "利益率、キャッシュフロー、ROE/ROICの変化を追加確認してください。",
      `関連タスク：${firstText(context.confirmationTasks, "title")}`,
    ],
    "データ不足の点": [
      "四半期データや会社ガイダンスが未入力の場合はデータ不足として扱ってください。",
    ],
  }, reportTitle(context, "決算要約"));
}

function riskSummary(context: LlmStockResearchContext): string {
  return formatStructuredLlmReport("リスク整理", {
    "主要リスク": [
      `リスクスコアは ${numberValue(context.scores, "risk")}、リスクメモ件数は ${countValue(context.riskMemos)} 件です。`,
      `主なリスク内容：${firstText(context.riskMemos, "content")}`,
    ],
    "影響度が高いリスク": [
      "影響度が高い項目は、事業・財務・株価反応への影響範囲を確認してください。",
    ],
    "発生可能性が高いリスク": [
      "発生可能性が高い項目は、確認頻度と更新日を見直してください。",
    ],
    "監視すべき指標": [
      "売上成長率、利益率、FCF、ROE、ROIC、バリュエーション指標を継続確認してください。",
    ],
    "リスク低減の確認ポイント": [
      "確認方法と対応メモを更新し、追加確認が必要な点をタスク化してください。",
    ],
  }, reportTitle(context, "リスク整理"));
}

function researchPoints(context: LlmStockResearchContext): string {
  return formatStructuredLlmReport("追加調査ポイント", {
    "優先度高": [
      `次回確認日：${textValue(context.watchlist, "nextReviewDate")}`,
      `未完了タスク候補：${firstText(context.confirmationTasks, "title")}`,
    ],
    "優先度中": [
      `直近の調査メモ：${firstText(context.researchMemos, "title")}`,
      "ニュース、決算予定、リスクメモを分けて確認してください。",
    ],
    "優先度低": [
      "入力済みメモの更新日やデータソースの古さを定期的に確認してください。",
    ],
    "次に見るべき決算項目": [
      "売上、営業利益率、EPS、FCF、会社側の説明を確認してください。",
    ],
    "次に見るべきニュース": [
      `直近ニュース：${firstText(context.news, "title")}`,
    ],
    "次に確認するリスク": [
      `リスクメモ：${firstText(context.riskMemos, "content")}`,
    ],
  }, reportTitle(context, "追加調査ポイント"));
}

function removeForbiddenPhrases(content: string): string {
  return ensureLlmReportNotice(replaceForbiddenLlmPhrases(content));
}

export const MockLlmAdapter = {
  async generate(context: LlmStockResearchContext, type: LlmOutputType): Promise<MockLlmGenerateResult> {
    const contentByType: Record<LlmOutputType, string> = {
      銘柄要約: stockSummary(context),
      ニュース要約: newsSummary(context),
      決算要約: earningsSummary(context),
      リスク整理: riskSummary(context),
      追加調査ポイント: researchPoints(context),
    };

    const content = removeForbiddenPhrases(contentByType[type]);

    return {
      content,
      structuredReport: parseLlmReport(content, type),
      model: MOCK_LLM_MODEL,
    };
  },
};
