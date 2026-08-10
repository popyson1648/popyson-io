import { createHash } from "node:crypto";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";
import { parse as parseToml, stringify as stringifyToml } from "smol-toml";

import { createPostScaffold, createWorkScaffold } from "./contentScaffold.mjs";
import { parseMarkdownFrontmatter } from "./frontmatter.mjs";
import { assertValidMetadata } from "./metadataSchema.mjs";
import { assertValidWorkMetadata } from "./workSchema.mjs";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const DRAFT_ROOT = join(ROOT, ".drafts");
const POST_ID_RE = /^\d{8}-(?:\d{6}|[a-f0-9]{8})$/;
const WORK_ID_RE = /^[a-z0-9][a-z0-9-]*$/;
const ABOUT_ID_RE = /^about$/;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_HISTORY_ENTRIES = 100;
const AUTO_HISTORY_INTERVAL_MS = 10 * 60 * 1000;

export const EDITOR_KINDS = {
  post: {
    dir: join(ROOT, "src/content/posts"),
    draftDir: join(DRAFT_ROOT, "posts"),
    idPattern: POST_ID_RE,
    assetSegment: "posts",
  },
  work: {
    dir: join(ROOT, "src/content/works"),
    draftDir: join(DRAFT_ROOT, "works"),
    idPattern: WORK_ID_RE,
    assetSegment: "works",
  },
  about: {
    dir: join(ROOT, "src/content/about"),
    draftDir: join(DRAFT_ROOT, "about"),
    idPattern: ABOUT_ID_RE,
    assetSegment: "about",
    fixed: true,
  },
};

export class EditorContentError extends Error {
  constructor(message, status = 400, code = "invalid_request") {
    super(message);
    this.name = "EditorContentError";
    this.status = status;
    this.code = code;
  }
}

function kindConfig(kind) {
  const config = EDITOR_KINDS[kind];
  if (!config) throw new EditorContentError(`Unknown content kind: ${kind}`, 404, "not_found");
  return config;
}

export function assertContentId(kind, id) {
  const config = kindConfig(kind);
  if (!config.idPattern.test(String(id || ""))) {
    throw new EditorContentError(`Invalid ${kind} id: ${id}`, 400, "invalid_id");
  }
  return String(id);
}

export function contentDirectory(kind, id) {
  const config = kindConfig(kind);
  const safeId = assertContentId(kind, id);
  return config.fixed ? config.dir : join(config.dir, safeId);
}

export function draftDirectory(kind, id) {
  const config = kindConfig(kind);
  const safeId = assertContentId(kind, id);
  return config.fixed ? config.draftDir : join(config.draftDir, safeId);
}

function sourceDirectory(kind, id) {
  const draft = draftDirectory(kind, id);
  return existsSync(draft) ? draft : contentDirectory(kind, id);
}

function contentFile(kind, id, locale, directory = sourceDirectory(kind, id)) {
  if (!["ja", "en"].includes(locale)) {
    throw new EditorContentError(`Invalid locale: ${locale}`, 400, "invalid_locale");
  }
  return join(directory, kind === "about" ? `about.${locale}.toml` : `index.${locale}.md`);
}

function aboutNewsFile(locale, directory) {
  return join(directory, `news.${locale}.toml`);
}

export function sourceRevision(source) {
  return createHash("sha256").update(String(source)).digest("hex");
}

function editorFile(kind, id, locale, directory = sourceDirectory(kind, id)) {
  const filePath = contentFile(kind, id, locale, directory);
  if (!existsSync(filePath)) {
    throw new EditorContentError(
      `Content file does not exist: ${kind}/${id}/${locale}`,
      404,
      "not_found",
    );
  }
  const source = readFileSync(filePath, "utf8");
  if (kind === "about") {
    const newsPath = aboutNewsFile(locale, directory);
    if (!existsSync(newsPath)) {
      throw new EditorContentError(`About news file does not exist: ${locale}`, 404, "not_found");
    }
    const newsSource = readFileSync(newsPath, "utf8");
    const data = parseToml(source);
    const newsData = parseToml(newsSource);
    return {
      meta: {
        person: data.person || {},
        newsConfig: data.news || {},
        newsItems: Array.isArray(newsData.news) ? newsData.news : [],
      },
      body: "",
      revision: sourceRevision(`${source}\0${newsSource}`),
    };
  }
  const parsed = parseMarkdownFrontmatter(source, filePath, { validate: false });
  return {
    meta: parsed.meta,
    body: parsed.body,
    revision: sourceRevision(source),
  };
}

