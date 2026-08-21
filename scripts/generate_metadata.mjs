import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { stringify as stringifyToml } from "smol-toml";
import { parseMarkdownFrontmatter } from "./frontmatter.mjs";
import { parseMetadataConfig } from "./metadataConfig.mjs";
import { assertValidMetadata, dateToIsoDate } from "./metadataSchema.mjs";
import { japaneseSourceItemIds } from "./publicationManifest.mjs";
import { contentSnapshotRoot } from "./content_loader.mjs";

const ROOT = join(fileURLToPath(new URL("..", import.meta.url)));
const CONTENT_ROOT = contentSnapshotRoot();
const POSTS_DIR = join(CONTENT_ROOT, "src/content/posts");
const METADATA_CONFIG_FILE = join(ROOT, "src/content/metadata.toml");
const JAPANESE_ONLY_POST_IDS = japaneseSourceItemIds(CONTENT_ROOT, "post");

function serializeMarkdown(meta, body) {
  return `+++\n${stringifyToml(meta).trimEnd()}\n+++\n\n${body}`;
}

function readMetadataConfig() {
  return parseMetadataConfig(readFileSync(METADATA_CONFIG_FILE, "utf8"));
}

export function postMarkdownFiles(
  postsDir = POSTS_DIR,
  japaneseOnlyPostIds = JAPANESE_ONLY_POST_IDS,
) {
  if (!existsSync(postsDir)) return [];
  return readdirSync(postsDir, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .flatMap((dirent) => {
      const directory = join(postsDir, dirent.name);
      const jaPath = join(directory, "index.ja.md");
      return japaneseOnlyPostIds.has(dirent.name)
        ? [jaPath]
        : [jaPath, join(directory, "index.en.md")];
    });
}

export function synchronizeJapaneseOnlyPosts({
  check = false,
  postsDir = POSTS_DIR,
  japaneseOnlyPostIds = JAPANESE_ONLY_POST_IDS,
} = {}) {
  const changed = [];
  for (const id of japaneseOnlyPostIds) {
    const directory = join(postsDir, id);
    const jaPath = join(directory, "index.ja.md");
    const enPath = join(directory, "index.en.md");
    const source = readFileSync(jaPath, "utf8");
    if (readFileSync(enPath, "utf8") === source) continue;
    if (check) throw new Error(`${enPath}: Japanese-only English source is out of sync`);
    writeFileSync(enPath, source);
    changed.push(enPath);
  }
  return changed;
}

function firstAddedGitDate(filePath) {
  const databaseDate = String(process.env.CONTENT_DATABASE_DATE || "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(databaseDate)) return databaseDate;
  if (CONTENT_ROOT !== ROOT) {
    const encoded = basename(dirname(filePath)).slice(0, 8);
    return /^\d{8}$/.test(encoded)
      ? `${encoded.slice(0, 4)}-${encoded.slice(4, 6)}-${encoded.slice(6, 8)}`
      : "";
  }
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
  return (
    /<\/?[A-Za-z][A-Za-z0-9:-]*(?:\s[^<>]*)?>/u.test(value) ||
    /!?\[[^\]]+\]\([^)]+\)/u.test(value) ||
    /`[^`]+`/u.test(value) ||
    /(?:\*\*[^*]+\*\*|\*[^*\s][^*]*\*)/u.test(value)
  );
}

function isLikelyJapanese(text) {
  return /[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/u.test(text);
}

// The length an article card has room for, and the limit both a written and a
// generated summary are held to.
function summaryMaxChars(config = {}) {
  return config.summary_generation?.max_chars || 180;
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
  const maxSummaryChars = summaryMaxChars(config);

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

// A model writes to a length it feels rather than one it counts, and it lands
// a little over whatever number it is given. Asking for a fraction of the limit
// leaves room for that overshoot to still fit. The fractions fall away on each
// retry, which is the lever that works: told only that its last answer was too
// long, the model writes another of the same length.
const SUMMARY_BUDGETS = [0.8, 0.65, 0.5];

function summaryBudget(maxChars, attempt) {
  return Math.max(1, Math.round(maxChars * (SUMMARY_BUDGETS[attempt] ?? 0.5)));
}

function buildSummaryPrompt({ filePath, meta, body, config, attempt = 0 }) {
  return [
    `Maximum summary length: ${summaryBudget(summaryMaxChars(config), attempt)} characters.`,
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

const RETRYABLE_STATUS = new Set([429, 500, 503]);

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * Fetch with exponential backoff on transient provider failures so the
 * automation workflow does not flake. Retries both transient HTTP responses
 * (rate limits, overloaded/unavailable) and thrown network/timeout errors, and
 * bounds each attempt with a timeout so a request cannot hang forever.
 * Non-retryable responses and the final attempt are returned/thrown as-is.
 */
async function fetchWithRetry(
  url,
  init,
  { attempts = 4, baseDelayMs = 1000, timeoutMs = 120000 } = {},
) {
  let lastError;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const isLastAttempt = attempt === attempts - 1;
    try {
      const response = await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
      if (response.ok || !RETRYABLE_STATUS.has(response.status) || isLastAttempt) {
        return response;
      }
      await response.text().catch(() => "");
    } catch (error) {
      lastError = error;
      if (isLastAttempt) throw error;
    }
    await sleep(baseDelayMs * 2 ** attempt);
  }
  throw lastError;
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
      // gemini-2.5-flash spends output tokens on "thinking" by default, which can
      // truncate the JSON answer. These are deterministic extraction tasks, so
      // disable thinking and keep a comfortable budget for the JSON itself.
      maxOutputTokens: 2048,
      thinkingConfig: { thinkingBudget: 0 },
      responseMimeType: "application/json",
      responseSchema: schema,
    },
  };
  if (systemInstruction.trim()) {
    requestBody.systemInstruction = { parts: [{ text: systemInstruction }] };
  }

  const response = await fetchWithRetry(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify(requestBody),
    },
  );

  if (!response.ok) {
    throw new Error(`Gemini API request failed: ${response.status} ${await response.text()}`);
  }

  const data = await response.json();
  const candidate = data.candidates?.[0];
  const finishReason = candidate?.finishReason || "unknown";
  const text = candidate?.content?.parts
    ?.map((part) => part.text || "")
    .join("")
    .trim();
  if (!text) {
    throw new Error(`Gemini API returned no text content (finishReason: ${finishReason})`);
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(
      `Gemini API returned non-JSON content (finishReason: ${finishReason}): ${text.slice(0, 200)}`,
    );
  }
}

function requireOpenaiKey(purpose = "thumbnail image generation") {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(`OPENAI_API_KEY is required for ${purpose}`);
  }
  return apiKey;
}

// Strict structured output answers the schema exactly, and asks for a schema
// that says exactly what it wants: every property required, nothing else
// allowed. The schemas above are written for neither provider in particular,
// so the closing is applied here rather than at each definition.
function strictSchema(schema) {
  if (!schema || schema.type !== "object") return schema;
  const properties = schema.properties || {};
  return {
    ...schema,
    properties,
    required: Object.keys(properties),
    additionalProperties: false,
  };
}

/**
 * Ask OpenAI for JSON matching a schema. Reasoning is turned off: these are
 * extraction tasks with one right shape, and a reasoning model bills what it
 * thinks as output.
 */
export async function openaiGenerateJson({
  apiKey = requireOpenaiKey("AI metadata generation"),
  model,
  systemInstruction = "",
  prompt,
  schema,
}) {
  const requestBody = {
    model,
    input: prompt,
    reasoning: { effort: "none" },
    text: {
      format: {
        type: "json_schema",
        name: "metadata",
        schema: strictSchema(schema),
        strict: true,
      },
    },
  };
  if (systemInstruction.trim()) requestBody.instructions = systemInstruction;

  const response = await fetchWithRetry("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API request failed: ${response.status} ${await response.text()}`);
  }

  const data = await response.json();
  const text = (data.output || [])
    .filter((item) => item.type === "message")
    .flatMap((item) => item.content || [])
    .filter((part) => part.type === "output_text")
    .map((part) => part.text || "")
    .join("")
    .trim();
  if (!text) {
    throw new Error(`OpenAI API returned no text content (status: ${data.status || "unknown"})`);
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`OpenAI API returned non-JSON content: ${text.slice(0, 200)}`);
  }
}

