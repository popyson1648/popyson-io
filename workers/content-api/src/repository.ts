import type { RuntimeEnv } from "./env";
import { HttpError } from "./http";

export const CONTENT_KINDS = ["post", "work", "about"] as const;
export type ContentKind = (typeof CONTENT_KINDS)[number];
export type Visibility = "public" | "private";

export interface RevisionInput {
  sourceJa: string;
  sourceEn: string;
  documents: unknown;
  metadata?: unknown;
  expectedRevisionId?: string | null;
  createdBy?: string;
}

interface ItemRow {
  id: string;
  kind: ContentKind;
  slug: string;
  visibility: Visibility;
  deleted_at: string | null;
  current_revision_id: string | null;
  published_revision_id: string | null;
  created_at: string;
  updated_at: string;
}

interface RevisionRow {
  id: string;
  item_id: string;
  parent_revision_id: string | null;
  source_format: "markdown" | "toml";
  source_ja: string;
  source_en: string;
  documents_json: string;
  metadata_json: string;
  checksum_sha256: string;
  created_by: string;
  created_at: string;
}

function assertKind(kind: string): asserts kind is ContentKind {
  if (!CONTENT_KINDS.includes(kind as ContentKind)) {
    throw new HttpError(404, "not_found", "Content kind was not found");
  }
}

function assertSlug(kind: ContentKind, slug: string): void {
  const valid =
    (kind === "post" && /^\d{8}-(?:\d{6}|[a-f0-9]{8})$/.test(slug)) ||
    (kind === "work" && /^[a-z0-9][a-z0-9-]*$/.test(slug)) ||
    (kind === "about" && slug === "about");
  if (!valid) throw new HttpError(400, "invalid_id", "Content id is invalid");
}