export function readEditorContent(kind, id) {
  assertContentId(kind, id);
  const draft = draftDirectory(kind, id);
  const published = contentDirectory(kind, id);
  const hasDraft = existsSync(draft);
  const hasPublished = existsSync(published);
  if (!hasDraft && !hasPublished) {
    throw new EditorContentError(`Content does not exist: ${kind}/${id}`, 404, "not_found");
  }
  const directory = hasDraft ? draft : published;
  return {
    kind,
    id,
    status: hasDraft ? (hasPublished ? "published_with_draft" : "draft") : "published",
    files: {
      ja: editorFile(kind, id, "ja", directory),
      en: editorFile(kind, id, "en", directory),
    },
  };
}

function readListItem(kind, id) {
  try {
    const content = readEditorContent(kind, id);
    const listMeta = /** @type {Record<string, any>} */ (content.files.ja.meta);
    const jaMeta = /** @type {Record<string, any>} */ (content.files.ja.meta);
    const enMeta = /** @type {Record<string, any>} */ (content.files.en.meta);
    const directory = sourceDirectory(kind, id);
    const filePaths = [
      contentFile(kind, id, "ja", directory),
      contentFile(kind, id, "en", directory),
    ];
    if (kind === "about") {
      filePaths.push(aboutNewsFile("ja", directory), aboutNewsFile("en", directory));
    }
    return {
      kind,
      id,
      title: {
        ja: String(kind === "about" ? jaMeta.person?.name || "About" : jaMeta.title || ""),
        en: String(kind === "about" ? enMeta.person?.name || "About" : enMeta.title || ""),
      },
      tags: Array.isArray(listMeta.tags) ? listMeta.tags : [],
      stack: Array.isArray(listMeta.stack) ? listMeta.stack : [],
      updatedAt: new Date(
        Math.max(...filePaths.map((file) => statSync(file).mtimeMs)),
      ).toISOString(),
      status: content.status,
    };
  } catch (error) {
    return {
      kind,
      id,
      title: { ja: "", en: "" },
      updatedAt: "",
      error: error.message,
    };
  }
}

export function listEditorContent() {
  return Object.entries(EDITOR_KINDS).flatMap(([kind, config]) => {
    if (config.fixed) return existsSync(config.dir) ? [readListItem(kind, "about")] : [];
    const ids = new Set();
    for (const directory of [config.dir, config.draftDir]) {
      if (!existsSync(directory)) continue;
      for (const entry of readdirSync(directory, { withFileTypes: true })) {
        if (entry.isDirectory() && config.idPattern.test(entry.name)) ids.add(entry.name);
      }
    }
    return [...ids].map((id) => readListItem(kind, id));
  });
}

function ensureDraftFromPublished(kind, id) {
  const draft = draftDirectory(kind, id);
  if (existsSync(draft)) return draft;
  const published = contentDirectory(kind, id);
  if (!existsSync(published)) {
    throw new EditorContentError(`Content does not exist: ${kind}/${id}`, 404, "not_found");
  }
  mkdirSync(dirname(draft), { recursive: true });
  cpSync(published, draft, { recursive: true, errorOnExist: true });
  return draft;
}

function cleanObject(value) {
  if (Array.isArray(value)) return value.map(cleanObject);
  if (!value || typeof value !== "object" || value instanceof Date) return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([, child]) => child !== undefined && child !== null)
      .map(([key, child]) => [key, cleanObject(child)]),
  );
}

export function serializeEditorMarkdown(kind, locale, meta, body, { validate = true } = {}) {
  const normalized = cleanObject(structuredClone(meta || {}));
  if (kind === "work" && locale === "en") {
    for (const field of ["year", "stack", "thumbnail", "hero"]) delete normalized[field];
  }

  if (validate && kind === "post") {
    assertValidMetadata(normalized, `${kind}/${locale}`);
  } else if (validate && kind === "work") {
    assertValidWorkMetadata(normalized, `${kind}/${locale}`, { locale });
  } else {
    kindConfig(kind);
  }

  return `+++\n${stringifyToml(normalized).trimEnd()}\n+++\n\n${String(body || "")}`;
}

