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

const POST_FIELDS = {
  ja: [
    "title      記事タイトル。必須、空文字不可",
    'date       "auto" | "YYYY-MM-DD"。auto は初回コミット日に置換される',
    "tags       手書きのタグ",
    "auto_tags  AI にタグを追加させる。{} で既定 3 個。追加しないなら行ごと削除",
    "kana       五十音順ソートに使う読み仮名",
    'sumup      mode = "text" | "auto" | "none"。text は text が必須',
    'thumbnail  mode = "auto" | "file" | "none"。file は path が必須',
  ],
  en: [
    "title      Article title. Required, must not be empty",
    'date       "auto" | "YYYY-MM-DD". auto is replaced with the first commit date',
    "tags       Hand-written tags",
    "auto_tags  Let the generator add tags. {} uses the default 3. Delete the line to skip",
    "kana       Reading used for Japanese kana sorting",
    'sumup      mode = "text" | "auto" | "none". text requires text',
    'thumbnail  mode = "auto" | "file" | "none". file requires path',
  ],
};

export function postMarkdownTemplate(locale) {
  const fields = POST_FIELDS[locale].map((field) => `# ${field}`).join("\n");
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

const WORK_FIELDS = {
  ja: [
    "title      作品名。必須、空文字不可",
    "tagline    一覧カードと詳細ページの見出し下に出る一行説明",
    "summary    一覧カードに出る説明文",
    "year       公開年。必須",
    "stack      使用技術。一覧と詳細にチップで並ぶ",
    "thumbnail  一覧カードの画像。public/ からのパス。空ならプレースホルダ",
    "hero       詳細ページの大きな画像。public/ からのパス。空ならプレースホルダ",
  ],
  en: [
    "title      Work name. Required, must not be empty",
    "tagline    One line shown on the index card and under the detail heading",
    "summary    Description shown on the index card",
    "",
    "year, stack, thumbnail and hero are taken from index.ja.md.",
  ],
};

export function workMarkdownTemplate(locale, year = new Date().getFullYear()) {
  const fields = WORK_FIELDS[locale].map((field) => (field ? `# ${field}` : "#")).join("\n");
  const shared = locale === "ja" ? `year = ${year}\nstack = []\nthumbnail = ""\nhero = ""\n` : "";
  return `+++
${fields}

title = ""
tagline = ""
summary = ""
${shared}+++

`;
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
