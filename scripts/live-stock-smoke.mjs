const appUrl = process.env.STOCK_TREND_APP_URL || "http://127.0.0.1:3000";

const cases = [
  { ticker: "7203.T", marketRegion: "JP", label: "日本株 7203.T" },
  { ticker: "AAPL", marketRegion: "US", label: "米国株 AAPL" },
];

function latestDateFromRows(rows) {
  return rows
    .map((row) => String(row.date || row.timestamp || row.time || row.day || "").slice(0, 10))
    .filter(Boolean)
    .sort()
    .at(-1) || "-";
}

async function run() {
  console.log(`stock-trend-mvp live stock smoke: ${appUrl}`);
  console.log("このスクリプトは起動中のNext.jsサーバーの /api/stock-prices を呼びます。APIキーは表示しません。");

  for (const item of cases) {
    const response = await fetch(`${appUrl.replace(/\/$/, "")}/api/stock-prices`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ticker: item.ticker,
        marketRegion: item.marketRegion,
        providerName: "Live stock API",
        period: "1m",
      }),
    });
    const payload = await response.json().catch(() => null);
    const rows = Array.isArray(payload?.rawRows) ? payload.rawRows : [];

    console.log([
      item.label,
      `http=${response.status}`,
      `status=${payload?.status || "unknown"}`,
      `count=${rows.length}`,
      `latest=${latestDateFromRows(rows)}`,
      payload?.message ? `message=${payload.message}` : "",
    ].filter(Boolean).join(" / "));

    if (!response.ok || !payload?.ok) {
      process.exitCode = 1;
    }
  }
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
