import type { RuntimeEnv } from "./env";
import { HttpError } from "./http";

export const CONTENT_KINDS = ["post", "work", "about"] as const;
export type ContentKind = (typeof CONTENT_KINDS)[number];
export type Visibility = "public" | "private";
export type AssetRole = "body" | "thumbnail" | "hero";

export interface RevisionInput {
  sourceJa: string;
  sourceEn: string;
  documents: unknown;
  metadata?: unknown;
  expectedRevisionId?: string | null;
  createdBy?: string;
}

export interface ItemRow {
  id: string;
  kind: ContentKind;
  slug: string;
  visibility: Visibility;
  translation_enabled: number;
  deleted_at: string | null;
  current_revision_id: string | null;
  published_revision_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface RevisionRow {
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

export interface AssetRow {
  id: string;
  mediaType: string;
  sizeBytes: number;
  logicalPath: string;
  role: AssetRole;
}

export function assertKind(kind: string): asserts kind is ContentKind {
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

export async function sha256(value: string | ArrayBuffer): Promise<string> {
  const input = typeof value === "string" ? new TextEncoder().encode(value) : value;
  const digest = await crypto.subtle.digest("SHA-256", input);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function serializeRevision(input: RevisionInput): {
  sourceJa: string;
  sourceEn: string;
  documentsJson: string;
  metadataJson: string;
} {
  if (typeof input.sourceJa !== "string" || typeof input.sourceEn !== "string") {
    throw new HttpError(400, "invalid_revision", "Both locale sources are required");
  }
  if (input.sourceJa.length === 0 || input.sourceEn.length === 0) {
    throw new HttpError(400, "invalid_revision", "Locale sources must not be empty");
  }
  try {
    return {
      sourceJa: input.sourceJa,
      sourceEn: input.sourceEn,
      documentsJson: JSON.stringify(input.documents ?? {}),
      metadataJson: JSON.stringify(input.metadata ?? {}),
    };
  } catch {
    throw new HttpError(400, "invalid_revision", "Revision data must be JSON serializable");
  }
}

export function itemJson(row: ItemRow) {
  return {
    id: row.slug,
    itemId: row.id,
    kind: row.kind,
    visibility: row.visibility,
    translationEnabled: row.kind === "post" ? row.translation_enabled !== 0 : true,
    deletedAt: row.deleted_at,
    currentRevisionId: row.current_revision_id,
    publishedRevisionId: row.published_revision_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function revisionJson(row: RevisionRow) {
  return {
    id: row.id,
    itemId: row.item_id,
    parentRevisionId: row.parent_revision_id,
    sourceJa: row.source_ja,
    sourceEn: row.source_en,
    documents: JSON.parse(row.documents_json) as unknown,
    metadata: JSON.parse(row.metadata_json) as unknown,
    checksumSha256: row.checksum_sha256,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

function revisionSummaryJson(row: RevisionRow) {
  return {
    id: row.id,
    itemId: row.item_id,
    parentRevisionId: row.parent_revision_id,
    checksumSha256: row.checksum_sha256,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

export async function getItem(env: RuntimeEnv, kindValue: string, slug: string): Promise<ItemRow> {
  assertKind(kindValue);
  assertSlug(kindValue, slug);
  const item = await env.CONTENT_DB.prepare(
    `SELECT id, kind, slug, visibility, translation_enabled, deleted_at, current_revision_id,
            published_revision_id, created_at, updated_at
       FROM content_items WHERE kind = ?1 AND slug = ?2`,
  )
    .bind(kindValue, slug)
    .first<ItemRow>();
  if (!item) throw new HttpError(404, "not_found", "Content was not found");
  return item;
}

export async function getRevision(
  env: RuntimeEnv,
  revisionId: string,
  itemId?: string,
): Promise<RevisionRow> {
  const revision = await env.CONTENT_DB.prepare(
    `SELECT * FROM content_revisions
      WHERE id = ?1 AND (?2 IS NULL OR item_id = ?2)`,
  )
    .bind(revisionId, itemId ?? null)
    .first<RevisionRow>();
  if (!revision) throw new HttpError(404, "not_found", "Revision was not found");
  return revision;
}

export async function getRevisionAssets(env: RuntimeEnv, revisionId: string): Promise<AssetRow[]> {
  const result = await env.CONTENT_DB.prepare(
    `SELECT a.id, a.media_type AS mediaType, a.size_bytes AS sizeBytes,
            ra.logical_path AS logicalPath, ra.role
       FROM revision_assets ra JOIN assets a ON a.id = ra.asset_id
      WHERE ra.revision_id = ?1 ORDER BY ra.logical_path`,
  )
    .bind(revisionId)
    .all<AssetRow>();
  return result.results;
}

export async function listContent(env: RuntimeEnv) {
  const result = await env.CONTENT_DB.prepare(
    `SELECT id, kind, slug, visibility, translation_enabled, deleted_at, current_revision_id,
            published_revision_id, created_at, updated_at
       FROM content_items
      ORDER BY updated_at DESC`,
  ).all<ItemRow>();
  return result.results.map(itemJson);
}

export async function readContent(env: RuntimeEnv, kindValue: string, slug: string) {
  const item = await getItem(env, kindValue, slug);
  if (!item.current_revision_id) {
    throw new HttpError(500, "missing_revision", "Current revision was not found");
  }
  const revision = await getRevision(env, item.current_revision_id, item.id);
  const assets = await getRevisionAssets(env, revision.id);
  return { ...itemJson(item), revision: revisionJson(revision), assets };
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
  if (visibility !== "public" && visibility !== "private") {
    throw new HttpError(400, "invalid_visibility", "Visibility is invalid");
  }
  const revision = serializeRevision(input);
  const now = new Date().toISOString();
  const itemId = crypto.randomUUID();
  const revisionId = crypto.randomUUID();
  const checksum = await sha256(
    `${revision.sourceJa}\0${revision.sourceEn}\0${revision.documentsJson}\0${revision.metadataJson}`,
  );
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
        revision.sourceJa,
        revision.sourceEn,
        revision.documentsJson,
        revision.metadataJson,
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

async function insertRevision(
  env: RuntimeEnv,
  item: ItemRow,
  input: RevisionInput,
  assetSourceRevisionId: string,
) {
  if (input.expectedRevisionId !== item.current_revision_id) {
    throw new HttpError(409, "revision_conflict", "Content changed; reload before saving");
  }
  const revision = serializeRevision(input);
  const now = new Date().toISOString();
  const revisionId = crypto.randomUUID();
  const checksum = await sha256(
    `${revision.sourceJa}\0${revision.sourceEn}\0${revision.documentsJson}\0${revision.metadataJson}`,
  );
  const results = await env.CONTENT_DB.batch([
    env.CONTENT_DB.prepare(
      `INSERT INTO content_revisions
        (id, item_id, parent_revision_id, source_format, source_ja, source_en,
         documents_json, metadata_json, checksum_sha256, created_by, created_at)
       SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11
        WHERE EXISTS (
          SELECT 1 FROM content_items WHERE id = ?2 AND current_revision_id = ?3
        )`,
    ).bind(
      revisionId,
      item.id,
      item.current_revision_id,
      item.kind === "about" ? "toml" : "markdown",
      revision.sourceJa,
      revision.sourceEn,
      revision.documentsJson,
      revision.metadataJson,
      checksum,
      input.createdBy || "author",
      now,
    ),
    env.CONTENT_DB.prepare(
      `UPDATE content_items SET current_revision_id = ?1, updated_at = ?2
        WHERE id = ?3 AND current_revision_id = ?4`,
    ).bind(revisionId, now, item.id, item.current_revision_id),
    env.CONTENT_DB.prepare(
      `INSERT INTO revision_assets (revision_id, asset_id, logical_path, role)
       SELECT ?1, asset_id, logical_path, role
         FROM revision_assets
        WHERE revision_id = ?2
          AND EXISTS (SELECT 1 FROM content_revisions WHERE id = ?1)`,
    ).bind(revisionId, assetSourceRevisionId),
  ]);
  if (results[0].meta.changes !== 1 || results[1].meta.changes !== 1) {
    throw new HttpError(409, "revision_conflict", "Content changed; reload before saving");
  }
  return revisionId;
}

export async function saveRevision(
  env: RuntimeEnv,
  kindValue: string,
  slug: string,
  input: RevisionInput,
) {
  const item = await getItem(env, kindValue, slug);
  if (!item.current_revision_id) {
    throw new HttpError(500, "missing_revision", "Current revision was not found");
  }
  await insertRevision(env, item, input, item.current_revision_id);
  return readContent(env, kindValue, slug);
}

export async function listRevisions(env: RuntimeEnv, kindValue: string, slug: string) {
  const item = await getItem(env, kindValue, slug);
  const result = await env.CONTENT_DB.prepare(
    `SELECT * FROM content_revisions WHERE item_id = ?1 ORDER BY created_at DESC, id DESC`,
  )
    .bind(item.id)
    .all<RevisionRow>();
  return { item: itemJson(item), revisions: result.results.map(revisionSummaryJson) };
}

export async function readRevision(
  env: RuntimeEnv,
  kindValue: string,
  slug: string,
  revisionId: string,
) {
  const item = await getItem(env, kindValue, slug);
  const revision = await getRevision(env, revisionId, item.id);
  return {
    item: itemJson(item),
    revision: revisionJson(revision),
    assets: await getRevisionAssets(env, revision.id),
  };
}

export async function restoreRevision(
  env: RuntimeEnv,
  kindValue: string,
  slug: string,
  input: { revisionId?: string; expectedRevisionId?: string | null },
) {
  const item = await getItem(env, kindValue, slug);
  if (!input.revisionId) {
    throw new HttpError(400, "invalid_revision", "Revision id is required");
  }
  const restored = await getRevision(env, input.revisionId, item.id);
  await insertRevision(
    env,
    item,
    {
      sourceJa: restored.source_ja,
      sourceEn: restored.source_en,
      documents: JSON.parse(restored.documents_json) as unknown,
      metadata: JSON.parse(restored.metadata_json) as unknown,
      expectedRevisionId: input.expectedRevisionId,
      createdBy: "author-restore",
    },
    restored.id,
  );
  return readContent(env, kindValue, slug);
}

export async function createPublicationRevision(
  env: RuntimeEnv,
  item: ItemRow,
  baseRevisionId: string,
  input: RevisionInput,
  assetInputs?: Array<{ assetId?: string; logicalPath?: string; role?: string }>,
  requestedRevisionId?: string,
): Promise<string> {
  await getRevision(env, baseRevisionId, item.id);
  if (input.expectedRevisionId !== undefined && input.expectedRevisionId !== baseRevisionId) {
    throw new HttpError(409, "revision_conflict", "Candidate does not match the pinned revision");
  }
  const revision = serializeRevision(input);
  const assets = assetInputs?.map(assertAssetReference) ?? [];
  if (new Set(assets.map(({ logicalPath }) => logicalPath)).size !== assets.length) {
    throw new HttpError(400, "duplicate_asset_path", "Candidate asset paths must be unique");
  }
  for (const asset of assets) {
    const found = await env.CONTENT_DB.prepare("SELECT id FROM assets WHERE id = ?1")
      .bind(asset.assetId)
      .first();
    if (!found) throw new HttpError(404, "not_found", "Candidate asset was not found");
  }
  const now = new Date().toISOString();
  const revisionId = requestedRevisionId || crypto.randomUUID();
  const checksum = await sha256(
    `${revision.sourceJa}\0${revision.sourceEn}\0${revision.documentsJson}\0${revision.metadataJson}`,
  );
  const statements = [
    env.CONTENT_DB.prepare(
      `INSERT INTO content_revisions
        (id, item_id, parent_revision_id, source_format, source_ja, source_en,
         documents_json, metadata_json, checksum_sha256, created_by, created_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)`,
    ).bind(
      revisionId,
      item.id,
      baseRevisionId,
      item.kind === "about" ? "toml" : "markdown",
      revision.sourceJa,
      revision.sourceEn,
      revision.documentsJson,
      revision.metadataJson,
      checksum,
      input.createdBy || "ci-publication",
      now,
    ),
    ...(assetInputs === undefined
      ? [
          env.CONTENT_DB.prepare(
            `INSERT INTO revision_assets (revision_id, asset_id, logical_path, role)
             SELECT ?1, asset_id, logical_path, role FROM revision_assets WHERE revision_id = ?2`,
          ).bind(revisionId, baseRevisionId),
        ]
      : []),
    ...assets.map((asset) =>
      env.CONTENT_DB.prepare(
        `INSERT INTO revision_assets (revision_id, asset_id, logical_path, role)
         VALUES (?1, ?2, ?3, ?4)
         ON CONFLICT(revision_id, logical_path)
         DO UPDATE SET asset_id = excluded.asset_id, role = excluded.role`,
      ).bind(revisionId, asset.assetId, asset.logicalPath, asset.role),
    ),
    env.CONTENT_DB.prepare(
      `UPDATE content_items SET current_revision_id = ?1, updated_at = ?2
        WHERE id = ?3 AND current_revision_id = ?4`,
    ).bind(revisionId, now, item.id, baseRevisionId),
  ];
  await env.CONTENT_DB.batch(statements);
  return revisionId;
}

export async function updateState(
  env: RuntimeEnv,
  kindValue: string,
  slug: string,
  input: {
    visibility?: Visibility;
    translationEnabled?: boolean;
    deleted?: boolean;
    expectedRevisionId?: string | null;
  },
) {
  const item = await getItem(env, kindValue, slug);
  if (
    input.expectedRevisionId !== undefined &&
    input.expectedRevisionId !== item.current_revision_id
  ) {
    throw new HttpError(409, "revision_conflict", "Content changed; reload before updating state");
  }
  const visibility = input.visibility ?? item.visibility;
  if (visibility !== "public" && visibility !== "private") {
    throw new HttpError(400, "invalid_visibility", "Visibility is invalid");
  }
  if (input.deleted !== undefined && typeof input.deleted !== "boolean") {
    throw new HttpError(400, "invalid_deleted", "Deleted must be a boolean");
  }
  if (input.translationEnabled !== undefined) {
    if (typeof input.translationEnabled !== "boolean" || item.kind !== "post") {
      throw new HttpError(
        400,
        "invalid_translation_setting",
        "Translation can be configured only for Blog articles",
      );
    }
  }
  const now = new Date().toISOString();
  const deletedAt = input.deleted === undefined ? item.deleted_at : input.deleted ? now : null;
  const translationEnabled =
    input.translationEnabled === undefined
      ? item.translation_enabled
      : input.translationEnabled
        ? 1
        : 0;
  const result = await env.CONTENT_DB.prepare(
    `UPDATE content_items
        SET visibility = ?1, translation_enabled = ?2, deleted_at = ?3, updated_at = ?4
      WHERE id = ?5 AND current_revision_id = ?6`,
  )
    .bind(visibility, translationEnabled, deletedAt, now, item.id, item.current_revision_id)
    .run();
  if (result.meta.changes !== 1) {
    throw new HttpError(409, "revision_conflict", "Content changed; reload before updating state");
  }
  return readContent(env, kindValue, slug);
}

const IMAGE_SIGNATURES: Record<string, (prefix: Uint8Array) => boolean> = {
  "image/gif": (value) =>
    value.length >= 6 && ["GIF87a", "GIF89a"].includes(new TextDecoder().decode(value.slice(0, 6))),
  "image/jpeg": (value) =>
    value.length >= 3 && value[0] === 0xff && value[1] === 0xd8 && value[2] === 0xff,
  "image/png": (value) =>
    value.length >= 8 &&
    [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((byte, index) => value[index] === byte),
  "image/webp": (value) =>
    value.length >= 12 &&
    new TextDecoder().decode(value.slice(0, 4)) === "RIFF" &&
    new TextDecoder().decode(value.slice(8, 12)) === "WEBP",
};

function validatingImageStream(mediaType: string): TransformStream<Uint8Array, Uint8Array> {
  const prefix: number[] = [];
  let validated = false;
  const validate = () => {
    if (!IMAGE_SIGNATURES[mediaType](Uint8Array.from(prefix))) {
      throw new HttpError(415, "invalid_image", "Asset bytes do not match the media type");
    }
    validated = true;
  };
  return new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      if (!validated) {
        prefix.push(...chunk.slice(0, Math.max(0, 12 - prefix.length)));
        if (prefix.length >= 12 || (mediaType === "image/jpeg" && prefix.length >= 3)) validate();
      }
      controller.enqueue(chunk);
    },
    flush() {
      if (!validated) validate();
    },
  });
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
  const mediaType = (request.headers.get("content-type") || "").split(";", 1)[0].toLowerCase();
  if (!IMAGE_SIGNATURES[mediaType]) {
    throw new HttpError(415, "unsupported_media_type", "Only supported image assets are accepted");
  }
  if (!request.body) throw new HttpError(400, "missing_asset", "Asset body is required");
  const objectKey = `sha256/${checksum.slice(0, 2)}/${checksum}`;
  let stored: R2Object | null;
  try {
    const fixed = new FixedLengthStream(length);
    const validated = request.body.pipeThrough(validatingImageStream(mediaType));
    const upload = env.CONTENT_ASSETS.put(objectKey, fixed.readable, {
      httpMetadata: { contentType: mediaType },
      customMetadata: { sha256: checksum },
      sha256: checksum,
    });
    const [, object] = await Promise.all([validated.pipeTo(fixed.writable), upload]);
    stored = object;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(400, "checksum_mismatch", "Asset checksum does not match");
  }
  if (!stored || stored.size !== length) {
    throw new HttpError(400, "asset_size_mismatch", "Asset size does not match");
  }
  await env.CONTENT_DB.prepare(
    `INSERT INTO assets
      (id, object_key, media_type, size_bytes, checksum_sha256, created_at)
     VALUES (?1, ?2, ?3, ?4, ?1, ?5)
     ON CONFLICT(id) DO NOTHING`,
  )
    .bind(checksum, objectKey, mediaType, length, new Date().toISOString())
    .run();
  const asset = await env.CONTENT_DB.prepare(
    "SELECT id, media_type AS mediaType, size_bytes AS sizeBytes FROM assets WHERE id = ?1",
  )
    .bind(checksum)
    .first<{ id: string; mediaType: string; sizeBytes: number }>();
  if (!asset) throw new HttpError(500, "missing_asset", "Stored asset record was not found");
  return asset;
}

export async function getAsset(env: RuntimeEnv, checksum: string): Promise<Response> {
  if (!/^[a-f0-9]{64}$/.test(checksum)) throw new HttpError(404, "not_found", "Asset not found");
  const object = await env.CONTENT_ASSETS.get(`sha256/${checksum.slice(0, 2)}/${checksum}`);
  if (!object) throw new HttpError(404, "not_found", "Asset not found");
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("content-length", String(object.size));
  headers.set("cache-control", "private, no-store");
  return new Response(object.body, { headers });
}

export function assertAssetReference(input: {
  assetId?: string;
  logicalPath?: string;
  role?: string;
}): { assetId: string; logicalPath: string; role: AssetRole } {
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
    logicalPath.includes("//") ||
    !/^[a-zA-Z0-9._/-]+$/.test(logicalPath)
  ) {
    throw new HttpError(400, "invalid_asset_path", "Asset path is invalid");
  }
  if (role !== "body" && role !== "thumbnail" && role !== "hero") {
    throw new HttpError(400, "invalid_asset_role", "Asset role is invalid");
  }
  return { assetId, logicalPath, role };
}

export async function attachAsset(
  env: RuntimeEnv,
  kindValue: string,
  slug: string,
  input: {
    assetId?: string;
    logicalPath?: string;
    role?: string;
    expectedRevisionId?: string | null;
  },
) {
  const item = await getItem(env, kindValue, slug);
  if (!item.current_revision_id) {
    throw new HttpError(500, "missing_revision", "Current revision was not found");
  }
  const reference = assertAssetReference(input);
  const asset = await env.CONTENT_DB.prepare("SELECT id FROM assets WHERE id = ?1")
    .bind(reference.assetId)
    .first();
  if (!asset) throw new HttpError(404, "not_found", "Asset was not found");
  await reviseAssets(env, item, input.expectedRevisionId, reference.logicalPath, reference);
  return readContent(env, kindValue, slug);
}

export async function detachAsset(
  env: RuntimeEnv,
  kindValue: string,
  slug: string,
  logicalPath: string,
  expectedRevisionId?: string | null,
) {
  const item = await getItem(env, kindValue, slug);
  if (!item.current_revision_id) {
    throw new HttpError(500, "missing_revision", "Current revision was not found");
  }
  const reference = assertAssetReference({
    assetId: "0".repeat(64),
    logicalPath,
    role: "body",
  });
  await reviseAssets(env, item, expectedRevisionId, reference.logicalPath);
  return readContent(env, kindValue, slug);
}

async function reviseAssets(
  env: RuntimeEnv,
  item: ItemRow,
  expectedRevisionId: string | null | undefined,
  changedPath: string,
  replacement?: { assetId: string; logicalPath: string; role: AssetRole },
): Promise<void> {
  const expected = expectedRevisionId ?? item.current_revision_id;
  if (!expected || expected !== item.current_revision_id) {
    throw new HttpError(409, "revision_conflict", "Content changed; reload before changing assets");
  }
  const now = new Date().toISOString();
  const revisionId = crypto.randomUUID();
  const statements = [
    env.CONTENT_DB.prepare(
      `INSERT INTO content_revisions
        (id, item_id, parent_revision_id, source_format, source_ja, source_en,
         documents_json, metadata_json, checksum_sha256, created_by, created_at)
       SELECT ?1, r.item_id, r.id, r.source_format, r.source_ja, r.source_en,
              r.documents_json, r.metadata_json, r.checksum_sha256, 'author-asset', ?2
         FROM content_revisions r JOIN content_items i ON i.id = r.item_id
        WHERE r.id = ?3 AND i.id = ?4 AND i.current_revision_id = ?3`,
    ).bind(revisionId, now, expected, item.id),
    env.CONTENT_DB.prepare(
      `INSERT INTO revision_assets (revision_id, asset_id, logical_path, role)
       SELECT ?1, asset_id, logical_path, role
         FROM revision_assets
        WHERE revision_id = ?2 AND logical_path <> ?3
          AND EXISTS (SELECT 1 FROM content_revisions WHERE id = ?1)`,
    ).bind(revisionId, expected, changedPath),
    ...(replacement
      ? [
          env.CONTENT_DB.prepare(
            `INSERT INTO revision_assets (revision_id, asset_id, logical_path, role)
             SELECT ?1, ?2, ?3, ?4
              WHERE EXISTS (SELECT 1 FROM content_revisions WHERE id = ?1)`,
          ).bind(revisionId, replacement.assetId, replacement.logicalPath, replacement.role),
        ]
      : []),
    env.CONTENT_DB.prepare(
      `UPDATE content_items SET current_revision_id = ?1, updated_at = ?2
        WHERE id = ?3 AND current_revision_id = ?4
          AND EXISTS (SELECT 1 FROM content_revisions WHERE id = ?1)`,
    ).bind(revisionId, now, item.id, expected),
  ];
  const results = await env.CONTENT_DB.batch(statements);
  if (results[0].meta.changes !== 1 || results.at(-1)?.meta.changes !== 1) {
    throw new HttpError(409, "revision_conflict", "Content changed; reload before changing assets");
  }
}
