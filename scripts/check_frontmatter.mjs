import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parse as parseToml } from "smol-toml";
import { postsDir } from "./content_loader.mjs";
import { validateMetadata } from "./metadataSchema.mjs";

function parseFrontmatter(source) {
  const text = source.replace(/^\uFEFF/, "");
  if (!text.startsWith("+++\n")) {
    return { errors: [{ field: "frontmatter", reason: "must start with TOML frontmatter delimited by +++" }] };
  }
  const end = text.indexOf("\n+++", 4);
  if (end === -1) {
    return { errors: [{ field: "frontmatter", reason: "is missing closing +++ delimiter" }] };
  }
  try {
    return { meta: parseToml(text.slice(4, end)), errors: [] };
  } catch (error) {
    return { errors: [{ field: "frontmatter", reason: `is not valid TOML: ${error.message}` }] };
  }
}

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

const failures = [];

for (const file of postMarkdownFiles()) {
  const parsed = parseFrontmatter(readFileSync(file, "utf8"));
  const errors = parsed.errors.length > 0 ? parsed.errors : validateMetadata(parsed.meta);
  for (const error of errors) {
    failures.push(`${file}: ${error.field}: ${error.reason}`);
  }
}

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log("frontmatter metadata checks passed");
