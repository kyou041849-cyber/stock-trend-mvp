"use client";

import { useMemo, useState } from "react";
import type React from "react";
import type { LucideIcon } from "lucide-react";
import { FileUp, List, Save, Upload } from "lucide-react";
import { ActionButton as DsActionButton, FormField, InfoAlert, MetricCard, PageHeader, SectionCard, StatusBadge, inputClassName as dsInputClassName } from "@/components/ui/design-system";
import { appendCsvImportHistory, createCsvImportHistory, type CsvImportDataType } from "@/lib/csvImportHistory";
import { createEarningsCsvTemplate, createPriceCsvTemplate, previewEarningsCsv, previewPriceCsv, type CsvPreviewRow, type EarningsCsvImportPreview, type PriceCsvImportPreview } from "@/lib/csvImportWorkflow";
import type { EarningsRow, PriceRow, StockProfile } from "@/lib/types";

type EarningsFormState = {
  fiscalYear: string;
  revenue: string;
  operatingIncome: string;
  netIncome: string;
  eps: string;
  operatingCashFlow: string;
  freeCashFlow: string;
  equityRatio: string;
  roe: string;
  roic: string;
  marketCap: string;
  per: string;
  pbr: string;
  psr: string;
  memo: string;
};
const emptyEarningsForm: EarningsFormState = {
  fiscalYear: "",
  revenue: "",
  operatingIncome: "",
  netIncome: "",
  eps: "",
  operatingCashFlow: "",
  freeCashFlow: "",
  equityRatio: "",
  roe: "",
  roic: "",
  marketCap: "",
  per: "",
  pbr: "",
  psr: "",
  memo: "",
};
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

