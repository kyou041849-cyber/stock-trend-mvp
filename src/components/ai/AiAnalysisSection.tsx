"use client";

import { useMemo, useState } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Copy, RefreshCw, Save, Trash2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  ActionButton as DsActionButton,
  CollapsibleSection,
  EmptyState,
  FormField,
  InfoAlert,
  MetricCard,
  SectionCard,
  StatusBadge,
  inputClassName as dsInputClassName,
} from "@/components/ui/design-system";
import { isLlmOutputCurrent } from "@/lib/llmOutputStorage";
import { REQUIRED_LLM_REPORT_NOTICE, createLlmReportCopyText, getLlmReportSections, resolveStructuredLlmReport } from "@/lib/llmReport";
import type { LlmGenerationMode } from "@/services/llmService";
import { useLlmAnalysis } from "./useLlmAnalysis";
import type {
  LlmGeneratedOutput,
  LlmOutputType,
  LlmSendSettings,
  LlmStockResearchContext,
  StockProfile,
} from "@/lib/types";

const LLM_ANALYSIS_TYPES: LlmOutputType[] = ["銘柄要約", "ニュース要約", "決算要約", "リスク整理", "追加調査ポイント"];
const LLM_GENERATION_MODES: LlmGenerationMode[] = ["mock", "real"];
const LLM_GENERATION_MODE_LABELS: Record<LlmGenerationMode, string> = {
  mock: "Mock",
  real: "実LLM",
};

const LLM_SEND_SETTING_LABELS: Array<{ key: keyof LlmSendSettings; label: string }> = [
  { key: "includePriceSummary", label: "株価要約" },
  { key: "includeFundamentals", label: "業績要約" },
  { key: "includeNews", label: "ニュース" },
  { key: "includeRiskMemos", label: "リスクメモ" },
  { key: "includeResearchMemos", label: "調査メモ" },
  { key: "includeEarningsMemos", label: "決算メモ" },
  { key: "includeTasks", label: "確認タスク" },
];

function Button({
  children,
  icon: Icon,
  variant = "secondary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  icon?: LucideIcon;
  variant?: "primary" | "secondary" | "ghost" | "danger";
}) {
  return (
    <DsActionButton {...props} icon={Icon} variant={variant} className={className}>
      {children}
    </DsActionButton>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <FormField label={label}>{children}</FormField>;
}

function inputClassName(extra = "") {
  return dsInputClassName(extra);
}

function formatDateTime(value: string): string {
  return value ? value.replace("T", " ").slice(0, 16) : "-";
}

function MetricTile({ label, value }: { label: string; value: string }) {
  return <MetricCard label={label} value={value} />;
}

function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
  testId,
}: {
  label: string;
  value: T;
  options: T[];
  onChange: (value: T) => void;
  testId?: string;
}) {
  return (
    <Field label={label}>
      <select data-testid={testId} className={inputClassName()} value={value} onChange={(event) => onChange(event.target.value as T)}>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </Field>
  );
}

function MiniTable({ title, children, empty }: { title: string; children: ReactNode; empty: boolean }) {
  return (
    <SectionCard title={title} className="mt-4" contentClassName="overflow-auto">
      {empty ? <p className="text-sm font-semibold text-slate-500">データ不足</p> : children}
    </SectionCard>
  );
}

function DetailDisclosure({
  title,
  description,
  children,
  defaultOpen = false,
  className = "",
  testId,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
  testId?: string;
}) {
  return (
    <CollapsibleSection title={title} description={description} defaultOpen={defaultOpen} className={className} testId={testId}>
      {children}
    </CollapsibleSection>
  );
}

export function LlmContextPreview({ context }: { context: LlmStockResearchContext | null }) {
  const previewText = context ? JSON.stringify(context, null, 2) : "データ不足";

  return (
    <DetailDisclosure
      title="LLM入力プレビュー"
      description="LLMへ渡す予定の調査データです。この画面ではLLM APIへ送信しません。"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <p className="text-xs font-semibold text-slate-500">
          APIキー、APIベースURL、認証情報、localStorageの生データは含めません。ニュース・調査メモ・リスクメモは新しい順に上限件数まで含めます。
        </p>
        {context ? (
          <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700">
            Context Hash: {context.contextHash}
          </div>
        ) : null}
      </div>
      <pre
        data-testid="llm-context-preview"
        className="mt-4 max-h-96 overflow-auto rounded-lg border border-slate-200 bg-slate-950 p-4 text-xs leading-relaxed text-slate-100 whitespace-pre-wrap"
      >
        {previewText}
      </pre>
    </DetailDisclosure>
  );
}

