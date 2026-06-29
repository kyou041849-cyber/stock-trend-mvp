const appUrl = process.env.STOCK_TREND_APP_URL || "http://127.0.0.1:3000";

function buildMinimalContext() {
  return {
    contextHash: `live-llm-smoke-${Date.now()}`,
    generatedAt: new Date().toISOString(),
    stock: {
      ticker: "SMOKE",
      companyName: "疎通確認用",
      market: "確認用",
      sector: "確認用",
      region: "US",
      currency: "USD",
    },
    priceSummary: {
      latestClose: 100,
      latestDate: "2026-01-01",
      trendScore: 50,
      trendScoreLabel: "中立",
    },
    trendSignals: [
      { label: "疎通確認用の参考シグナル", passed: null, points: 0 },
    ],
  };
}

async function run() {
  const endpoint = `${appUrl.replace(/\/$/, "")}/api/llm/analyze`;
  console.log(`stock-trend-mvp live LLM smoke: ${endpoint}`);
  console.log("起動中のNext.jsサーバーを呼びます。APIキー、送信本文全文、レスポンス全文は表示しません。");

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "銘柄要約",
      context: buildMinimalContext(),
    }),
  });

  const payload = await response.json().catch(() => null);
  const content = typeof payload?.content === "string" ? payload.content : "";
  const preview = content.replace(/\s+/g, " ").slice(0, 120);

  console.log([
    `http=${response.status}`,
    `ok=${payload?.ok === true}`,
    payload?.model ? `model=${payload.model}` : "",
    content ? `contentPreview=${preview}` : "",
    payload?.message ? `message=${payload.message}` : "",
    payload?.status ? `status=${payload.status}` : "",
  ].filter(Boolean).join(" / "));

  if (!response.ok || payload?.ok !== true) {
    process.exitCode = 1;
  }
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
