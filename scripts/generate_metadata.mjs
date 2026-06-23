import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { stringify as stringifyToml } from "smol-toml";
import { parseMarkdownFrontmatter } from "./frontmatter.mjs";
import { parseMetadataConfig } from "./metadataConfig.mjs";
import { assertValidMetadata, dateToIsoDate } from "./metadataSchema.mjs";

const ROOT = join(fileURLToPath(new URL("..", import.meta.url)));
const POSTS_DIR = join(ROOT, "src/content/posts");
const METADATA_CONFIG_FILE = join(ROOT, "src/content/metadata.toml");

function serializeMarkdown(meta, body) {
  return `+++\n${stringifyToml(meta).trimEnd()}\n+++\n\n${body}`;
}

function readMetadataConfig() {
  return parseMetadataConfig(readFileSync(METADATA_CONFIG_FILE, "utf8"));
}

function postMarkdownFiles() {
  if (!existsSync(POSTS_DIR)) return [];
  return readdirSync(POSTS_DIR, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .flatMap((dirent) => [
      join(POSTS_DIR, dirent.name, "index.ja.md"),
      join(POSTS_DIR, dirent.name, "index.en.md"),
    ]);
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
    return output.split(/\r?\n/).filter(Boolean).at(-1)?.slice(0, 10) || "";
  } catch {
    return "";
  }
}

function normalizeTags(tags) {
  const seen = new Set();
  const normalized = [];
  for (const rawTag of Array.isArray(tags) ? tags : []) {
    const tag = String(rawTag).trim();
    const key = tag.toLocaleLowerCase();
    if (!tag || seen.has(key)) continue;
    seen.add(key);
    normalized.push(tag);
  }
  return normalized;
}

function mergeTags(existingTags, generatedTags, count) {
  const tags = normalizeTags(existingTags);
  const initialCount = tags.length;
  const seen = new Set(tags.map((tag) => tag.toLocaleLowerCase()));
  for (const rawTag of generatedTags) {
    const tag = String(rawTag).trim();
    const key = tag.toLocaleLowerCase();
    if (!tag || seen.has(key)) continue;
    tags.push(tag);
    seen.add(key);
    if (tags.length >= initialCount + count) break;
  }
  const added = tags.length - initialCount;
  if (added < count) {
    throw new Error(`AI metadata generation returned ${added} usable tags, expected ${count}`);
  }
  return tags;
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function hasDisallowedMarkup(text) {
  const value = String(text || "");
  return /<\/?[A-Za-z][A-Za-z0-9:-]*(?:\s[^<>]*)?>/u.test(value)
    || /!?\[[^\]]+\]\([^)]+\)/u.test(value)
    || /`[^`]+`/u.test(value)
    || /(?:\*\*[^*]+\*\*|\*[^*\s][^*]*\*)/u.test(value);
}

function isLikelyJapanese(text) {
  return /[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/u.test(text);
}

/**
 * @param {import("./frontmatter.mjs").MarkdownMetadata} meta
 * @param {{ filePath?: string, locale?: string, config?: import("./metadataConfig.mjs").MetadataConfig }} [options]
 */
export function evaluateMetadata(meta, { filePath = "metadata", locale = "en", config = {} } = {}) {
  const errors = [];
  const tags = normalizeTags(meta.tags);
  const maxTagChars = config.tag_generation?.max_tag_chars || 32;
  const maxTotalTags = config.tag_generation?.max_total_tags || 8;
  const maxSummaryChars = config.summary_generation?.max_chars || 180;

  if (tags.length > maxTotalTags) {
    errors.push(`${filePath}: tags: must contain at most ${maxTotalTags} tags`);
  }
  for (const tag of tags) {
    if (tag.length > maxTagChars) {
      errors.push(`${filePath}: tags: "${tag}" is longer than ${maxTagChars} characters`);
    }
    if (!/[\p{L}\p{N}]/u.test(tag)) {
      errors.push(`${filePath}: tags: "${tag}" must contain a letter or number`);
    }
  }

  const summary = meta.sumup?.mode === "text" ? String(meta.sumup.text || "").trim() : "";
  if (summary) {
    if (summary.length > maxSummaryChars) {
      errors.push(`${filePath}: sumup.text: must be at most ${maxSummaryChars} characters`);
    }
    if (hasDisallowedMarkup(summary)) {
      errors.push(`${filePath}: sumup.text: must not contain Markdown or HTML markup`);
    }
    if (locale === "ja" && !isLikelyJapanese(summary)) {
      errors.push(`${filePath}: sumup.text: Japanese article summaries must contain Japanese text`);
    }
  }

  return errors;
}

function localeFromPath(filePath) {
  return filePath.endsWith(".ja.md") ? "ja" : "en";
}

function articlePromptBase({ filePath, meta, body }) {
  return [
    `File: ${relative(ROOT, filePath)}`,
    `Locale: ${localeFromPath(filePath)}`,
    `Title: ${meta.title}`,
    `Existing tags: ${JSON.stringify(Array.isArray(meta.tags) ? meta.tags : [])}`,
    "",
    "Article body:",
    body,
  ].join("\n");
}

function readPromptFile(configPath) {
  const promptFile = configPath ? join(ROOT, configPath) : "";
  return promptFile && existsSync(promptFile) ? readFileSync(promptFile, "utf8") : "";
}

function buildTagPrompt({ filePath, meta, body, config, knownTags, count }) {
  return [
    `Generate exactly ${count} additional tags.`,
    `Maximum tag length: ${config.tag_generation?.max_tag_chars || 32} characters.`,
    `Maximum final tag count after merging: ${config.tag_generation?.max_total_tags || 8}.`,
    "Prefer natural existing tags from the known tag list when they fit the article.",
    "Known tags:",
    JSON.stringify(knownTags),
    "",
    articlePromptBase({ filePath, meta, body }),
  ].join("\n");
}

function buildSummaryPrompt({ filePath, meta, body, config }) {
  return [
    `Maximum summary length: ${config.summary_generation?.max_chars || 180} characters.`,
    "",
    articlePromptBase({ filePath, meta, body }),
  ].join("\n");
}

function tagSchema() {
  return {
    type: "object",
    properties: {
      tags: {
        type: "array",
        items: { type: "string" },
      },
    },
    required: ["tags"],
  };
}

function summarySchema() {
  return {
    type: "object",
    properties: {
      summary: { type: "string" },
    },
    required: ["summary"],
  };
}

function requireGeminiKey() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is required for AI metadata generation");
  }
  return apiKey;
}

export async function geminiGenerateJson({
  apiKey = requireGeminiKey(),
  model,
  systemInstruction = "",
  prompt,
  schema,
}) {
  const requestBody = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0,
      candidateCount: 1,
      maxOutputTokens: 512,
      responseFormat: {
        text: {
          mimeType: "application/json",
          schema,
        },
      },
    },
  };
  if (systemInstruction.trim()) {
    requestBody.systemInstruction = { parts: [{ text: systemInstruction }] };
  }

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    throw new Error(`Gemini API request failed: ${response.status} ${await response.text()}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("").trim();
  if (!text) throw new Error("Gemini API returned no text content");
  return JSON.parse(text);
}