function LlmReportView({
  content,
  type,
  structuredReport,
  testId,
}: {
  content: string;
  type?: LlmOutputType;
  structuredReport?: LlmGeneratedOutput["structuredReport"];
  testId?: string;
}) {
  const report = useMemo(() => resolveStructuredLlmReport(content, type, structuredReport), [content, type, structuredReport]);

  return (
    <div data-testid={testId} className="rounded-md border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-black text-ink">{report.title}</p>
        <span className="rounded-md bg-white px-2 py-1 text-xs font-bold text-slate-600">{report.analysisType}</span>
      </div>
      <div className="mt-3 grid gap-3">
        {report.sections.map((section) => {
          const isNotice = section.heading === "注意文";
          return (
            <details
              key={`${section.heading}-${section.items.join("|").slice(0, 24)}`}
              open={isNotice || report.sections.length <= 4}
              className={isNotice ? "rounded-md border border-amber-200 bg-amber-50 px-3 py-2" : "border-t border-slate-200 pt-3 first:border-t-0 first:pt-0"}
            >
              <summary className={`cursor-pointer text-sm font-black ${isNotice ? "text-amber-950" : "text-ink"}`}>{section.heading}</summary>
              <ul className={`mt-2 list-disc space-y-1 pl-5 text-sm leading-6 ${isNotice ? "text-amber-950" : "text-slate-700"}`}>
                {section.items.map((item, index) => (
                  <li key={`${section.heading}-${index}`}>{item}</li>
                ))}
              </ul>
            </details>
          );
        })}
      </div>
      <p className="mt-3 text-xs font-bold text-slate-600">{report.disclaimer}</p>
    </div>
  );
}

