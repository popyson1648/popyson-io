const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const TOP_LEVEL_FIELDS = new Set([
  "title",
  "date",
  "tags",
  "auto_tags",
  "sumup",
  "thumbnail",
  "reading",
  "kana",
]);

export function dateToIsoDate(value) {
  if (typeof value === "string") return value;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  if (value && typeof value.toString === "function") {
    const text = value.toString();
    if (ISO_DATE_RE.test(text)) return text;
  }
  return "";
}

function isPlainObject(value) {
  return (
    value !== null && typeof value === "object" && !Array.isArray(value) && !(value instanceof Date)
  );
}

function addError(errors, field, reason) {
  errors.push({ field, reason });
}

export function validateMetadata(meta) {
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

  if (!("date" in meta)) {
    addError(errors, "date", "is required");
  } else {
    const date = dateToIsoDate(meta.date);
    if (date !== "auto" && !ISO_DATE_RE.test(date)) {
      addError(errors, "date", 'must be YYYY-MM-DD or "auto"');
    }
  }

  if ("tags" in meta) {
    if (!Array.isArray(meta.tags)) {
      addError(errors, "tags", "must be an array");
    } else if (meta.tags.some((tag) => typeof tag !== "string")) {
      addError(errors, "tags", "must contain only strings");
    }
  }

  if ("auto_tags" in meta) {
    if (!isPlainObject(meta.auto_tags)) {
      addError(errors, "auto_tags", "must be a table");
    } else if (
      "count" in meta.auto_tags &&
      (!Number.isInteger(meta.auto_tags.count) || meta.auto_tags.count <= 0)
    ) {
      addError(errors, "auto_tags.count", "must be a positive integer");
    }
  }

  if ("sumup" in meta) {
    if (!isPlainObject(meta.sumup)) {
      addError(errors, "sumup", "must be a table");
    } else {
      const mode = meta.sumup.mode;
      if (mode !== undefined && !["auto", "none", "text"].includes(mode)) {
        addError(errors, "sumup.mode", "must be one of auto, none, text");
      }
      if (mode === "text" && !("text" in meta.sumup)) {
        addError(errors, "sumup.text", "is required when sumup.mode is text");
      } else if (mode === "text" && typeof meta.sumup.text !== "string") {
        addError(errors, "sumup.text", "must be a string");
      }
      if ("generated" in meta.sumup && typeof meta.sumup.generated !== "boolean") {
        addError(errors, "sumup.generated", "must be a boolean");
      }
    }
  }

  if ("thumbnail" in meta) {
    if (!isPlainObject(meta.thumbnail)) {
      addError(errors, "thumbnail", "must be a table");
    } else {
      const mode = meta.thumbnail.mode;
      if (mode !== undefined && !["none", "file", "auto"].includes(mode)) {
        addError(errors, "thumbnail.mode", "must be one of none, file, auto");
      }
      if (mode === "file" && !("path" in meta.thumbnail)) {
        addError(errors, "thumbnail.path", "is required when thumbnail.mode is file");
      } else if (mode === "file" && typeof meta.thumbnail.path !== "string") {
        addError(errors, "thumbnail.path", "must be a string");
      }
      if ("concept" in meta.thumbnail && typeof meta.thumbnail.concept !== "string") {
        addError(errors, "thumbnail.concept", "must be a string");
      }
      if ("generated" in meta.thumbnail && typeof meta.thumbnail.generated !== "boolean") {
        addError(errors, "thumbnail.generated", "must be a boolean");
      }
    }
  }

  if ("reading" in meta && (!Number.isFinite(meta.reading) || meta.reading <= 0)) {
    addError(errors, "reading", "must be a positive number");
  }

  if ("kana" in meta && typeof meta.kana !== "string") {
    addError(errors, "kana", "must be a string");
  }

  return errors;
}

export function assertValidMetadata(meta, filePath = "frontmatter") {
  const errors = validateMetadata(meta);
  if (errors.length === 0) return meta;
  const details = errors.map((error) => `${filePath}: ${error.field}: ${error.reason}`).join("\n");
  throw new Error(details);
}