function createId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return prefix + "-" + Date.now() + "-" + Math.random().toString(16).slice(2);
}
function parseRequiredNumber(value: string): number | null {
  if (value.trim() === "") return null;
  const parsed = Number(value.replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function parseOptionalNumber(value: string): number | null {
  if (value.trim() === "") return null;
  return parseRequiredNumber(value);
}
function ViewHeader({ title, actions }: { title: string; actions?: React.ReactNode }) {
  return <PageHeader title={title} actions={actions} />;
}

function Disclaimer() {
  return (
    <InfoAlert tone="warning">
      <p>CSV取り込みは保存前に必ずプレビューします。追加件数、更新件数、エラー行を確認してから取り込みを実行してください。</p>
    </InfoAlert>
  );
}

function MetricTile({ label, value }: { label: string; value: string }) {
  return <MetricCard label={label} value={value} />;
}

function downloadCsvText(fileName: string, content: string) {
  if (typeof window === "undefined") {
    return;
  }

  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  window.URL.revokeObjectURL(url);
}

function readCsvFile(
  event: React.ChangeEvent<HTMLInputElement>,
  onRead: (text: string, fileName: string) => void,
  onError: (message: string) => void,
) {
  const file = event.target.files?.[0];
  event.target.value = "";

  if (!file) {
    return;
  }

  void file.text()
    .then((text) => onRead(text, file.name))
    .catch(() => onError("CSVファイルの読み込みに失敗しました。ファイル内容を確認してください。"));
}

function createCsvHistoryFromPreview({
  stock,
  dataType,
  fileName,
  preview,
  success,
  errorMessage,
}: {
  stock: StockProfile;
  dataType: CsvImportDataType;
  fileName: string;
  preview: PriceCsvImportPreview | EarningsCsvImportPreview;
  success: boolean;
  errorMessage: string;
}) {
  return createCsvImportHistory({
    stockId: stock.id,
    ticker: stock.ticker,
    companyName: stock.companyName,
    dataType,
    fileName: fileName.trim() || (dataType === "株価" ? "stock-prices.csv" : "fundamentals.csv"),
    totalRows: preview.totalRows,
    addedRows: success ? preview.addedRows : 0,
    updatedRows: success ? preview.updatedRows : 0,
    errorRows: preview.errorRows,
    warningRows: preview.warningRows,
    success,
    errorMessage,
  });
}

function CsvPreviewRowsTable({ rows }: { rows: CsvPreviewRow[] }) {
  if (rows.length === 0) {
    return <p className="text-sm font-semibold text-slate-500">プレビューできるデータ行がありません。</p>;
  }

  const headers = Object.keys(rows[0].values);

  return (
    <div className="overflow-x-auto rounded-md border border-line">
      <table className="w-full min-w-[720px] text-xs">
        <thead className="bg-slate-50 text-left text-slate-600">
          <tr>
            <th className="px-3 py-2">行</th>
            {headers.map((header) => (
              <th key={header} className="px-3 py-2">{header}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((row) => (
            <tr key={row.rowNumber}>
              <td className="px-3 py-2 font-bold text-ink">{row.rowNumber}</td>
              {headers.map((header) => (
                <td key={header} className="px-3 py-2 font-mono text-slate-700">{row.values[header] || "-"}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CsvImportSteps({ currentStep }: { currentStep: number }) {
  const steps = ["テンプレート", "入力", "プレビュー", "確認", "取り込み"];
  return (
    <ol className="grid gap-2 rounded-lg border border-line bg-white p-3 text-sm font-bold text-slate-700 shadow-panel sm:grid-cols-5">
      {steps.map((step, index) => (
        <li key={step} className={`flex items-center gap-2 rounded-md px-3 py-2 ${index + 1 <= currentStep ? "bg-teal-50 text-teal-900" : "bg-slate-50 text-slate-600"}`}>
          <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs ${index + 1 <= currentStep ? "bg-accent text-white" : "bg-white text-slate-500"}`}>{index + 1}</span>
          <span>{step}</span>
        </li>
      ))}
    </ol>
  );
}

function getCsvCurrentStep(preview: PriceCsvImportPreview | EarningsCsvImportPreview | null, csvText: string): number {
  if (!csvText.trim()) return 2;
  if (!preview) return 2;
  if (!preview.ok) return 4;
  return 5;
}

function CsvInputMethodPanel({
  templateLabel,
  fileTestId,
  textTestId,
  fileNameTestId,
  fileName,
  csvText,
  placeholder,
  onDownloadTemplate,
  onReadFile,
  onFileNameChange,
  onCsvTextChange,
}: {
  templateLabel: string;
  fileTestId: string;
  textTestId: string;
  fileNameTestId: string;
  fileName: string;
  csvText: string;
  placeholder: string;
  onDownloadTemplate: () => void;
  onReadFile: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onFileNameChange: (value: string) => void;
  onCsvTextChange: (value: string) => void;
}) {
  return (
    <SectionCard
      title="テンプレートと入力"
      description="テンプレートを確認し、ファイル選択または貼り付けでCSVを読み込みます。"
      actions={<Button icon={FileUp} onClick={onDownloadTemplate}>{templateLabel}</Button>}
    >
      <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
        <div className="rounded-lg border border-line bg-slate-50 p-4">
          <h2 className="text-sm font-black text-ink">ファイルから読み込む</h2>
          <p className="mt-1 text-xs font-semibold text-slate-500">手元のCSVファイルを選ぶと、保存前プレビューに進みます。</p>
          <label className="mt-3 inline-flex cursor-pointer items-center rounded-md border border-line bg-white px-3 py-2 text-sm font-bold text-ink shadow-sm">
            CSVファイルを選択
            <input data-testid={fileTestId} type="file" accept=".csv,text/csv" className="sr-only" onChange={onReadFile} />
          </label>
          <Field label="ファイル名"><input data-testid={fileNameTestId} className={inputClassName("mt-3")} value={fileName} onChange={(event) => onFileNameChange(event.target.value)} /></Field>
        </div>
        <div className="rounded-lg border border-line bg-white p-4">
          <h2 className="text-sm font-black text-ink">CSVを貼り付ける</h2>
          <p className="mt-1 text-xs font-semibold text-slate-500">ExcelなどからコピーしたCSVもここに貼り付けできます。</p>
          <textarea
            data-testid={textTestId}
            className={inputClassName("mt-3 min-h-72 w-full font-mono text-xs leading-5")}
            value={csvText}
            onChange={(event) => onCsvTextChange(event.target.value)}
            placeholder={placeholder}
          />
        </div>
      </div>
    </SectionCard>
  );
}

function CsvImportPreviewPanel({ preview, duplicatePolicy }: { preview: PriceCsvImportPreview | EarningsCsvImportPreview; duplicatePolicy: string }) {
  const resultTone = preview.ok ? "border-teal-200 bg-teal-50 text-teal-900" : "border-rose-200 bg-rose-50 text-rose-900";

  return (
    <div data-testid="csv-import-preview" className="grid gap-4 rounded-lg border border-line bg-white p-5 shadow-panel">
      <div className={`rounded-md border px-4 py-3 text-sm ${resultTone}`}>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge tone={preview.ok ? "success" : "danger"}>{preview.ok ? "取り込み可能" : "要修正"}</StatusBadge>
          <p className="font-bold">{preview.ok ? "プレビュー完了：取り込み実行できます" : "プレビュー完了：エラーがあるため保存されません"}</p>
        </div>
        <p className="mt-1">{duplicatePolicy}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <MetricTile label="読み込み件数" value={`${preview.totalRows}`} />
        <MetricTile label="追加予定" value={`${preview.addedRows}`} />
        <MetricTile label="更新予定" value={`${preview.updatedRows}`} />
        <MetricTile label="エラー行" value={`${preview.errorRows}`} />
        <MetricTile label="警告" value={`${preview.warningRows}`} />
      </div>
      {preview.warnings.length > 0 ? (
        <details open className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
          <summary className="cursor-pointer font-bold">警告</summary>
          <ul className="mt-2 grid gap-1">
            {preview.warnings.map((warning) => <li key={warning}>{warning}</li>)}
          </ul>
        </details>
      ) : null}
      {preview.result.errors.length > 0 ? (
        <details open data-testid="csv-import-errors" className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-900">
          <summary className="cursor-pointer font-bold">エラー行の詳細</summary>
          <ul className="mt-2 grid gap-1">
            {preview.result.errors.map((error) => <li key={error}>{error}</li>)}
          </ul>
        </details>
      ) : null}
      <details open className="rounded-md border border-line bg-slate-50 p-3">
        <summary className="cursor-pointer text-sm font-bold text-ink">先頭プレビュー</summary>
        <div className="mt-3 max-h-72 overflow-auto">
          <CsvPreviewRowsTable rows={preview.previewRows} />
        </div>
      </details>
    </div>
  );
}

export function PriceCsvImportView({ stocks, initialStockId, onBack, onImported }: { stocks: StockProfile[]; initialStockId?: string; onBack: () => void; onImported: (stockId: string, rows: PriceRow[]) => void; }) {
  const [stockId, setStockId] = useState(initialStockId ?? stocks[0]?.id ?? "");
  const [csvText, setCsvText] = useState("");
  const [fileName, setFileName] = useState("stock-prices.csv");
  const [message, setMessage] = useState("");
  const selectedStock = stocks.find((stock) => stock.id === stockId);
  const preview = useMemo(() => selectedStock && csvText.trim().length > 0 ? previewPriceCsv(csvText, selectedStock.prices) : null, [csvText, selectedStock]);
  const handleExecute = () => {
    if (!selectedStock || !preview) return;
    const errorMessage = preview.result.errors.join(" / ");
    const success = preview.ok;
    try {
      if (success) {
        onImported(selectedStock.id, preview.result.rows);
      }
      appendCsvImportHistory(createCsvHistoryFromPreview({
        stock: selectedStock,
        dataType: "株価",
        fileName,
        preview,
        success,
        errorMessage: success ? "" : errorMessage,
      }));
      setMessage(success ? `取り込み成功：追加 ${preview.addedRows} 件 / 更新 ${preview.updatedRows} 件` : "取り込み失敗：エラー行を修正してから再実行してください。");
    } catch {
      setMessage("localStorageへの保存に失敗しました。ブラウザの保存容量や設定を確認してください。");
    }
  };

  return (
    <section data-testid="price-import-view" className="mx-auto grid max-w-6xl gap-5">
      <ViewHeader title="株価CSVインポート" actions={<Button data-testid="csv-import-back" icon={List} onClick={onBack}>一覧へ</Button>} />
      <Disclaimer />
      <CsvImportSteps currentStep={getCsvCurrentStep(preview, csvText)} />
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.9fr)]">
        <div className="grid content-start gap-4">
          <SectionCard title="銘柄選択" description="取り込み先の銘柄を選びます。">
            <Field label="銘柄"><select className={inputClassName()} value={stockId} onChange={(event) => setStockId(event.target.value)}>{stocks.map((stock) => <option key={stock.id} value={stock.id}>{stock.ticker} {stock.companyName}</option>)}</select></Field>
          </SectionCard>
          <CsvInputMethodPanel
            templateLabel="株価CSVテンプレート"
            fileTestId="price-csv-file"
            textTestId="csv-textarea"
            fileNameTestId="price-csv-file-name"
            fileName={fileName}
            csvText={csvText}
            placeholder={createPriceCsvTemplate()}
            onDownloadTemplate={() => downloadCsvText("stock-price-template.csv", createPriceCsvTemplate())}
            onReadFile={(event) => readCsvFile(event, (text, name) => { setCsvText(text); setFileName(name); setMessage(""); }, setMessage)}
            onFileNameChange={setFileName}
            onCsvTextChange={(value) => { setCsvText(value); setMessage(""); }}
          />
          <InfoAlert tone="info">
            重複方針：同じ日付の株価データは後から読み込んだデータで更新します。プレビュー後、「取り込み実行」を押すまで保存されません。
          </InfoAlert>
          <div className="flex justify-end"><Button data-testid="import-submit" icon={Upload} variant="primary" onClick={handleExecute} disabled={!selectedStock || !preview || !preview.ok}>取り込み実行</Button></div>
        </div>
        <div className="grid content-start gap-3">
          {message ? <p data-testid="price-import-message" className="rounded-lg border border-line bg-white px-4 py-3 text-sm font-bold text-ink shadow-panel">{message}</p> : null}
          {preview ? (
            <CsvImportPreviewPanel preview={preview} duplicatePolicy="同じ日付は後勝ちで更新します。" />
          ) : (
            <div className="rounded-lg border border-dashed border-line bg-white p-5 text-sm font-semibold text-slate-500 shadow-panel">
              CSVを貼り付けるかファイルを選ぶと、保存前プレビューがここに表示されます。
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export function EarningsCsvImportView({ stocks, initialStockId, onBack, onSaved, onImported }: { stocks: StockProfile[]; initialStockId?: string; onBack: () => void; onSaved: (stockId: string, row: EarningsRow) => void; onImported: (stockId: string, rows: EarningsRow[]) => void; }) {
  const [stockId, setStockId] = useState(initialStockId ?? stocks[0]?.id ?? "");
  const [form, setForm] = useState<EarningsFormState>(emptyEarningsForm);
  const [error, setError] = useState("");
  const [csvText, setCsvText] = useState("");
  const [csvFileName, setCsvFileName] = useState("fundamentals.csv");
  const [csvMessage, setCsvMessage] = useState("");
  const selectedStock = stocks.find((stock) => stock.id === stockId);
  const csvPreview = useMemo(() => selectedStock && csvText.trim().length > 0 ? previewEarningsCsv(csvText, selectedStock.earnings) : null, [csvText, selectedStock]);
  const updateField = (field: keyof EarningsFormState, value: string) => setForm((current) => ({ ...current, [field]: value }));
  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedStock) return;
    const fiscalYear = form.fiscalYear.trim();
    const revenue = parseRequiredNumber(form.revenue);
    const operatingIncome = parseRequiredNumber(form.operatingIncome);
    const netIncome = parseRequiredNumber(form.netIncome);
    if (!fiscalYear || revenue === null || operatingIncome === null || netIncome === null || revenue <= 0) {
      setError("会計年度、売上高、営業利益、純利益を確認してください。");
      return;
    }
    const existingRow = selectedStock.earnings.find((row) => row.fiscalYear === fiscalYear);
    onSaved(selectedStock.id, {
      id: existingRow?.id ?? createId("earnings"),
      fiscalYear,
      revenue,
      operatingIncome,
      netIncome,
      eps: parseOptionalNumber(form.eps),
      operatingCashFlow: parseOptionalNumber(form.operatingCashFlow),
      freeCashFlow: parseOptionalNumber(form.freeCashFlow),
      equityRatio: parseOptionalNumber(form.equityRatio),
      roe: parseOptionalNumber(form.roe),
      roic: parseOptionalNumber(form.roic),
      marketCap: parseOptionalNumber(form.marketCap),
      per: parseOptionalNumber(form.per),
      pbr: parseOptionalNumber(form.pbr),
      psr: parseOptionalNumber(form.psr),
      memo: form.memo.trim(),
    });
    setError("");
    setForm(emptyEarningsForm);
  };
  const handleCsvImport = () => {
    if (!selectedStock || !csvPreview) return;
    const errorMessage = csvPreview.result.errors.join(" / ");
    const success = csvPreview.ok;
    try {
      if (success) {
        onImported(selectedStock.id, csvPreview.result.rows);
      }
      appendCsvImportHistory(createCsvHistoryFromPreview({
        stock: selectedStock,
        dataType: "業績",
        fileName: csvFileName,
        preview: csvPreview,
        success,
        errorMessage: success ? "" : errorMessage,
      }));
      setCsvMessage(success ? `取り込み成功：追加 ${csvPreview.addedRows} 件 / 更新 ${csvPreview.updatedRows} 件` : "取り込み失敗：エラー行を修正してから再実行してください。");
    } catch {
      setCsvMessage("localStorageへの保存に失敗しました。ブラウザの保存容量や設定を確認してください。");
    }
  };

  return (
    <section data-testid="earnings-view" className="mx-auto grid max-w-6xl gap-5">
      <ViewHeader title="業績データ登録" actions={<Button data-testid="csv-import-back" icon={List} onClick={onBack}>一覧へ</Button>} />
      <Disclaimer />
      <div className="rounded-lg border border-line bg-white p-5 shadow-panel">
        <form onSubmit={handleSubmit} className="grid gap-4">
          <Field label="銘柄"><select className={inputClassName()} value={stockId} onChange={(event) => setStockId(event.target.value)}>{stocks.map((stock) => <option key={stock.id} value={stock.id}>{stock.ticker} {stock.companyName}</option>)}</select></Field>
          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {[
              ["fiscalYear", "会計年度"],
              ["revenue", "売上高"],
              ["operatingIncome", "営業利益"],
              ["netIncome", "純利益"],
              ["eps", "EPS"],
              ["operatingCashFlow", "営業キャッシュフロー"],
              ["freeCashFlow", "フリーキャッシュフロー"],
              ["equityRatio", "自己資本比率 (%)"],
              ["roe", "ROE (%)"],
              ["roic", "ROIC (%)"],
              ["marketCap", "時価総額"],
              ["per", "PER"],
              ["pbr", "PBR"],
              ["psr", "PSR"],
            ].map(([field, label]) => (
              <Field key={field} label={label}><input data-testid={`earnings-${field}`} className={inputClassName()} inputMode="decimal" value={form[field as keyof EarningsFormState]} onChange={(event) => updateField(field as keyof EarningsFormState, event.target.value)} /></Field>
            ))}
          </div>
          <Field label="メモ"><textarea data-testid="earnings-memo" className={inputClassName("min-h-24")} value={form.memo} onChange={(event) => updateField("memo", event.target.value)} /></Field>
          {error ? <p className="text-sm font-semibold text-decline">{error}</p> : null}
          <div className="flex justify-end"><Button data-testid="save-earnings" type="submit" icon={Save} variant="primary" disabled={!selectedStock}>保存</Button></div>
        </form>
      </div>
      <CsvImportSteps currentStep={getCsvCurrentStep(csvPreview, csvText)} />
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.9fr)]">
        <div className="grid content-start gap-4">
          <CsvInputMethodPanel
            templateLabel="業績CSVテンプレート"
            fileTestId="earnings-csv-file"
            textTestId="earnings-csv-textarea"
            fileNameTestId="earnings-csv-file-name"
            fileName={csvFileName}
            csvText={csvText}
            placeholder={createEarningsCsvTemplate()}
            onDownloadTemplate={() => downloadCsvText("fundamentals-template.csv", createEarningsCsvTemplate())}
            onReadFile={(event) => readCsvFile(event, (text, name) => { setCsvText(text); setCsvFileName(name); setCsvMessage(""); }, setCsvMessage)}
            onFileNameChange={setCsvFileName}
            onCsvTextChange={(value) => { setCsvText(value); setCsvMessage(""); }}
          />
          <InfoAlert tone="info">
            重複方針：同じ会計年度の業績データは後から読み込んだデータで更新します。プレビュー後、「取り込み実行」を押すまで保存されません。
          </InfoAlert>
          <div className="flex justify-end"><Button data-testid="import-earnings-submit" icon={Upload} variant="primary" onClick={handleCsvImport} disabled={!selectedStock || !csvPreview || !csvPreview.ok}>取り込み実行</Button></div>
        </div>
        <div className="grid content-start gap-3">
          {csvMessage ? <p data-testid="earnings-import-message" className="rounded-lg border border-line bg-white px-4 py-3 text-sm font-bold text-ink shadow-panel">{csvMessage}</p> : null}
          {csvPreview ? (
            <CsvImportPreviewPanel preview={csvPreview} duplicatePolicy="同じ会計年度は後勝ちで更新します。" />
          ) : (
            <div className="rounded-lg border border-dashed border-line bg-white p-5 text-sm font-semibold text-slate-500 shadow-panel">
              CSVを貼り付けるかファイルを選ぶと、保存前プレビューがここに表示されます。
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
