import { expect, type Page, test } from "@playwright/test";

const ticker = "E2EUI";
const companyName = "E2E UI Test Inc";

const priceCsv = `date,open,high,low,close,volume
2026-01-01,100,105,98,102,1000000
2026-01-02,102,108,101,107,1200000
2026-01-03,107,110,105,109,1300000
2026-01-04,109,111,106,108,900000
2026-01-05,108,115,107,114,1600000`;

const earningsCsv = `fiscalYear,revenue,operatingIncome,netIncome,eps,operatingCashFlow,freeCashFlow,equityRatio,roe,roic,marketCap,per,pbr,psr
2022,100000,10000,7000,70,12000,8000,55,12,9,500000,30,3,5
2023,120000,14000,9000,90,15000,10000,58,14,10,650000,35,4,5.4
2024,150000,20000,13000,130,22000,16000,60,16,12,900000,40,5,6`;

async function createStock(page: Page, stockTicker: string, stockName: string) {
  await expect(page.getByTestId("stock-list")).toBeVisible();
  await page.getByTestId("create-stock").click();

  await page.getByTestId("ticker-input").fill(stockTicker);
  await page.getByTestId("company-name-input").fill(stockName);
  await page.getByTestId("market-input").fill("TSE");
  await page.getByTestId("sector-input").fill("Technology");
  await page.getByTestId("save-stock").click();

  await expect(page.getByTestId("stock-detail")).toBeVisible();
  await expect(page.getByRole("heading", { name: `${stockTicker} ${stockName}` })).toBeVisible();
}

async function saveMockAiAnalysis(page: Page, analysisTypeIndex?: number) {
  if (analysisTypeIndex !== undefined) {
    await page.getByTestId("llm-analysis-type").selectOption({ index: analysisTypeIndex });
  }

  await page.getByTestId("llm-generation-mode").selectOption("mock");
  await page.getByTestId("generate-ai-analysis").click();
  await expect(page.getByTestId("ai-analysis-draft")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId("save-ai-analysis")).toBeEnabled();
  await page.getByTestId("save-ai-analysis").click();
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => window.localStorage.clear());
});

