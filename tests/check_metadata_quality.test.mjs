import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, expect, test } from "vitest";
import { evaluateMetadata } from "../scripts/generate_metadata.mjs";
import { postsDir, rootDir } from "../scripts/content_loader.mjs";
import { parseMarkdownFrontmatter } from "../scripts/frontmatter.mjs";
import { parseMetadataConfig } from "../scripts/metadataConfig.mjs";
import { dateToIsoDate } from "../scripts/metadataSchema.mjs";

const ROOT = rootDir();
const config = parseMetadataConfig(readFileSync(join(ROOT, "src/content/metadata.toml"), "utf8"));

function markdownFiles() {
  const dir = postsDir();
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .flatMap((dirent) => [
      join(dir, dirent.name, "index.ja.md"),
      join(dir, dirent.name, "index.en.md"),
    ]);
}

function frontmatter(source) {
  return parseMarkdownFrontmatter(source, "frontmatter", { validate: false }).meta;
}

function validatePromptFile(configPath, field) {
  if (typeof configPath !== "string" || configPath.trim() === "") {
    return [`src/content/metadata.toml: ${field}: must be a non-empty path`];
  }
  const promptPath = join(ROOT, configPath);
  if (!existsSync(promptPath)) {
    return [`src/content/metadata.toml: ${field}: file does not exist`];
  }
  if (readFileSync(promptPath, "utf8").trim() === "") {
    return [`src/content/metadata.toml: ${field}: file must not be empty`];
  }
  return [];
}

function validateProvider(sectionName, section) {
  const errors = [];
  if (section?.provider !== "gemini") {
    errors.push(`src/content/metadata.toml: ${sectionName}.provider: must be "gemini"`);
  }
  if (typeof section?.model !== "string" || !section.model.startsWith("gemini-")) {
    errors.push(`src/content/metadata.toml: ${sectionName}.model: must be a gemini-* model string`);
  }
  return errors;
}

function validateThumbnailGeneration() {
  const section = config.thumbnail_generation;
  if (!section) {
    return ["src/content/metadata.toml: thumbnail_generation: section is required"];
  }
  const errors = [
    ...validatePromptFile(section.prompt_file, "thumbnail_generation.prompt_file"),
    ...validatePromptFile(section.concept_prompt_file, "thumbnail_generation.concept_prompt_file"),
  ];
  if (!["openai", "gemini"].includes(section.provider)) {
    errors.push(
      'src/content/metadata.toml: thumbnail_generation.provider: must be "openai" or "gemini"',
    );
  }
  if (typeof section.model !== "string" || section.model.trim() === "") {
    errors.push(
      "src/content/metadata.toml: thumbnail_generation.model: must be a non-empty string",
    );
  }
  if (typeof section.size !== "string" || !/^\d+x\d+$/.test(section.size)) {
    errors.push("src/content/metadata.toml: thumbnail_generation.size: must be WIDTHxHEIGHT");
  }
  const allowedQuality = ["low", "medium", "high", "auto"];
  if (!allowedQuality.includes(section.quality)) {
    errors.push(
      `src/content/metadata.toml: thumbnail_generation.quality: must be one of ${allowedQuality.join(", ")}`,
    );
  }
  return errors;
}

function configErrors() {
  const errors = [
    ...validatePromptFile(config.tag_generation?.prompt_file, "tag_generation.prompt_file"),
    ...validatePromptFile(config.summary_generation?.prompt_file, "summary_generation.prompt_file"),
    ...validateProvider("tag_generation", config.tag_generation),
    ...validateProvider("summary_generation", config.summary_generation),
  ];
  if (
    typeof config.thumbnail?.default_path !== "string" ||
    !config.thumbnail.default_path.startsWith("/")
  ) {
    errors.push("src/content/metadata.toml: thumbnail.default_path: must start with /");
  } else if (!existsSync(join(ROOT, "public", config.thumbnail.default_path.slice(1)))) {
    errors.push("src/content/metadata.toml: thumbnail.default_path: public file does not exist");
  }
  errors.push(...validateThumbnailGeneration());
  return errors;
}