const TEXT_PROVIDERS = {
  gemini: geminiGenerateJson,
  openai: openaiGenerateJson,
};

/**
 * Send a text request to the provider it names. Each request carries the
 * provider and model from its own section of src/content/metadata.toml, so
 * tags, summaries, and thumbnail concepts can be moved one at a time.
 */
export async function generateJson(request) {
  const provider = TEXT_PROVIDERS[request.provider || "gemini"];
  if (!provider) throw new Error(`Unknown text provider: ${request.provider}`);
  return provider(request);
}

/**
 * Generate a single image and return the decoded PNG bytes. gpt-image models
 * always respond with base64 PNG data at data[0].b64_json.
 */
export async function openaiGenerateImage({
  apiKey = requireOpenaiKey(),
  model,
  prompt,
  size,
  quality,
}) {
  const response = await fetchWithRetry("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, prompt, size, quality, n: 1 }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI image API request failed: ${response.status} ${await response.text()}`);
  }

  const data = await response.json();
  const b64 = data.data?.[0]?.b64_json;
  if (!b64) throw new Error("OpenAI image API returned no image data");
  return Buffer.from(b64, "base64");
}

// Tags are shown to the model as the vocabulary the blog already uses, and the
// blog keeps a separate vocabulary per locale: the English list of a Japanese
// article is a list of words that article will never be filed under. Reading
// them per locale is also what keeps the answer from drifting into the wrong
// language when a model weighs the list over the instruction.
export function knownTagsByLocale(files) {
  const byLocale = { ja: [], en: [] };
  for (const file of files) {
    const parsed = parseMarkdownFrontmatter(readFileSync(file, "utf8"), file);
    byLocale[localeFromPath(file)].push(...normalizeTags(parsed.meta.tags));
  }
  return {
    ja: normalizeTags(byLocale.ja).sort((a, b) => a.localeCompare(b)),
    en: normalizeTags(byLocale.en).sort((a, b) => a.localeCompare(b)),
  };
}

