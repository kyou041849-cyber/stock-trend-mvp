"use client";

import { useState } from "react";
import type React from "react";
import type { LucideIcon } from "lucide-react";
import { Download, List, RefreshCw, Save, Upload } from "lucide-react";
import { ActionButton as DsActionButton, FormField, InfoAlert, PageHeader, SectionCard, inputClassName as dsInputClassName } from "@/components/ui/design-system";
import { loadFundamentalApiSettings, loadStockPriceApiSettings, maskApiKey, saveFundamentalApiSettings, saveStockPriceApiSettings } from "@/lib/apiSettings";
import { createLocalStorageBackup, listStockTrendLocalStorageKeys, parseLocalStorageBackupJson, restoreLocalStorageBackup, type ParsedBackupResult } from "@/lib/localStorageBackup";
import { checkFundamentalApiConnection } from "@/services/fundamentalUpdateService";
import { checkStockPriceApiConnection } from "@/services/stockPriceUpdateService";
import type { FundamentalApiSettings, StockPriceApiSettings } from "@/lib/types";

function Button({
  children,
  icon: Icon,
  variant = "secondary",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  icon?: LucideIcon;
  variant?: "primary" | "secondary" | "ghost" | "danger";
}) {
  return (
    <DsActionButton {...props} icon={Icon} variant={variant} className={className}>
      {children}
    </DsActionButton>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <FormField label={label}>{children}</FormField>;
}

function inputClassName(extra = "") {
  return dsInputClassName(extra);
}

function ViewHeader({ title, actions }: { title: string; actions?: React.ReactNode }) {
  return <PageHeader title={title} actions={actions} />;
}

function Disclaimer() {
  return (
    <InfoAlert tone="warning">
      <p>APIキーはlocalStorageに保存しません。実LLMはサーバー側の `.env.local` を使い、ブラウザ側にキーを置かない前提です。</p>
    </InfoAlert>
  );
}

function formatDateTime(value: string): string {
  return value ? value.replace("T", " ").slice(0, 16) : "-";
}

function getBackupKeys(): string[] {
  if (typeof window === "undefined") return [];
  return listStockTrendLocalStorageKeys(window.localStorage);
}

export function SettingsView({ onBack }: { onBack: () => void }) {
  const [settings, setSettings] = useState<StockPriceApiSettings>(() => loadStockPriceApiSettings());
  const [fundamentalSettings, setFundamentalSettings] = useState<FundamentalApiSettings>(() => loadFundamentalApiSettings());
  const [backupKeys, setBackupKeys] = useState<string[]>(() => getBackupKeys());
  const [backupMessage, setBackupMessage] = useState("");
  const [restoreMessage, setRestoreMessage] = useState("");
  const [restorePreview, setRestorePreview] = useState<ParsedBackupResult | null>(null);
  const [restoreConfirmed, setRestoreConfirmed] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [fundamentalSaveMessage, setFundamentalSaveMessage] = useState("");
  const [checkMessage, setCheckMessage] = useState("");
  const [fundamentalCheckMessage, setFundamentalCheckMessage] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const [isCheckingFundamental, setIsCheckingFundamental] = useState(false);
  const apiRows = [
    { label: "ニュースAPI", provider: "NewsApiAdapter" },
    { label: "決算カレンダーAPI", provider: "TDnetAdapter / FinnhubAdapter" },
  ];
  const updateSettings = <K extends keyof StockPriceApiSettings,>(key: K, value: StockPriceApiSettings[K]) => {
    setSettings((current) => ({ ...current, [key]: value }));
  };
  const updateFundamentalSettings = <K extends keyof FundamentalApiSettings,>(key: K, value: FundamentalApiSettings[K]) => {
    setFundamentalSettings((current) => ({ ...current, [key]: value }));
  };
  const refreshBackupKeys = () => {
    setBackupKeys(getBackupKeys());
  };
  const handleBackupDownload = () => {
    if (typeof window === "undefined") return;
    const result = createLocalStorageBackup(window.localStorage);
    refreshBackupKeys();
    setBackupMessage(result.message);
    if (!result.ok) return;

    const blob = new Blob([result.json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const stamp = result.payload.createdAt.replace(/[-:T]/g, "").slice(0, 12);
    link.href = url;
    link.download = `stock-trend-mvp-localStorage-backup-${stamp}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };
  const handleRestoreFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    setRestoreConfirmed(false);
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const parsed = parseLocalStorageBackupJson(text);
    setRestorePreview(parsed);
    setRestoreMessage(parsed.message);
  };
  const handleRestore = () => {
    if (typeof window === "undefined" || !restorePreview?.ok || !restoreConfirmed) return;
    const result = restoreLocalStorageBackup(window.localStorage, restorePreview.payload);
    setRestoreMessage(result.message);
    refreshBackupKeys();
  };
  const handleSave = () => {
    const result = saveStockPriceApiSettings(settings);
    setSaveMessage(result.message);
    refreshBackupKeys();
  };
  const handleSaveFundamental = () => {
    const result = saveFundamentalApiSettings(fundamentalSettings);
    setFundamentalSaveMessage(result.message);
    refreshBackupKeys();
  };
  const handleConnectionCheck = async () => {
    setIsChecking(true);
    setCheckMessage("接続確認中です。");
    try {
      const result = await checkStockPriceApiConnection(settings);
      const nextSettings = { ...settings, lastConnectionCheckedAt: result.checkedAt };
      setSettings(nextSettings);
      saveStockPriceApiSettings(nextSettings);
      setCheckMessage(result.message);
    } catch {
      setCheckMessage("接続確認に失敗しました。Mock APIモードまたは設定内容を確認してください。");
    } finally {
      setIsChecking(false);
    }
  };
  const handleFundamentalConnectionCheck = async () => {
    setIsCheckingFundamental(true);
    setFundamentalCheckMessage("接続確認中です。");
    try {
      const result = await checkFundamentalApiConnection(fundamentalSettings);
      const nextSettings = { ...fundamentalSettings, lastConnectionCheckedAt: result.checkedAt };
      setFundamentalSettings(nextSettings);
      saveFundamentalApiSettings(nextSettings);
      setFundamentalCheckMessage(result.message);
    } catch {
      setFundamentalCheckMessage("接続確認に失敗しました。Mock APIモードまたは設定内容を確認してください。");
    } finally {
      setIsCheckingFundamental(false);
    }
  };

  return (
    <section data-testid="settings-view" className="mx-auto grid max-w-4xl gap-5">
      <ViewHeader title="外部API設定" actions={<Button data-testid="settings-back" icon={List} onClick={onBack}>一覧へ</Button>} />
      <Disclaimer />
      <SectionCard title="安全に関する注意" description="設定を変更する前に確認してください。">
        <ul className="grid gap-2 text-sm font-semibold text-slate-700">
          <li className="rounded-md border border-line px-3 py-2">APIキーはlocalStorageに保存しません。</li>
          <li className="rounded-md border border-line px-3 py-2">実LLMのキーは `.env.local` に置き、サーバー側API Routeから使います。</li>
          <li className="rounded-md border border-line px-3 py-2">E2E確認では実APIを呼ばず、Mock APIを使います。</li>
        </ul>
      </SectionCard>
      <SectionCard title="β版データバックアップ" description="stock-trend-mvp のlocalStorageキーだけをJSONで保存・復元します。APIキーらしい値を検出した場合は中止します。">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="rounded-lg border border-line bg-slate-50 p-4">
            <h2 className="text-base font-bold text-ink">バックアップ</h2>
            <p className="mt-1 text-sm font-semibold text-slate-600">銘柄、株価、業績、ニュース、AI履歴、LLM利用ログ、CSV履歴など、対象キーをJSONファイルとして保存します。</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button data-testid="refresh-local-storage-keys" icon={RefreshCw} onClick={refreshBackupKeys}>対象キー再確認</Button>
              <Button data-testid="download-local-storage-backup" icon={Download} variant="primary" onClick={handleBackupDownload}>バックアップJSONを保存</Button>
            </div>
            {backupMessage ? <p data-testid="backup-message" className="mt-3 text-sm font-semibold text-slate-700">{backupMessage}</p> : null}
            <div className="mt-4 rounded-md border border-line bg-white p-3">
              <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">バックアップ対象キー</p>
              {backupKeys.length === 0 ? (
                <p data-testid="backup-key-empty" className="mt-2 text-sm font-semibold text-slate-500">対象キーはまだありません。</p>
              ) : (
                <ul data-testid="backup-key-list" className="mt-2 grid max-h-48 gap-1 overflow-auto text-xs font-semibold text-slate-700">
                  {backupKeys.map((key) => <li key={key} className="rounded bg-slate-50 px-2 py-1 font-mono">{key}</li>)}
                </ul>
              )}
            </div>
          </div>
          <div className="rounded-lg border border-line bg-slate-50 p-4">
            <h2 className="text-base font-bold text-ink">復元</h2>
            <p className="mt-1 text-sm font-semibold text-slate-600">復元は上書き方式です。対象キーを確認し、チェックを入れた場合だけ実行できます。</p>
            <Field label="バックアップJSON">
              <input data-testid="restore-local-storage-file" type="file" accept="application/json,.json" className={inputClassName()} onChange={handleRestoreFileChange} />
            </Field>
            {restoreMessage ? <p data-testid="restore-message" className="mt-3 text-sm font-semibold text-slate-700">{restoreMessage}</p> : null}
            {restorePreview?.restoreKeys.length ? (
              <div className="mt-4 rounded-md border border-line bg-white p-3">
                <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">復元対象キー</p>
                <ul data-testid="restore-key-list" className="mt-2 grid max-h-40 gap-1 overflow-auto text-xs font-semibold text-slate-700">
                  {restorePreview.restoreKeys.map((key) => <li key={key} className="rounded bg-slate-50 px-2 py-1 font-mono">{key}</li>)}
                </ul>
              </div>
            ) : null}
            {restorePreview?.skippedKeys.length ? <p className="mt-2 text-xs font-bold text-amber-900">対象外キーは復元しません: {restorePreview.skippedKeys.join(", ")}</p> : null}
            <label className="mt-4 flex items-start gap-2 text-sm font-bold text-ink">
              <input data-testid="confirm-local-storage-restore" type="checkbox" checked={restoreConfirmed} onChange={(event) => setRestoreConfirmed(event.target.checked)} disabled={!restorePreview?.ok} />
              <span>既存のβ版データを上書きすることを理解しました。</span>
            </label>
            <div className="mt-4 flex justify-end">
              <Button data-testid="restore-local-storage-backup" icon={Upload} variant="danger" onClick={handleRestore} disabled={!restorePreview?.ok || !restoreConfirmed}>復元を実行</Button>
            </div>
          </div>
        </div>
      </SectionCard>
      <div className="rounded-lg border border-line bg-white p-5 shadow-panel">
        <h2 className="text-lg font-bold text-ink">株価API設定</h2>
        <p data-testid="api-key-safety-note" className="mt-2 text-sm font-semibold text-slate-600">
          APIキーはlocalStorageに保存しません。保存時に破棄されるため、Mock APIでの確認を優先してください。実運用ではサーバー側APIルートと環境変数で扱う構成が安全です。
        </p>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <Field label="APIプロバイダ名">
            <input data-testid="stock-api-provider" className={inputClassName()} value={settings.providerName} onChange={(event) => updateSettings("providerName", event.target.value)} placeholder="例: Alpha Vantage" />
          </Field>
          <Field label="APIキー">
            <input data-testid="stock-api-key" type="password" className={inputClassName()} value={settings.apiKey} onChange={(event) => updateSettings("apiKey", event.target.value)} placeholder="未設定" />
            <p className="mt-1 text-xs font-semibold text-slate-500">表示：{maskApiKey(settings.apiKey)}</p>
          </Field>
          <Field label="APIベースURL">
            <input data-testid="stock-api-base-url" className={inputClassName()} value={settings.baseUrl} onChange={(event) => updateSettings("baseUrl", event.target.value)} placeholder="https://example.com/prices" />
          </Field>
          <div className="grid gap-3 rounded-lg border border-line p-4">
            <label className="flex items-center gap-2 text-sm font-bold text-ink">
              <input data-testid="stock-api-enabled" type="checkbox" checked={settings.enabled} onChange={(event) => updateSettings("enabled", event.target.checked)} />
              有効
            </label>
            <label className="flex items-center gap-2 text-sm font-bold text-ink">
              <input data-testid="stock-api-mock-mode" type="checkbox" checked={settings.mockMode} onChange={(event) => updateSettings("mockMode", event.target.checked)} />
              Mock APIモード
            </label>
            <p className="text-xs font-semibold text-slate-500">最終接続確認日時：{formatDateTime(settings.lastConnectionCheckedAt)}</p>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Button data-testid="check-stock-api" icon={RefreshCw} onClick={handleConnectionCheck} disabled={isChecking}>{isChecking ? "確認中" : "接続確認"}</Button>
          <Button data-testid="save-api-settings" icon={Save} variant="primary" onClick={handleSave}>保存</Button>
        </div>
        {saveMessage ? <p className="mt-3 text-sm font-semibold text-slate-700">{saveMessage}</p> : null}
        {checkMessage ? <p data-testid="stock-api-check-message" className="mt-2 text-sm font-semibold text-slate-700">{checkMessage}</p> : null}
      </div>
      <div className="rounded-lg border border-line bg-white p-5 shadow-panel">
        <h2 className="text-lg font-bold text-ink">業績API設定</h2>
        <p className="mt-2 text-sm font-semibold text-slate-600">
          業績・財務データ取得用の設定です。Mock APIモードではAPIキーなしで年次業績データの動作確認ができます。
        </p>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <Field label="APIプロバイダ名">
            <input data-testid="fundamental-api-provider" className={inputClassName()} value={fundamentalSettings.providerName} onChange={(event) => updateFundamentalSettings("providerName", event.target.value)} placeholder="例: Finnhub" />
          </Field>
          <Field label="APIキー">
            <input data-testid="fundamental-api-key" type="password" className={inputClassName()} value={fundamentalSettings.apiKey} onChange={(event) => updateFundamentalSettings("apiKey", event.target.value)} placeholder="未設定" />
            <p className="mt-1 text-xs font-semibold text-slate-500">表示：{maskApiKey(fundamentalSettings.apiKey)}</p>
          </Field>
          <Field label="APIベースURL">
            <input data-testid="fundamental-api-base-url" className={inputClassName()} value={fundamentalSettings.baseUrl} onChange={(event) => updateFundamentalSettings("baseUrl", event.target.value)} placeholder="https://example.com/fundamentals" />
          </Field>
          <div className="grid gap-3 rounded-lg border border-line p-4">
            <label className="flex items-center gap-2 text-sm font-bold text-ink">
              <input data-testid="fundamental-api-enabled" type="checkbox" checked={fundamentalSettings.enabled} onChange={(event) => updateFundamentalSettings("enabled", event.target.checked)} />
              有効
            </label>
            <label className="flex items-center gap-2 text-sm font-bold text-ink">
              <input data-testid="fundamental-api-mock-mode" type="checkbox" checked={fundamentalSettings.mockMode} onChange={(event) => updateFundamentalSettings("mockMode", event.target.checked)} />
              Mock APIモード
            </label>
            <p className="text-xs font-semibold text-slate-500">最終接続確認日時：{formatDateTime(fundamentalSettings.lastConnectionCheckedAt)}</p>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Button data-testid="check-fundamental-api" icon={RefreshCw} onClick={handleFundamentalConnectionCheck} disabled={isCheckingFundamental}>{isCheckingFundamental ? "確認中" : "接続確認"}</Button>
          <Button data-testid="save-fundamental-api-settings" icon={Save} variant="primary" onClick={handleSaveFundamental}>保存</Button>
        </div>
        {fundamentalSaveMessage ? <p className="mt-3 text-sm font-semibold text-slate-700">{fundamentalSaveMessage}</p> : null}
        {fundamentalCheckMessage ? <p data-testid="fundamental-api-check-message" className="mt-2 text-sm font-semibold text-slate-700">{fundamentalCheckMessage}</p> : null}
      </div>
      <div className="rounded-lg border border-line bg-white p-5 shadow-panel">
        <h2 className="text-lg font-bold text-ink">今後のAPI連携予定</h2>
        <div className="mt-5 grid gap-4">
          {apiRows.map((row) => (
            <div key={row.label} className="grid gap-2 rounded-lg border border-line p-4 md:grid-cols-[180px_minmax(0,1fr)_120px] md:items-center">
              <p className="text-sm font-bold text-ink">{row.label}</p>
              <input className={inputClassName()} value="未設定" readOnly aria-label={row.label} />
              <span className="rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-center text-xs font-bold text-sky-900">API未実装</span>
              <p className="text-xs font-semibold text-slate-500 md:col-start-2 md:col-span-2">将来追加予定: {row.provider}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
