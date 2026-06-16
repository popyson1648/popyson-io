import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseToml } from "smol-toml";

const ROOT = join(fileURLToPath(new URL("..", import.meta.url)));
const POSTS_DIR = join(ROOT, "src/content/posts");
const ABOUT_DIR = join(ROOT, "src/content/about");
const POST_ID_RE = /^\d{8}-[a-f0-9]{8}$/;

function parseFrontmatter(source, filePath) {
  const text = source.replace(/^\uFEFF/, "");
  if (!text.startsWith("+++\n")) {
    throw new Error(`${filePath} must start with TOML frontmatter delimited by +++`);
  }
  const end = text.indexOf("\n+++", 4);
  if (end === -1) throw new Error(`${filePath} is missing closing +++ frontmatter delimiter`);
  const frontmatter = text.slice(4, end);
  const body = text.slice(end + 5).replace(/^\r?\n/, "");
  return { meta: parseToml(frontmatter), body };
}

function slugifyHeading(value, seen) {
  const base = String(value)
    .trim()
    .toLowerCase()
    .replace(/[`*_~:[\](){}]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "") || "section";
  const count = seen.get(base) || 0;
  seen.set(base, count + 1);
  return count ? `${base}-${count + 1}` : base;
}

function parseMarkdownBlocks(markdown) {
  const blocks = [];
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const seenHeadings = new Map();
  let i = 0;

  const readParagraph = () => {
    const parts = [];
    while (i < lines.length) {
      const line = lines[i];
      if (!line.trim()) break;
      if (/^(#{2} |\d+\. |- |```|:::)/.test(line)) break;
      parts.push(line.trim());
      i += 1;
    }
    if (parts.length) blocks.push({ kind: "p", text: parts.join(" ") });
  };

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i += 1;
      continue;
    }

    if (line.startsWith("```")) {
      const lang = line.slice(3).trim() || "text";
      i += 1;
      const code = [];
      while (i < lines.length && !lines[i].startsWith("```")) {
        code.push(lines[i]);
        i += 1;
      }
      if (i < lines.length) i += 1;
      blocks.push({ kind: "code", lang, code: code.join("\n") });
      continue;
    }

    if (line.startsWith(":::")) {
      const variant = line.slice(3).trim() || "info";
      i += 1;
      const parts = [];
      while (i < lines.length && !lines[i].startsWith(":::")) {
        if (lines[i].trim()) parts.push(lines[i].trim());
        i += 1;
      }
      if (i < lines.length) i += 1;
      blocks.push({ kind: "msg", variant, text: parts.join(" ") });
      continue;
    }

    if (line.startsWith("## ")) {
      const text = line.slice(3).trim();
      blocks.push({ kind: "h2", id: slugifyHeading(text, seenHeadings), text });
      i += 1;
      continue;
    }

    if (line.startsWith("- ")) {
      const items = [];
      while (i < lines.length && lines[i].startsWith("- ")) {
        items.push(lines[i].slice(2).trim());
        i += 1;
      }
      blocks.push({ kind: "ul", items });
      continue;
    }

    if (/^\d+\. /.test(line)) {
      const items = [];
      while (i < lines.length && /^\d+\. /.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\. /, "").trim());
        i += 1;
      }
      blocks.push({ kind: "ol", items });
      continue;
    }

    readParagraph();
  }

  return blocks;
}

function localizeBlocks(jaBlocks, enBlocks) {
  const max = Math.max(jaBlocks.length, enBlocks.length);
  const out = [];
  for (let i = 0; i < max; i += 1) {
    const ja = jaBlocks[i];
    const en = enBlocks[i];
    const kind = ja?.kind || en?.kind;
    if (!kind) continue;
    if (kind === "code") {
      out.push({ kind, lang: ja?.lang || en?.lang, code: ja?.code || en?.code || "" });
    } else if (kind === "h2") {
      out.push({ kind, id: ja?.id || en?.id || `section-${i + 1}`, ja: ja?.text || "", en: en?.text || "" });
    } else if (kind === "ul" || kind === "ol") {
      out.push({ kind, ja: ja?.items || [], en: en?.items || [] });
    } else if (kind === "msg") {
      out.push({ kind, variant: ja?.variant || en?.variant || "info", ja: ja?.text || "", en: en?.text || "" });
    } else if (kind === "p") {
      out.push({ kind, ja: ja?.text || "", en: en?.text || "" });
    }
  }
  return out;
}

