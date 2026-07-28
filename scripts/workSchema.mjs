/**
 * Front matter of a work under src/content/works/, one file per locale.
 *
 * @typedef {Object} WorkMetadata
 * @property {string} [title]
 * @property {string} [tagline]
 * @property {string} [summary]
 * @property {number} [year]
 * @property {string[]} [stack]
 * @property {string} [thumbnail]
 * @property {string} [hero]
 */

const TOP_LEVEL_FIELDS = new Set([
  "title",
  "tagline",
  "summary",
  "year",
  "stack",
  "thumbnail",
  "hero",
]);
const STRING_FIELDS = ["tagline", "summary", "thumbnail", "hero"];
const IMAGE_FIELDS = ["thumbnail", "hero"];

function isPlainObject(value) {
  return (
    value !== null && typeof value === "object" && !Array.isArray(value) && !(value instanceof Date)
  );
}

function addError(errors, field, reason) {
  errors.push({ field, reason });
}

export function validateWorkMetadata(meta) {
  const errors = [];

  if (!isPlainObject(meta)) {
    return [{ field: "frontmatter", reason: "must be a TOML table" }];
  }

  for (const field of Object.keys(meta)) {
    if (!TOP_LEVEL_FIELDS.has(field)) {
      addError(errors, field, "is not a supported metadata field");
    }
  }

  if (!("title" in meta)) {
    addError(errors, "title", "is required");
  } else if (typeof meta.title !== "string" || meta.title.trim() === "") {
    addError(errors, "title", "must be a non-empty string");
  }

  if (!("year" in meta)) {
    addError(errors, "year", "is required");
  } else if (!Number.isInteger(meta.year)) {
    addError(errors, "year", "must be an integer");
  }

  for (const field of STRING_FIELDS) {
    if (field in meta && typeof meta[field] !== "string") {
      addError(errors, field, "must be a string");
    }
  }

  if ("stack" in meta) {
    if (!Array.isArray(meta.stack)) {
      addError(errors, "stack", "must be an array");
    } else if (meta.stack.some((entry) => typeof entry !== "string")) {
      addError(errors, "stack", "must contain only strings");
    }
  }

  // Images are served from public/, so the path is site-absolute. An empty
  // string is how a work says it has no image yet.
  for (const field of IMAGE_FIELDS) {
    const value = meta[field];
    if (typeof value === "string" && value !== "" && !value.startsWith("/")) {
      addError(errors, field, "must start with /");
    }
  }

  return errors;
}

export function assertValidWorkMetadata(meta, filePath = "frontmatter") {
  const errors = validateWorkMetadata(meta);
  if (errors.length === 0) return meta;
  const details = errors.map((error) => `${filePath}: ${error.field}: ${error.reason}`).join("\n");
  throw new Error(details);
}
