import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { contentCloudConfig } from "./contentCloudClient.mjs";
import { githubWorkflowConfig } from "./githubWorkflowClient.mjs";
import { pullContentSnapshot } from "./pull_content_snapshot.mjs";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const EDITOR_VITE_CONFIG = join(ROOT, "editor/vite.config.js");
export const EDITOR_PID_FILE = join(ROOT, ".tmp/editor-server.pid");
export const EDITOR_SNAPSHOT_ROOT = join(ROOT, ".tmp/editor-content-snapshot");

function argumentValue(args, name, fallback) {
  const index = args.indexOf(name);
  return index === -1 ? fallback : args[index + 1] || fallback;
}

export function editorServerOptions(args = [], env = process.env) {
  return {
    host: "127.0.0.1",
    port: Number(argumentValue(args, "--port", "4173")),
    tailscaleHttpsPort: Number(argumentValue(args, "--tailscale-port", "4173")),
    useTailscale: !args.includes("--no-tailscale") && env.CONTENT_EDITOR_NO_TAILSCALE !== "1",
    development: args.includes("--dev"),
  };
}

export function validateEditorEnvironment(env = process.env) {
  contentCloudConfig(env);
  githubWorkflowConfig(env);
  return true;
}

export function viteEditorServerOptions({ host, port, trustedHost = "" }) {
  return {
    host,
    port,
    strictPort: true,
    allowedHosts: trustedHost ? [trustedHost] : [],
  };
}

export function viteEditorPreviewOptions({ host, port, trustedHost = "" }) {
  return {
    host,
    port,
    strictPort: true,
    allowedHosts: trustedHost ? [trustedHost] : [],
  };
}

export function parseTailscaleIdentity(status) {
  const dnsName = String(status?.Self?.DNSName || "").replace(/\.$/, "");
  const user = status?.User?.[String(status?.Self?.UserID)];
  const login = String(user?.LoginName || "");
  if (!dnsName || !login || status?.BackendState !== "Running") {
    throw new Error("Tailscale is not connected or its node identity is unavailable.");
  }
  return { dnsName, login };
}

export function readTailscaleIdentity(run = execFileSync) {
  try {
    return parseTailscaleIdentity(
      JSON.parse(
        run("tailscale", ["status", "--json"], {
          encoding: "utf8",
        }),
      ),
    );
  } catch (error) {
    throw new Error(`Unable to read Tailscale identity: ${error.message}`, {
      cause: error,
    });
  }
}

export function tailscaleServeArguments({ httpsPort, upstreamPort }) {
  return ["serve", "--bg", "--yes", `--https=${httpsPort}`, `http://127.0.0.1:${upstreamPort}`];
}

export function tailscaleServeOffArguments({ httpsPort }) {
  return ["serve", "--bg", "--yes", `--https=${httpsPort}`, "off"];
}

export function configureTailscaleServe(options, run = execFileSync) {
  try {
    run("tailscale", tailscaleServeArguments(options), {
      encoding: "utf8",
      stdio: "pipe",
    });
  } catch (error) {
    const detail = String(error.stderr || error.message || "unknown error").trim();
    throw new Error(`Unable to configure Tailscale Serve: ${detail}`, {
      cause: error,
    });
  }
}

export function removeTailscaleServe(options, run = execFileSync) {
  try {
    run("tailscale", tailscaleServeOffArguments(options), {
      encoding: "utf8",
      stdio: "pipe",
    });
  } catch (error) {
    const detail = String(error.stderr || error.message || "unknown error").trim();
    throw new Error(`Unable to remove Tailscale Serve listener: ${detail}`, {
      cause: error,
    });
  }
}

export function editorStartupMessages({ resolvedUrls, publicUrl, tailscaleLogin, development }) {
  const local = resolvedUrls?.local || [];
  const network = resolvedUrls?.network || [];
  const localBase = local[0] || `http://localhost:4173/`;
  const lines = [
    "",
    "Content editor is ready:",
    publicUrl || String(new URL("/editor", localBase)),
    `Mode: ${development ? "Vite development server" : "optimized local bundle"}`,
  ];
  if (publicUrl) {
    lines.push(
      "",
      `Tailscale identity: ${tailscaleLogin}`,
      `Local recovery URL: ${new URL("/editor", localBase)}`,
    );
  }
  if (network.length) lines.push("Unexpected network listener detected; stop the server.");
  return lines;
}

/**
 * Point CONTENT_SNAPSHOT_ROOT at a freshly pulled snapshot unless the caller
 * already chose one.
 *
 * @param {{ env?: NodeJS.ProcessEnv, pull?: typeof pullContentSnapshot }} [options]
 */
