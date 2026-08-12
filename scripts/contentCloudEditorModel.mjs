import { parse as parseToml } from "smol-toml";

import { postMarkdownTemplate, workMarkdownTemplate } from "./contentScaffold.mjs";
import {
  assertContentId,
  EditorContentError,
  serializeEditorAbout,
  serializeEditorMarkdown,
} from "./contentEditorModel.mjs";
import { parseMarkdownFrontmatter } from "./frontmatter.mjs";

const ASSET_SEGMENTS = { post: "posts", work: "works", about: "about" };

function cloneFiles(files) {
  return structuredClone(files || {});
}

function parseAboutSource(source, locale) {
  const bundle = JSON.parse(source);
  const about = parseToml(bundle.about || "");
  const news = parseToml(bundle.news || "");
  return {
    meta: {
      person: about.person || {},
      newsConfig: about.news || { file: `news.${locale}.toml`, count: 5 },
      newsItems: Array.isArray(news.news) ? news.news : [],
    },
    body: "",
  };
}

function parseSource(kind, source, locale) {
  if (kind === "about") return parseAboutSource(source, locale);
  const parsed = parseMarkdownFrontmatter(source, `${kind}/${locale}`, { validate: false });
  return { meta: parsed.meta, body: parsed.body };
}

function editorFiles(value) {
  const embedded = value.revision?.documents?.files;
  const files =
    embedded?.ja && embedded?.en
      ? cloneFiles(embedded)
      : {
          ja: parseSource(value.kind, value.revision.sourceJa, "ja"),
          en: parseSource(value.kind, value.revision.sourceEn, "en"),
        };
  for (const locale of ["ja", "en"]) {
    files[locale].revision = value.currentRevisionId;
  }
  return files;
}

export function cloudContentStatus(value) {
  if (value.deletedAt) return "deleted";
  return value.visibility === "public" ? "public" : "private";
}

export function fromCloudContent(value) {
  const files = editorFiles(value);
  return {
    kind: value.kind,
    id: value.id,
    itemId: value.itemId,
    visibility: value.visibility,
    deletedAt: value.deletedAt,
    currentRevisionId: value.currentRevisionId,
    publishedRevisionId: value.publishedRevisionId,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
    status: cloudContentStatus(value),
    assets: value.assets || [],
    revisionMetadata: value.revision?.metadata || {},
    files,
  };
}

export function cloudListItem(value) {
  const content = fromCloudContent(value);
  const ja = content.files.ja.meta || {};
  const en = content.files.en.meta || {};
  return {
    kind: content.kind,
    id: content.id,
    title: {
      ja: String(content.kind === "about" ? ja.person?.name || "About" : ja.title || ""),
      en: String(content.kind === "about" ? en.person?.name || "About" : en.title || ""),
    },
    tags: Array.isArray(ja.tags) ? ja.tags : [],
    stack: Array.isArray(ja.stack) ? ja.stack : [],
    updatedAt: content.updatedAt,
    visibility: content.visibility,
    deletedAt: content.deletedAt,
    currentRevisionId: content.currentRevisionId,
    publishedRevisionId: content.publishedRevisionId,
    status: content.status,
  };
}

function serializeLocale(content, locale) {
  if (content.kind === "about") {
    return JSON.stringify(
      serializeEditorAbout(locale, content.files[locale].meta, { validate: false }),
    );
  }
  return serializeEditorMarkdown(
    content.kind,
    locale,
    content.files[locale].meta,
    content.files[locale].body,
    { validate: false },
  );
}

export function toCloudRevision(content) {
  return {
    sourceJa: serializeLocale(content, "ja"),
    sourceEn: serializeLocale(content, "en"),
    documents: {
      files: {
        ja: { meta: cloneFiles(content.files.ja.meta), body: content.files.ja.body || "" },
        en: { meta: cloneFiles(content.files.en.meta), body: content.files.en.body || "" },
      },
    },
    metadata: content.revisionMetadata || {},
    expectedRevisionId: content.currentRevisionId,
    createdBy: "local-editor",
  };
}

function parseTemplate(kind, locale) {
  const source = kind === "post" ? postMarkdownTemplate(locale) : workMarkdownTemplate(locale);
  return parseSource(kind, source, locale);
}

export function newCloudContent(kind, id) {
  assertContentId(kind, id);
  if (kind === "about") {
    throw new EditorContentError(
      "About is a fixed page and cannot be created",
      405,
      "fixed_content",
    );
  }
  const content = {
    kind,
    id,
    visibility: "private",
    currentRevisionId: null,
    revisionMetadata: {},
    files: {
      ja: parseTemplate(kind, "ja"),
      en: parseTemplate(kind, "en"),
    },
  };
  return {
    kind,
    id,
    visibility: "private",
    ...toCloudRevision(content),
  };
}

export function nextCloudPostId(items, now = new Date()) {
  const existing = new Set(items.filter((item) => item.kind === "post").map((item) => item.id));
  const pad = (value) => String(value).padStart(2, "0");
  for (let index = 0; index < 256; index += 1) {
    const at = new Date(now.getTime() + index * 1000);
    const id = `${at.getFullYear()}${pad(at.getMonth() + 1)}${pad(at.getDate())}-${pad(at.getHours())}${pad(at.getMinutes())}${pad(at.getSeconds())}`;
    if (!existing.has(id)) return id;
  }
  throw new EditorContentError(
    "Could not generate a collision-free post ID",
    409,
    "content_conflict",
  );
}

export function validateCloudContent(content) {
  if (content.deletedAt || content.visibility === "private") return { valid: true, issues: [] };
  const issues = [];
  for (const locale of ["ja", "en"]) {
    try {
      if (content.kind === "about") {
        serializeEditorAbout(locale, content.files[locale].meta);
      } else {
        serializeEditorMarkdown(
          content.kind,
          locale,
          content.files[locale].meta,
          content.files[locale].body,
        );
        if (!String(content.files[locale].body || "").trim()) {
          issues.push({ locale, field: "body", message: "本文を入力してください" });
        }
      }
    } catch (error) {
      issues.push({ locale, field: "metadata", message: error.message });
    }
  }
  return { valid: issues.length === 0, issues };
}

export function cloudAssetLogicalPath(name) {
  return `assets/${name}`;
}

export function cloudAssetUrl(kind, id, name) {
  return `/content-assets/${ASSET_SEGMENTS[kind]}/${encodeURIComponent(id)}/${encodeURIComponent(name)}`;
}

export function safeCloudAssetName(originalName, existingPaths = []) {
  const extensionMatch = /\.[a-zA-Z0-9]{1,8}$/.exec(String(originalName || ""));
  const extension = (extensionMatch?.[0] || "").toLowerCase();
  const raw = String(originalName || "image").slice(0, extension ? -extension.length : undefined);
  const stem =
    raw
      .normalize("NFKD")
      .replace(/[^a-zA-Z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase()
      .slice(0, 80) || "image";
  const used = new Set(existingPaths.map((path) => String(path).replace(/^assets\//, "")));
  for (let index = 1; index < 10_000; index += 1) {
    const suffix = index === 1 ? "" : `-${index}`;
    const candidate = `${stem}${suffix}${extension}`;
    if (!used.has(candidate)) return candidate;
  }
  throw new EditorContentError(
    "Could not create a collision-free image name",
    409,
    "asset_conflict",
  );
}
