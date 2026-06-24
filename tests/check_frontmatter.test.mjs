import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
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

describe("checked-in article frontmatter", () => {
  const files = postMarkdownFiles();

  test("has article Markdown to validate", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  test.each(files)("%s parses and validates against the metadata schema", (file) => {
    const parsed = parseFrontmatterForCheck(readFileSync(file, "utf8"));
    const errors = parsed.errors.length > 0 ? parsed.errors : validateMetadata(parsed.meta);

    expect(errors).toEqual([]);
  });
});
