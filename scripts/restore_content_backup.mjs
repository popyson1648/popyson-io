import { createHash } from "node:crypto";
import { createReadStream, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const FINGERPRINT_QUERY =
  "SELECT (SELECT COUNT(*) FROM content_items) AS content_items, " +
  "(SELECT COUNT(*) FROM content_revisions) AS content_revisions, " +
  "(SELECT COUNT(*) FROM assets) AS assets, " +
  "(SELECT COUNT(*) FROM revision_assets) AS revision_assets, " +
  "(SELECT COUNT(*) FROM publish_jobs) AS publish_jobs, " +
  "(SELECT COUNT(*) FROM releases) AS releases, " +
  "(SELECT COUNT(*) FROM release_items) AS release_items, " +
  "(SELECT COALESCE(SUM(LENGTH(source_ja)+LENGTH(source_en)+LENGTH(documents_json)+" +
  "LENGTH(metadata_json)+LENGTH(checksum_sha256)),0) FROM content_revisions) AS revision_bytes, " +
  "(SELECT COALESCE(SUM(size_bytes),0) FROM assets) AS asset_bytes";

const ORPHAN_QUERY =
  "SELECT " +
  "(SELECT COUNT(*) FROM content_revisions r LEFT JOIN content_items i ON i.id=r.item_id " +
  "WHERE i.id IS NULL) AS orphan_revisions, " +
  "(SELECT COUNT(*) FROM revision_assets ra LEFT JOIN content_revisions r ON r.id=ra.revision_id " +
  "LEFT JOIN assets a ON a.id=ra.asset_id WHERE r.id IS NULL OR a.id IS NULL) AS orphan_assets, " +
  "(SELECT COUNT(*) FROM content_items i LEFT JOIN content_revisions r ON r.id=i.current_revision_id " +
  "WHERE i.current_revision_id IS NOT NULL AND r.id IS NULL) AS orphan_current, " +
  "(SELECT COUNT(*) FROM content_items i LEFT JOIN content_revisions r ON r.id=i.published_revision_id " +
  "WHERE i.published_revision_id IS NOT NULL AND r.id IS NULL) AS orphan_published";

function parseArgs(argv) {
  const values = new Map();
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--execute") {
      values.set("execute", true);
      continue;
    }
    if (!token.startsWith("--") || argv[index + 1] === undefined) {
      throw new Error("Arguments must use --name value pairs");
    }
    values.set(token.slice(2), argv[index + 1]);
    index += 1;
  }
  return values;
}

function required(values, name) {
  const value = String(values.get(name) || "").trim();
  if (!value) throw new Error(`--${name} is required`);
  return value;
}

function checkedDatabase(name, productionDatabase) {
  if (!/^[a-z0-9-]+-restore-[a-z0-9-]+$/.test(name) || name === productionDatabase) {
    throw new Error("The target must be a dedicated non-production restore database");
  }
  return name;
}

function readManifest(path) {
  if (statSync(path).size > 8192) throw new Error("Backup manifest is too large");
  const manifest = JSON.parse(readFileSync(path, "utf8"));
  if (
    !Number.isSafeInteger(manifest.bytes) ||
    manifest.bytes <= 0 ||
    !/^[a-f0-9]{64}$/.test(manifest.sha256)
  ) {
    throw new Error("Backup manifest is invalid");
  }
  return manifest;
}

async function sha256(path) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest("hex");
}

function wrangler(args, { json = false } = {}) {
  const result = spawnSync("npx", ["wrangler", ...args], {
    cwd: resolve(import.meta.dirname, ".."),
    encoding: "utf8",
    env: process.env,
  });
  if (result.status !== 0)
    throw new Error("Wrangler operation failed; detailed output was suppressed");
  if (!json) return undefined;
  try {
    return JSON.parse(result.stdout);
  } catch {
    throw new Error("Wrangler returned invalid JSON");
  }
}

function query(database, sql) {
  const payload = wrangler(["d1", "execute", database, "--remote", "--command", sql, "--json"], {
    json: true,
  });
  const row = payload?.[0]?.results?.[0];
  if (!row) throw new Error("Restore verification query returned no result");
  return row;
}

async function main(argv = process.argv.slice(2)) {
  const values = parseArgs(argv);
  const database = checkedDatabase(
    required(values, "database"),
    process.env.CONTENT_PRODUCTION_DATABASE || "popyson-content",
  );
  const sqlPath = resolve(required(values, "sql"));
  const manifestPath = resolve(required(values, "manifest"));
  const manifest = readManifest(manifestPath);
  const bytes = statSync(sqlPath).size;
  const checksum = await sha256(sqlPath);
  if (bytes !== manifest.bytes || checksum !== manifest.sha256) {
    throw new Error("Backup file does not match its manifest");
  }

  if (!values.get("execute")) {
    console.log("Backup checksum verified; no database changes were made.");
    return;
  }

  wrangler(["d1", "execute", database, "--remote", "--file", sqlPath]);
  const source = String(values.get("source") || "").trim();
  if (source) {
    if (source === database) throw new Error("Source and restore databases must differ");
    if (
      JSON.stringify(query(source, FINGERPRINT_QUERY)) !==
      JSON.stringify(query(database, FINGERPRINT_QUERY))
    ) {
      throw new Error("Restored database fingerprint does not match the source");
    }
  }
  if (Object.values(query(database, ORPHAN_QUERY)).some((count) => count !== 0)) {
    throw new Error("Restored database contains orphaned references");
  }
  console.log("Backup restored and verified in the non-production database.");
}

main().catch((error) => {
  console.error(`${error.name || "Error"}: ${error.message}`);
  process.exitCode = 1;
});
