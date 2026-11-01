import { stringify as stringifyToml } from "smol-toml";
import { assertValidMetadata } from "./metadataSchema.mjs";
import { assertValidWorkMetadata } from "./workSchema.mjs";

export class EditorContentError extends Error {
  constructor(message, status = 400, code = "invalid_request") {
    super(message);
    this.name = "EditorContentError";
    this.status = status;
    this.code = code;
  }
}

const patterns = {
  post: /^\d{8}-(?:\d{6}|[a-f0-9]{8})$/,
  work: /^[a-z0-9][a-z0-9-]*$/,
  about: /^about$/,
};
function assertContentKind(kind) {
  if (!Object.hasOwn(patterns, kind))
    throw new EditorContentError(`Unknown content kind: ${kind}`, 404, "not_found");
  return patterns[kind];
}
export function assertContentId(kind, id) {
  if (!assertContentKind(kind).test(String(id || "")))
    throw new EditorContentError(`Invalid ${kind} id: ${id}`, 400, "invalid_id");
  return String(id);
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

  // The publication translates the Japanese source into the English one, so a
  // check that runs before publication cannot ask for English prose without
  // blocking the run that writes it. Structure is still required of both
  // locales — a date is not translated. Same rule as About; see
  // serializeEditorAbout.
  const requireText = locale === "ja";
  if (validate && kind === "post") {
    assertValidMetadata(normalized, `${kind}/${locale}`, { requireText });
  } else if (validate && kind === "work") {
    assertValidWorkMetadata(normalized, `${kind}/${locale}`, { locale, requireText });
  } else {
    assertContentKind(kind);
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
    // Japanese is the source; publication translates about.en.toml and
    // news.en.toml from it. Demanding English prose here would block the one
    // run that writes it. What English still has to bring is structure — a date
    // is not translated, and an entry without one cannot be read at all.
    const requireText = locale === "ja";
    if (requireText && !String(normalized.person.name ?? "").trim()) {
      throw new Error("Name is required");
    }
    for (const [index, item] of normalized.newsItems.entries()) {
      const date = String(item?.date ?? "").trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        throw new Error(`News ${index + 1}: date must use YYYY-MM-DD`);
      }
      if (requireText && !String(item?.title ?? "").trim()) {
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
