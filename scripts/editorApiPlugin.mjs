import { createHash } from "node:crypto";
import { isIP } from "node:net";

import { renderArticleHtml } from "./articleHtml.mjs";
import {
  cloudAssetLogicalPath,
  cloudAssetUrl,
  cloudListItem,
  fromCloudContent,
  newCloudContent,
  nextCloudPostId,
  safeCloudAssetName,
  toCloudRevision,
  validateCloudContent,
} from "./contentCloudEditorModel.mjs";
import { ContentCloudClient } from "./contentCloudClient.mjs";
import { EditorContentError } from "./contentEditorModel.mjs";
import { GitHubWorkflowClient } from "./githubWorkflowClient.mjs";
import { publishProgress } from "./publishProgress.mjs";

const MAX_JSON_BYTES = 15 * 1024 * 1024;
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
  const status = Number(error?.status) || 500;
  sendJson(response, status, {
    error: {
      code: error.code || "internal_error",
      message: error.message || "Unexpected editor server error",
    },
  });
}

const TERMINAL_JOB_STATES = new Set(["succeeded", "failed", "cancelled"]);

function publicJob(job, run = null) {
  return {
    ...job,
    contentId: job.contentId || job.slug,
    status: TERMINAL_JOB_STATES.has(job.state) ? job.state : "running",
    phase: job.state,
    log: job.sanitizedError || "",
    progress: publishProgress({ job, run }),
  };
}

async function readCloudEditorContent(cloud, kind, id) {
  return fromCloudContent(await cloud.read(kind, id));
}

async function listCloudEditorContent(cloud) {
  const listed = await cloud.list();
  const detailed = await Promise.all(listed.items.map((item) => cloud.read(item.kind, item.id)));
  return detailed.map(cloudListItem);
}

function revisionHistoryEntry(value) {
  return {
    id: value.id,
    createdAt: value.createdAt,
    createdBy: value.createdBy,
    checksumSha256: value.checksumSha256,
  };
}

function publicationIdempotencyKey(content) {
  return createHash("sha256")
    .update(
      [
        content.itemId,
        content.currentRevisionId,
        content.visibility,
        content.translationEnabled === false ? "translation-off" : "translation-on",
        content.deletedAt || "active",
      ].join("\0"),
    )
    .digest("hex");
}

export function batchPublicationIdempotencyKey(intentChecksum) {
  return createHash("sha256")
    .update(`batch\0${String(intentChecksum || "")}`)
    .digest("hex");
}

