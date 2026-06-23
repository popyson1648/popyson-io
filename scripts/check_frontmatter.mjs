import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { postsDir } from "./content_loader.mjs";
import { parseFrontmatterForCheck } from "./frontmatter.mjs";
import { validateMetadata } from "./metadataSchema.mjs";

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
  const parsed = parseFrontmatterForCheck(readFileSync(file, "utf8"));
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
