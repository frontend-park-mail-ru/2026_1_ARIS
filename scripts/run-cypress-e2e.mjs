import http from "node:http";
import net from "node:net";
import { spawn } from "node:child_process";

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const preferredPort = Number(process.env.CYPRESS_DEV_PORT ?? 3010);
const startupTimeoutMs = Number(process.env.CYPRESS_DEV_TIMEOUT_MS ?? 60000);

function isPortFree(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => resolve(false));
    server.once("listening", () => {
      server.close(() => resolve(true));
    });
    server.listen(port, "127.0.0.1");
  });
}

async function findFreePort(startPort) {
  for (let port = startPort; port < startPort + 50; port += 1) {
    if (await isPortFree(port)) {
      return port;
    }
  }

  throw new Error(`No free port found from ${startPort} to ${startPort + 49}`);
}

function waitForHttp(url, timeoutMs) {
  const startedAt = Date.now();

  return new Promise((resolve, reject) => {
    const poll = () => {
      const req = http.get(url, (res) => {
        res.resume();
        resolve();
      });

      req.on("error", () => {
        if (Date.now() - startedAt > timeoutMs) {
          reject(new Error(`Timed out waiting for ${url}`));
          return;
        }

        setTimeout(poll, 500);
      });

      req.setTimeout(1000, () => {
        req.destroy();
      });
    };

    poll();
  });
}

function spawnProcess(command, args, options = {}) {
  return spawn(command, args, {
    shell: false,
    stdio: options.stdio ?? "inherit",
    env: options.env ?? process.env,
  });
}

function runProcess(command, args, options = {}) {
  return new Promise((resolve) => {
    const child = spawnProcess(command, args, options);
    child.on("exit", (code, signal) => {
      resolve({ code: code ?? 1, signal });
    });
  });
}

async function main() {
  const port = await findFreePort(preferredPort);
  const baseUrl = `http://localhost:${port}`;

  console.log(`Starting dev server on ${baseUrl}`);
  const server = spawnProcess(npmCommand, ["run", "dev", "--", "--port", String(port)], {
    stdio: ["ignore", "pipe", "pipe"],
  });

  let serverOutput = "";
  const collectServerOutput = (chunk) => {
    serverOutput = `${serverOutput}${chunk.toString()}`.slice(-8000);
  };
  server.stdout.on("data", collectServerOutput);
  server.stderr.on("data", collectServerOutput);

  try {
    await waitForHttp(baseUrl, startupTimeoutMs);
    console.log(`Running Cypress against ${baseUrl}`);

    const env = { ...process.env, CYPRESS_BASE_URL: baseUrl };
    delete env.ELECTRON_RUN_AS_NODE;

    const result = await runProcess(npmCommand, ["run", "test:e2e"], { env });
    process.exitCode = result.code;
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    if (serverOutput.trim()) {
      console.error("\nLast dev server output:\n");
      console.error(serverOutput.trim());
    }
    process.exitCode = 1;
  } finally {
    if (!server.killed) {
      server.kill("SIGTERM");
    }
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
