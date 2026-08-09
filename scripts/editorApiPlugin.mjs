import { execFileSync, spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { cpSync, existsSync, mkdtempSync, rmSync } from "node:fs";
import { isIP } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { renderArticleHtml } from "./articleHtml.mjs";
import {
  contentDirectory,
  createEditorContent,
  discardEditorDraft,
  EditorContentError,
  editorRootDir,
  listEditorHistory,
  listEditorContent,
  promoteEditorDraft,
  readEditorContent,
  removeEditorDraft,
  restoreEditorHistory,
  saveContentAsset,
  saveEditorContent,
  validateEditorDraft,
} from "./contentEditorModel.mjs";

const MAX_JSON_BYTES = 15 * 1024 * 1024;
const jobs = new Map();
let activePublishJob = "";
const DEPLOY_BRANCH = process.env.CONTENT_EDITOR_DEPLOY_BRANCH || "main";
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export function isLoopbackAddress(address) {
  const value = String(address || "")
    .split("%")[0]
    .toLowerCase();
  if (value === "::1") return true;
  if (value.startsWith("::ffff:")) return isLoopbackAddress(value.slice(7));
  return isIP(value) === 4 && value.split(".")[0] === "127";
}

export function isLoopbackHost(hostHeader) {
  try {
    const hostname = new URL(`http://${String(hostHeader || "").trim()}`).hostname
      .toLowerCase()
      .replace(/^\[|\]$/g, "");
    return hostname === "localhost" || isLoopbackAddress(hostname);
  } catch {
    return false;
  }
}

function requestHostname(hostHeader) {
  try {
    return new URL(`http://${String(hostHeader || "").trim()}`).hostname
      .toLowerCase()
      .replace(/^\[|\]$/g, "");
  } catch {
    return "";
  }
}

export function isTrustedTailscaleHost(hostHeader, trustedHost) {
  return Boolean(trustedHost) && requestHostname(hostHeader) === String(trustedHost).toLowerCase();
}

function isSameOriginRequest(request) {
  if (SAFE_METHODS.has(String(request.method || "GET").toUpperCase())) return true;
  const host = String(request.headers.host || "").toLowerCase();
  const fetchSite = String(request.headers["sec-fetch-site"] || "").toLowerCase();
  if (fetchSite && fetchSite !== "same-origin") return false;
  try {
    const origin = new URL(String(request.headers.origin || ""));
    return ["http:", "https:"].includes(origin.protocol) && origin.host.toLowerCase() === host;
  } catch {
    return false;
  }
}

export function editorRequestAccess(request, { trustedHost = "", tailscaleLogin = "" } = {}) {
  if (!isLoopbackAddress(request.socket?.remoteAddress) || !isSameOriginRequest(request)) {
    return { authorized: false, mode: "denied" };
  }
  if (isLoopbackHost(request.headers.host)) return { authorized: true, mode: "loopback" };

  const loginHeader = request.headers["tailscale-user-login"];
  const login = Array.isArray(loginHeader) ? loginHeader[0] : loginHeader;
  if (
    isTrustedTailscaleHost(request.headers.host, trustedHost) &&
    tailscaleLogin &&
    login === tailscaleLogin
  ) {
    return { authorized: true, mode: "tailscale" };
  }
  return { authorized: false, mode: "denied" };
}

function sendJson(response, status, value) {
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "no-store");
  response.end(JSON.stringify(value));
}

function readJson(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    request.on("data", (chunk) => {
      size += chunk.length;
      if (size > MAX_JSON_BYTES) {
        reject(new EditorContentError("Request body is too large", 413, "body_too_large"));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.on("end", () => {
      try {
        resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString("utf8")) : {});
      } catch {
        reject(new EditorContentError("Request body must be valid JSON", 400, "invalid_json"));
      }
    });
    request.on("error", reject);
  });
}

function apiError(response, error) {
  const status = error instanceof EditorContentError ? error.status : 500;
  sendJson(response, status, {
    error: {
      code: error.code || "internal_error",
      message: error.message || "Unexpected editor server error",
    },
  });
}

function appendJobLog(job, chunk) {
  const text = String(chunk || "");
  const phase = /::editor-publish-phase::([a-z_]+)/.exec(text)?.[1];
  if (phase) job.phase = phase;
  job.log = `${job.log}${text}`.slice(-80_000);
  job.updatedAt = new Date().toISOString();
}

