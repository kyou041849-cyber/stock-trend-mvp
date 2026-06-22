import { spawn } from "node:child_process";
import { createWriteStream } from "node:fs";
import path from "node:path";

const port = process.argv[2] ?? "3001";
const projectRoot = process.cwd();
const nextBin = path.join(projectRoot, "node_modules", "next", "dist", "bin", "next");
const log = createWriteStream(path.join(projectRoot, "dev-server.log"), { flags: "a" });

const child = spawn(process.execPath, [nextBin, "dev", "-p", port], {
  cwd: projectRoot,
  env: {
    ...process.env,
    NEXT_TELEMETRY_DISABLED: "1",
  },
  stdio: ["ignore", "pipe", "pipe"],
  windowsHide: true,
});

child.stdout.pipe(log);
child.stderr.pipe(log);

child.on("exit", (code, signal) => {
  log.end(`\nNext dev server exited with ${signal ?? code ?? 0}\n`);
  process.exit(code ?? 0);
});

process.on("SIGTERM", () => child.kill("SIGTERM"));
process.on("SIGINT", () => child.kill("SIGINT"));
