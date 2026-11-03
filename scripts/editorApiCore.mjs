import { createHash } from "node:crypto";

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
import { EditorContentError } from "./editorContentSchema.mjs";
import { publishProgress } from "./publishProgress.mjs";

const MAX_JSON_BYTES = 15 * 1024 * 1024;
const json = (status, value) =>
  Response.json(value, { status, headers: { "Cache-Control": "no-store" } });
async function readJson(request) {
  if (Number(request.headers.get("content-length")) > MAX_JSON_BYTES)
    throw new EditorContentError("Request body is too large", 413, "body_too_large");
  const reader = request.body?.getReader();
  if (!reader) return {};
  const chunks = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_JSON_BYTES) {
        await reader.cancel();
        throw new EditorContentError("Request body is too large", 413, "body_too_large");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  try {
    const body = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
    if (!body || typeof body !== "object" || Array.isArray(body))
      throw new Error("object required");
    return body;
  } catch {
    throw new EditorContentError("Request body must be a JSON object", 400, "invalid_json");
  }
}
export function editorApiError(error) {
  const status = Number(error?.status) || 500;
  return json(status, {
    error: {
      code: error.code || "internal_error",
      message: status >= 500 ? "Editor service unavailable" : error.message || "Invalid request",
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

export async function handleEditorApi(request, { cloud, workflows, renderArticleHtml }) {
  const pathname = new URL(request.url).pathname;
  if (request.method === "GET" && pathname === "/api/editor/content") {
    return json(200, { items: await listCloudEditorContent(cloud) });
  }

  if (request.method === "POST" && pathname === "/api/editor/preview") {
    const body = await readJson(request);
    if (typeof body.markdown !== "string") {
      throw new EditorContentError("Markdown must be a string", 400, "invalid_markdown");
    }
    if (body.markdown.length > 262144) {
      throw new EditorContentError(
        "Preview is limited to 262144 characters",
        413,
        "preview_too_large",
      );
    }
    const copyLabel = body.locale === "ja" ? "コードをコピー" : "Copy code";
    const detailsLabel = body.locale === "ja" ? "詳細" : "Details";
    return json(200, {
      html: await renderArticleHtml(body.markdown, { copyLabel, detailsLabel }),
    });
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
    return json(200, {
      ...preflight,
      items,
      valid: items.every((item) => item.valid),
      pendingCount: items.length,
    });
  }
  if (pathname === "/api/editor/publication" && request.method === "POST") {
    const body = await readJson(request);
    const result = await cloud.createBatchPublication({
      intentChecksum: body.intentChecksum,
      idempotencyKey: batchPublicationIdempotencyKey(body.intentChecksum),
    });
    if (result.noChanges || !result.job) {
      return json(200, { noChanges: true });
    }
    const dispatch = await workflows.dispatchPublication(result.job.id);
    return json(202, publicJob({ ...result.job, ...dispatch }));
  }

  const contentMatch = /^\/api\/editor\/content\/(post|work|about)(?:\/([^/]+))?$/.exec(pathname);
  if (contentMatch) {
    const kind = /** @type {"post" | "work" | "about"} */ (contentMatch[1]);
    const id = contentMatch[2] ? decodeURIComponent(contentMatch[2]) : "";
    if (request.method === "POST" && !id) {
      const body = await readJson(request);
      const items = kind === "post" ? await listCloudEditorContent(cloud) : [];
      const contentId = kind === "post" ? nextCloudPostId(items) : String(body.slug || "");
      return json(201, fromCloudContent(await cloud.create(newCloudContent(kind, contentId))));
    }
    if (request.method === "GET" && id) {
      return json(200, await readCloudEditorContent(cloud, kind, id));
    }
    if (request.method === "PUT" && id) {
      const body = await readJson(request);
      const content = { ...body, kind, id };
      return json(200, fromCloudContent(await cloud.save(kind, id, toCloudRevision(content))));
    }
    if (request.method === "PATCH" && id) {
      const body = await readJson(request);
      return json(
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
      return json(200, { entries: value.revisions.map(revisionHistoryEntry) });
    }
    if (request.method === "POST" && historyId) {
      const body = await readJson(request);
      return json(
        200,
        fromCloudContent(
          await cloud.restoreRevision(kind, id, {
            revisionId: historyId,
            expectedRevisionId: body.currentRevisionId,
          }),
        ),
      );
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
    return json(201, {
      name,
      url: cloudAssetUrl(kind, id, name),
      currentRevisionId: attached.currentRevisionId,
      assets: attached.assets,
    });
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
    return json(200, fromCloudContent(await cloud.save(kind, id, toCloudRevision(content))));
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
    return json(202, publicJob({ ...result.job, ...dispatch, kind, contentId: id }));
  }
  if (request.method === "GET" && publishMatch) {
    const kind = publishMatch[1];
    const id = decodeURIComponent(publishMatch[2]);
    const content = await readCloudEditorContent(cloud, kind, id);
    return json(200, {
      ...validateCloudContent(content),
      revisionId: content.currentRevisionId,
      visibility: content.visibility,
      deletedAt: content.deletedAt,
    });
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
    return json(200, publicJob(result.job, run));
  }

  throw new EditorContentError("Editor API route not found", 404, "not_found");
}