function readPost(dirName) {
  if (!POST_ID_RE.test(dirName)) {
    throw new Error(`Invalid post directory name: ${dirName}`);
  }
  const dir = join(POSTS_DIR, dirName);
  const jaPath = join(dir, "index.ja.md");
  const enPath = join(dir, "index.en.md");
  const ja = parseFrontmatter(readFileSync(jaPath, "utf8"), jaPath);
  const en = parseFrontmatter(readFileSync(enPath, "utf8"), enPath);
  const common = { ...en.meta, ...ja.meta };
  const post = {
    id: dirName,
    title: { ja: ja.meta.title || "", en: en.meta.title || "" },
    date: String(common.date || ""),
    reading: Number(common.reading || 1),
    tags: Array.isArray(common.tags) ? common.tags.map(String) : [],
    kana: String(common.kana || ""),
    summary: { ja: ja.meta.summary || "", en: en.meta.summary || "" },
  };
  return { post, body: localizeBlocks(parseMarkdownBlocks(ja.body), parseMarkdownBlocks(en.body)) };
}

function readAbout(locale) {
  const file = join(ABOUT_DIR, `about.${locale}.toml`);
  const data = parseToml(readFileSync(file, "utf8"));
  return data.person || {};
}

function localizeAbout(ja, en) {
  const person = {
    initials: ja.initials || en.initials || "",
    name: { ja: ja.name || "", en: en.name || "" },
    role: { ja: ja.role || "", en: en.role || "" },
    location: { ja: ja.location || "", en: en.location || "" },
    tagline: { ja: ja.tagline || "", en: en.tagline || "" },
    bio: { ja: ja.bio || [], en: en.bio || [] },
    career: (ja.career || []).map((item, i) => ({
      period: item.period,
      role: { ja: item.role || "", en: en.career?.[i]?.role || "" },
      org: { ja: item.org || "", en: en.career?.[i]?.org || "" },
    })),
    activities: (ja.activities || []).map((item, i) => ({
      ja: item,
      en: en.activities?.[i] || "",
    })),
    links: ja.links || en.links || [],
  };
  return person;
}

export function loadSiteContent() {
  const dirs = existsSync(POSTS_DIR)
    ? readdirSync(POSTS_DIR, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort()
    : [];
  const entries = dirs.map(readPost).sort((a, b) => b.post.date.localeCompare(a.post.date));
  const posts = entries.map((entry) => entry.post);
  const articleBodies = Object.fromEntries(entries.map((entry) => [entry.post.id, entry.body]));
  const tags = [...new Set(posts.flatMap((post) => post.tags))];
  const person = localizeAbout(readAbout("ja"), readAbout("en"));
  return { POSTS: posts, TAGS: tags, ARTICLE_BODIES: articleBodies, PERSON: person };
}

export function contentWatchFiles() {
  const files = [
    join(ABOUT_DIR, "about.ja.toml"),
    join(ABOUT_DIR, "about.en.toml"),
  ];
  if (!existsSync(POSTS_DIR)) return files;
  for (const dirent of readdirSync(POSTS_DIR, { withFileTypes: true })) {
    if (!dirent.isDirectory()) continue;
    const dir = join(POSTS_DIR, dirent.name);
    files.push(join(dir, "index.ja.md"), join(dir, "index.en.md"));
  }
  return files;
}

export function postIdPattern() {
  return POST_ID_RE;
}

export function postsDir() {
  return POSTS_DIR;
}

export function rootDir() {
  return ROOT;
}
