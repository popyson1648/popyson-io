import { mkdirSync, existsSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const POSTS_DIR = process.env.NEW_POSTS_DIR
  ? resolve(process.env.NEW_POSTS_DIR)
  : join(ROOT, "src/content/posts");

function pad(value, width = 2) {
  return String(value).padStart(width, "0");
}

function dateStamp(at) {
  return `${at.getFullYear()}${pad(at.getMonth() + 1)}${pad(at.getDate())}`;
}

function timeStamp(at) {
  return `${pad(at.getHours())}${pad(at.getMinutes())}${pad(at.getSeconds())}`;
}

// The id ends in the time of day rather than random hex, so listing the posts
// directory shows the day's drafts in the order they were created. Two runs
// within the same second step forward until the directory is free, which keeps
// that order rather than breaking it with a random suffix.
function newPostId() {
  const startedAt = new Date();
  for (let i = 0; i < 256; i += 1) {
    const at = new Date(startedAt.getTime() + i * 1000);
    const id = `${process.env.NEW_POST_DATE || dateStamp(at)}-${timeStamp(at)}`;
    if (!existsSync(join(POSTS_DIR, id))) return id;
  }
  throw new Error("Could not generate a collision-free post ID");
}

// Drafting aid only: `scripts/generate_metadata.mjs` re-serializes the front
// matter, so these comments disappear once metadata is generated.
const TEMPLATE_TEXT = {
  ja: {
    fields: [
      "title      記事タイトル。必須、空文字不可",
      'date       "auto" | "YYYY-MM-DD"。auto は初回コミット日に置換される',
      "tags       手書きのタグ",
      "auto_tags  AI にタグを追加させる。{} で既定 3 個。追加しないなら行ごと削除",
      "kana       五十音順ソートに使う読み仮名",
      'sumup      mode = "text" | "auto" | "none"。text は text が必須',
      'thumbnail  mode = "auto" | "file" | "none"。file は path が必須',
    ],
  },
  en: {
    fields: [
      "title      Article title. Required, must not be empty",
      'date       "auto" | "YYYY-MM-DD". auto is replaced with the first commit date',
      "tags       Hand-written tags",
      "auto_tags  Let the generator add tags. {} uses the default 3. Delete the line to skip",
      "kana       Reading used for Japanese kana sorting",
      'sumup      mode = "text" | "auto" | "none". text requires text',
      'thumbnail  mode = "auto" | "file" | "none". file requires path',
    ],
  },
};

// Only defaults: every value the author has to write is left empty, so nothing
// placeholder-looking can reach a published post by being forgotten.
function markdownTemplate(locale) {
  const fields = TEMPLATE_TEXT[locale].fields.map((field) => `# ${field}`).join("\n");
  return `+++
${fields}

title = ""
date = "auto"
tags = []
auto_tags = {}
kana = ""

[sumup]
mode = "text"
text = ""

[thumbnail]
mode = "auto"
+++

`;
}

function main() {
  mkdirSync(POSTS_DIR, { recursive: true });
  const id = newPostId();
  const dir = join(POSTS_DIR, id);
  mkdirSync(join(dir, "assets"), { recursive: true });
  writeFileSync(join(dir, "index.ja.md"), markdownTemplate("ja"));
  writeFileSync(join(dir, "index.en.md"), markdownTemplate("en"));
  console.log(id);
  console.log(dir);
}

main();