function normalizeAboutMeta(locale, meta) {
  const person = cleanObject(structuredClone(meta?.person || {}));
  const newsItems = cleanObject(
    (Array.isArray(meta?.newsItems) ? meta.newsItems : []).map((item) => ({
      ...item,
      date: item?.date instanceof Date ? item.date.toISOString().slice(0, 10) : item?.date,
    })),
  );
  const count = Number.parseInt(meta?.newsConfig?.count, 10);
  return {
    person,
    newsConfig: {
      file: `news.${locale}.toml`,
      count: Number.isFinite(count) && count > 0 ? count : 5,
    },
    newsItems,
  };
}

export function serializeEditorAbout(locale, meta, { validate = true } = {}) {
  if (!["ja", "en"].includes(locale)) {
    throw new EditorContentError(`Invalid locale: ${locale}`, 400, "invalid_locale");
  }
  const normalized = normalizeAboutMeta(locale, meta);
  if (validate) {
    if (!String(normalized.person.name ?? "").trim()) throw new Error("Name is required");
    for (const [index, item] of normalized.newsItems.entries()) {
      const date = String(item?.date ?? "").trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        throw new Error(`News ${index + 1}: date must use YYYY-MM-DD`);
      }
      if (!String(item?.title ?? "").trim()) {
        throw new Error(`News ${index + 1}: title is required`);
      }
    }
  }
  return {
    about: `${stringifyToml({
      person: normalized.person,
      news: normalized.newsConfig,
    }).trimEnd()}\n`,
    news: `${stringifyToml({ news: normalized.newsItems }).trimEnd()}\n`,
  };
}

function validateAboutPair(files) {
  for (const field of ["activities", "career", "education"]) {
    const jaCount = Array.isArray(files.ja.meta?.person?.[field])
      ? files.ja.meta.person[field].length
      : 0;
    const enCount = Array.isArray(files.en.meta?.person?.[field])
      ? files.en.meta.person[field].length
      : 0;
    if (jaCount !== enCount) {
      throw new Error(`${field}: Japanese and English item counts differ`);
    }
  }
  const jaNews = Array.isArray(files.ja.meta?.newsItems) ? files.ja.meta.newsItems.length : 0;
  const enNews = Array.isArray(files.en.meta?.newsItems) ? files.en.meta.newsItems.length : 0;
  if (jaNews !== enNews) throw new Error("news: Japanese and English item counts differ");
}

function historyDirectory(kind, id) {
  const config = kindConfig(kind);
  return join(dirname(config.draftDir), ".history", config.assetSegment, assertContentId(kind, id));
}

function historyEntries(kind, id) {
  const directory = historyDirectory(kind, id);
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && /^[0-9TZ.-]+-[a-f0-9]{12}$/.test(entry.name))
    .map((entry) => {
      try {
        return JSON.parse(readFileSync(join(directory, entry.name, "manifest.json"), "utf8"));
      } catch {
        return null;
      }
    })
    .filter(Boolean)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function draftSourceFiles(kind, id, directory) {
  if (kind === "about") {
    return ["ja", "en"].flatMap((locale) => [
      {
        name: `about.${locale}.toml`,
        source: readFileSync(contentFile(kind, id, locale, directory), "utf8"),
      },
      {
        name: `news.${locale}.toml`,
        source: readFileSync(aboutNewsFile(locale, directory), "utf8"),
      },
    ]);
  }
  return ["ja", "en"].map((locale) => ({
    name: `index.${locale}.md`,
    source: readFileSync(contentFile(kind, id, locale, directory), "utf8"),
  }));
}

