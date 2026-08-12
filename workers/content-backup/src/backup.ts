import { createHash } from "node:crypto";

interface ApiEnvelope {
  result?: unknown;
  success?: boolean;
}

interface ExportStart {
  at_bookmark?: unknown;
}

interface ExportReady {
  signed_url?: unknown;
}

interface ExportLocation {
  signedUrl: string;
}

export interface BackupRecord {
  bookmark: string;
  bytes: number;
  key: string;
  sha256: string;
}

export interface BackupEnvironment {
  ACCOUNT_ID: string;
  BACKUP_BUCKET: R2Bucket;
  CONTENT_ASSETS: R2Bucket;
  CONTENT_DB: D1Database;
  D1_REST_API_TOKEN: string;
  DATABASE_ID: string;
}

const MAX_API_RESPONSE_BYTES = 64 * 1024;
const MAX_ASSET_BYTES = 10 * 1024 * 1024;

interface AssetInventoryRow {
  checksum_sha256: string;
  object_key: string;
  size_bytes: number;
}

export interface AssetBackupRecord {
  bytes: number;
  key: string;
  sha256: string;
}

function required(value: string, name: string): string {
  if (!value || value.startsWith("REPLACE_ME")) {
    throw new Error(`${name} is not configured`);
  }
  return value;
}

function exportEndpoint(env: BackupEnvironment): string {
  const accountId = required(env.ACCOUNT_ID, "ACCOUNT_ID");
  const databaseId = required(env.DATABASE_ID, "DATABASE_ID");
  return `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/export`;
}

async function readApiEnvelope(response: Response): Promise<ApiEnvelope> {
  if (!response.ok) throw new Error(`D1 export API returned ${response.status}`);

  const contentLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_API_RESPONSE_BYTES) {
    throw new Error("D1 export API response exceeded the size limit");
  }

  const text = await response.text();
  if (new TextEncoder().encode(text).byteLength > MAX_API_RESPONSE_BYTES) {
    throw new Error("D1 export API response exceeded the size limit");
  }

  try {
    return JSON.parse(text) as ApiEnvelope;
  } catch {
    throw new Error("D1 export API returned invalid JSON");
  }
}