export function hasPendingMetadata(meta) {
  return (
    dateToIsoDate(meta.date) === "auto" ||
    Boolean(meta.auto_tags) ||
    meta.sumup?.mode === "auto" ||
    !meta.thumbnail ||
    meta.thumbnail?.mode === "none" ||
    meta.thumbnail?.mode === "auto"
  );
}

function autoTagCount(meta, config) {
  return meta.auto_tags.count || config.tag_generation?.default_count || 3;
}

function tagGenerationRequest({ filePath, meta, body, config, knownTags, count }) {
  return {
    provider: config.tag_generation?.provider,
    model: config.tag_generation?.model || "gemini-2.5-flash",
    systemInstruction: readPromptFile(config.tag_generation?.prompt_file),
    schema: tagSchema(),
    prompt: buildTagPrompt({ filePath, meta, body, config, knownTags, count }),
  };
}

function summaryGenerationRequest({ filePath, meta, body, config, attempt = 0 }) {
  return {
    provider: config.summary_generation?.provider || config.tag_generation?.provider,
    model: config.summary_generation?.model || config.tag_generation?.model || "gemini-2.5-flash",
    systemInstruction: readPromptFile(config.summary_generation?.prompt_file),
    schema: summarySchema(),
    prompt: buildSummaryPrompt({ filePath, meta, body, config, attempt }),
  };
}

function conceptSchema() {
  return {
    type: "object",
    properties: {
      concept: { type: "string" },
    },
    required: ["concept"],
  };
}

function buildConceptPrompt({ title }) {
  return ["Article title:", title].join("\n");
}

// The concept is written from the summary, so it goes to whichever model wrote
// the summary.
function conceptProvider(config) {
  return config.summary_generation?.provider || config.tag_generation?.provider;
}

function conceptModel(config) {
  return config.summary_generation?.model || config.tag_generation?.model || "gemini-2.5-flash";
}

function conceptGenerationRequest({ config, title }) {
  return {
    provider: conceptProvider(config),
    model: conceptModel(config),
    systemInstruction: readPromptFile(config.thumbnail_generation?.concept_prompt_file),
    schema: conceptSchema(),
    prompt: buildConceptPrompt({ title }),
  };
}