async function handleApi(request, response, pathname, { cloud, workflows }) {
  if (request.method === "GET" && pathname === "/api/editor/content") {
    sendJson(response, 200, { items: await listCloudEditorContent(cloud) });
    return;
  }

  if (request.method === "POST" && pathname === "/api/editor/preview") {
    const body = await readJson(request);
    const copyLabel = body.locale === "ja" ? "コードをコピー" : "Copy code";
    const detailsLabel = body.locale === "ja" ? "詳細" : "Details";
    sendJson(response, 200, {
      html: await renderArticleHtml(body.markdown, { copyLabel, detailsLabel }),
    });
    return;
  }

  if (pathname === "/api/editor/publication" && request.method === "GET") {
    const preflight = await cloud.publicationPreflight();
    const items = await Promise.all(
      preflight.items.map(async (pending) => {
        const content = await readCloudEditorContent(cloud, pending.kind, pending.id);
        const validation =
          pending.visibility === "public" && !pending.deletedAt
            ? validateCloudContent(content)
            : { valid: true, issues: [] };
        return {
          ...pending,
          title:
            content.kind === "about"
              ? content.files.ja.meta?.person?.name || "About"
              : content.files.ja.meta?.title || content.id,
          valid: validation.valid,
          issues: validation.issues || [],
        };
      }),
    );
    sendJson(response, 200, {
      ...preflight,
      items,
      valid: items.every((item) => item.valid),
      pendingCount: items.length,
    });
    return;
  }
  if (pathname === "/api/editor/publication" && request.method === "POST") {
    const body = await readJson(request);
    const result = await cloud.createBatchPublication({
      intentChecksum: body.intentChecksum,
      idempotencyKey: batchPublicationIdempotencyKey(body.intentChecksum),
    });
    if (result.noChanges || !result.job) {
      sendJson(response, 200, { noChanges: true });
      return;
    }
    const dispatch = await workflows.dispatchPublication(result.job.id);
    sendJson(response, 202, publicJob({ ...result.job, ...dispatch }));
    return;
  }

  const contentMatch = /^\/api\/editor\/content\/(post|work|about)(?:\/([^/]+))?$/.exec(pathname);
  if (contentMatch) {
    const kind = /** @type {"post" | "work" | "about"} */ (contentMatch[1]);
    const id = contentMatch[2] ? decodeURIComponent(contentMatch[2]) : "";
    if (request.method === "POST" && !id) {
      const body = await readJson(request);
      const items = kind === "post" ? await listCloudEditorContent(cloud) : [];
      const contentId = kind === "post" ? nextCloudPostId(items) : String(body.slug || "");
      sendJson(
        response,
        201,
        fromCloudContent(await cloud.create(newCloudContent(kind, contentId))),
      );
      return;
    }
    if (request.method === "GET" && id) {
      sendJson(response, 200, await readCloudEditorContent(cloud, kind, id));
      return;
    }
    if (request.method === "PUT" && id) {
      const body = await readJson(request);
      const content = { ...body, kind, id };
      sendJson(
        response,
        200,
        fromCloudContent(await cloud.save(kind, id, toCloudRevision(content))),
      );
      return;
    }
    if (request.method === "PATCH" && id) {
      const body = await readJson(request);
      sendJson(
        response,
        200,
        fromCloudContent(
          await cloud.updateState(kind, id, {
            visibility: body.visibility,
            translationEnabled: body.translationEnabled,
            deleted: body.deleted,
            expectedRevisionId: body.currentRevisionId,
          }),
        ),
      );
      return;
    }
  }

  const historyMatch =
    /^\/api\/editor\/content\/(post|work|about)\/([^/]+)\/history(?:\/([^/]+))?$/.exec(pathname);
  if (historyMatch) {
    const kind = historyMatch[1];
    const id = decodeURIComponent(historyMatch[2]);
    const historyId = historyMatch[3] ? decodeURIComponent(historyMatch[3]) : "";
    if (request.method === "GET" && !historyId) {
      const value = await cloud.listRevisions(kind, id);
      sendJson(response, 200, { entries: value.revisions.map(revisionHistoryEntry) });
      return;
    }
    if (request.method === "POST" && historyId) {
      const body = await readJson(request);
      sendJson(
        response,
        200,
        fromCloudContent(
          await cloud.restoreRevision(kind, id, {
            revisionId: historyId,
            expectedRevisionId: body.currentRevisionId,
          }),
        ),
      );
      return;
    }
  }

  const assetMatch = /^\/api\/editor\/content\/(post|work|about)\/([^/]+)\/assets$/.exec(pathname);
  if (request.method === "POST" && assetMatch) {
    const body = await readJson(request);
    const bytes = Buffer.from(String(body.data || ""), "base64");
    const kind = assetMatch[1];
    const id = decodeURIComponent(assetMatch[2]);
    const current = await cloud.read(kind, id);
    const name = safeCloudAssetName(
      body.name,
      current.assets.map((asset) => asset.logicalPath),
    );
    const uploaded = await cloud.uploadAsset(bytes, body.type);
    const attached = await cloud.attachAsset(kind, id, {
      assetId: uploaded.id,
      logicalPath: cloudAssetLogicalPath(name),
      role: kind === "about" ? "hero" : "body",
      expectedRevisionId: body.currentRevisionId,
    });
    sendJson(response, 201, {
      name,
      url: cloudAssetUrl(kind, id, name),
      currentRevisionId: attached.currentRevisionId,
      assets: attached.assets,
    });
    return;
  }

  // Generation writes the image once and reuses the file on every later run,
  // which is what keeps a publication from paying for a picture it already has.
  // Asking again therefore means taking the stored one away: the asset goes,
  // the mode returns to "auto", and the next publication draws.
  const thumbnailMatch = /^\/api\/editor\/content\/(post|work)\/([^/]+)\/thumbnail$/.exec(pathname);
  if (request.method === "DELETE" && thumbnailMatch) {
    const kind = thumbnailMatch[1];
    const id = decodeURIComponent(thumbnailMatch[2]);
    const current = await cloud.read(kind, id);
    const stored = (current.assets || []).find((asset) => asset.role === "thumbnail");
    const detached = stored
      ? await cloud.detachAsset(kind, id, stored.logicalPath, current.currentRevisionId)
      : current;
    const content = fromCloudContent(detached);
    for (const locale of ["ja", "en"]) {
      content.files[locale].meta.thumbnail = { mode: "auto" };
    }
    sendJson(response, 200, fromCloudContent(await cloud.save(kind, id, toCloudRevision(content))));
    return;
  }

  const publishMatch = /^\/api\/editor\/content\/(post|work|about)\/([^/]+)\/publish$/.exec(
    pathname,
  );
  if (request.method === "POST" && publishMatch) {
    const kind = publishMatch[1];
    const id = decodeURIComponent(publishMatch[2]);
    const content = await readCloudEditorContent(cloud, kind, id);
    const validation = validateCloudContent(content);
    if (!validation.valid) {
      throw new EditorContentError("公開前に入力内容を確認してください", 422, "invalid_draft");
    }
    const result = await cloud.createPublication(kind, id, {
      revisionId: content.currentRevisionId,
      idempotencyKey: publicationIdempotencyKey(content),
    });
    const dispatch = await workflows.dispatchPublication(result.job.id);
    sendJson(response, 202, publicJob({ ...result.job, ...dispatch, kind, contentId: id }));
    return;
  }
  if (request.method === "GET" && publishMatch) {
    const kind = publishMatch[1];
    const id = decodeURIComponent(publishMatch[2]);
    const content = await readCloudEditorContent(cloud, kind, id);
    sendJson(response, 200, {
      ...validateCloudContent(content),
      revisionId: content.currentRevisionId,
      visibility: content.visibility,
      deletedAt: content.deletedAt,
    });
    return;
  }

  const jobMatch = /^\/api\/editor\/publish\/([a-f0-9-]+)$/.exec(pathname);
  if (request.method === "GET" && jobMatch) {
    const result = await cloud.publication(jobMatch[1]);
    // The workflow records its run id on the job as its first step, so from
    // then on the editor can show which step of the publication is running.
    // The reading that lands on a finished job skips the cache: it is the one
    // the author is left looking at, so it has to name the step that actually
    // ended the run, not one up to RUN_CACHE_MS behind it.
    const run = result.job.githubRunId
      ? await workflows.runProgress(result.job.githubRunId, {
          fresh: TERMINAL_JOB_STATES.has(result.job.state),
        })
      : null;
    sendJson(response, 200, publicJob(result.job, run));
    return;
  }

  throw new EditorContentError("Editor API route not found", 404, "not_found");
}

/**
 * @param {{
 *   enabled?: boolean,
 *   trustedHost?: string,
 *   tailscaleLogin?: string,
 *   cloudClient?: ContentCloudClient,
 *   workflowClient?: GitHubWorkflowClient,
 * }} [options]
 */
export function editorApiPlugin({
  enabled = false,
  trustedHost = "",
  tailscaleLogin = "",
  cloudClient,
  workflowClient,
} = {}) {
  const configureMiddleware = (server) => {
    if (!enabled) return;
    const services = {
      cloud: cloudClient || new ContentCloudClient(),
      workflows: workflowClient || new GitHubWorkflowClient(),
    };
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
        await handleApi(request, response, url.pathname, services);
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