function allKnownTags(files) {
  const tags = [];
  for (const file of files) {
    const parsed = parseMarkdownFrontmatter(readFileSync(file, "utf8"), file);
    tags.push(...normalizeTags(parsed.meta.tags));
  }
  return normalizeTags(tags).sort((a, b) => a.localeCompare(b));
}

export function hasPendingMetadata(meta) {
  return dateToIsoDate(meta.date) === "auto"
    || Boolean(meta.auto_tags)
    || meta.sumup?.mode === "auto"
    || !meta.thumbnail
    || meta.thumbnail?.mode === "none";
}

function autoTagCount(meta, config) {
  return meta.auto_tags.count || config.tag_generation?.default_count || 3;
}

function tagGenerationRequest({ filePath, meta, body, config, knownTags, count }) {
  return {
    model: config.tag_generation?.model || "gemini-2.5-flash",
    systemInstruction: readPromptFile(config.tag_generation?.prompt_file),
    schema: tagSchema(),
    prompt: buildTagPrompt({ filePath, meta, body, config, knownTags, count }),
  };
}

function summaryGenerationRequest({ filePath, meta, body, config }) {
  return {
    model: config.summary_generation?.model || config.tag_generation?.model || "gemini-2.5-flash",
    systemInstruction: readPromptFile(config.summary_generation?.prompt_file),
    schema: summarySchema(),
    prompt: buildSummaryPrompt({ filePath, meta, body, config }),
  };
}

function previewItemFromRequest({ filePath, kind, request }) {
  return {
    filePath,
    kind,
    model: request.model,
    systemInstruction: request.systemInstruction,
    prompt: request.prompt,
  };
}

function resolveAutoDate(meta, filePath) {
  if (dateToIsoDate(meta.date) !== "auto") return false;

  let gitDate = firstAddedGitDate(filePath);
  if (!gitDate) {
    if (process.env.CI) {
      throw new Error(`${filePath}: date = "auto" could not be resolved from git history`);
    }
    gitDate = todayIsoDate();
  }
  meta.date = gitDate;
  return true;
}

async function resolveAutoTags(meta, { filePath, body, config, knownTags, provider }) {
  if (!meta.auto_tags) return false;

  const count = autoTagCount(meta, config);
  const result = await provider(tagGenerationRequest({ filePath, meta, body, config, knownTags, count }));
  meta.tags = mergeTags(meta.tags || [], result.tags || [], count);
  delete meta.auto_tags;
  return true;
}

async function resolveAutoSummary(meta, { filePath, body, config, provider }) {
  if (meta.sumup?.mode !== "auto") return false;

  const result = await provider(summaryGenerationRequest({ filePath, meta, body, config }));
  const summary = String(result.summary || "").trim();
  if (!summary) throw new Error(`${filePath}: AI summary generation returned an empty summary`);
  meta.sumup = { mode: "text", text: summary, generated: true };
  return true;
}

