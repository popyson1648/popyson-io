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
import { stringify as stringifyToml } from "smol-toml";

import { createPostScaffold, createWorkScaffold } from "./contentScaffold.mjs";
import { parseMarkdownFrontmatter } from "./frontmatter.mjs";
import { assertValidMetadata } from "./metadataSchema.mjs";
import { assertValidWorkMetadata } from "./workSchema.mjs";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const DRAFT_ROOT = join(ROOT, ".drafts");
const POST_ID_RE = /^\d{8}-(?:\d{6}|[a-f0-9]{8})$/;
const WORK_ID_RE = /^[a-z0-9][a-z0-9-]*$/;
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
  return join(config.dir, assertContentId(kind, id));
}

export function draftDirectory(kind, id) {
  const config = kindConfig(kind);
  return join(config.draftDir, assertContentId(kind, id));
}

function sourceDirectory(kind, id) {
  const draft = draftDirectory(kind, id);
  return existsSync(draft) ? draft : contentDirectory(kind, id);
}

function contentFile(kind, id, locale, directory = sourceDirectory(kind, id)) {
  if (!["ja", "en"].includes(locale)) {
    throw new EditorContentError(`Invalid locale: ${locale}`, 400, "invalid_locale");
  }
  return join(directory, `index.${locale}.md`);
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
    const directory = sourceDirectory(kind, id);
    const filePaths = [
      contentFile(kind, id, "ja", directory),
      contentFile(kind, id, "en", directory),
    ];
    return {
      kind,
      id,
      title: {
        ja: String(content.files.ja.meta.title || ""),
        en: String(content.files.en.meta.title || ""),
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
  mkdirSync(kindConfig(kind).draftDir, { recursive: true });
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

function captureDraftHistory(kind, id, { force = false } = {}) {
  const draft = draftDirectory(kind, id);
  if (!existsSync(draft)) return;
  const sources = Object.fromEntries(
    ["ja", "en"].map((locale) => [
      locale,
      readFileSync(contentFile(kind, id, locale, draft), "utf8"),
    ]),
  );
  const revision = sourceRevision(`${sources.ja}\0${sources.en}`);
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
  for (const locale of ["ja", "en"]) {
    writeFileSync(join(directory, `index.${locale}.md`), sources[locale]);
  }
  writeFileSync(
    join(directory, "manifest.json"),
    JSON.stringify({
      id: historyId,
      createdAt,
      revision,
      title: {
        ja: editorFile(kind, id, "ja", draft).meta.title || "",
        en: editorFile(kind, id, "en", draft).meta.title || "",
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

  const sources = Object.fromEntries(
    ["ja", "en"].map((locale) => [
      locale,
      serializeEditorMarkdown(kind, locale, files[locale].meta, files[locale].body, {
        validate: false,
      }),
    ]),
  );

  const draft = ensureDraftFromPublished(kind, id);
  captureDraftHistory(kind, id, { force: checkpoint });
  for (const locale of ["ja", "en"]) {
    writeFileSync(contentFile(kind, id, locale, draft), sources[locale]);
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
  for (const locale of ["ja", "en"]) {
    writeFileSync(
      contentFile(kind, id, locale, draft),
      readFileSync(join(source, `index.${locale}.md`), "utf8"),
    );
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
  for (const locale of ["ja", "en"]) {
    try {
      serializeEditorMarkdown(kind, locale, content.files[locale].meta, content.files[locale].body);
      if (!String(content.files[locale].body || "").trim()) {
        issues.push({ locale, field: "body", message: "本文を入力してください" });
      }
    } catch (error) {
      issues.push({ locale, field: "metadata", message: error.message });
    }
  }
  return { valid: issues.length === 0, issues };
}

/** @param {"post" | "work"} kind @param {{ slug?: string }} [options] */
export function createEditorContent(kind, { slug } = {}) {
  const config = kindConfig(kind);
  let created;
  if (kind === "post") {
    created = createPostScaffold(config.draftDir, { reservedDirs: [config.dir] });
  } else {
    const id = String(slug || "");
    assertContentId(kind, id);
    if (existsSync(contentDirectory(kind, id))) {
      throw new EditorContentError(`Already exists: ${kind}/${id}`, 409, "content_conflict");
    }
    created = createWorkScaffold(config.draftDir, id);
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
  const config = kindConfig(kind);
  const draft = draftDirectory(kind, id);
  if (!existsSync(draft)) {
    throw new EditorContentError(`Draft does not exist: ${kind}/${id}`, 404, "draft_not_found");
  }
  // Drafts may be intentionally incomplete. Validate the complete locale pair
  // only at the explicit publish boundary.
  try {
    for (const locale of ["ja", "en"]) {
      const file = editorFile(kind, id, locale, draft);
      serializeEditorMarkdown(kind, locale, file.meta, file.body);
    }
  } catch (error) {
    throw new EditorContentError(error.message, 422, "invalid_draft");
  }

  mkdirSync(config.dir, { recursive: true });
  const published = contentDirectory(kind, id);
  const next = join(config.dir, `.${id}.editor-next-${process.pid}`);
  const backup = join(config.dir, `.${id}.editor-backup-${process.pid}`);
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
