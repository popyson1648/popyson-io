import { createHash } from "node:crypto";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

import { describe, expect, it } from "vitest";

const script = new URL("../scripts/restore_content_backup.mjs", import.meta.url);

function fixture() {
  const directory = mkdtempSync(join(tmpdir(), "content-restore-test-"));
  const sql = join(directory, "backup.sql");
  const manifest = join(directory, "backup.sql.json");
  const body = "CREATE TABLE example (id TEXT);\n";
  writeFileSync(sql, body);
  writeFileSync(
    manifest,
    JSON.stringify({
      bytes: Buffer.byteLength(body),
      key: "d1/example.sql",
      sha256: createHash("sha256").update(body).digest("hex"),
    }),
  );
  return { manifest, sql };
}

function run(args) {
  return spawnSync(process.execPath, [script.pathname, ...args], { encoding: "utf8" });
}

describe("content backup restore guard", () => {
  it("verifies a backup without changing a database by default", () => {
    const { manifest, sql } = fixture();
    const result = run([
      "--database",
      "example-restore-drill",
      "--sql",
      sql,
      "--manifest",
      manifest,
    ]);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("no database changes were made");
  });

  it("rejects the production database before reading the backup", () => {
    const result = run([
      "--database",
      "popyson-content",
      "--sql",
      "/missing",
      "--manifest",
      "/missing",
    ]);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("dedicated non-production restore database");
  });

  it("rejects a backup whose checksum changed", () => {
    const { manifest, sql } = fixture();
    writeFileSync(sql, "changed");
    const result = run([
      "--database",
      "example-restore-drill",
      "--sql",
      sql,
      "--manifest",
      manifest,
    ]);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("does not match its manifest");
  });
});
