import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseToml } from "smol-toml";
import { makeDateLabel, normalizeIsoDate } from "../src/dateLabel.js";
import { slugifyHeading } from "../src/headingSlug.js";
import { renderArticleBody } from "./articleHtml.mjs";

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

function extractMarkdownHeadings(markdown) {
  const headings = [];
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const seenHeadings = new Map();
  let fenced = false;

  for (const line of lines) {
    if (/^\s*(```|~~~)/.test(line)) {
      fenced = !fenced;
      continue;
    }
    if (fenced) continue;
    // CommonMark allows up to 3 leading spaces before an ATX heading; match
    // that here so the build-time TOC stays in sync with the runtime ids.
    const match = /^ {0,3}(#{1,6})[ \t]+(.+?)[ \t#]*$/.exec(line);
    if (!match) continue;
    const depth = match[1].length;
    const text = match[2].trim();
    if (depth === 2) {
      headings.push({ id: slugifyHeading(text, seenHeadings), text });
    }
  }

  return headings;
}

function localizeMarkdown(jaBody, enBody) {
  const jaHeadings = extractMarkdownHeadings(jaBody);
  const enHeadings = extractMarkdownHeadings(enBody);
  const max = Math.max(jaHeadings.length, enHeadings.length);
  const headings = [];
  for (let i = 0; i < max; i += 1) {
    const ja = jaHeadings[i];
    const en = enHeadings[i];
    headings.push({
      id: ja?.id || en?.id || `section-${i + 1}`,
      ja: ja?.text || "",
      en: en?.text || "",
    });
  }
  return { ja: jaBody, en: enBody, headings };
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
  const date = normalizeIsoDate(common.date);
  const post = {
    id: dirName,
    title: { ja: ja.meta.title || "", en: en.meta.title || "" },
    date,
    dateLabel: makeDateLabel(date),
    reading: Number(common.reading || 1),
    tags: Array.isArray(common.tags) ? common.tags.map(String) : [],
    kana: String(common.kana || ""),
    summary: { ja: ja.meta.summary || "", en: en.meta.summary || "" },
  };
  return { post, body: localizeMarkdown(ja.body, en.body) };
}

function readAbout(locale) {
  const file = join(ABOUT_DIR, `about.${locale}.toml`);
  const data = parseToml(readFileSync(file, "utf8"));
  return data.person || {};
}

export function relatedPostIds(post, posts, limit = 3) {
  if (!post || !Array.isArray(posts)) return [];
  const postTags = Array.isArray(post.tags) ? post.tags : [];
  return posts
    .filter((candidate) => candidate && candidate.id !== post.id)
    .map((candidate) => ({
      post: candidate,
      score: (Array.isArray(candidate.tags) ? candidate.tags : [])
        .filter((tag) => postTags.includes(tag)).length,
    }))
    .sort((a, b) => b.score - a.score || String(b.post.date || "").localeCompare(String(a.post.date || "")))
    .slice(0, limit)
    .map((ranked) => ranked.post.id);
}

function withRelatedIds(posts) {
  return posts.map((post) => ({
    ...post,
    relatedIds: relatedPostIds(post, posts),
  }));
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
  const posts = withRelatedIds(entries.map((entry) => entry.post));
  const articleBodies = Object.fromEntries(entries.map((entry) => [entry.post.id, entry.body]));
  const tags = [...new Set(posts.flatMap((post) => post.tags))];
  const person = localizeAbout(readAbout("ja"), readAbout("en"));
  return { POSTS: posts, TAGS: tags, ARTICLE_BODIES: articleBodies, PERSON: person };
}

export async function renderArticleBodies(content) {
  const copyLabels = { ja: "コードをコピー", en: "Copy code" };
  const entries = await Promise.all(Object.entries(content.ARTICLE_BODIES).map(async ([id, body]) => [
    id,
    {
      ja: await renderArticleBody(body.ja, { copyLabel: copyLabels.ja }),
      en: await renderArticleBody(body.en, { copyLabel: copyLabels.en }),
      headings: body.headings,
    },
  ]));
  return {
    ...content,
    ARTICLE_BODIES: Object.fromEntries(entries),
  };
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