function captureDraftHistory(kind, id, { force = false } = {}) {
  const draft = draftDirectory(kind, id);
  if (!existsSync(draft)) return;
  const sources = draftSourceFiles(kind, id, draft);
  const revision = sourceRevision(sources.map(({ source }) => source).join("\0"));
  const entries = historyEntries(kind, id);
  if (entries[0]?.revision === revision) return;
  if (
    !force &&
    entries[0] &&
    Date.now() - new Date(entries[0].createdAt).getTime() < AUTO_HISTORY_INTERVAL_MS
  ) {
    return;
  }

  const createdAt = new Date().toISOString();
  const historyId = `${createdAt.replace(/:/g, "-")}-${revision.slice(0, 12)}`;
  const directory = join(historyDirectory(kind, id), historyId);
  mkdirSync(directory, { recursive: true });
  for (const file of sources) {
    writeFileSync(join(directory, file.name), file.source);
  }
  const jaMeta = /** @type {Record<string, any>} */ (editorFile(kind, id, "ja", draft).meta);
  const enMeta = /** @type {Record<string, any>} */ (editorFile(kind, id, "en", draft).meta);
  writeFileSync(
    join(directory, "manifest.json"),
    JSON.stringify({
      id: historyId,
      createdAt,
      revision,
      title: {
        ja: (kind === "about" ? jaMeta.person?.name : jaMeta.title) || "",
        en: (kind === "about" ? enMeta.person?.name : enMeta.title) || "",
      },
    }),
  );

  for (const entry of historyEntries(kind, id).slice(MAX_HISTORY_ENTRIES)) {
    rmSync(join(historyDirectory(kind, id), entry.id), { recursive: true, force: true });
  }
}

export function saveEditorContent(kind, id, files, { checkpoint = false } = {}) {
  assertContentId(kind, id);
  if (!files?.ja || !files?.en) {
    throw new EditorContentError(
      "Both Japanese and English files are required",
      400,
      "locale_pair_required",
    );
  }

  const current = readEditorContent(kind, id);
  for (const locale of ["ja", "en"]) {
    if (files[locale].revision !== current.files[locale].revision) {
      throw new EditorContentError(
        `${locale.toUpperCase()} content changed on disk. Reload before saving.`,
        409,
        "revision_conflict",
      );
    }
  }

  const draft = ensureDraftFromPublished(kind, id);
  captureDraftHistory(kind, id, { force: checkpoint });
  for (const locale of ["ja", "en"]) {
    if (kind === "about") {
      const source = serializeEditorAbout(locale, files[locale].meta, { validate: false });
      writeFileSync(contentFile(kind, id, locale, draft), source.about);
      writeFileSync(aboutNewsFile(locale, draft), source.news);
    } else {
      const source = serializeEditorMarkdown(kind, locale, files[locale].meta, files[locale].body, {
        validate: false,
      });
      writeFileSync(contentFile(kind, id, locale, draft), source);
    }
  }
  return readEditorContent(kind, id);
}

export function listEditorHistory(kind, id) {
  readEditorContent(kind, id);
  return historyEntries(kind, id);
}

export function restoreEditorHistory(kind, id, historyId, expectedRevisions) {
  const current = readEditorContent(kind, id);
  for (const locale of ["ja", "en"]) {
    if (expectedRevisions?.[locale] !== current.files[locale].revision) {
      throw new EditorContentError(
        "Content changed after the history panel was opened",
        409,
        "revision_conflict",
      );
    }
  }
  const entries = historyEntries(kind, id);
  if (!entries.some((entry) => entry.id === historyId)) {
    throw new EditorContentError("Draft history entry not found", 404, "not_found");
  }
  const source = join(historyDirectory(kind, id), historyId);
  const draft = ensureDraftFromPublished(kind, id);
  captureDraftHistory(kind, id, { force: true });
  for (const file of draftSourceFiles(kind, id, source)) {
    writeFileSync(join(draft, file.name), file.source);
  }
  return readEditorContent(kind, id);
}

export function discardEditorDraft(kind, id) {
  const draft = draftDirectory(kind, id);
  const published = contentDirectory(kind, id);
  if (!existsSync(draft)) {
    throw new EditorContentError("No draft exists", 404, "draft_not_found");
  }
  rmSync(draft, { recursive: true, force: true });
  if (existsSync(published)) return readEditorContent(kind, id);
  rmSync(historyDirectory(kind, id), { recursive: true, force: true });
  return { kind, id, deleted: true };
}

export function validateEditorDraft(kind, id) {
  const content = readEditorContent(kind, id);
  const issues = [];
  if (kind === "about") {
    try {
      validateAboutPair(content.files);
    } catch (error) {
      issues.push({ locale: "both", field: "structure", message: error.message });
    }
  }
  for (const locale of ["ja", "en"]) {
    try {
      if (kind === "about") {
        serializeEditorAbout(locale, content.files[locale].meta);
      } else {
        serializeEditorMarkdown(
          kind,
          locale,
          content.files[locale].meta,
          content.files[locale].body,
        );
      }
      if (kind !== "about" && !String(content.files[locale].body || "").trim()) {
        issues.push({ locale, field: "body", message: "本文を入力してください" });
      }
    } catch (error) {
      issues.push({ locale, field: "metadata", message: error.message });
    }
  }
  return { valid: issues.length === 0, issues };
}

