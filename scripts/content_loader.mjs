import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseToml } from "smol-toml";
import { makeDateLabel, normalizeIsoDate } from "../src/dateLabel.js";
import { slugifyHeading } from "../src/headingSlug.js";
import { estimateReadingMinutes } from "../src/readingTime.js";
import { renderArticleBody } from "./articleHtml.mjs";
import { parseMarkdownFrontmatter } from "./frontmatter.mjs";
import { parseMetadataConfig } from "./metadataConfig.mjs";
import { dateToIsoDate } from "./metadataSchema.mjs";
import { assertValidWorkMetadata } from "./workSchema.mjs";

/** @typedef {import("./workSchema.mjs").WorkMetadata} WorkMetadata */

const ROOT = join(fileURLToPath(new URL("..", import.meta.url)));
const POSTS_DIR = join(ROOT, "src/content/posts");
const WORKS_DIR = join(ROOT, "src/content/works");
const ABOUT_DIR = join(ROOT, "src/content/about");
const METADATA_CONFIG_FILE = join(ROOT, "src/content/metadata.toml");
const POST_ID_RE = /^\d{8}-[a-f0-9]{8}$/;
const WORK_ID_RE = /^[a-z0-9][a-z0-9-]*$/;

function readMetadataConfig() {
  if (!existsSync(METADATA_CONFIG_FILE)) {
    throw new Error(`${METADATA_CONFIG_FILE} is required`);
  }
  return parseMetadataConfig(readFileSync(METADATA_CONFIG_FILE, "utf8"));
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function firstAddedGitDate(filePath) {
  const relPath = relative(ROOT, filePath);
  try {
    const output = execFileSync(
      "git",
      ["log", "--diff-filter=A", "--follow", "--format=%cI", "--", relPath],
      { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
    ).trim();
    if (!output) return "";
    const dates = output.split(/\r?\n/).filter(Boolean);
    return dates.at(-1)?.slice(0, 10) || "";
  } catch {
    return "";
  }
}

function resolveDate(meta, filePath) {
  const date = dateToIsoDate(meta.date);
  if (date !== "auto") return normalizeIsoDate(date);
  const gitDate = firstAddedGitDate(filePath);
  if (gitDate) return normalizeIsoDate(gitDate);
  if (process.env.CI) {
    throw new Error(`${filePath}: date = "auto" could not be resolved from git history`);
  }
  return todayIsoDate();
}

function resolveSummary(meta) {
  const sumup = meta.sumup;
  if (!sumup || sumup.mode === "none") return "";
  if (sumup.mode === "text") return sumup.text || "";
  return "";
}

function resolveThumbnail(meta, config) {
  const thumbnail = meta.thumbnail;
  if (thumbnail?.mode === "file") return thumbnail.path;
  return config.thumbnail?.default_path || "";
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

function readPost(dirName, config) {
  if (!POST_ID_RE.test(dirName)) {
    throw new Error(`Invalid post directory name: ${dirName}`);
  }
  const dir = join(POSTS_DIR, dirName);
  const jaPath = join(dir, "index.ja.md");
  const enPath = join(dir, "index.en.md");
  const ja = parseMarkdownFrontmatter(readFileSync(jaPath, "utf8"), jaPath);
  const en = parseMarkdownFrontmatter(readFileSync(enPath, "utf8"), enPath);
  const common = { ...en.meta, ...ja.meta };
  const date = resolveDate(common, common.date === ja.meta.date ? jaPath : enPath);
  const post = {
    id: dirName,
    title: { ja: ja.meta.title || "", en: en.meta.title || "" },
    date,
    dateLabel: makeDateLabel(date),
    reading: { ja: estimateReadingMinutes(ja.body), en: estimateReadingMinutes(en.body) },
    tags: Array.isArray(common.tags) ? common.tags.map(String) : [],
    kana: String(common.kana || ""),
    summary: { ja: resolveSummary(ja.meta), en: resolveSummary(en.meta) },
    thumbnail: resolveThumbnail(common, config),
  };
  return { post, body: localizeMarkdown(ja.body, en.body) };
}

/**
 * @typedef {Object} AboutFile
 * @property {Record<string, any>} [person]
 * @property {{ file?: string, count?: number }} [news]
 */

function readAbout(locale) {
  const file = join(ABOUT_DIR, `about.${locale}.toml`);
  const data = /** @type {AboutFile} */ (parseToml(readFileSync(file, "utf8")));
  return { person: data.person || {}, news: data.news || {} };
}

// Newest first, capped by `count`. A missing or non-positive `count` shows
// every entry. `source` only names the file in error messages.
export function normalizeNewsEntries(entries, count, source = "news") {
  const items = Array.isArray(entries) ? entries : [];
  const limit = Number.isFinite(Number(count)) && Number(count) > 0 ? Math.floor(count) : Infinity;
  return items
    .map((entry) => {
      const date = normalizeIsoDate(entry.date);
      if (!date) {
        throw new Error(`${source}: news entry "${entry.title || ""}" needs a YYYY-MM-DD date`);
      }
      const item = {
        date,
        dateLabel: makeDateLabel(date),
        title: String(entry.title || ""),
        description: String(entry.description || ""),
      };
      if (entry.href) item.href = String(entry.href);
      return item;
    })
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, limit);
}

// `[news] file` names a sibling of the about file; `[news] count` caps how many
// of the newest entries reach the page. An empty `file` disables the section.
function readNews(config) {
  const fileName = String(config.file || "").trim();
  if (!fileName) return [];
  const file = join(ABOUT_DIR, fileName);
  if (!existsSync(file)) {
    throw new Error(`${file} is referenced by [news] file but does not exist`);
  }
  return normalizeNewsEntries(parseToml(readFileSync(file, "utf8")).news, config.count, file);
}

function newsWatchFiles() {
  const files = [];
  for (const locale of ["ja", "en"]) {
    const aboutFile = join(ABOUT_DIR, `about.${locale}.toml`);
    if (!existsSync(aboutFile)) continue;
    const fileName = String(readAbout(locale).news.file || "").trim();
    if (fileName) files.push(join(ABOUT_DIR, fileName));
  }
  return files;
}

// A work is addressed by its slug, which becomes the URL segment, so it stays
// lowercase and hyphenated rather than the date-and-hash form posts use.
function readWork(dirName) {
  if (!WORK_ID_RE.test(dirName)) {
    throw new Error(`Invalid work directory name: ${dirName}`);
  }
  const dir = join(WORKS_DIR, dirName);
  const jaPath = join(dir, "index.ja.md");
  const enPath = join(dir, "index.en.md");
  // Parsed without the post schema, then validated against the work one.
  const jaFile = parseMarkdownFrontmatter(readFileSync(jaPath, "utf8"), jaPath, {
    validate: false,
  });
  const enFile = parseMarkdownFrontmatter(readFileSync(enPath, "utf8"), enPath, {
    validate: false,
  });
  const ja = /** @type {WorkMetadata} */ (assertValidWorkMetadata(jaFile.meta, jaPath));
  const en = /** @type {WorkMetadata} */ (assertValidWorkMetadata(enFile.meta, enPath));
  // Japanese wins for the values that are not per-locale, matching readPost().
  const common = { ...en, ...ja };
  const work = {
    id: dirName,
    title: { ja: ja.title || "", en: en.title || "" },
    tagline: { ja: ja.tagline || "", en: en.tagline || "" },
    summary: { ja: ja.summary || "", en: en.summary || "" },
    stack: Array.isArray(common.stack) ? common.stack.map(String) : [],
    year: Number(common.year),
    thumbnail: String(common.thumbnail || ""),
    hero: String(common.hero || ""),
  };
  return { work, body: { ja: jaFile.body, en: enFile.body } };
}

function readWorkEntries() {
  if (!existsSync(WORKS_DIR)) return [];
  return readdirSync(WORKS_DIR, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name)
    .sort()
    .map(readWork)
    .sort((a, b) => b.work.year - a.work.year || a.work.id.localeCompare(b.work.id));
}

function postDirectories() {
  if (!existsSync(POSTS_DIR)) return [];
  return readdirSync(POSTS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();
}

function readPostEntries(config) {
  return postDirectories()
    .map((dir) => readPost(dir, config))
    .sort((a, b) => b.post.date.localeCompare(a.post.date));
}

function articleBodiesFromEntries(entries) {
  return Object.fromEntries(entries.map((entry) => [entry.post.id, entry.body]));
}

function uniqueTags(posts) {
  return [...new Set(posts.flatMap((post) => post.tags))];
}

export function relatedPostIds(post, posts, limit = 3) {
  if (!post || !Array.isArray(posts)) return [];
  const postTags = Array.isArray(post.tags) ? post.tags : [];
  return posts
    .filter((candidate) => candidate && candidate.id !== post.id)
    .map((candidate) => ({
      post: candidate,
      score: (Array.isArray(candidate.tags) ? candidate.tags : []).filter((tag) =>
        postTags.includes(tag),
      ).length,
    }))
    .sort(
      (a, b) =>
        b.score - a.score || String(b.post.date || "").localeCompare(String(a.post.date || "")),
    )
    .slice(0, limit)
    .map((ranked) => ranked.post.id);
}

function withRelatedIds(posts) {
  return posts.map((post) => ({
    ...post,
    relatedIds: relatedPostIds(post, posts),
  }));
}

// The locale files are zipped by index, so a drifting entry count would quietly
// render blank English fields. Fail the build instead — this is easy to hit when
// only one locale gets a new entry.
export function assertLocaleParity(field, jaItems, enItems, source = "about") {
  const jaCount = (jaItems || []).length;
  const enCount = (enItems || []).length;
  if (jaCount !== enCount) {
    throw new Error(
      `${field}: ${source}.ja.toml has ${jaCount} entries but ${source}.en.toml has ${enCount}; ` +
        "the two locales are matched by position and must stay the same length",
    );
  }
}

function localizeAbout(ja, en) {
  for (const field of ["career", "education", "activities"]) {
    assertLocaleParity(field, ja[field], en[field]);
  }
  const person = {
    icon: ja.icon || en.icon || "",
    name: { ja: ja.name || "", en: en.name || "" },
    role: { ja: ja.role || "", en: en.role || "" },
    location: { ja: ja.location || "", en: en.location || "" },
    tagline: { ja: ja.tagline || "", en: en.tagline || "" },
    bio: { ja: ja.bio || [], en: en.bio || [] },
    // `period` is localized too: it can carry words ("現在" / "now"), not just dates.
    career: (ja.career || []).map((item, i) => ({
      period: { ja: item.period || "", en: en.career?.[i]?.period || item.period || "" },
      role: { ja: item.role || "", en: en.career?.[i]?.role || "" },
      org: { ja: item.org || "", en: en.career?.[i]?.org || "" },
    })),
    education: (ja.education || []).map((item, i) => ({
      period: { ja: item.period || "", en: en.education?.[i]?.period || item.period || "" },
      school: { ja: item.school || "", en: en.education?.[i]?.school || "" },
      description: { ja: item.description || "", en: en.education?.[i]?.description || "" },
    })),
    // An activity with no description renders as a plain row instead of an
    // expandable one, so the detail text is authored entirely in the TOML.
    activities: (ja.activities || []).map((item, i) => ({
      title: { ja: item.title || "", en: en.activities?.[i]?.title || "" },
      description: { ja: item.description || "", en: en.activities?.[i]?.description || "" },
    })),
    // `href` is optional: a link without one renders as plain text (e.g. an
    // email address written out to keep it away from scrapers).
    links: ja.links || en.links || [],
  };
  return person;
}

export function loadSiteContent() {
  const metadataConfig = readMetadataConfig();
  const entries = readPostEntries(metadataConfig);
  const posts = withRelatedIds(entries.map((entry) => entry.post));
  const articleBodies = articleBodiesFromEntries(entries);
  const tags = uniqueTags(posts);
  const workEntries = readWorkEntries();
  const ja = readAbout("ja");
  const en = readAbout("en");
  const person = localizeAbout(ja.person, en.person);
  const news = { ja: readNews(ja.news), en: readNews(en.news) };
  // News is not index-zipped, but a locale missing entries silently empties the
  // News section on that language's page, so hold both files to the same count.
  assertLocaleParity("news", news.ja, news.en, "news");
  return {
    POSTS: posts,
    TAGS: tags,
    ARTICLE_BODIES: articleBodies,
    PERSON: person,
    NEWS: news,
    // Named APPS because the Works page routes under /app; the content lives in
    // src/content/works/.
    APPS: workEntries.map((entry) => entry.work),
    WORK_BODIES: Object.fromEntries(workEntries.map((entry) => [entry.work.id, entry.body])),
  };
}

export async function renderArticleBodies(content) {
  const copyLabels = { ja: "コードをコピー", en: "Copy code" };
  const entries = await Promise.all(
    Object.entries(content.ARTICLE_BODIES).map(async ([id, body]) => [
      id,
      {
        ja: await renderArticleBody(body.ja, { copyLabel: copyLabels.ja }),
        en: await renderArticleBody(body.en, { copyLabel: copyLabels.en }),
        headings: body.headings,
      },
    ]),
  );
  const works = await Promise.all(
    Object.entries(content.WORK_BODIES || {}).map(async ([id, body]) => [
      id,
      {
        ja: await renderArticleBody(body.ja, { copyLabel: copyLabels.ja }),
        en: await renderArticleBody(body.en, { copyLabel: copyLabels.en }),
      },
    ]),
  );
  return {
    ...content,
    ARTICLE_BODIES: Object.fromEntries(entries),
    WORK_BODIES: Object.fromEntries(works),
  };
}

export function contentWatchFiles() {
  const files = [
    join(ABOUT_DIR, "about.ja.toml"),
    join(ABOUT_DIR, "about.en.toml"),
    ...newsWatchFiles(),
    METADATA_CONFIG_FILE,
  ];
  const metadataConfig = existsSync(METADATA_CONFIG_FILE) ? readMetadataConfig() : {};
  const promptFile = metadataConfig.tag_generation?.prompt_file;
  if (promptFile) files.push(join(ROOT, promptFile));
  for (const contentDir of [POSTS_DIR, WORKS_DIR]) {
    if (!existsSync(contentDir)) continue;
    for (const dirent of readdirSync(contentDir, { withFileTypes: true })) {
      if (!dirent.isDirectory()) continue;
      const dir = join(contentDir, dirent.name);
      files.push(join(dir, "index.ja.md"), join(dir, "index.en.md"));
    }
  }
  return files;
}

export function worksDir() {
  return WORKS_DIR;
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
