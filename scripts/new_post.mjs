import { mkdirSync, existsSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const POSTS_DIR = process.env.NEW_POSTS_DIR
  ? resolve(process.env.NEW_POSTS_DIR)
  : join(ROOT, "src/content/posts");

function todayStamp() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

function newPostId() {
  const date = process.env.NEW_POST_DATE || todayStamp();
  for (let i = 0; i < 256; i += 1) {
    const id = `${date}-${randomBytes(4).toString("hex")}`;
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
    title: "新しい記事",
    summary: "記事の概要を書く。",
    heading: "見出し",
    body: "本文を書く。",
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
    title: "New Post",
    summary: "Write a short summary.",
    heading: "Heading",
    body: "Write the body.",
  },
};

function markdownTemplate(locale) {
  const text = TEMPLATE_TEXT[locale];
  const fields = text.fields.map((field) => `# ${field}`).join("\n");
  return `+++
${fields}

title = "${text.title}"
date = "auto"
tags = []
auto_tags = {}
kana = ""

[sumup]
mode = "text"
text = "${text.summary}"

[thumbnail]
mode = "auto"
+++

## ${text.heading}

${text.body}
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