function buildThumbnailPrompt({ concept, config }) {
  const template = readPromptFile(config.thumbnail_generation?.prompt_file);
  if (!template.trim()) {
    throw new Error("thumbnail_generation.prompt_file is required for thumbnail generation");
  }
  return template.replaceAll("{CONCEPT}", concept);
}

function thumbnailGenerationRequest({ config, prompt }) {
  return {
    model: config.thumbnail_generation?.model || "gpt-image-2",
    size: config.thumbnail_generation?.size || "1024x1024",
    quality: config.thumbnail_generation?.quality || "medium",
    prompt,
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
  const result = await provider(
    tagGenerationRequest({ filePath, meta, body, config, knownTags, count }),
  );
  meta.tags = mergeTags(meta.tags || [], result.tags || [], count);
  delete meta.auto_tags;
  return true;
}

// An English summary of a Japanese article runs long — the same content needs
// roughly twice the characters — and the limit is the width of a card, not a
// preference. Each attempt asks for less until the answer fits.
async function generateSummary({ filePath, meta, body, config, provider }) {
  const maxChars = summaryMaxChars(config);
  let last = "";
  for (let attempt = 0; attempt < SUMMARY_BUDGETS.length; attempt += 1) {
    const result = await provider(
      summaryGenerationRequest({ filePath, meta, body, config, attempt }),
    );
    last = String(result.summary || "").trim();
    if (!last) throw new Error(`${filePath}: AI summary generation returned an empty summary`);
    if (last.length <= maxChars) return last;
  }
  throw new Error(
    `${filePath}: AI summary generation returned ${last.length} characters, over the ${maxChars} a summary may use`,
  );
}

async function resolveAutoSummary(meta, { filePath, body, config, provider }) {
  if (meta.sumup?.mode !== "auto") return false;

  const summary = await generateSummary({ filePath, meta, body, config, provider });
  meta.sumup = { mode: "text", text: summary, generated: true };
  return true;
}

function resolveDefaultThumbnail(meta, { filePath, config }) {
  // Reached after resolveAutoThumbnail, so "auto" is already rewritten to
  // "file". Only a missing table or mode "none" falls back to the default path.
  if (meta.thumbnail && meta.thumbnail.mode !== "none") return false;

  const defaultPath = config.thumbnail?.default_path;
  if (!defaultPath) throw new Error(`${filePath}: thumbnail.default_path is required`);
  meta.thumbnail = { mode: "file", path: defaultPath, generated: true };
  return true;
}

function postIdFromPath(filePath) {
  return basename(dirname(filePath));
}

/**
 * The thumbnail concept always derives from the Japanese title, so a post gets
 * one image shared by both locales. The title is the author's own words and is
 * always there — a post may be published with no summary at all — and it
 * carries the particular thing the post is about, which is what the drawing
 * wants. When the current file is the Japanese sibling its title is already in
 * memory; otherwise the ja file is read from disk.
 */
function readJaTitle(filePath, meta) {
  const jaPath = join(dirname(filePath), "index.ja.md");
  let jaMeta = meta;
  if (filePath !== jaPath) {
    if (!existsSync(jaPath)) return "";
    jaMeta = parseMarkdownFrontmatter(readFileSync(jaPath, "utf8"), jaPath).meta;
  }
  return String(jaMeta.title || "").trim();
}

async function resolveThumbnailConcept(meta, context) {
  const { filePath, config, provider } = context;
  const explicit = typeof meta.thumbnail?.concept === "string" ? meta.thumbnail.concept.trim() : "";
  if (explicit) return explicit;

  const title = readJaTitle(filePath, meta);
  if (!title) {
    throw new Error(
      `${filePath}: thumbnail concept needs a Japanese title or an explicit [thumbnail].concept`,
    );
  }
  const result = await provider(conceptGenerationRequest({ config, title }));
  const concept = String(result.concept || "").trim();
  if (!concept)
    throw new Error(`${filePath}: thumbnail concept generation returned an empty concept`);
  return concept;
}

async function resolveAutoThumbnail(meta, { filePath, body, config, provider, imageProvider }) {
  if (meta.thumbnail?.mode !== "auto") return false;

  const postId = postIdFromPath(filePath);
  const publicRef = `/thumbnails/${postId}.png`;
  const targetPath = join(CONTENT_ROOT, "public", "thumbnails", `${postId}.png`);

  if (!existsSync(targetPath)) {
    const concept = await resolveThumbnailConcept(meta, { filePath, body, config, provider });
    const prompt = buildThumbnailPrompt({ concept, config });
    const bytes = await imageProvider(thumbnailGenerationRequest({ config, prompt }));
    mkdirSync(dirname(targetPath), { recursive: true });
    writeFileSync(targetPath, bytes);
  }

  meta.thumbnail = { mode: "file", path: publicRef, generated: true };
  return true;
}

function assertResolvedMetadata(meta, { filePath, config }) {
  assertValidMetadata(meta, filePath);
  const evaluationErrors = evaluateMetadata(meta, {
    filePath,
    locale: localeFromPath(filePath),
    config,
  });
  if (evaluationErrors.length > 0) {
    throw new Error(evaluationErrors.join("\n"));
  }
}

export async function resolveMetadata({
  filePath,
  source,
  config,
  knownTags = [],
  provider = generateJson,
  imageProvider = openaiGenerateImage,
}) {
  const parsed = parseMarkdownFrontmatter(source, filePath);
  const meta = structuredClone(parsed.meta);
  const context = { filePath, body: parsed.body, config, knownTags, provider, imageProvider };
  const changed = [
    resolveAutoDate(meta, filePath),
    await resolveAutoTags(meta, context),
    await resolveAutoSummary(meta, context),
    await resolveAutoThumbnail(meta, context),
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
    const request = tagGenerationRequest({
      filePath,
      meta: parsed.meta,
      body: parsed.body,
      config,
      knownTags,
      count,
    });
    previews.push(
      previewItemFromRequest({
        filePath,
        kind: "tags",
        request,
      }),
    );
  }
  if (parsed.meta.sumup?.mode === "auto") {
    const request = summaryGenerationRequest({
      filePath,
      meta: parsed.meta,
      body: parsed.body,
      config,
    });
    previews.push(
      previewItemFromRequest({
        filePath,
        kind: "summary",
        request,
      }),
    );
  }
  if (parsed.meta.thumbnail?.mode === "auto") {
    const explicit =
      typeof parsed.meta.thumbnail.concept === "string" ? parsed.meta.thumbnail.concept.trim() : "";
    if (!explicit) {
      previews.push(
        previewItemFromRequest({
          filePath,
          kind: "thumbnail-concept",
          request: conceptGenerationRequest({
            config,
            title: readJaTitle(filePath, parsed.meta) || "{Japanese title}",
          }),
        }),
      );
    }
    previews.push({
      filePath,
      kind: "thumbnail",
      model: config.thumbnail_generation?.model || "gpt-image-2",
      systemInstruction: "",
      prompt: buildThumbnailPrompt({ concept: explicit || "{CONCEPT}", config }),
    });
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
  if (meta.thumbnail?.mode === "auto") reasons.push('thumbnail.mode = "auto"');
  return reasons;
}

function unresolvedMetadataMessage(items) {
  return items.map(({ filePath, reasons }) => `- ${filePath}: ${reasons.join(", ")}`).join("\n");
}

export async function runGenerateMetadata({
  check = false,
  preview = false,
  provider = generateJson,
  imageProvider = openaiGenerateImage,
} = {}) {
  const config = readMetadataConfig();
  const files = postMarkdownFiles();
  const knownTags = knownTagsByLocale(files);
  const changedFiles = [];

  if (preview) {
    const previews = files.flatMap((filePath) =>
      previewPrompts({
        filePath,
        source: readFileSync(filePath, "utf8"),
        config,
        knownTags: knownTags[localeFromPath(filePath)],
      }),
    );
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
    synchronizeJapaneseOnlyPosts({ check: true });
    return [];
  }

  for (const filePath of files) {
    const source = readFileSync(filePath, "utf8");
    const result = await resolveMetadata({
      filePath,
      source,
      config,
      knownTags: knownTags[localeFromPath(filePath)],
      provider,
      imageProvider,
    });
    if (!result.changed || result.output === source) continue;
    changedFiles.push(filePath);
    if (!check) writeFileSync(filePath, result.output);
  }

  changedFiles.push(...synchronizeJapaneseOnlyPosts());

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
