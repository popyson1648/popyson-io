import { createHash } from "node:crypto";

interface ApiEnvelope {
  result?: unknown;
  success?: boolean;
}

interface ExportStart {
  at_bookmark?: unknown;
}

// A polling export reports progress in the envelope result and only carries a
// download location once it has finished, nested one level further down.
interface ExportProgress {
  result?: { signed_url?: unknown };
  success?: boolean;
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
const MAX_DUMP_BYTES = 64 * 1024 * 1024;

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

function redactUrls(value: string): string {
  return value.replaceAll(/\bhttps?:\/\/\S+/gi, "<redacted url>");
}

async function fetchExport(location: ExportLocation): Promise<Response> {
  try {
    // The Workers runtime rejects `redirect: "error"`, so a redirect is refused
    // by leaving it unfollowed and letting the caller reject the 3xx status.
    return await fetch(location.signedUrl, { redirect: "manual" });
  } catch (error) {
    // Fetch exceptions can include the requested URL, and the signed download
    // credential must never reach Workflow failure output or observability
    // logs. Keep the reason, which is what separates a blocked host from a
    // transport failure, and redact any URL it carries.
    const reason = error instanceof Error ? redactUrls(error.message) : "unknown error";
    throw new Error(`D1 export download failed: ${reason}`);
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

// Returns null while the export is still running. The download location is
// reported to a single poll, so a caller must keep polling closely.
export async function pollExport(
  env: BackupEnvironment,
  bookmark: string,
): Promise<ExportLocation | null> {
  const envelope = await callExportApi(env, {
    output_format: "polling",
    current_bookmark: bookmark,
  });
  const result = envelope.result as ExportProgress | undefined;
  if (envelope.success === false || result?.success === false) {
    // The API reports "Not currently exporting anything" once the export
    // session is over, which means this run can no longer reach its dump.
    throw new Error("D1 export session ended before it was collected");
  }
  const location = result?.result?.signed_url;
  if (typeof location !== "string") return null;

  const signedUrl = new URL(location);
  if (signedUrl.protocol !== "https:") {
    throw new Error("D1 export URL must use HTTPS");
  }
  return { signedUrl: signedUrl.toString() };
}

export interface ExportAttempt {
  bookmark: string;
  location: ExportLocation;
}

interface ExportPollingOptions {
  intervalMs?: number;
  sleep?: (ms: number) => Promise<void>;
  timeoutMs?: number;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Starting the export and collecting its result belong to one attempt. The
// export API keeps a finished dump available only until the polling session
// closes, so a retry has to start a new export rather than poll an old one.
export async function exportDatabase(
  env: BackupEnvironment,
  options: ExportPollingOptions = {},
): Promise<ExportAttempt> {
  const intervalMs = options.intervalMs ?? 1000;
  const timeoutMs = options.timeoutMs ?? 90_000;
  const sleep = options.sleep ?? wait;
  const bookmark = await startExport(env);
  const deadline = Date.now() + timeoutMs;

  for (;;) {
    const location = await pollExport(env, bookmark);
    if (location) return { bookmark, location };
    if (Date.now() >= deadline) throw new Error("D1 export did not finish in time");
    await sleep(intervalMs);
  }
}

function backupKey(timestamp: Date, instanceId: string): string {
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(instanceId)) {
    throw new Error("Workflow instance ID is invalid");
  }
  const day = timestamp.toISOString().slice(0, 10).replaceAll("-", "/");
  return `d1/${day}/${instanceId}.sql`;
}

// R2 rejects a stream whose length is unknown, and piping the download through
// a hashing transform discards the length the response carried. The dump is a
// text export of one small database, so it is read into memory under an
// explicit cap instead, which also keeps the growth ceiling visible.
async function readDump(response: Response): Promise<Uint8Array> {
  const declared = Number(response.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > MAX_DUMP_BYTES) {
    throw new Error("D1 export exceeded the size limit");
  }
  const dump = new Uint8Array(await response.arrayBuffer());
  if (dump.byteLength > MAX_DUMP_BYTES) {
    throw new Error("D1 export exceeded the size limit");
  }
  if (dump.byteLength === 0) throw new Error("D1 export was empty");
  return dump;
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

  const dump = await readDump(response);
  const object = await env.BACKUP_BUCKET.put(key, dump, {
    httpMetadata: { contentType: "application/sql" },
    customMetadata: { bookmark },
    onlyIf: { etagDoesNotMatch: "*" },
  });
  if (!object) throw new Error("Backup object already exists");

  const record: BackupRecord = {
    bookmark,
    bytes: dump.byteLength,
    key,
    sha256: createHash("sha256").update(dump).digest("hex"),
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
