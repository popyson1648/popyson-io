import { parse as parseToml } from "smol-toml";

import { assertValidMetadata } from "./metadataSchema.mjs";

/**
 * @typedef {Object} MarkdownMetadata
 * @property {string} [title]
 * @property {string | Date} [date]
 * @property {string[]} [tags]
 * @property {{ count?: number }} [auto_tags]
 * @property {{ mode?: "auto" | "none" | "text", text?: string, generated?: boolean }} [sumup]
 * @property {{ mode?: "none" | "file", path?: string, generated?: boolean }} [thumbnail]
 * @property {number} [reading]
 * @property {string} [kana]
 */

export function normalizeMarkdownSource(source) {
  return String(source || "").replace(/^\uFEFF/, "").replace(/\r\n/g, "\n");
}

export function splitTomlFrontmatter(source, filePath, {
  missingClosingSuffix = "is missing closing +++ frontmatter delimiter",
} = {}) {
  const text = normalizeMarkdownSource(source);
  if (!text.startsWith("+++\n")) {
    throw new Error(`${filePath} must start with TOML frontmatter delimited by +++`);
  }

  const end = text.indexOf("\n+++", 4);
  if (end === -1) {
    throw new Error(`${filePath} ${missingClosingSuffix}`);
  }

  return {
    frontmatter: text.slice(4, end),
    body: text.slice(end + 5).replace(/^\r?\n/, ""),
  };
}

export function parseMarkdownFrontmatter(source, filePath, { validate = true } = {}) {
  const { frontmatter, body } = splitTomlFrontmatter(source, filePath);
  const meta = /** @type {MarkdownMetadata} */ (parseToml(frontmatter));
  if (validate) assertValidMetadata(meta, filePath);
  return { meta, body };
}

export function parseFrontmatterForCheck(source) {
  try {
    const { frontmatter } = splitTomlFrontmatter(source, "frontmatter", {
      missingClosingSuffix: "is missing closing +++ delimiter",
    });
    return { meta: /** @type {MarkdownMetadata} */ (parseToml(frontmatter)), errors: [] };
  } catch (error) {
    const message = error.message.replace(/^frontmatter /, "");
    if (message === "must start with TOML frontmatter delimited by +++") {
      return { errors: [{ field: "frontmatter", reason: "must start with TOML frontmatter delimited by +++" }] };
    }
    if (message === "is missing closing +++ delimiter") {
      return { errors: [{ field: "frontmatter", reason: message }] };
    }
    return { errors: [{ field: "frontmatter", reason: `is not valid TOML: ${error.message}` }] };
  }
}
