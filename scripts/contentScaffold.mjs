import { postMarkdownTemplate, workMarkdownTemplate } from "./contentTemplates.mjs";
export { postMarkdownTemplate, workMarkdownTemplate } from "./contentTemplates.mjs";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export const WORK_SLUG_RE = /^[a-z0-9][a-z0-9-]*$/;

function pad(value, width = 2) {
  return String(value).padStart(width, "0");
}

function dateStamp(at) {
  return `${at.getFullYear()}${pad(at.getMonth() + 1)}${pad(at.getDate())}`;
}

function timeStamp(at) {
  return `${pad(at.getHours())}${pad(at.getMinutes())}${pad(at.getSeconds())}`;
}

export function nextPostId(
  postsDir,
  { now = new Date(), dateOverride = "", reservedDirs = [] } = {},
) {
  for (let index = 0; index < 256; index += 1) {
    const at = new Date(now.getTime() + index * 1000);
    const id = `${dateOverride || dateStamp(at)}-${timeStamp(at)}`;
    if (
      !existsSync(join(postsDir, id)) &&
      reservedDirs.every((directory) => !existsSync(join(directory, id)))
    ) {
      return id;
    }
  }
  throw new Error("Could not generate a collision-free post ID");
}

export function createPostScaffold(postsDir, options = {}) {
  mkdirSync(postsDir, { recursive: true });
  const id = nextPostId(postsDir, options);
  const dir = join(postsDir, id);
  mkdirSync(join(dir, "assets"), { recursive: true });
  writeFileSync(join(dir, "index.ja.md"), postMarkdownTemplate("ja"));
  writeFileSync(join(dir, "index.en.md"), postMarkdownTemplate("en"));
  return { id, dir };
}

export function createWorkScaffold(worksDir, slug, { year = new Date().getFullYear() } = {}) {
  if (!WORK_SLUG_RE.test(slug || "")) {
    throw new Error(`Invalid slug: ${slug}. Use lowercase letters, digits and hyphens.`);
  }
  const dir = join(worksDir, slug);
  if (existsSync(dir)) throw new Error(`Already exists: ${dir}`);
  mkdirSync(join(dir, "assets"), { recursive: true });
  writeFileSync(join(dir, "index.ja.md"), workMarkdownTemplate("ja", year));
  writeFileSync(join(dir, "index.en.md"), workMarkdownTemplate("en", year));
  return { id: slug, dir };
}
