import { spawn } from "node:child_process";
import { once } from "node:events";
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { homedir, tmpdir } from "node:os";
import { extname, join, normalize } from "node:path";

import { expect, test } from "vitest";

const EDITOR_DIST = join(process.cwd(), "editor", "dist");

// A cold CI runner needs far longer than a warm local machine to launch Chrome
// and open its debug port, so budget generously here rather than let the run
// fail on a slow start. A Chrome that dies is still reported immediately, and
// the per-test timeout above this one still catches a genuine hang.
const CHROME_TARGET_TIMEOUT_MS = 45000;
const TEST_TIMEOUT_MS = 90000;

function chromePath() {
  const candidates = [
    process.env.CHROME_PATH,
    join(homedir(), ".cache/ms-playwright/chromium-1223/chrome-linux64/chrome"),
    join(homedir(), ".cache/ms-playwright/chromium-1217/chrome-linux64/chrome"),
    join(homedir(), ".cache/ms-playwright/chromium-1208/chrome-linux64/chrome"),
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
  ].filter(Boolean);
  const resolved = candidates.find((candidate) => existsSync(candidate));
  if (!resolved) throw new Error("Chrome is required for editor responsive integration tests");
  return resolved;
}

function contentType(pathname) {
  return (
    {
      ".css": "text/css; charset=utf-8",
      ".html": "text/html; charset=utf-8",
      ".js": "text/javascript; charset=utf-8",
      ".svg": "image/svg+xml",
    }[extname(pathname)] || "application/octet-stream"
  );
}

async function staticEditorServer() {
  const server = createServer((request, response) => {
    const pathname = new URL(request.url || "/", "http://editor.test").pathname;
    const relative = pathname === "/" || pathname === "/editor" ? "editor.html" : pathname.slice(1);
    const filePath = normalize(join(EDITOR_DIST, relative));
    if (
      !filePath.startsWith(`${EDITOR_DIST}/`) ||
      !existsSync(filePath) ||
      !statSync(filePath).isFile()
    ) {
      response.writeHead(404).end("Not found");
      return;
    }
    response.writeHead(200, { "Content-Type": contentType(filePath) });
    response.end(readFileSync(filePath));
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  return server;
}

async function freePort() {
  const server = createServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const { port } = server.address();
  await new Promise((resolve) => server.close(resolve));
  return port;
}

async function retry(action, attempts = 80) {
  let lastError;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await action();
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }
  throw lastError;
}

async function waitForChromeTarget(debugPort, chrome, stderr) {
  let lastError;
  const deadline = Date.now() + CHROME_TARGET_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (chrome.exitCode !== null) {
      throw new Error(`Chrome exited before its debug target was ready:\n${stderr()}`);
    }
    try {
      const response = await fetch(`http://127.0.0.1:${debugPort}/json`);
      if (!response.ok) throw new Error(`Chrome target list returned ${response.status}`);
      const targets = await response.json();
      const page = targets.find(
        (candidate) => candidate.type === "page" && candidate.url.includes("/editor"),
      );
      if (page) return page;
      lastError = new Error("Editor page target is not ready");
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error(
    `Chrome did not expose its editor target within ${CHROME_TARGET_TIMEOUT_MS / 1000} seconds: ${lastError?.message || "unknown error"}\n${stderr()}`,
  );
}

async function connectToPage(debugPort, chrome, stderr) {
  const target = await waitForChromeTarget(debugPort, chrome, stderr);
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });
  let requestId = 0;
  const pending = new Map();
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(String(event.data));
    if (!message.id || !pending.has(message.id)) return;
    pending.get(message.id)(message);
    pending.delete(message.id);
  });
  const call = (method, params = {}) =>
    new Promise((resolve) => {
      requestId += 1;
      pending.set(requestId, resolve);
      socket.send(JSON.stringify({ id: requestId, method, params }));
    });
  const evaluate = async (expression) => {
    const response = await call("Runtime.evaluate", { expression, returnByValue: true });
    if (response.result.exceptionDetails) throw new Error(response.result.exceptionDetails.text);
    return response.result.result.value;
  };
  await retry(async () => {
    if (!(await evaluate("Boolean(document.querySelector('.editor-shell'))"))) {
      throw new Error("Editor shell is not ready");
    }
  });
  return { socket, call, evaluate };
}