async function callExportApi(
  env: BackupEnvironment,
  payload: Record<string, string>,
): Promise<ApiEnvelope> {
  let response: Response;
  try {
    response = await fetch(exportEndpoint(env), {
      method: "POST",
      headers: {
        authorization: `Bearer ${required(env.D1_REST_API_TOKEN, "D1_REST_API_TOKEN")}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new Error("D1 export API request failed");
  }
  return readApiEnvelope(response);
}

async function fetchExport(location: ExportLocation): Promise<Response> {
  try {
    return await fetch(location.signedUrl, { redirect: "error" });
  } catch {
    // Fetch exceptions can include the requested URL. Never let the signed
    // download credential enter Workflow failure output or observability logs.
    throw new Error("D1 export download failed");
  }
}

export async function startExport(env: BackupEnvironment): Promise<string> {
  const envelope = await callExportApi(env, { output_format: "polling" });
  const result = envelope.result as ExportStart | undefined;
  if (envelope.success === false || typeof result?.at_bookmark !== "string") {
    throw new Error("D1 export did not return a bookmark");
  }
  return result.at_bookmark;
}

export async function pollExport(
  env: BackupEnvironment,
  bookmark: string,
): Promise<ExportLocation> {
  const envelope = await callExportApi(env, { current_bookmark: bookmark });
  const result = envelope.result as ExportReady | undefined;
  if (envelope.success === false || typeof result?.signed_url !== "string") {
    throw new Error("D1 export is not ready");
  }

  const signedUrl = new URL(result.signed_url);
  if (signedUrl.protocol !== "https:") {
    throw new Error("D1 export URL must use HTTPS");
  }
  return { signedUrl: signedUrl.toString() };
}

function backupKey(timestamp: Date, instanceId: string): string {
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(instanceId)) {
    throw new Error("Workflow instance ID is invalid");
  }
  const day = timestamp.toISOString().slice(0, 10).replaceAll("-", "/");
  return `d1/${day}/${instanceId}.sql`;
}

function hashingStream(hash: ReturnType<typeof createHash>, onBytes: (size: number) => void) {
  return new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      hash.update(chunk);
      onBytes(chunk.byteLength);
      controller.enqueue(chunk);
    },
  });
}

async function digestStream(
  body: ReadableStream<Uint8Array>,
): Promise<{ bytes: number; sha256: string }> {
  const hash = createHash("sha256");
  let bytes = 0;
  const reader = body.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    hash.update(value);
    bytes += value.byteLength;
  }
  return { bytes, sha256: hash.digest("hex") };
}

export async function storeExport(
  env: BackupEnvironment,
  location: ExportLocation,
  bookmark: string,
  timestamp: Date,
  instanceId: string,
): Promise<BackupRecord> {
  const key = backupKey(timestamp, instanceId);
  const existing = await env.BACKUP_BUCKET.head(key);
  if (existing) {
    const manifest = await env.BACKUP_BUCKET.get(`${key}.json`);
    if (manifest) {
      const record = (await manifest.json()) as BackupRecord;
      if (
        record.key !== key ||
        record.bookmark !== bookmark ||
        record.bytes !== existing.size ||
        record.bytes <= 0 ||
        !/^[a-f0-9]{64}$/.test(record.sha256)
      ) {
        throw new Error("Existing backup does not match this workflow run");
      }
      return record;
    }

    const response = await fetchExport(location);
    if (!response.ok || !response.body) {
      throw new Error(`D1 export download returned ${response.status}`);
    }
    const digest = await digestStream(response.body);
    if (digest.bytes !== existing.size) {
      throw new Error("Existing backup size does not match the export");
    }
    const record = { bookmark, key, ...digest };
    const repaired = await env.BACKUP_BUCKET.put(`${key}.json`, JSON.stringify(record), {
      httpMetadata: { contentType: "application/json" },
      customMetadata: { backupKey: key },
      onlyIf: { etagDoesNotMatch: "*" },
    });
    if (!repaired) throw new Error("Backup checksum manifest already exists");
    return record;
  }

  const response = await fetchExport(location);
  if (!response.ok || !response.body) {
    throw new Error(`D1 export download returned ${response.status}`);
  }

  const hash = createHash("sha256");
  let bytes = 0;
  const object = await env.BACKUP_BUCKET.put(
    key,
    response.body.pipeThrough(hashingStream(hash, (size) => (bytes += size))),
    {
      httpMetadata: { contentType: "application/sql" },
      customMetadata: { bookmark },
      onlyIf: { etagDoesNotMatch: "*" },
    },
  );
  if (!object) throw new Error("Backup object already exists");

  const record: BackupRecord = {
    bookmark,
    bytes,
    key,
    sha256: hash.digest("hex"),
  };
  const manifest = await env.BACKUP_BUCKET.put(`${key}.json`, JSON.stringify(record), {
    httpMetadata: { contentType: "application/json" },
    customMetadata: { backupKey: key },
    onlyIf: { etagDoesNotMatch: "*" },
  });
  if (!manifest) throw new Error("Backup checksum manifest already exists");
  return record;
}

function checkedAsset(row: AssetInventoryRow): AssetInventoryRow {
  if (!/^[a-f0-9]{64}$/.test(row.checksum_sha256)) {
    throw new Error("Asset checksum is invalid");
  }
  const expectedKey = `sha256/${row.checksum_sha256.slice(0, 2)}/${row.checksum_sha256}`;
  if (row.object_key !== expectedKey) throw new Error("Asset object key is invalid");
  if (
    !Number.isSafeInteger(row.size_bytes) ||
    row.size_bytes <= 0 ||
    row.size_bytes > MAX_ASSET_BYTES
  ) {
    throw new Error("Asset size is invalid");
  }
  return row;
}

export async function listAssetInventory(env: BackupEnvironment): Promise<AssetInventoryRow[]> {
  const result = await env.CONTENT_DB.prepare(
    "SELECT object_key, checksum_sha256, size_bytes FROM assets ORDER BY object_key",
  ).all<AssetInventoryRow>();
  return result.results.map(checkedAsset);
}

export async function backupAsset(
  env: BackupEnvironment,
  inventory: AssetInventoryRow,
): Promise<AssetBackupRecord> {
  const asset = checkedAsset(inventory);
  const key = `assets/${asset.object_key}`;
  const existing = await env.BACKUP_BUCKET.head(key);
  if (existing) {
    if (existing.size !== asset.size_bytes) {
      throw new Error("Existing asset backup does not match the inventory");
    }
    if (existing.customMetadata?.sha256 !== asset.checksum_sha256) {
      const stored = await env.BACKUP_BUCKET.get(key);
      if (!stored) throw new Error("Existing asset backup could not be read");
      const digest = createHash("sha256")
        .update(new Uint8Array(await stored.arrayBuffer()))
        .digest("hex");
      if (digest !== asset.checksum_sha256) {
        throw new Error("Existing asset backup does not match the inventory");
      }
    }
    return { bytes: existing.size, key, sha256: asset.checksum_sha256 };
  }

  const source = await env.CONTENT_ASSETS.get(asset.object_key);
  if (!source) throw new Error("Primary asset is missing");
  if (source.size !== asset.size_bytes) throw new Error("Primary asset size does not match D1");
  const bytes = await source.arrayBuffer();
  const digest = createHash("sha256").update(new Uint8Array(bytes)).digest();
  if (digest.toString("hex") !== asset.checksum_sha256) {
    throw new Error("Primary asset checksum does not match D1");
  }

  const stored = await env.BACKUP_BUCKET.put(key, bytes, {
    httpMetadata: source.httpMetadata,
    customMetadata: { sha256: asset.checksum_sha256 },
    onlyIf: { etagDoesNotMatch: "*" },
    sha256: digest,
  });
  if (!stored) throw new Error("Asset backup already exists");
  return { bytes: stored.size, key, sha256: asset.checksum_sha256 };
}
