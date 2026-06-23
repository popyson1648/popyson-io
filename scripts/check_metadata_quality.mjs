import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { evaluateMetadata } from "./generate_metadata.mjs";
import { postsDir, rootDir } from "./content_loader.mjs";
import { parseMarkdownFrontmatter } from "./frontmatter.mjs";
import { parseMetadataConfig } from "./metadataConfig.mjs";
import { dateToIsoDate } from "./metadataSchema.mjs";

const ROOT = rootDir();
const config = parseMetadataConfig(readFileSync(join(ROOT, "src/content/metadata.toml"), "utf8"));
const failures = [];

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
    failures.push(`src/content/metadata.toml: ${field}: must be a non-empty path`);
    return;
  }
  const promptPath = join(ROOT, configPath);
  if (!existsSync(promptPath)) {
    failures.push(`src/content/metadata.toml: ${field}: file does not exist`);
    return;
  }
  if (readFileSync(promptPath, "utf8").trim() === "") {
    failures.push(`src/content/metadata.toml: ${field}: file must not be empty`);
  }
}

function validateProvider(sectionName, section) {
  if (section?.provider !== "gemini") {
    failures.push(`src/content/metadata.toml: ${sectionName}.provider: must be "gemini"`);
  }
  if (typeof section?.model !== "string" || !section.model.startsWith("gemini-")) {
    failures.push(`src/content/metadata.toml: ${sectionName}.model: must be a gemini-* model string`);
  }
}

function validateThumbnailGeneration() {
  const section = config.thumbnail_generation;
  if (!section) {
    failures.push("src/content/metadata.toml: thumbnail_generation: section is required");
    return;
  }
  validatePromptFile(section.prompt_file, "thumbnail_generation.prompt_file");
  validatePromptFile(section.concept_prompt_file, "thumbnail_generation.concept_prompt_file");
  if (!["openai", "gemini"].includes(section.provider)) {
    failures.push('src/content/metadata.toml: thumbnail_generation.provider: must be "openai" or "gemini"');
  }
  if (typeof section.model !== "string" || section.model.trim() === "") {
    failures.push("src/content/metadata.toml: thumbnail_generation.model: must be a non-empty string");
  }
  if (typeof section.size !== "string" || !/^\d+x\d+$/.test(section.size)) {
    failures.push("src/content/metadata.toml: thumbnail_generation.size: must be WIDTHxHEIGHT");
  }
  const allowedQuality = ["low", "medium", "high", "auto"];
  if (!allowedQuality.includes(section.quality)) {
    failures.push(`src/content/metadata.toml: thumbnail_generation.quality: must be one of ${allowedQuality.join(", ")}`);
  }
}

function validateConfig() {
  validatePromptFile(config.tag_generation?.prompt_file, "tag_generation.prompt_file");
  validatePromptFile(config.summary_generation?.prompt_file, "summary_generation.prompt_file");
  validateProvider("tag_generation", config.tag_generation);
  validateProvider("summary_generation", config.summary_generation);
  if (typeof config.thumbnail?.default_path !== "string" || !config.thumbnail.default_path.startsWith("/")) {
    failures.push("src/content/metadata.toml: thumbnail.default_path: must start with /");
  } else if (!existsSync(join(ROOT, "public", config.thumbnail.default_path.slice(1)))) {
    failures.push("src/content/metadata.toml: thumbnail.default_path: public file does not exist");
  }
  validateThumbnailGeneration();
}

function validateTags(meta, filePath) {
  const seen = new Set();
  for (const rawTag of Array.isArray(meta.tags) ? meta.tags : []) {
    const tag = String(rawTag).trim();
    if (tag === "") {
      failures.push(`${filePath}: tags: must not contain empty tags`);
      continue;
    }
    const key = tag.toLocaleLowerCase();
    if (seen.has(key)) {
      failures.push(`${filePath}: tags: must not contain duplicate tag "${tag}"`);
    }
    seen.add(key);
  }
}

function validateResolvedMetadata(meta, filePath) {
  if (dateToIsoDate(meta.date) === "auto") {
    failures.push(`${filePath}: date: must be generated before verification`);
  }
  if (meta.auto_tags) {
    failures.push(`${filePath}: auto_tags: must be generated before verification`);
  }
  if (meta.sumup?.mode === "auto") {
    failures.push(`${filePath}: sumup.mode: must be generated before verification`);
  }
  if (!meta.thumbnail || meta.thumbnail.mode === "none" || meta.thumbnail.mode === "auto") {
    failures.push(`${filePath}: thumbnail: must be generated before verification`);
  }
}

function validateThumbnail(meta, filePath) {
  if (meta.thumbnail?.mode !== "file") return;
  const path = meta.thumbnail.path;
  if (typeof path !== "string" || !path.startsWith("/")) {
    failures.push(`${filePath}: thumbnail.path: must start with /`);
    return;
  }
  if (path.includes("..") || path.includes("//")) {
    failures.push(`${filePath}: thumbnail.path: must be a normalized public path`);
    return;
  }
  if (!existsSync(join(ROOT, "public", path.slice(1)))) {
    failures.push(`${filePath}: thumbnail.path: public file does not exist`);
  }
}

function validateLocalePairs(filesByDir) {
  for (const [dir, files] of filesByDir) {
    if (!files.ja || !files.en) continue;
    const ja = files.ja.meta;
    const en = files.en.meta;
    const jaDate = dateToIsoDate(ja.date);
    const enDate = dateToIsoDate(en.date);
    if (jaDate !== enDate) {
      failures.push(`${dir}: date: Japanese and English metadata must match`);
    }
    const jaThumb = ja.thumbnail?.mode === "file" ? ja.thumbnail.path : "";
    const enThumb = en.thumbnail?.mode === "file" ? en.thumbnail.path : "";
    if (jaThumb !== enThumb) {
      failures.push(`${dir}: thumbnail.path: Japanese and English metadata must match`);
    }
  }
}

validateConfig();

const filesByDir = new Map();

for (const filePath of markdownFiles()) {
  const meta = frontmatter(readFileSync(filePath, "utf8"));
  const locale = filePath.endsWith(".ja.md") ? "ja" : "en";
  const dir = dirname(filePath);
  if (!filesByDir.has(dir)) filesByDir.set(dir, {});
  filesByDir.get(dir)[locale] = { filePath, meta };

  failures.push(...evaluateMetadata(meta, { filePath, locale, config }));
  validateTags(meta, filePath);
  validateResolvedMetadata(meta, filePath);
  validateThumbnail(meta, filePath);
}

validateLocalePairs(filesByDir);

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log("metadata quality checks passed");