/** @param {"post" | "work" | "about"} kind @param {{ slug?: string }} [options] */
export function createEditorContent(kind, { slug } = {}) {
  const config = kindConfig(kind);
  let created;
  if (kind === "post") {
    created = createPostScaffold(config.draftDir, { reservedDirs: [config.dir] });
  } else if (kind === "work") {
    const id = String(slug || "");
    assertContentId(kind, id);
    if (existsSync(contentDirectory(kind, id))) {
      throw new EditorContentError(`Already exists: ${kind}/${id}`, 409, "content_conflict");
    }
    created = createWorkScaffold(config.draftDir, id);
  } else {
    throw new EditorContentError(
      "About is a fixed page and cannot be created",
      405,
      "fixed_content",
    );
  }
  return readEditorContent(kind, created.id);
}

const IMAGE_TYPES = {
  "image/png": {
    extension: ".png",
    matches: (bytes) => bytes.subarray(0, 8).equals(Buffer.from("89504e470d0a1a0a", "hex")),
  },
  "image/jpeg": {
    extension: ".jpg",
    matches: (bytes) => bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff,
  },
  "image/gif": {
    extension: ".gif",
    matches: (bytes) => ["GIF87a", "GIF89a"].includes(bytes.subarray(0, 6).toString("ascii")),
  },
  "image/webp": {
    extension: ".webp",
    matches: (bytes) =>
      bytes.subarray(0, 4).toString("ascii") === "RIFF" &&
      bytes.subarray(8, 12).toString("ascii") === "WEBP",
  },
};

const TRANSCODE_IMAGE_TYPES = new Set(["image/avif", "image/heic", "image/heif", "image/tiff"]);

function safeImageName(originalName, extension) {
  const rawBase = basename(String(originalName || "image"), extname(String(originalName || "")));
  const base = rawBase
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase()
    .slice(0, 80);
  return `${base || "image"}${extension}`;
}

function collisionFreeName(dir, preferred) {
  if (!existsSync(join(dir, preferred))) return preferred;
  const extension = extname(preferred);
  const stem = preferred.slice(0, -extension.length);
  for (let index = 2; index < 10_000; index += 1) {
    const candidate = `${stem}-${index}${extension}`;
    if (!existsSync(join(dir, candidate))) return candidate;
  }
  throw new EditorContentError(
    "Could not create a collision-free image name",
    409,
    "asset_conflict",
  );
}

export async function saveContentAsset(kind, id, { name, type, bytes }) {
  const config = kindConfig(kind);
  assertContentId(kind, id);
  let normalizedType = type;
  let buffer = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes || []);
  if (buffer.length === 0 || buffer.length > MAX_IMAGE_BYTES) {
    throw new EditorContentError("Image must be between 1 byte and 10 MB", 413, "image_too_large");
  }
  if (TRANSCODE_IMAGE_TYPES.has(type)) {
    try {
      buffer = await sharp(buffer, { limitInputPixels: 80_000_000 })
        .rotate()
        .webp({ quality: 86 })
        .toBuffer();
      normalizedType = "image/webp";
    } catch {
      throw new EditorContentError(
        "The selected photo could not be converted. Try exporting it as JPEG or PNG.",
        415,
        "unsupported_image",
      );
    }
  }
  const imageType = IMAGE_TYPES[normalizedType];
  if (!imageType) {
    throw new EditorContentError(
      "Only PNG, JPEG, GIF, WebP, AVIF, HEIC/HEIF, and TIFF images are supported",
      415,
      "unsupported_image",
    );
  }
  if (buffer.length > MAX_IMAGE_BYTES) {
    throw new EditorContentError("Image must be between 1 byte and 10 MB", 413, "image_too_large");
  }
  if (!imageType.matches(buffer)) {
    throw new EditorContentError(
      "Image bytes do not match the declared file type",
      415,
      "invalid_image",
    );
  }

  const draft = ensureDraftFromPublished(kind, id);
  const dir = join(draft, "assets");
  mkdirSync(dir, { recursive: true });
  const fileName = collisionFreeName(dir, safeImageName(name, imageType.extension));
  writeFileSync(join(dir, fileName), buffer, { flag: "wx" });
  return {
    name: fileName,
    url: `/content-assets/${config.assetSegment}/${id}/${encodeURIComponent(fileName)}`,
  };
}

