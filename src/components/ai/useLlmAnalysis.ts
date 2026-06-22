"use client";

import { useEffect, useMemo, useState } from "react";
import {
  deleteLlmOutput,
  loadLlmOutputsForStock,
  saveLlmOutput,
} from "@/lib/llmOutputStorage";
import {
  appendLlmUsageLog,
  checkLlmUsageLimit,
  createLlmUsageLog,
  filterLlmContextForSend,
  getLlmInputSizeSummary,
  loadLlmUsageLogs,
} from "@/lib/llmUsage";
import {
  exportStoredLlmSendSettingsJson,
  getDefaultLlmSendSettings,
  getRecommendedLlmSendSettings,
  importStoredLlmSendSettingsJson,
  loadLlmSendSettings,
  resetLlmSendSettings,
  saveLlmSendSettings,
} from "@/lib/llmSendSettings";
import { generateMockLlmAnalysis, generateRealLlmAnalysis } from "@/services/llmService";
import type { LlmGenerationMode } from "@/services/llmService";
import type {
  LlmGeneratedOutput,
  LlmOutputType,
  LlmSendSettings,
  LlmStockResearchContext,
  LlmUsageLog,
  StockProfile,
} from "@/lib/types";

type AiRetryState = {
  analysisType: LlmOutputType;
  generationMode: LlmGenerationMode;
  sendSettings: LlmSendSettings;
};

const DEFAULT_ANALYSIS_TYPE: LlmOutputType = "銘柄要約";

