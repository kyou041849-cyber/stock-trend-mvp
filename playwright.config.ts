import { defineConfig, devices } from "@playwright/test";

const port = process.env.E2E_PORT ?? "3010";
const baseURL = `http://127.0.0.1:${port}`;
const devCommand = `node node_modules/next/dist/bin/next dev -p ${port}`;
const isCi = Boolean(process.env.CI);

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  use: {
    baseURL,
    trace: "retain-on-failure",
  },
  webServer: process.env.E2E_SKIP_WEB_SERVER ? undefined : {
    command: devCommand,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: isCi
    ? [
        {
          name: "chromium",
          use: {
            ...devices["Desktop Chrome"],
          },
        },
      ]
    : [
        {
          name: "edge",
          use: {
            ...devices["Desktop Edge"],
            channel: "msedge",
          },
        },
      ],
});