export function resolveContentAsset(assetSegment, id, fileName, { preferDraft = false } = {}) {
  const entry = Object.entries(EDITOR_KINDS).find(
    ([, config]) => config.assetSegment === assetSegment,
  );
  if (!entry) throw new EditorContentError("Unknown asset kind", 404, "not_found");
  const [kind] = entry;
  assertContentId(kind, id);
  const decodedName = decodeURIComponent(fileName || "");
  if (decodedName !== basename(decodedName) || !/^[a-z0-9][a-z0-9._-]*$/i.test(decodedName)) {
    throw new EditorContentError("Invalid asset name", 400, "invalid_asset_name");
  }
  const candidates = preferDraft
    ? [
        join(draftDirectory(kind, id), "assets", decodedName),
        join(contentDirectory(kind, id), "assets", decodedName),
      ]
    : [join(contentDirectory(kind, id), "assets", decodedName)];
  const filePath = candidates.find((candidate) => existsSync(candidate));
  if (!filePath) throw new EditorContentError("Asset not found", 404, "not_found");
  return filePath;
}

export function promoteEditorDraft(kind, id) {
  kindConfig(kind);
  const draft = draftDirectory(kind, id);
  if (!existsSync(draft)) {
    throw new EditorContentError(`Draft does not exist: ${kind}/${id}`, 404, "draft_not_found");
  }
  // Drafts may be intentionally incomplete. Validate the complete locale pair
  // only at the explicit publish boundary.
  try {
    const files = {};
    for (const locale of ["ja", "en"]) {
      const file = editorFile(kind, id, locale, draft);
      files[locale] = file;
      if (kind === "about") serializeEditorAbout(locale, file.meta);
      else serializeEditorMarkdown(kind, locale, file.meta, file.body);
    }
    if (kind === "about") validateAboutPair(files);
  } catch (error) {
    throw new EditorContentError(error.message, 422, "invalid_draft");
  }

  const published = contentDirectory(kind, id);
  const parent = dirname(published);
  mkdirSync(parent, { recursive: true });
  const stem = basename(published);
  const next = join(parent, `.${stem}.editor-next-${process.pid}`);
  const backup = join(parent, `.${stem}.editor-backup-${process.pid}`);
  rmSync(next, { recursive: true, force: true });
  rmSync(backup, { recursive: true, force: true });
  cpSync(draft, next, { recursive: true });
  try {
    if (existsSync(published)) renameSync(published, backup);
    renameSync(next, published);
    rmSync(backup, { recursive: true, force: true });
  } catch (error) {
    rmSync(next, { recursive: true, force: true });
    if (!existsSync(published) && existsSync(backup)) renameSync(backup, published);
    throw error;
  }
  return published;
}

export function removeEditorDraft(kind, id) {
  rmSync(draftDirectory(kind, id), { recursive: true, force: true });
}

export function listContentAssets() {
  const assets = [];
  for (const [kind, config] of Object.entries(EDITOR_KINDS)) {
    if (!existsSync(config.dir)) continue;
    if (config.fixed) {
      const dir = join(config.dir, "assets");
      if (!existsSync(dir)) continue;
      for (const file of readdirSync(dir, { withFileTypes: true })) {
        if (!file.isFile()) continue;
        assets.push({
          kind,
          id: "about",
          name: file.name,
          filePath: join(dir, file.name),
          outputPath: `content-assets/${config.assetSegment}/about/${file.name}`,
        });
      }
      continue;
    }
    for (const entry of readdirSync(config.dir, { withFileTypes: true })) {
      if (!entry.isDirectory() || !config.idPattern.test(entry.name)) continue;
      const dir = join(config.dir, entry.name, "assets");
      if (!existsSync(dir)) continue;
      for (const file of readdirSync(dir, { withFileTypes: true })) {
        if (!file.isFile()) continue;
        assets.push({
          kind,
          id: entry.name,
          name: file.name,
          filePath: join(dir, file.name),
          outputPath: `content-assets/${config.assetSegment}/${entry.name}/${file.name}`,
        });
      }
    }
  }
  return assets;
}

export function editorRootDir() {
  return ROOT;
}
