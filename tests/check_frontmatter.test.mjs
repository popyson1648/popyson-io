import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "vitest";
import { postsDir } from "../scripts/content_loader.mjs";
import { parseFrontmatterForCheck } from "../scripts/frontmatter.mjs";
import { validateMetadata } from "../scripts/metadataSchema.mjs";

function postMarkdownFiles() {
  const dir = postsDir();
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .flatMap((dirent) => [
      join(dir, dirent.name, "index.ja.md"),
      join(dir, dirent.name, "index.en.md"),
    ]);
}

test("checkedInPostFrontmatter_parsesAndValidatesAgainstMetadataSchema", () => {
  const failures = [];

  for (const file of postMarkdownFiles()) {
    const parsed = parseFrontmatterForCheck(readFileSync(file, "utf8"));
    const errors = parsed.errors.length > 0 ? parsed.errors : validateMetadata(parsed.meta);
    for (const error of errors) {
      failures.push(`${file}: ${error.field}: ${error.reason}`);
    }
  }

  assert.deepEqual(failures, [], failures.join("\n"));
});
