import assert from "node:assert/strict";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { evaluateMetadata, hasPendingMetadata, pendingMetadataReasons, resolveMetadata } from "./generate_metadata.mjs";
import { parseFrontmatterForCheck, parseMarkdownFrontmatter } from "./frontmatter.mjs";
import { assertValidMetadata, dateToIsoDate, validateMetadata } from "./metadataSchema.mjs";

function test(name, fn) {
  try {
    awaitIfNeeded(fn());
  } catch (error) {
    error.message = `${name}: ${error.message}`;
    throw error;
  }
}

async function asyncTest(name, fn) {
  try {
    await fn();
  } catch (error) {
    error.message = `${name}: ${error.message}`;
    throw error;
  }
}

function awaitIfNeeded(value) {
  if (value && typeof value.then === "function") {
    throw new Error("use asyncTest for async checks");
  }
}

const config = {
  tag_generation: {
    default_count: 2,
    max_tag_chars: 8,
    max_total_tags: 3,
    model: "mock-model",
  },
  summary_generation: {
    max_chars: 20,
    model: "mock-model",
  },
  thumbnail: {
    default_path: "/default.png",
  },
};

test("dateToIsoDate_whenValueHasIsoToString_returnsIsoString", () => {
  const date = dateToIsoDate({ toString: () => "2026-02-07" });

  assert.equal(date, "2026-02-07");
});

test("parseMarkdownFrontmatter_whenSourceHasBomAndCrlf_normalizesAndReturnsMetaAndBody", () => {
  const source = "\uFEFF+++\r\ntitle = \"Post\"\r\ndate = \"2026-02-07\"\r\n+++\r\n\r\nBody.\r\n";

  const parsed = parseMarkdownFrontmatter(source, "post.md");

  assert.equal(parsed.meta.title, "Post");
  assert.equal(parsed.meta.date, "2026-02-07");
  assert.equal(parsed.body, "Body.\n");
});

test("parseFrontmatterForCheck_whenDelimiterIsMissing_returnsExistingFrontmatterErrorShape", () => {
  const parsed = parseFrontmatterForCheck("title = \"Post\"");

  assert.deepEqual(parsed, {
    errors: [{ field: "frontmatter", reason: "must start with TOML frontmatter delimited by +++" }],
  });
});

test("parseFrontmatterForCheck_whenClosingDelimiterIsMissing_returnsExistingFrontmatterErrorShape", () => {
  const parsed = parseFrontmatterForCheck("+++\ntitle = \"Post\"\n");

  assert.deepEqual(parsed, {
    errors: [{ field: "frontmatter", reason: "is missing closing +++ delimiter" }],
  });
});

test("parseFrontmatterForCheck_whenTomlIsInvalid_returnsReadableTomlError", () => {
  const parsed = parseFrontmatterForCheck("+++\ntitle =\n+++\n");

  assert.equal(parsed.errors[0].field, "frontmatter");
  assert.match(parsed.errors[0].reason, /^is not valid TOML:/);
});

test("validateMetadata_whenInputIsNotTomlTable_returnsFrontmatterError", () => {
  const errors = validateMetadata(["not", "a", "table"]);

  assert.deepEqual(errors, [{ field: "frontmatter", reason: "must be a TOML table" }]);
});

test("validateMetadata_whenMultipleFieldsAreInvalid_reportsAllObservableErrors", () => {
  const errors = validateMetadata({
    title: "",
    date: "soon",
    tags: ["js", 1],
    reading: 0,
    legacy: true,
  });

  assert.deepEqual(errors.map((error) => error.field), ["legacy", "title", "date", "tags", "reading"]);
});

test("assertValidMetadata_whenMetadataIsInvalid_throwsReadableFileScopedMessage", () => {
  assert.throws(
    () => assertValidMetadata({ title: "", date: "soon" }, "post.md"),
    /post\.md: title: must be a non-empty string\npost\.md: date: must be YYYY-MM-DD or "auto"/,
  );
});

test("evaluateMetadata_whenTagsExceedLimits_reportsTagQualityErrors", () => {
  const errors = evaluateMetadata({
    tags: ["valid", "toolongtag", "!!!", "extra"],
    sumup: { mode: "none" },
  }, { filePath: "post.md", locale: "en", config });

  assert.deepEqual(errors, [
    "post.md: tags: must contain at most 3 tags",
    'post.md: tags: "toolongtag" is longer than 8 characters',
    'post.md: tags: "!!!" must contain a letter or number',
  ]);
});

test("evaluateMetadata_whenJapaneseSummaryHasMarkupAndNoJapanese_reportsBothErrors", () => {
  const errors = evaluateMetadata({
    tags: [],
    sumup: { mode: "text", text: "**English only**" },
  }, { filePath: "post.ja.md", locale: "ja", config });

  assert.deepEqual(errors, [
    "post.ja.md: sumup.text: must not contain Markdown or HTML markup",
    "post.ja.md: sumup.text: Japanese article summaries must contain Japanese text",
  ]);
});

test("hasPendingMetadata_whenGeneratedFieldsRemain_returnsTrue", () => {
  const pending = hasPendingMetadata({
    title: "Post",
    date: "auto",
    auto_tags: { count: 2 },
    sumup: { mode: "auto" },
    thumbnail: { mode: "none" },
  });

  assert.equal(pending, true);
});

test("pendingMetadataReasons_whenGeneratedFieldsRemain_returnsStableHumanReasons", () => {
  const reasons = pendingMetadataReasons({
    date: "auto",
    auto_tags: {},
    sumup: { mode: "auto" },
    thumbnail: { mode: "none" },
  });

  assert.deepEqual(reasons, ['date = "auto"', "auto_tags", 'sumup.mode = "auto"', 'thumbnail.mode = "none"']);
});

await asyncTest("resolveMetadata_whenMetadataIsAlreadyResolved_returnsUnchangedWithoutProvider", async () => {
  const filePath = join(tmpdir(), "resolved.en.md");
  const source = [
    "+++",
    'title = "Resolved"',
    'date = "2026-02-07"',
    'tags = ["js"]',
    "",
    "[sumup]",
    'mode = "text"',
    'text = "Resolved summary."',
    "",
    "[thumbnail]",
    'mode = "file"',
    'path = "/default.png"',
    "+++",
    "",
    "Body.",
    "",
  ].join("\n");

  const result = await resolveMetadata({
    filePath,
    source,
    config,
    provider: async () => {
      throw new Error("provider should not be called");
    },
  });

  assert.equal(result.changed, false);
  assert.equal(result.meta.title, "Resolved");
  assert.equal(result.meta.thumbnail.path, "/default.png");
  assert.match(result.output, /Body\./);
});

await asyncTest("resolveMetadata_whenGeneratedTagsDoNotContainEnoughUsableValues_throwsReadableError", async () => {
  const source = [
    "+++",
    'title = "Needs tags"',
    'date = "2026-02-07"',
    'tags = ["js"]',
    'auto_tags = { count = 2 }',
    "",
    "[sumup]",
    'mode = "none"',
    "",
    "[thumbnail]",
    'mode = "file"',
    'path = "/default.png"',
    "+++",
    "",
    "Body.",
    "",
  ].join("\n");

  await assert.rejects(
    () => resolveMetadata({
      filePath: join(tmpdir(), "needs-tags.en.md"),
      source,
      config,
      knownTags: ["js"],
      provider: async () => ({ tags: ["js", "", "JS"] }),
    }),
    /AI metadata generation returned 0 usable tags, expected 2/,
  );
});

console.log("metadata edge checks passed");