function git(args) {
  return execFileSync("git", args, { cwd: editorRootDir(), encoding: "utf8" }).trim();
}

function currentBranch() {
  try {
    return git(["branch", "--show-current"]);
  } catch {
    return "";
  }
}

function publishPreflight(kind, id) {
  const validation = validateEditorDraft(kind, id);
  const branch = currentBranch();
  return {
    ...validation,
    branch,
    deployBranch: DEPLOY_BRANCH,
    productionEligible: branch === DEPLOY_BRANCH,
  };
}

function createPublishRollback(kind, id) {
  const published = contentDirectory(kind, id);
  const directory = mkdtempSync(join(tmpdir(), "popyson-editor-publish-"));
  const backup = join(directory, "content");
  const existed = existsSync(published);
  if (existed) cpSync(published, backup, { recursive: true });
  return {
    head: git(["rev-parse", "HEAD"]),
    cleanup: () => rmSync(directory, { recursive: true, force: true }),
    restore: () => {
      rmSync(published, { recursive: true, force: true });
      if (existed) cpSync(backup, published, { recursive: true });
    },
  };
}

function startPublish(kind, id) {
  if (activePublishJob && jobs.get(activePublishJob)?.status === "running") {
    throw new EditorContentError("Another publish is already running", 409, "publish_running");
  }
  const preflight = publishPreflight(kind, id);
  if (!preflight.valid) {
    throw new EditorContentError("公開前に入力内容を確認してください", 422, "invalid_draft");
  }
  if (!preflight.productionEligible) {
    throw new EditorContentError(
      `現在のブランチは ${preflight.branch || "detached HEAD"} です。サイトを公開できる ${DEPLOY_BRANCH} ブランチでエディターを起動してください。`,
      409,
      "wrong_publish_branch",
    );
  }
  const rollback = createPublishRollback(kind, id);
  try {
    promoteEditorDraft(kind, id);
  } catch (error) {
    rollback.cleanup();
    throw error;
  }
  const job = {
    id: randomUUID(),
    kind,
    contentId: id,
    status: "running",
    phase: "preparing",
    branch: preflight.branch,
    deployBranch: DEPLOY_BRANCH,
    deploymentStatus: "not_started",
    log: "Starting verification and publish…\n",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  jobs.set(job.id, job);
  activePublishJob = job.id;

  const child = spawn(
    process.execPath,
    [join(editorRootDir(), "scripts/publish_content.mjs"), kind, "--id", id],
    {
      cwd: editorRootDir(),
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  child.stdout.on("data", (chunk) => appendJobLog(job, chunk));
  child.stderr.on("data", (chunk) => appendJobLog(job, chunk));
  child.on("error", (error) => {
    appendJobLog(job, `${error.message}\n`);
  });
  child.on("close", (code) => {
    job.exitCode = code;
    job.status = code === 0 ? "succeeded" : "failed";
    job.phase = code === 0 ? "deployment_pending" : job.phase;
    job.deploymentStatus = code === 0 ? "pending" : "not_started";
    if (code === 0) {
      try {
        removeEditorDraft(kind, id);
        appendJobLog(job, "\nLocal draft removed after successful push.\n");
      } catch (error) {
        appendJobLog(
          job,
          `\nPush succeeded, but the local draft could not be removed: ${error.message}\n`,
        );
      }
    } else if (git(["rev-parse", "HEAD"]) === rollback.head) {
      try {
        rollback.restore();
        appendJobLog(job, "\nPublish failed before commit; public content was restored.\n");
      } catch (error) {
        appendJobLog(job, `\nPublic content restoration failed: ${error.message}\n`);
      }
    }
    rollback.cleanup();
    job.updatedAt = new Date().toISOString();
    activePublishJob = "";
  });
  return job;
}

function publicJob(job) {
  if (!job) throw new EditorContentError("Publish job not found", 404, "not_found");
  return { ...job };
}

async function handleApi(request, response, pathname) {
  if (request.method === "GET" && pathname === "/api/editor/content") {
    sendJson(response, 200, { items: listEditorContent() });
    return;
  }

  if (request.method === "POST" && pathname === "/api/editor/preview") {
    const body = await readJson(request);
    const copyLabel = body.locale === "ja" ? "コードをコピー" : "Copy code";
    sendJson(response, 200, { html: await renderArticleHtml(body.markdown, { copyLabel }) });
    return;
  }

  const contentMatch = /^\/api\/editor\/content\/(post|work)(?:\/([^/]+))?$/.exec(pathname);
  if (contentMatch) {
    const kind = /** @type {"post" | "work"} */ (contentMatch[1]);
    const id = contentMatch[2] ? decodeURIComponent(contentMatch[2]) : "";
    if (request.method === "POST" && !id) {
      const body = await readJson(request);
      sendJson(response, 201, createEditorContent(kind, body));
      return;
    }
    if (request.method === "GET" && id) {
      sendJson(response, 200, readEditorContent(kind, id));
      return;
    }
    if (request.method === "PUT" && id) {
      const body = await readJson(request);
      sendJson(
        response,
        200,
        saveEditorContent(kind, id, body.files, { checkpoint: Boolean(body.checkpoint) }),
      );
      return;
    }
    if (request.method === "DELETE" && id) {
      sendJson(response, 200, discardEditorDraft(kind, id));
      return;
    }
  }

  const historyMatch = /^\/api\/editor\/content\/(post|work)\/([^/]+)\/history(?:\/([^/]+))?$/.exec(
    pathname,
  );
  if (historyMatch) {
    const kind = historyMatch[1];
    const id = decodeURIComponent(historyMatch[2]);
    const historyId = historyMatch[3] ? decodeURIComponent(historyMatch[3]) : "";
    if (request.method === "GET" && !historyId) {
      sendJson(response, 200, { entries: listEditorHistory(kind, id) });
      return;
    }
    if (request.method === "POST" && historyId) {
      const body = await readJson(request);
      sendJson(response, 200, restoreEditorHistory(kind, id, historyId, body.revisions));
      return;
    }
  }

  const assetMatch = /^\/api\/editor\/content\/(post|work)\/([^/]+)\/assets$/.exec(pathname);
  if (request.method === "POST" && assetMatch) {
    const body = await readJson(request);
    const bytes = Buffer.from(String(body.data || ""), "base64");
    sendJson(
      response,
      201,
      await saveContentAsset(assetMatch[1], decodeURIComponent(assetMatch[2]), {
        name: body.name,
        type: body.type,
        bytes,
      }),
    );
    return;
  }

  const publishMatch = /^\/api\/editor\/content\/(post|work)\/([^/]+)\/publish$/.exec(pathname);
  if (request.method === "POST" && publishMatch) {
    const kind = publishMatch[1];
    const id = decodeURIComponent(publishMatch[2]);
    readEditorContent(kind, id);
    sendJson(response, 202, publicJob(startPublish(kind, id)));
    return;
  }
  if (request.method === "GET" && publishMatch) {
    const kind = publishMatch[1];
    const id = decodeURIComponent(publishMatch[2]);
    sendJson(response, 200, publishPreflight(kind, id));
    return;
  }

  const jobMatch = /^\/api\/editor\/publish\/([a-f0-9-]+)$/.exec(pathname);
  if (request.method === "GET" && jobMatch) {
    sendJson(response, 200, publicJob(jobs.get(jobMatch[1])));
    return;
  }

  throw new EditorContentError("Editor API route not found", 404, "not_found");
}

export function editorApiPlugin({ enabled = false, trustedHost = "", tailscaleLogin = "" } = {}) {
  const configureMiddleware = (server) => {
    if (!enabled) return;
    server.middlewares.use(async (request, response, next) => {
      const url = new URL(request.url || "/", "http://editor.local");
      if (request.method === "GET" && ["/editor", "/editor/"].includes(url.pathname)) {
        request.url = `/editor.html${url.search}`;
        next();
        return;
      }
      if (
        request.method === "GET" &&
        ["/editor-preview", "/editor-preview/"].includes(url.pathname)
      ) {
        request.url = `/editor-preview.html${url.search}`;
        next();
        return;
      }
      if (!url.pathname.startsWith("/api/editor/")) return next();
      if (!editorRequestAccess(request, { trustedHost, tailscaleLogin }).authorized) {
        sendJson(response, 401, {
          error: {
            code: "unauthorized",
            message:
              "この接続は許可されていません。npm run editor が表示したTailscale Serve URLを、許可されたTailscaleアカウントで開いてください。",
          },
        });
        return;
      }
      try {
        await handleApi(request, response, url.pathname);
      } catch (error) {
        apiError(response, error);
      }
    });
  };

  return {
    name: "content-editor-api",
    configureServer: configureMiddleware,
    configurePreviewServer: configureMiddleware,
  };
}