async function setViewport(client, width, height = 768) {
  await client.call("Emulation.setDeviceMetricsOverride", {
    width,
    height,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await new Promise((resolve) => setTimeout(resolve, 150));
}

async function layoutMetrics(client) {
  return client.evaluate(`(() => {
    const root = document.documentElement;
    const sidebar = document.querySelector('.editor-sidebar').getBoundingClientRect();
    const create = document.querySelector('.editor-create-button').getBoundingClientRect();
    return {
      clientWidth: root.clientWidth,
      scrollWidth: root.scrollWidth,
      sidebarRight: sidebar.right,
      createRight: create.right,
      sidebarVisible: document.querySelector('.editor-shell').classList.contains('is-sidebar-open'),
    };
  })()`);
}

test(
  "keeps the rendered editor within iPad and 200% full-page zoom viewports",
  async () => {
    const server = await staticEditorServer();
    const { port } = server.address();
    const debugPort = await freePort();
    const profile = mkdtempSync(join(tmpdir(), "popyson-editor-chrome-"));
    const chrome = spawn(
      chromePath(),
      [
        "--headless=new",
        "--no-sandbox",
        "--disable-gpu",
        "--disable-dev-shm-usage",
        "--disable-extensions",
        "--no-first-run",
        `--remote-debugging-port=${debugPort}`,
        `--user-data-dir=${profile}`,
        `http://127.0.0.1:${port}/editor`,
      ],
      { stdio: ["ignore", "ignore", "pipe"] },
    );
    let chromeStderr = "";
    chrome.stderr.setEncoding("utf8");
    chrome.stderr.on("data", (chunk) => {
      chromeStderr = `${chromeStderr}${chunk}`.slice(-8000);
    });
    let client;
    try {
      client = await connectToPage(debugPort, chrome, () => chromeStderr.trim());

      for (const width of [1024, 1180, 1181, 1194, 1366]) {
        await setViewport(client, width);
        const ipadOpen = await layoutMetrics(client);
        expect(ipadOpen.sidebarVisible).toBe(true);
        expect(ipadOpen.createRight).toBeLessThanOrEqual(ipadOpen.sidebarRight);
        expect(ipadOpen.scrollWidth).toBeLessThanOrEqual(ipadOpen.clientWidth);
      }

      await setViewport(client, 1024);
      await client.evaluate("document.querySelector('.editor-menu-button').click()");
      const ipadCollapsed = await layoutMetrics(client);
      expect(ipadCollapsed.sidebarVisible).toBe(false);
      expect(ipadCollapsed.scrollWidth).toBeLessThanOrEqual(ipadCollapsed.clientWidth);

      await setViewport(client, 512);
      const zoomCollapsed = await layoutMetrics(client);
      expect(zoomCollapsed.sidebarVisible).toBe(false);
      expect(zoomCollapsed.scrollWidth).toBeLessThanOrEqual(zoomCollapsed.clientWidth);

      await client.evaluate("document.querySelector('.editor-menu-button').click()");
      const zoomOpen = await layoutMetrics(client);
      expect(zoomOpen.sidebarVisible).toBe(true);
      expect(zoomOpen.createRight).toBeLessThanOrEqual(zoomOpen.sidebarRight);
      expect(zoomOpen.scrollWidth).toBeLessThanOrEqual(zoomOpen.clientWidth);
    } finally {
      client?.socket.close();
      if (chrome.exitCode === null) {
        chrome.kill("SIGTERM");
        await once(chrome, "exit");
      }
      await new Promise((resolve) => server.close(resolve));
      await retry(() => rmSync(profile, { recursive: true, force: true }));
    }
  },
  TEST_TIMEOUT_MS,
);