export async function ensureEditorSnapshot({ env = process.env, pull = pullContentSnapshot } = {}) {
  if (String(env.CONTENT_SNAPSHOT_ROOT || "").trim()) return env.CONTENT_SNAPSHOT_ROOT;
  console.log("Pulling content from the database...");
  const { itemCount, assetCount } = await pull({
    root: EDITOR_SNAPSHOT_ROOT,
    includePrivate: true,
  });
  console.log(`Pulled ${itemCount} items and ${assetCount} assets.`);
  env.CONTENT_SNAPSHOT_ROOT = EDITOR_SNAPSHOT_ROOT;
  return EDITOR_SNAPSHOT_ROOT;
}

export async function startEditorServer(args = process.argv.slice(2)) {
  validateEditorEnvironment();
  const options = editorServerOptions(args);
  const identity = options.useTailscale ? readTailscaleIdentity() : null;
  options.trustedHost = identity?.dnsName || "";
  process.env.CONTENT_EDITOR_ENABLED = "1";
  process.env.CONTENT_EDITOR_TRUSTED_HOST = identity?.dnsName || "";
  process.env.CONTENT_EDITOR_TAILSCALE_LOGIN = identity?.login || "";

  // Building the editor loads vite.config.js, which reads site content, and
  // content lives in D1/R2. The editor is the one process that always holds
  // author credentials, so it materializes its own snapshot rather than asking
  // the person to run `npm run content:pull` first. Drafts are included: the
  // preview exists to show work that is not published yet.
  await ensureEditorSnapshot();

  const { build, createServer, preview } = await import("vite");
  let server;
  if (options.development) {
    server = await createServer({
      configFile: join(ROOT, "vite.config.js"),
      logLevel: "error",
      server: viteEditorServerOptions(options),
    });
    await server.listen();
  } else {
    console.log("Building optimized local editor bundle...");
    await build({ configFile: EDITOR_VITE_CONFIG, logLevel: "error" });
    server = await preview({
      configFile: EDITOR_VITE_CONFIG,
      logLevel: "error",
      preview: viteEditorPreviewOptions(options),
    });
  }
  try {
    if (identity) {
      configureTailscaleServe({
        httpsPort: options.tailscaleHttpsPort,
        upstreamPort: options.port,
      });
    }
  } catch (error) {
    let startupError = error;
    if (identity) {
      try {
        removeTailscaleServe({ httpsPort: options.tailscaleHttpsPort });
      } catch (cleanupError) {
        startupError = new AggregateError(
          [error, cleanupError],
          `${error.message} Cleanup also failed: ${cleanupError.message}`,
        );
      }
    }
    await server.close();
    throw startupError;
  }
  mkdirSync(dirname(EDITOR_PID_FILE), { recursive: true });
  writeFileSync(EDITOR_PID_FILE, `${process.pid}\n`, { mode: 0o600 });

  const removeOwnPidFile = () => {
    if (!existsSync(EDITOR_PID_FILE)) return;
    try {
      if (readFileSync(EDITOR_PID_FILE, "utf8").trim() === String(process.pid)) {
        rmSync(EDITOR_PID_FILE, { force: true });
      }
    } catch {
      // A stale or concurrently replaced PID file must not stop shutdown.
    }
  };
  let stopping = false;
  const stop = async () => {
    if (stopping) return;
    stopping = true;
    let exitCode = 0;
    if (identity) {
      try {
        removeTailscaleServe({ httpsPort: options.tailscaleHttpsPort });
      } catch (error) {
        exitCode = 1;
        console.error(error.message);
      }
    }
    try {
      await server.close();
    } catch (error) {
      exitCode = 1;
      console.error(`Unable to close editor server: ${error.message}`);
    }
    removeOwnPidFile();
    process.exit(exitCode);
  };
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);
  process.once("exit", removeOwnPidFile);
  for (const line of editorStartupMessages({
    resolvedUrls: server.resolvedUrls,
    publicUrl: identity ? `https://${identity.dnsName}:${options.tailscaleHttpsPort}/editor` : "",
    tailscaleLogin: identity?.login || "",
    development: options.development,
  })) {
    console.log(line);
  }
  return server;
}

const isMain =
  process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (isMain) {
  try {
    await startEditorServer();
  } catch (error) {
    console.error(error.message);
    if (String(error.message).includes("serve config denied")) {
      console.error("Run `npm run editor:setup` once, then retry `npm run editor`.");
    }
    process.exitCode = 1;
  }
}
