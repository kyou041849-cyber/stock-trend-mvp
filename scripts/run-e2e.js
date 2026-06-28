const { spawn } = require("node:child_process");
const http = require("node:http");

const port = process.env.E2E_PORT || "3010";
const baseURL = `http://127.0.0.1:${port}`;
const args = process.argv.slice(2).filter((arg) => arg !== "--");

function waitForServer(url, timeoutMs = 120_000) {
  const startedAt = Date.now();
  return new Promise((resolve, reject) => {
    const tick = () => {
      const request = http.get(url, (response) => {
        response.resume();
        resolve();
      });
      request.on("error", () => {
        if (Date.now() - startedAt > timeoutMs) {
          reject(new Error(`Timed out waiting for ${url}`));
          return;
        }
        setTimeout(tick, 1000);
      });
      request.setTimeout(5000, () => {
        request.destroy();
      });
    };
    tick();
  });
}

function stopProcessTree(processId) {
  return new Promise((resolve) => {
    let resolved = false;
    const finish = () => {
      if (resolved) return;
      resolved = true;
      resolve();
    };
    const fallback = setTimeout(finish, 5000);
    fallback.unref?.();

    if (process.platform === "win32") {
      const killer = spawn("taskkill.exe", ["/pid", String(processId), "/T", "/F"], { stdio: "ignore" });
      killer.on("close", finish);
      killer.on("error", finish);
      return;
    }
    try {
      process.kill(-processId, "SIGTERM");
    } catch {
      try {
        process.kill(processId, "SIGTERM");
      } catch {
        // Already stopped.
      }
    }
    finish();
  });
}

async function main() {
  const server = spawn(
    process.execPath,
    ["node_modules/next/dist/bin/next", "dev", "-p", port],
    {
      cwd: process.cwd(),
      env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" },
      stdio: ["ignore", "pipe", "pipe"],
      detached: process.platform !== "win32",
    },
  );

  server.stdout.on("data", (chunk) => process.stdout.write(`[next] ${chunk}`));
  server.stderr.on("data", (chunk) => process.stderr.write(`[next] ${chunk}`));

  let exitCode = 1;
  try {
    await waitForServer(baseURL);
    const playwrightCli = require.resolve("@playwright/test/cli");
    exitCode = await new Promise((resolve) => {
      const testProcess = spawn(
        process.execPath,
        [playwrightCli, "test", ...args],
        {
          cwd: process.cwd(),
          env: { ...process.env, E2E_SKIP_WEB_SERVER: "1", E2E_PORT: port },
          stdio: "inherit",
        },
      );
      testProcess.on("close", (code) => resolve(code ?? 1));
      testProcess.on("error", () => resolve(1));
    });
  } finally {
    await stopProcessTree(server.pid);
    server.stdout.destroy();
    server.stderr.destroy();
    server.unref();
  }

  process.exitCode = exitCode;
}

main().catch(async (error) => {
  console.error(error);
  process.exitCode = 1;
});