export function AiAnalysisSection({
  stock,
  context,
}: {
  stock: StockProfile;
  context: LlmStockResearchContext | null;
}) {
  const {
    analysisType,
    setAnalysisType,
    generationMode,
    setGenerationMode,
    sendSettings,
    sendSettingsInfo,
    draftOutput,
    savedOutputs,
    message,
    isGenerating,
    lastFailedRequest,
    inputSummary,
    usageLimit,
    recentUsageLogs,
    updateSendSetting,
    handleSaveSendSettings,
    handleResetSendSettings,
    handleApplyRecommendedSendSettings,
    handleExportSendSettingsJson,
    handleImportSendSettingsJson,
    handleGenerate,
    handleRetry,
    handleCopy,
    handleSave,
    handleDelete,
  } = useLlmAnalysis(stock, context);
  const [settingsJsonText, setSettingsJsonText] = useState("");
  const enabledSendSettings = LLM_SEND_SETTING_LABELS.filter((item) => sendSettings[item.key]);
  const disabledSendSettings = LLM_SEND_SETTING_LABELS.filter((item) => !sendSettings[item.key]);
  const outputSections = useMemo(() => getLlmReportSections(analysisType), [analysisType]);
  return (
    <section data-testid="ai-analysis-section" className="grid gap-4">
      <SectionCard
        title="AI分析"
        description="まず分析タイプと生成モードを選び、調査補助用のレポートを作成します。詳細設定は下の管理エリアにまとめています。"
        actions={<StatusBadge tone={context ? "info" : "warning"}>Context Hash: {context?.contextHash ?? "データ不足"}</StatusBadge>}
      >
        <InfoAlert tone="warning">
          このAI分析は公開データ・入力済みメモをもとにした調査補助です。投資判断ではありません。
        </InfoAlert>

        <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
          <div className="rounded-lg border border-line bg-slate-50 p-4">
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="生成モード">
                <select
                  data-testid="llm-generation-mode"
                  className={inputClassName()}
                  value={generationMode}
                  onChange={(event) => setGenerationMode(event.target.value as LlmGenerationMode)}
                >
                  {LLM_GENERATION_MODES.map((mode) => (
                    <option key={mode} value={mode}>{LLM_GENERATION_MODE_LABELS[mode]}</option>
                  ))}
                </select>
              </Field>
              <SelectField
                label="分析タイプ"
                value={analysisType}
                options={LLM_ANALYSIS_TYPES}
                onChange={setAnalysisType}
                testId="llm-analysis-type"
              />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                data-testid="generate-ai-analysis"
                icon={RefreshCw}
                variant="primary"
                onClick={handleGenerate}
                disabled={isGenerating || !context}
              >
                {isGenerating ? "生成中" : "AI分析を生成"}
              </Button>
              <Button
                data-testid="retry-ai-analysis"
                icon={RefreshCw}
                onClick={handleRetry}
                disabled={!lastFailedRequest || isGenerating || (lastFailedRequest.generationMode === "real" && !usageLimit.ok)}
              >
                再試行
              </Button>
              <Button
                data-testid="save-ai-analysis"
                icon={Save}
                onClick={handleSave}
                disabled={!draftOutput}
              >
                生成結果を保存
              </Button>
            </div>
          </div>

          <div className="grid gap-3">
            <div className="flex flex-wrap gap-2">
              <StatusBadge tone={generationMode === "real" ? "warning" : "neutral"}>現在モード：{LLM_GENERATION_MODE_LABELS[generationMode]}</StatusBadge>
              <StatusBadge tone={inputSummary.isBlocked ? "danger" : inputSummary.isWarning ? "warning" : "success"}>送信可否：{inputSummary.isBlocked ? "要調整" : "送信可能"}</StatusBadge>
              <StatusBadge tone="info">送信項目ON {enabledSendSettings.length} / {LLM_SEND_SETTING_LABELS.length}</StatusBadge>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <MetricTile label="今日の実LLM利用" value={`${usageLimit.dailyCount} / 20`} />
              <MetricTile label="この銘柄の今日" value={`${usageLimit.stockDailyCount} / 5`} />
              <MetricTile label="LLM入力サイズ" value={`${inputSummary.inputSize.toLocaleString()}文字`} />
              <MetricTile label="ニュース件数" value={`${inputSummary.newsCount}`} />
              <MetricTile label="メモ/リスク/決算" value={`${inputSummary.researchMemoCount}/${inputSummary.riskMemoCount}/${inputSummary.earningsMemoCount}`} />
              <MetricTile label="確認タスク件数" value={`${inputSummary.taskCount}`} />
            </div>
          </div>
        </div>

        {generationMode === "real" ? (
          <InfoAlert tone="info" className="mt-3">
            実LLMを使うにはサーバー側の `.env.local` に `OPENAI_API_KEY` と `OPENAI_MODEL` を設定してください。APIキーは画面やlocalStorageには保存しません。
          </InfoAlert>
        ) : null}

        {inputSummary.isBlocked ? (
          <InfoAlert tone="danger" className="mt-3">
            LLM入力サイズが上限を超えています。送信項目をOFFにしてから再試行してください。
          </InfoAlert>
        ) : inputSummary.isWarning ? (
          <InfoAlert tone="warning" className="mt-3">
            LLM入力サイズが大きめです。必要に応じて送信項目を絞ってください。
          </InfoAlert>
        ) : null}

        {generationMode === "real" && !usageLimit.ok ? (
          <InfoAlert tone="danger" className="mt-3">
            {usageLimit.message}
          </InfoAlert>
        ) : null}
      </SectionCard>

      <SectionCard title="最新の生成結果" description="生成直後のレポートをここで確認し、必要ならコピーや保存を行います。">
        {message ? <InfoAlert testId="ai-analysis-message" tone="info" className="mb-3">{message}</InfoAlert> : null}
        {draftOutput ? (
          <div className="grid gap-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap gap-2 text-xs font-bold text-slate-600">
                <StatusBadge tone="info">{draftOutput.type}</StatusBadge>
                <StatusBadge>{draftOutput.model}</StatusBadge>
                <StatusBadge>{formatDateTime(draftOutput.updatedAt)}</StatusBadge>
              </div>
              <Button data-testid="copy-ai-analysis-draft" className="h-9 w-fit px-2" icon={Copy} onClick={() => handleCopy(createLlmReportCopyText(draftOutput.content, draftOutput.type, draftOutput.structuredReport))}>コピー</Button>
            </div>
            <LlmReportView content={draftOutput.content} type={draftOutput.type} structuredReport={draftOutput.structuredReport} testId="ai-analysis-draft" />
          </div>
        ) : (
          <EmptyState title="生成結果はまだありません" description="分析タイプを選んで「AI分析を生成」を押すと、ここに最新結果が表示されます。" />
        )}
      </SectionCard>

      <SectionCard title="管理・詳細" description="送信項目、プレビュー、履歴、利用ログなど、普段は閉じておける情報をまとめています。">
        <div className="grid gap-4">
          <DetailDisclosure
            title="LLM送信項目"
            description="AIへ渡す情報を選びます。普段は閉じたままで問題ありません。"
          >
        <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <p className="text-xs font-bold text-slate-500">
            保存単位：この銘柄 + この分析タイプ / 状態：{sendSettingsInfo.source === "saved" ? "保存済み" : "デフォルト"}
            {sendSettingsInfo.updatedAt ? ` / 更新: ${formatDateTime(sendSettingsInfo.updatedAt)}` : ""}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button data-testid="apply-recommended-llm-send-settings" className="h-9 px-2 text-xs" onClick={handleApplyRecommendedSendSettings}>推奨設定を適用</Button>
            <Button data-testid="save-llm-send-settings" className="h-9 px-2 text-xs" icon={Save} onClick={handleSaveSendSettings}>設定を保存</Button>
            <Button data-testid="reset-llm-send-settings" className="h-9 px-2 text-xs" onClick={handleResetSendSettings}>デフォルトに戻す</Button>
          </div>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["includePriceSummary", "株価要約を含める"],
            ["includeFundamentals", "業績要約を含める"],
            ["includeNews", "ニュースを含める"],
            ["includeRiskMemos", "リスクメモを含める"],
            ["includeResearchMemos", "調査メモを含める"],
            ["includeEarningsMemos", "決算メモを含める"],
            ["includeTasks", "確認タスクを含める"],
          ].map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 rounded-md border border-line px-3 py-2 text-sm font-bold text-ink">
              <input
                data-testid={`llm-send-${key}`}
                type="checkbox"
                checked={sendSettings[key as keyof LlmSendSettings]}
                onChange={(event) => updateSendSetting(key as keyof LlmSendSettings, event.target.checked)}
              />
              {label}
            </label>
          ))}
        </div>
      </DetailDisclosure>

          <DetailDisclosure title="プロンプト概要・設定JSON" description="LLM送信設定の確認とJSON取り込み用です。APIキーや送信本文全文は含めません。">
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-sm font-black text-ink">LLMへ送る予定の概要</h3>
            <dl className="mt-3 grid gap-2 text-sm font-semibold text-slate-700">
              <div><dt className="font-black text-slate-500">分析タイプ</dt><dd>{analysisType}</dd></div>
              <div><dt className="font-black text-slate-500">送信項目ON</dt><dd>{enabledSendSettings.map((item) => item.label).join("、") || "なし"}</dd></div>
              <div><dt className="font-black text-slate-500">送信項目OFF</dt><dd>{disabledSendSettings.map((item) => item.label).join("、") || "なし"}</dd></div>
              <div><dt className="font-black text-slate-500">入力サイズ</dt><dd>{inputSummary.inputSize.toLocaleString()}文字</dd></div>
              <div><dt className="font-black text-slate-500">注意文</dt><dd>{REQUIRED_LLM_REPORT_NOTICE}</dd></div>
              <div><dt className="font-black text-slate-500">禁止表現ポリシー</dt><dd>売買推奨、将来株価の断定、利益保証にあたる表現は出力前チェックの対象です。</dd></div>
              <div><dt className="font-black text-slate-500">出力形式</dt><dd>JSON structuredReport: title / analysisType / sections / disclaimer</dd></div>
              <div><dt className="font-black text-slate-500">出力セクション</dt><dd>{outputSections.join("、")}</dd></div>
            </dl>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-sm font-black text-ink">LLM送信設定JSON</h3>
            <p className="mt-1 text-xs font-bold text-slate-500">
              保存済みのLLM送信設定だけをJSON化します。APIキー、APIベースURL、LLM送信本文全文は含めません。
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                data-testid="export-llm-send-settings-json"
                className="h-9 px-2 text-xs"
                onClick={() => setSettingsJsonText(handleExportSendSettingsJson())}
              >
                設定JSONを生成
              </Button>
              <Button
                data-testid="import-llm-send-settings-json"
                className="h-9 px-2 text-xs"
                onClick={() => handleImportSendSettingsJson(settingsJsonText)}
                disabled={!settingsJsonText.trim()}
              >
                設定JSONを取り込み
              </Button>
            </div>
            <textarea
              data-testid="llm-send-settings-json"
              className={`${inputClassName("mt-3 min-h-36 w-full font-mono text-xs")}`}
              value={settingsJsonText}
              onChange={(event) => setSettingsJsonText(event.target.value)}
              placeholder="設定JSONをここに表示、または貼り付け"
            />
          </div>
        </div>
          </DetailDisclosure>

          <DetailDisclosure title="保存済みAI分析の履歴" description="古い分析、コピー、削除はここで管理します。" testId="ai-analysis-history">
          {savedOutputs.length === 0 ? (
            <p className="mt-3 text-sm font-semibold text-slate-500">保存済みAI分析はまだありません。</p>
          ) : (
            <div data-testid="ai-history-list" className="mt-3 grid max-h-[560px] gap-3 overflow-auto pr-1">
              {savedOutputs.map((output) => {
                const current = isLlmOutputCurrent(output, context?.contextHash);
                return (
                  <article key={output.id} data-testid="ai-analysis-history-item" className="rounded-md border border-line p-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-sm font-black text-ink">{output.type}</p>
                        <p className="mt-1 text-xs font-semibold text-slate-500">{formatDateTime(output.updatedAt)} / {output.model}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <span className={`rounded-md px-2 py-1 text-xs font-bold ${current ? "bg-teal-50 text-teal-900" : "bg-amber-50 text-amber-900"}`}>
                          {current ? "最新データに基づく分析" : "元データが更新されています。再生成を検討してください。"}
                        </span>
                        <Button data-testid="copy-ai-analysis-history" className="h-8 px-2 text-xs" icon={Copy} onClick={() => handleCopy(createLlmReportCopyText(output.content, output.type, output.structuredReport))}>コピー</Button>
                        <Button data-testid="delete-ai-analysis" className="h-8 px-2 text-xs" icon={Trash2} variant="danger" onClick={() => handleDelete(output.id)}>削除</Button>
                      </div>
                    </div>
                    <div className="mt-3">
                      <LlmReportView content={output.content} type={output.type} structuredReport={output.structuredReport} />
                    </div>
                  </article>
                );
              })}
            </div>
          )}
          </DetailDisclosure>

          <DetailDisclosure title="LLM利用ログ（この銘柄）" description="APIキーや送信本文全文は保存しません。">
        <MiniTable title="直近ログ" empty={recentUsageLogs.length === 0}>
          <table className="w-full min-w-[1000px] text-sm">
            <tbody className="divide-y divide-line">
              {recentUsageLogs.map((log) => (
                <tr key={log.id}>
                  <td className="px-4 py-3 font-bold">{formatDateTime(log.requestedAt)}</td>
                  <td className="px-4 py-3">{log.mode} / {log.analysisType}</td>
                  <td className="px-4 py-3">{log.success ? "成功" : "失敗"}</td>
                  <td className="px-4 py-3">入力 {log.inputSize.toLocaleString()} / 出力 {log.outputSize.toLocaleString()}</td>
                  <td className="px-4 py-3">{log.errorMessage || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </MiniTable>
          </DetailDisclosure>
        </div>
      </SectionCard>
    </section>
  );
}