function validateTags(meta, filePath) {
  const errors = [];
  const seen = new Set();
  for (const rawTag of Array.isArray(meta.tags) ? meta.tags : []) {
    const tag = String(rawTag).trim();
    if (tag === "") {
      errors.push(`${filePath}: tags: must not contain empty tags`);
      continue;
    }
    const key = tag.toLocaleLowerCase();
    if (seen.has(key)) {
      errors.push(`${filePath}: tags: must not contain duplicate tag "${tag}"`);
    }
    seen.add(key);
  }
  return errors;
}

function validateResolvedMetadata(meta, filePath) {
  const errors = [];
  if (dateToIsoDate(meta.date) === "auto") {
    errors.push(`${filePath}: date: must be generated before verification`);
  }
  if (meta.auto_tags) {
    errors.push(`${filePath}: auto_tags: must be generated before verification`);
  }
  if (meta.sumup?.mode === "auto") {
    errors.push(`${filePath}: sumup.mode: must be generated before verification`);
  }
  if (!meta.thumbnail || meta.thumbnail.mode === "none" || meta.thumbnail.mode === "auto") {
    errors.push(`${filePath}: thumbnail: must be generated before verification`);
  }
  return errors;
}

function validateThumbnail(meta, filePath) {
  if (meta.thumbnail?.mode !== "file") return [];
  const path = meta.thumbnail.path;
  if (typeof path !== "string" || !path.startsWith("/")) {
    return [`${filePath}: thumbnail.path: must start with /`];
  }
  if (path.includes("..") || path.includes("//")) {
    return [`${filePath}: thumbnail.path: must be a normalized public path`];
  }
  if (!existsSync(join(ROOT, "public", path.slice(1)))) {
    return [`${filePath}: thumbnail.path: public file does not exist`];
  }
  return [];
}

function fileErrors({ filePath, meta, locale }) {
  return [
    ...evaluateMetadata(meta, { filePath, locale, config }),
    ...validateTags(meta, filePath),
    ...validateResolvedMetadata(meta, filePath),
    ...validateThumbnail(meta, filePath),
  ];
}

function localePairErrors(dir, { ja, en }) {
  const errors = [];
  if (dateToIsoDate(ja.meta.date) !== dateToIsoDate(en.meta.date)) {
    errors.push(`${dir}: date: Japanese and English metadata must match`);
  }
  const jaThumb = ja.meta.thumbnail?.mode === "file" ? ja.meta.thumbnail.path : "";
  const enThumb = en.meta.thumbnail?.mode === "file" ? en.meta.thumbnail.path : "";
  if (jaThumb !== enThumb) {
    errors.push(`${dir}: thumbnail.path: Japanese and English metadata must match`);
  }
  return errors;
}

const files = markdownFiles().map((filePath) => ({
  filePath,
  locale: filePath.endsWith(".ja.md") ? "ja" : "en",
  meta: frontmatter(readFileSync(filePath, "utf8")),
}));

const filesByDir = new Map();
for (const file of files) {
  const dir = dirname(file.filePath);
  if (!filesByDir.has(dir)) filesByDir.set(dir, {});
  filesByDir.get(dir)[file.locale] = file;
}
const localePairs = [...filesByDir.entries()].filter(([, pair]) => pair.ja && pair.en);

describe("metadata.toml configuration", () => {
  test("passes provider, prompt-file, default thumbnail, and generation rules", () => {
    expect(configErrors()).toEqual([]);
  });
});

describe("checked-in article metadata quality", () => {
  test("has article Markdown to validate", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  test.each(files)("$filePath passes tag/summary/thumbnail quality rules", (file) => {
    expect(fileErrors(file)).toEqual([]);
  });
});

describe("locale parity", () => {
  test("article directories have both locales", () => {
    expect(localePairs.length).toBeGreaterThan(0);
  });

  test.each(localePairs)("%s has matching date and thumbnail across locales", (dir, pair) => {
    expect(localePairErrors(dir, pair)).toEqual([]);
  });
});