async function sha256(value: string | ArrayBuffer): Promise<string> {
  const input = typeof value === "string" ? new TextEncoder().encode(value) : value;
  const digest = await crypto.subtle.digest("SHA-256", input);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function itemJson(row: ItemRow) {
  return {
    id: row.slug,
    itemId: row.id,
    kind: row.kind,
    visibility: row.visibility,
    deletedAt: row.deleted_at,
    currentRevisionId: row.current_revision_id,
    publishedRevisionId: row.published_revision_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function revisionJson(row: RevisionRow) {
  return {
    id: row.id,
    itemId: row.item_id,
    parentRevisionId: row.parent_revision_id,
    sourceJa: row.source_ja,
    sourceEn: row.source_en,
    documents: JSON.parse(row.documents_json),
    metadata: JSON.parse(row.metadata_json),
    checksumSha256: row.checksum_sha256,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

export async function listContent(env: RuntimeEnv) {
  const result = await env.CONTENT_DB.prepare(
    `SELECT id, kind, slug, visibility, deleted_at, current_revision_id,
            published_revision_id, created_at, updated_at
       FROM content_items
      ORDER BY updated_at DESC`,
  ).all<ItemRow>();
  return result.results.map(itemJson);
}

export async function readContent(env: RuntimeEnv, kindValue: string, slug: string) {
  assertKind(kindValue);
  assertSlug(kindValue, slug);
  const item = await env.CONTENT_DB.prepare(
    `SELECT id, kind, slug, visibility, deleted_at, current_revision_id,
            published_revision_id, created_at, updated_at
       FROM content_items WHERE kind = ?1 AND slug = ?2`,
  )
    .bind(kindValue, slug)
    .first<ItemRow>();
  if (!item) throw new HttpError(404, "not_found", "Content was not found");
  const revision = item.current_revision_id
    ? await env.CONTENT_DB.prepare("SELECT * FROM content_revisions WHERE id = ?1")
        .bind(item.current_revision_id)
        .first<RevisionRow>()
    : null;
  if (!revision) throw new HttpError(500, "missing_revision", "Current revision was not found");
  const assets = await env.CONTENT_DB.prepare(
    `SELECT a.id, a.media_type AS mediaType, a.size_bytes AS sizeBytes,
            ra.logical_path AS logicalPath, ra.role
       FROM revision_assets ra JOIN assets a ON a.id = ra.asset_id
      WHERE ra.revision_id = ?1 ORDER BY ra.logical_path`,
  )
    .bind(revision.id)
    .all();
  return { ...itemJson(item), revision: revisionJson(revision), assets: assets.results };
}

export async function createContent(
  env: RuntimeEnv,
  kindValue: string,
  slug: string,
  visibility: Visibility,
  input: RevisionInput,
) {
  assertKind(kindValue);
  assertSlug(kindValue, slug);
  if (!["public", "private"].includes(visibility)) {
    throw new HttpError(400, "invalid_visibility", "Visibility is invalid");
  }
  const now = new Date().toISOString();
  const itemId = crypto.randomUUID();
  const revisionId = crypto.randomUUID();
  const documentsJson = JSON.stringify(input.documents ?? {});
  const metadataJson = JSON.stringify(input.metadata ?? {});
  const checksum = await sha256(`${input.sourceJa}\0${input.sourceEn}\0${documentsJson}`);
  try {
    await env.CONTENT_DB.batch([
      env.CONTENT_DB.prepare(
        `INSERT INTO content_items
          (id, kind, slug, visibility, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?5)`,
      ).bind(itemId, kindValue, slug, visibility, now),
      env.CONTENT_DB.prepare(
        `INSERT INTO content_revisions
          (id, item_id, source_format, source_ja, source_en, documents_json,
           metadata_json, checksum_sha256, created_by, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)`,
      ).bind(
        revisionId,
        itemId,
        kindValue === "about" ? "toml" : "markdown",
        input.sourceJa,
        input.sourceEn,
        documentsJson,
        metadataJson,
        checksum,
        input.createdBy || "author",
        now,
      ),
      env.CONTENT_DB.prepare(
        "UPDATE content_items SET current_revision_id = ?1 WHERE id = ?2",
      ).bind(revisionId, itemId),
    ]);
  } catch (error) {
    if (String(error).includes("UNIQUE")) {
      throw new HttpError(409, "content_conflict", "Content already exists");
    }
    throw error;
  }
  return readContent(env, kindValue, slug);
}

export async function saveRevision(
  env: RuntimeEnv,
  kindValue: string,
  slug: string,
  input: RevisionInput,
) {
  const current = await readContent(env, kindValue, slug);
  if (input.expectedRevisionId !== current.currentRevisionId) {
    throw new HttpError(409, "revision_conflict", "Content changed; reload before saving");
  }
  const now = new Date().toISOString();
  const revisionId = crypto.randomUUID();
  const documentsJson = JSON.stringify(input.documents ?? {});
  const metadataJson = JSON.stringify(input.metadata ?? {});
  const checksum = await sha256(`${input.sourceJa}\0${input.sourceEn}\0${documentsJson}`);
  const results = await env.CONTENT_DB.batch([
    env.CONTENT_DB.prepare(
      `INSERT INTO content_revisions
        (id, item_id, parent_revision_id, source_format, source_ja, source_en,
         documents_json, metadata_json, checksum_sha256, created_by, created_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)`,
    ).bind(
      revisionId,
      current.itemId,
      current.currentRevisionId,
      kindValue === "about" ? "toml" : "markdown",
      input.sourceJa,
      input.sourceEn,
      documentsJson,
      metadataJson,
      checksum,
      input.createdBy || "author",
      now,
    ),
    env.CONTENT_DB.prepare(
      `UPDATE content_items SET current_revision_id = ?1, updated_at = ?2
        WHERE id = ?3 AND current_revision_id = ?4`,
    ).bind(revisionId, now, current.itemId, current.currentRevisionId),
    env.CONTENT_DB.prepare(
      `INSERT INTO revision_assets (revision_id, asset_id, logical_path, role)
       SELECT ?1, asset_id, logical_path, role
         FROM revision_assets WHERE revision_id = ?2`,
    ).bind(revisionId, current.currentRevisionId),
  ]);
  if (results[1].meta.changes !== 1) {
    throw new HttpError(409, "revision_conflict", "Content changed; reload before saving");
  }
  return readContent(env, kindValue, slug);
}

export async function updateState(
  env: RuntimeEnv,
  kindValue: string,
  slug: string,
  input: { visibility?: Visibility; deleted?: boolean },
) {
  const current = await readContent(env, kindValue, slug);
  const visibility = input.visibility ?? current.visibility;
  if (!["public", "private"].includes(visibility)) {
    throw new HttpError(400, "invalid_visibility", "Visibility is invalid");
  }
  const now = new Date().toISOString();
  await env.CONTENT_DB.prepare(
    `UPDATE content_items SET visibility = ?1, deleted_at = ?2, updated_at = ?3 WHERE id = ?4`,
  )
    .bind(visibility, input.deleted ? now : null, now, current.itemId)
    .run();
  return readContent(env, kindValue, slug);
}

export async function putAsset(
  env: RuntimeEnv,
  request: Request,
  checksum: string,
  maximumBytes: number,
) {
  if (!/^[a-f0-9]{64}$/.test(checksum)) {
    throw new HttpError(400, "invalid_checksum", "Asset checksum is invalid");
  }
  const length = Number(request.headers.get("content-length") || "0");
  if (!Number.isSafeInteger(length) || length < 1 || length > maximumBytes) {
    throw new HttpError(413, "asset_too_large", "Asset size is invalid");
  }
  const mediaType = request.headers.get("content-type") || "application/octet-stream";
  if (!mediaType.startsWith("image/")) {
    throw new HttpError(415, "unsupported_media_type", "Only image assets are accepted");
  }
  const bytes = await request.arrayBuffer();
  if (bytes.byteLength !== length || (await sha256(bytes)) !== checksum) {
    throw new HttpError(400, "checksum_mismatch", "Asset checksum does not match");
  }
  const objectKey = `sha256/${checksum.slice(0, 2)}/${checksum}`;
  await env.CONTENT_ASSETS.put(objectKey, bytes, {
    httpMetadata: { contentType: mediaType },
    customMetadata: { sha256: checksum },
  });
  await env.CONTENT_DB.prepare(
    `INSERT INTO assets
      (id, object_key, media_type, size_bytes, checksum_sha256, created_at)
     VALUES (?1, ?2, ?3, ?4, ?1, ?5)
     ON CONFLICT(id) DO NOTHING`,
  )
    .bind(checksum, objectKey, mediaType, length, new Date().toISOString())
    .run();
  return { id: checksum, mediaType, sizeBytes: length };
}

export async function getAsset(env: RuntimeEnv, checksum: string): Promise<Response> {
  if (!/^[a-f0-9]{64}$/.test(checksum)) throw new HttpError(404, "not_found", "Asset not found");
  const object = await env.CONTENT_ASSETS.get(`sha256/${checksum.slice(0, 2)}/${checksum}`);
  if (!object) throw new HttpError(404, "not_found", "Asset not found");
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("cache-control", "private, no-store");
  return new Response(object.body, { headers });
}

export async function attachAsset(
  env: RuntimeEnv,
  kindValue: string,
  slug: string,
  input: { assetId?: string; logicalPath?: string; role?: string },
) {
  const current = await readContent(env, kindValue, slug);
  const assetId = String(input.assetId || "");
  const logicalPath = String(input.logicalPath || "");
  const role = String(input.role || "body");
  if (!/^[a-f0-9]{64}$/.test(assetId)) {
    throw new HttpError(400, "invalid_asset", "Asset id is invalid");
  }
  if (
    !logicalPath ||
    logicalPath.startsWith("/") ||
    logicalPath.includes("..") ||
    !/^[a-zA-Z0-9._/-]+$/.test(logicalPath)
  ) {
    throw new HttpError(400, "invalid_asset_path", "Asset path is invalid");
  }
  if (!["body", "thumbnail", "hero"].includes(role)) {
    throw new HttpError(400, "invalid_asset_role", "Asset role is invalid");
  }
  const asset = await env.CONTENT_DB.prepare("SELECT id FROM assets WHERE id = ?1")
    .bind(assetId)
    .first();
  if (!asset) throw new HttpError(404, "not_found", "Asset was not found");
  await env.CONTENT_DB.prepare(
    `INSERT INTO revision_assets (revision_id, asset_id, logical_path, role)
     VALUES (?1, ?2, ?3, ?4)
     ON CONFLICT(revision_id, logical_path)
     DO UPDATE SET asset_id = excluded.asset_id, role = excluded.role`,
  )
    .bind(current.currentRevisionId, assetId, logicalPath, role)
    .run();
  return readContent(env, kindValue, slug);
}