function resolveDefaultThumbnail(meta, { filePath, config }) {
  if (meta.thumbnail && meta.thumbnail.mode !== "none") return false;

  const defaultPath = config.thumbnail?.default_path;
  if (!defaultPath) throw new Error(`${filePath}: thumbnail.default_path is required`);
  meta.thumbnail = { mode: "file", path: defaultPath, generated: true };
  return true;
}

function assertResolvedMetadata(meta, { filePath, config }) {
  assertValidMetadata(meta, filePath);
  const evaluationErrors = evaluateMetadata(meta, { filePath, locale: localeFromPath(filePath), config });
  if (evaluationErrors.length > 0) {
    throw new Error(evaluationErrors.join("\n"));
  }
}

export async function resolveMetadata({ filePath, source, config, knownTags = [], provider = geminiGenerateJson }) {
  const parsed = parseMarkdownFrontmatter(source, filePath);
  const meta = structuredClone(parsed.meta);
  const context = { filePath, body: parsed.body, config, knownTags, provider };
  const changed = [
    resolveAutoDate(meta, filePath),
    await resolveAutoTags(meta, context),
    await resolveAutoSummary(meta, context),
    resolveDefaultThumbnail(meta, context),
  ].some(Boolean);

  assertResolvedMetadata(meta, { filePath, config });
  return {
    changed,
    output: serializeMarkdown(meta, parsed.body),
    meta,
  };
}

export function previewPrompts({ filePath, source, config, knownTags = [] }) {
  const parsed = parseMarkdownFrontmatter(source, filePath);
  const previews = [];
  if (parsed.meta.auto_tags) {
    const count = autoTagCount(parsed.meta, config);
    const request = tagGenerationRequest({ filePath, meta: parsed.meta, body: parsed.body, config, knownTags, count });
    previews.push(previewItemFromRequest({
      filePath,
      kind: "tags",
      request,
    }));
  }
  if (parsed.meta.sumup?.mode === "auto") {
    const request = summaryGenerationRequest({ filePath, meta: parsed.meta, body: parsed.body, config });
    previews.push(previewItemFromRequest({
      filePath,
      kind: "summary",
      request,
    }));
  }
  return previews;
}

export function pendingMetadataReasons(meta) {
  const reasons = [];
  if (dateToIsoDate(meta.date) === "auto") reasons.push('date = "auto"');
  if (meta.auto_tags) reasons.push("auto_tags");
  if (meta.sumup?.mode === "auto") reasons.push('sumup.mode = "auto"');
  if (!meta.thumbnail) reasons.push("thumbnail is missing");
  if (meta.thumbnail?.mode === "none") reasons.push('thumbnail.mode = "none"');
  return reasons;
}

function unresolvedMetadataMessage(items) {
  return items
    .map(({ filePath, reasons }) => `- ${filePath}: ${reasons.join(", ")}`)
    .join("\n");
}

export async function runGenerateMetadata({ check = false, preview = false, provider = geminiGenerateJson } = {}) {
  const config = readMetadataConfig();
  const files = postMarkdownFiles();
  const knownTags = allKnownTags(files);
  const changedFiles = [];

  if (preview) {
    const previews = files.flatMap((filePath) => previewPrompts({
      filePath,
      source: readFileSync(filePath, "utf8"),
      config,
      knownTags,
    }));
    for (const item of previews) {
      console.log(`--- ${relative(ROOT, item.filePath)} ${item.kind} ${item.model} ---`);
      console.log("[systemInstruction]");
      console.log(item.systemInstruction.trimEnd());
      console.log("");
      console.log("[user]");
      console.log(item.prompt.trimEnd());
      console.log("");
    }
    if (previews.length === 0) console.log("no AI metadata prompts to preview");
    return [];
  }

  if (check) {
    const unresolved = [];
    for (const filePath of files) {
      const parsed = parseMarkdownFrontmatter(readFileSync(filePath, "utf8"), filePath);
      const reasons = pendingMetadataReasons(parsed.meta);
      if (reasons.length > 0) unresolved.push({ filePath, reasons });
    }
    if (unresolved.length > 0) {
      throw new Error(`metadata is not generated for:\n${unresolvedMetadataMessage(unresolved)}`);
    }
    return [];
  }

  for (const filePath of files) {
    const source = readFileSync(filePath, "utf8");
    const result = await resolveMetadata({ filePath, source, config, knownTags, provider });
    if (!result.changed || result.output === source) continue;
    changedFiles.push(filePath);
    if (!check) writeFileSync(filePath, result.output);
  }

  return changedFiles;
}

function parseArgs(argv) {
  return {
    check: argv.includes("--check"),
    preview: argv.includes("--preview-prompts"),
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = parseArgs(process.argv.slice(2));
  runGenerateMetadata(args)
    .then((changedFiles) => {
      if (args.preview) {
        return;
      }
      if (args.check) {
        console.log("generated metadata checks passed");
      } else if (changedFiles.length === 0) {
        console.log("metadata already generated");
      } else {
        console.log(`generated metadata for ${changedFiles.length} file(s)`);
      }
    })
    .catch((error) => {
      console.error(error.message);
      process.exit(1);
    });
}