export function useLlmAnalysis(stock: StockProfile, context: LlmStockResearchContext | null) {
  const [analysisType, setAnalysisType] = useState<LlmOutputType>(DEFAULT_ANALYSIS_TYPE);
  const [generationMode, setGenerationMode] = useState<LlmGenerationMode>("mock");
  const [sendSettings, setSendSettings] = useState<LlmSendSettings>(() => loadLlmSendSettings(stock.id, DEFAULT_ANALYSIS_TYPE).settings);
  const [sendSettingsInfo, setSendSettingsInfo] = useState(() => {
    const result = loadLlmSendSettings(stock.id, DEFAULT_ANALYSIS_TYPE);
    return { source: result.source, updatedAt: result.updatedAt };
  });
  const [draftOutput, setDraftOutput] = useState<LlmGeneratedOutput | null>(null);
  const [savedOutputs, setSavedOutputs] = useState<LlmGeneratedOutput[]>(() => loadLlmOutputsForStock(stock.id));
  const [usageLogs, setUsageLogs] = useState<LlmUsageLog[]>(() => loadLlmUsageLogs());
  const [message, setMessage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastFailedRequest, setLastFailedRequest] = useState<AiRetryState | null>(null);

  useEffect(() => {
    setSavedOutputs(loadLlmOutputsForStock(stock.id));
    setUsageLogs(loadLlmUsageLogs());
    setDraftOutput(null);
    setMessage(null);
    setLastFailedRequest(null);
  }, [stock.id]);

  useEffect(() => {
    const result = loadLlmSendSettings(stock.id, analysisType);
    setSendSettings(result.settings);
    setSendSettingsInfo({ source: result.source, updatedAt: result.updatedAt });
  }, [stock.id, analysisType]);

  const refreshSavedOutputs = () => setSavedOutputs(loadLlmOutputsForStock(stock.id));
  const refreshUsageLogs = () => setUsageLogs(loadLlmUsageLogs());
  const contextForSend = useMemo(() => context ? filterLlmContextForSend(context, sendSettings) : null, [context, sendSettings]);
  const inputSummary = useMemo(() => getLlmInputSizeSummary(contextForSend), [contextForSend]);
  const usageLimit = useMemo(() => checkLlmUsageLimit(usageLogs, stock.id), [usageLogs, stock.id]);
  const recentUsageLogs = usageLogs.filter((log) => log.stockId === stock.id).slice(0, 5);

  const updateSendSetting = (key: keyof LlmSendSettings, value: boolean) => {
    setSendSettings((current) => ({ ...current, [key]: value }));
  };

  const handleSaveSendSettings = () => {
    const result = saveLlmSendSettings(stock.id, analysisType, sendSettings);
    setMessage(result.message);
    if (result.ok) {
      setSendSettingsInfo({ source: "saved", updatedAt: result.updatedAt });
    }
  };

  const handleResetSendSettings = () => {
    const result = resetLlmSendSettings(stock.id, analysisType);
    setSendSettings(getDefaultLlmSendSettings());
    setSendSettingsInfo({ source: "default", updatedAt: "" });
    setMessage(result.message);
  };

  const handleApplyRecommendedSendSettings = () => {
    setSendSettings(getRecommendedLlmSendSettings(analysisType));
    setMessage("分析タイプ別の推奨LLM送信設定を適用しました。必要に応じて保存してください。");
  };

  const handleExportSendSettingsJson = () => exportStoredLlmSendSettingsJson();

  const handleImportSendSettingsJson = (json: string) => {
    const result = importStoredLlmSendSettingsJson(json);
    setMessage(result.message);
    if (result.ok) {
      const loaded = loadLlmSendSettings(stock.id, analysisType);
      setSendSettings(loaded.settings);
      setSendSettingsInfo({ source: loaded.source, updatedAt: loaded.updatedAt });
    }
    return result;
  };

  const writeUsageLog = ({
    mode,
    type,
    contextHash,
    inputSize,
    success,
    errorMessage,
    model,
    outputSize,
  }: {
    mode: LlmGenerationMode;
    type: LlmOutputType;
    contextHash: string;
    inputSize: number;
    success: boolean;
    errorMessage: string;
    model: string;
    outputSize: number;
  }) => {
    const log = createLlmUsageLog({
      stockId: stock.id,
      ticker: stock.ticker,
      companyName: stock.companyName,
      analysisType: type,
      mode: mode === "real" ? "実LLM" : "Mock",
      model,
      requestedAt: new Date().toISOString(),
      success,
      errorMessage,
      inputSize,
      outputSize,
      sourceContextHash: contextHash,
    });
    const result = appendLlmUsageLog(log);
    if (result.ok) {
      refreshUsageLogs();
    }
  };

  const runGenerate = async (request: AiRetryState) => {
    const requestContext = context ? filterLlmContextForSend(context, request.sendSettings) : null;
    const requestSummary = getLlmInputSizeSummary(requestContext);
    const requestUsageLimit = checkLlmUsageLimit(loadLlmUsageLogs(), stock.id);

    if (!requestContext) {
      setMessage("AI分析の入力データが不足しています。銘柄データを確認してください。");
      setLastFailedRequest(null);
      return;
    }

    if (requestSummary.isBlocked) {
      setMessage(`LLM入力サイズが${requestSummary.hardLimit.toLocaleString()}文字を超えています。送信項目をOFFにして入力を減らしてください。`);
      setLastFailedRequest(null);
      return;
    }

    if (request.generationMode === "real" && !requestUsageLimit.ok) {
      setMessage(requestUsageLimit.message);
      setLastFailedRequest(null);
      return;
    }

    setIsGenerating(true);
    setLastFailedRequest(null);
    setMessage(request.generationMode === "mock" ? "Mock LLMでAI分析を生成中です。実LLM APIは呼び出しません。" : "実LLMでAI分析を生成中です。APIキーはサーバー側の環境変数から読み込みます。");
    try {
      const result = request.generationMode === "mock"
        ? await generateMockLlmAnalysis(stock.id, request.analysisType, [stock], { context: requestContext })
        : await generateRealLlmAnalysis(stock.id, request.analysisType, requestContext);
      if (!result.ok) {
        setMessage(result.message);
        writeUsageLog({
          mode: request.generationMode,
          type: request.analysisType,
          contextHash: requestContext.contextHash,
          inputSize: requestSummary.inputSize,
          success: false,
          errorMessage: result.message,
          model: request.generationMode === "mock" ? "mock-llm-v1" : "server-route",
          outputSize: 0,
        });
        setLastFailedRequest(request.generationMode === "real" ? request : null);
        return;
      }
      setDraftOutput(result.output);
      writeUsageLog({
        mode: request.generationMode,
        type: request.analysisType,
        contextHash: requestContext.contextHash,
        inputSize: requestSummary.inputSize,
        success: true,
        errorMessage: "",
        model: result.output.model,
        outputSize: result.output.content.length,
      });
      setMessage(result.message);
    } catch {
      const errorMessage = "AI分析の生成に失敗しました。入力データを確認してください。";
      setMessage(errorMessage);
      writeUsageLog({
        mode: request.generationMode,
        type: request.analysisType,
        contextHash: requestContext.contextHash,
        inputSize: requestSummary.inputSize,
        success: false,
        errorMessage,
        model: request.generationMode === "mock" ? "mock-llm-v1" : "server-route",
        outputSize: 0,
      });
      setLastFailedRequest(request.generationMode === "real" ? request : null);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerate = async () => {
    await runGenerate({ analysisType, generationMode, sendSettings });
  };

  const handleRetry = async () => {
    if (!lastFailedRequest) {
      return;
    }
    await runGenerate(lastFailedRequest);
  };

  const handleCopy = async (content: string) => {
    if (!navigator.clipboard) {
      setMessage("コピー機能を利用できません。ブラウザの権限やHTTPS環境を確認してください。");
      return;
    }

    try {
      await navigator.clipboard.writeText(content);
      setMessage("AI分析結果をコピーしました。");
    } catch {
      setMessage("コピーに失敗しました。ブラウザの権限を確認してください。");
    }
  };

  const handleSave = () => {
    if (!draftOutput) {
      setMessage("保存するAI分析がありません。先に生成してください。");
      return;
    }

    const result = saveLlmOutput(draftOutput);
    setMessage(result.message);
    if (result.ok) {
      refreshSavedOutputs();
    }
  };

  const handleDelete = (outputId: string) => {
    const result = deleteLlmOutput(outputId);
    setMessage(result.message);
    if (result.ok) {
      refreshSavedOutputs();
      if (draftOutput?.id === outputId) {
        setDraftOutput(null);
      }
    }
  };

  return {
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
  };
}