test("main research flow stays usable without real LLM", async ({ page }) => {
  await page.goto("/");

  await createStock(page, ticker, companyName);
  await expect(page.getByTestId("ai-analysis-section")).toBeVisible();
  await expect(page.getByTestId("detail-news-summary")).toBeVisible();
  await expect(page.getByTestId("detail-task-summary")).toBeVisible();
  await expect(page.getByTestId("detail-risk-summary")).toBeVisible();

  await page.getByTestId("toggle-news-add-form").click();
  await page.getByTestId("news-date-input").fill("2026-01-10");
  await page.getByTestId("news-title-input").fill("E2E news memo");
  await page.getByTestId("news-summary-input").fill("E2E smoke test news summary");
  await page.getByTestId("news-importance-input").selectOption("高");
  await page.getByTestId("news-sentiment-input").selectOption("ネガティブ");
  await page.getByTestId("add-news-submit").click();

  await page.getByTestId("detail-risk").click();
  await page.getByTestId("risk-impact").selectOption("大");
  await page.getByTestId("risk-probability").selectOption("高");
  await page.getByTestId("risk-content").fill("E2E risk content");
  await page.getByTestId("risk-confirmation").fill("E2E risk confirmation");
  await page.getByTestId("save-risk").click();
  await page.getByRole("button", { name: "一覧へ" }).click();

  await page.locator("tr", { hasText: ticker }).getByTestId("detail-stock").click();
  await page.getByTestId("detail-tasks").click();
  await page.getByTestId("task-title-input").fill("E2E confirmation task");
  await page.getByTestId("task-due-input").fill("2026-01-20");
  await page.getByTestId("task-priority-input").selectOption("高");
  await page.getByTestId("save-task").click();
  await page.getByRole("button", { name: "一覧へ" }).click();

  await page.locator("tr", { hasText: ticker }).getByTestId("detail-stock").click();
  await page.getByTestId("news-detail-list").locator("summary").click();
  await expect(page.getByTestId("news-item")).toBeVisible();
  await page.getByTestId("news-detail-toggle").first().click();
  await expect(page.getByTestId("news-detail-panel")).toBeVisible();
  await page.getByTestId("news-detail-toggle").first().click();
  await expect(page.getByTestId("news-detail-panel")).toHaveCount(0);

  await page.getByTestId("risk-detail-list").locator("summary").click();
  await expect(page.getByTestId("risk-item")).toBeVisible();
  await page.getByTestId("risk-detail-toggle").first().click();
  await expect(page.getByTestId("risk-detail-panel")).toBeVisible();
  await page.getByTestId("risk-detail-toggle").first().click();
  await expect(page.getByTestId("risk-detail-panel")).toHaveCount(0);

  await page.getByTestId("task-detail-list").locator("summary").click();
  await expect(page.getByTestId("detail-task-item")).toBeVisible();
  await page.getByTestId("task-detail-toggle").first().click();
  await expect(page.getByTestId("detail-task-memo-edit")).toBeVisible();
  await page.getByTestId("task-detail-toggle").first().click();
  await expect(page.getByTestId("detail-task-memo-edit")).toHaveCount(0);
  await expect(page.getByTestId("detail-danger-zone")).toBeVisible();

  await page.getByTestId("detail-price-import").click();
  await expect(page.getByTestId("price-import-view")).toBeVisible();
  await page.getByTestId("csv-textarea").fill(priceCsv);
  await expect(page.getByTestId("csv-import-preview")).toBeVisible();
  await expect(page.getByTestId("import-submit")).toBeEnabled();
  await page.getByTestId("import-submit").click();
  await expect(page.getByTestId("price-import-message")).toBeVisible();
  await page.getByTestId("csv-import-back").click();

  await page.locator("tr", { hasText: ticker }).getByTestId("detail-stock").click();
  await expect(page.getByTestId("stock-detail")).toBeVisible();
  await page.getByText("CSVインポート履歴").click();
  await expect(page.getByTestId("csv-import-history-row")).toBeVisible();

  await page.getByTestId("detail-earnings").click();
  await expect(page.getByTestId("earnings-view")).toBeVisible();
  await page.getByTestId("earnings-csv-textarea").fill(earningsCsv);
  await expect(page.getByTestId("csv-import-preview")).toBeVisible();
  await expect(page.getByTestId("import-earnings-submit")).toBeEnabled();
  await page.getByTestId("import-earnings-submit").click();
  await expect(page.getByTestId("earnings-import-message")).toBeVisible();
  await page.getByTestId("csv-import-back").click();

  await page.locator("tr", { hasText: ticker }).getByTestId("detail-stock").click();
  await saveMockAiAnalysis(page);
  await saveMockAiAnalysis(page);

  await page.locator('[data-testid="ai-analysis-history"] > summary').click();
  await expect(page.getByTestId("ai-history-list")).toBeVisible();
  await expect(page.getByTestId("ai-analysis-history-item")).toHaveCount(2);

  await page.getByTestId("detail-back").click();
  await page.getByTestId("list-ai-history").click();
  await expect(page.getByTestId("ai-history-view")).toBeVisible();
  await page.getByTestId("ai-history-stock-query").fill(ticker);

  const compareBoxes = page.locator('[data-testid^="ai-history-compare-"]');
  await expect(compareBoxes).toHaveCount(2);
  await compareBoxes.nth(0).check();
  await compareBoxes.nth(1).check();
  await expect(page.getByTestId("ai-comparison-view")).toBeVisible();
  await expect(page.getByTestId("ai-comparison-summary")).toBeVisible();
  await expect(page.getByTestId("ai-diff-unchanged-items")).toHaveCount(0);
  await page.getByTestId("toggle-unchanged-diff").click();
  await expect(page.getByTestId("ai-diff-unchanged-section").first()).toBeVisible();
  await expect.poll(async () => page.getByTestId("ai-diff-unchanged-items").count()).toBeGreaterThan(0);
  await page.getByTestId("ai-history-back").click();

  await page.getByTestId("list-settings").click();
  await expect(page.getByTestId("settings-view")).toBeVisible();
  await expect(page.getByTestId("api-key-safety-note")).toBeVisible();
  await expect(page.getByTestId("api-key-safety-note")).toContainText("localStorage");
});

test("mobile width smoke flow does not crash", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  await createStock(page, "E2EMOB", "E2E Mobile Test Inc");
  await expect(page.getByTestId("ai-analysis-section")).toBeVisible();
  await expect(page.getByTestId("detail-news-summary")).toBeVisible();
  await expect(page.getByTestId("detail-task-summary")).toBeVisible();
  await expect(page.getByTestId("detail-risk-summary")).toBeVisible();
  await expect(page.getByTestId("detail-danger-zone")).toBeVisible();

  await page.getByTestId("detail-price-import").click();
  await expect(page.getByTestId("price-import-view")).toBeVisible();
  await expect(page.getByTestId("csv-textarea")).toBeVisible();
});

test("mobile width AI comparison smoke flow does not crash", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  await createStock(page, "E2EDIFF", "E2E Diff Mobile Inc");
  await saveMockAiAnalysis(page);
  await saveMockAiAnalysis(page);

  await page.getByTestId("detail-back").click();
  await page.getByTestId("list-ai-history").click();
  await expect(page.getByTestId("ai-history-view")).toBeVisible();
  await page.getByTestId("ai-history-stock-query").fill("E2EDIFF");

  const compareBoxes = page.locator('[data-testid^="ai-history-compare-"]');
  await expect(compareBoxes).toHaveCount(2);
  await compareBoxes.nth(0).check();
  await compareBoxes.nth(1).check();

  await expect(page.getByTestId("ai-comparison-view")).toBeVisible();
  await expect(page.getByTestId("ai-comparison-summary")).toBeVisible();
  await expect(page.getByTestId("toggle-unchanged-diff")).toBeVisible();
});
