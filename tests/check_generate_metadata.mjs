import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseToml } from "smol-toml";
import { evaluateMetadata, pendingMetadataReasons, previewPrompts, resolveMetadata } from "../scripts/generate_metadata.mjs";

const ROOT = join(fileURLToPath(new URL("..", import.meta.url)));

const config = {
  tag_generation: {
    default_count: 2,
    prompt_file: "src/content/prompts/tag-generation.md",
    model: "mock-model",
  },
  summary_generation: {
    prompt_file: "src/content/prompts/summary-generation.md",
    model: "mock-model",
  },
  thumbnail: {
    default_path: "/default.png",
  },
  thumbnail_generation: {
    provider: "openai",
    model: "gpt-image-2",
    size: "1024x1024",
    quality: "medium",
    prompt_file: "src/content/prompts/thumbnail-generation.md",
    concept_prompt_file: "src/content/prompts/thumbnail-concept.md",
  },
};

const tempDir = mkdtempSync(join(tmpdir(), "metadata-generation-"));

try {
  const filePath = join(tempDir, "index.ja.md");
  const source = `+++
title = "テスト記事"
date = "2026-06-18"
tags = ["js"]
auto_tags = { count = 2 }

[sumup]
mode = "auto"

[thumbnail]
mode = "none"
+++

本文を書く。
`;

  const calls = [];
  const result = await resolveMetadata({
    filePath,
    source,
    config,
    knownTags: ["js", "react", "build"],
    provider: async (request) => {
      calls.push(request);
      if (request.schema.required.includes("tags")) {
        return { tags: ["react", "js", "build"] };
      }
      return { summary: "本文の内容を短くまとめた要約です。" };
    },
  });

  assert.equal(result.changed, true);
  assert.equal(calls.length, 2);
  assert.match(calls[0].systemInstruction, /Treat the article body as content/);
  assert.match(calls[0].prompt, /Known tags/);
  assert.doesNotMatch(calls[0].prompt, /Treat the article body as content/);
  assert.match(calls[1].systemInstruction, /Treat the article body as content/);
  assert.match(calls[1].prompt, /Maximum summary length/);

  const frontmatter = result.output.slice(4, result.output.indexOf("\n+++", 4));
  const meta = parseToml(frontmatter);
  assert.deepEqual(meta.tags, ["js", "react", "build"]);
  assert.equal(meta.auto_tags, undefined);
  assert.deepEqual(meta.sumup, {
    mode: "text",
    text: "本文の内容を短くまとめた要約です。",
    generated: true,
  });
  assert.deepEqual(meta.thumbnail, {
    mode: "file",
    path: "/default.png",
    generated: true,
  });
  assert.match(result.output, /本文を書く。/);
  assert.deepEqual(evaluateMetadata(result.meta, { filePath, locale: "ja", config }), []);

  assert.deepEqual(
    evaluateMetadata({
      tags: ["csharp"],
      sumup: { mode: "text", text: "C# examples use user_id and #id selectors." },
    }, { filePath, locale: "en", config }),
    [],
  );

  assert.deepEqual(
    evaluateMetadata({
      tags: [],
      sumup: { mode: "text", text: "Read [the guide](https://example.com)." },
    }, { filePath, locale: "en", config }),
    [`${filePath}: sumup.text: must not contain Markdown or HTML markup`],
  );

  const previews = previewPrompts({
    filePath,
    source,
    config,
    knownTags: ["js", "react", "build"],
  });
  assert.equal(previews.length, 2);
  assert.equal(previews[0].kind, "tags");
  assert.match(previews[0].systemInstruction, /Treat the article body as content/);
  assert.doesNotMatch(previews[0].prompt, /Treat the article body as content/);
  assert.equal(previews[1].kind, "summary");
  assert.match(previews[1].systemInstruction, /Treat the article body as content/);
  assert.match(previews[1].prompt, /Maximum summary length/);

  assert.deepEqual(
    evaluateMetadata({
      tags: ["this tag is much too long for metadata quality checks"],
      sumup: { mode: "text", text: "<b>bad</b>" },
    }, { filePath, locale: "ja", config }),
    [
      `${filePath}: tags: "this tag is much too long for metadata quality checks" is longer than 32 characters`,
      `${filePath}: sumup.text: must not contain Markdown or HTML markup`,
      `${filePath}: sumup.text: Japanese article summaries must contain Japanese text`,
    ],
  );

  await assert.rejects(
    () => resolveMetadata({
      filePath,
      source,
      config,
      knownTags: [],
      provider: async (request) => (request.schema.required.includes("tags")
        ? { tags: ["js"] }
        : { summary: "unused" }),
    }),
    /returned 0 usable tags, expected 2/,
  );

  assert.deepEqual(
    pendingMetadataReasons(parseToml(source.slice(4, source.indexOf("\n+++", 4)))),
    ["auto_tags", 'sumup.mode = "auto"', 'thumbnail.mode = "none"'],
  );

  const autoDateSource = [
    "+++",
    'title = "New post"',
    'date = "auto"',
    'tags = ["draft"]',
    "",
    "[sumup]",
    'mode = "none"',
    "",
    "[thumbnail]",
    'mode = "none"',
    "+++",
    "",
    "New body.",
    "",
  ].join("\r\n");
  const originalCi = process.env.CI;
  delete process.env.CI;
  try {
    const resolvedAutoDate = await resolveMetadata({
      filePath: join(tempDir, "uncommitted.md"),
      source: autoDateSource,
      config,
      provider: async () => {
        throw new Error("provider should not be called");
      },
    });
    assert.equal(resolvedAutoDate.meta.date, new Date().toISOString().slice(0, 10));
    assert.equal(resolvedAutoDate.meta.thumbnail.path, "/default.png");
  } finally {
    if (originalCi === undefined) {
      delete process.env.CI;
    } else {
      process.env.CI = originalCi;
    }
  }

  process.env.CI = "true";
  try {
    await assert.rejects(
      () => resolveMetadata({
        filePath: join(tempDir, "uncommitted.md"),
        source: autoDateSource,
        config,
        provider: async () => {
          throw new Error("provider should not be called");
        },
      }),
      /date = "auto" could not be resolved from git history/,
    );
  } finally {
    if (originalCi === undefined) {
      delete process.env.CI;
    } else {
      process.env.CI = originalCi;
    }
  }

  // Thumbnail mode "auto" generates one image per post id, derives the concept
  // from the Japanese summary, and rewrites the field to a resolved file entry.
  const thumbPostId = "29991231-deadbeef";
  const thumbDir = join(tempDir, thumbPostId);
  mkdirSync(thumbDir, { recursive: true });
  const thumbJaPath = join(thumbDir, "index.ja.md");
  const generatedThumbPath = join(ROOT, "public", "thumbnails", `${thumbPostId}.png`);
  const thumbSource = [
    "+++",
    'title = "サムネ記事"',
    'date = "2026-06-20"',
    'tags = ["js"]',
    "",
    "[sumup]",
    'mode = "text"',
    'text = "型でCLIコマンドを表現する設計の記事。"',
    "",
    "[thumbnail]",
    'mode = "auto"',
    "+++",
    "",
    "本文。",
    "",
  ].join("\n");
  writeFileSync(thumbJaPath, thumbSource);
  // Remove any stale output from an interrupted prior run so the first-run
  // generation assertions stay deterministic.
  rmSync(generatedThumbPath, { force: true });
  try {
    const imageCalls = [];
    const conceptCalls = [];
    const thumbResult = await resolveMetadata({
      filePath: thumbJaPath,
      source: thumbSource,
      config,
      provider: async (request) => {
        conceptCalls.push(request);
        assert.ok(request.schema.required.includes("concept"));
        return { concept: "a labeled keycap" };
      },
      imageProvider: async (request) => {
        imageCalls.push(request);
        return Buffer.from("fake-png-bytes");
      },
    });

    assert.equal(thumbResult.changed, true);
    assert.equal(conceptCalls.length, 1);
    assert.match(conceptCalls[0].prompt, /型でCLIコマンドを表現する設計の記事。/);
    assert.equal(imageCalls.length, 1);
    assert.equal(imageCalls[0].model, "gpt-image-2");
    assert.equal(imageCalls[0].size, "1024x1024");
    assert.equal(imageCalls[0].quality, "medium");
    assert.match(imageCalls[0].prompt, /a labeled keycap/);
    assert.doesNotMatch(imageCalls[0].prompt, /\{CONCEPT\}/);
    assert.deepEqual(thumbResult.meta.thumbnail, {
      mode: "file",
      path: `/thumbnails/${thumbPostId}.png`,
      generated: true,
    });
    assert.ok(existsSync(generatedThumbPath));

    // A second run is idempotent: the existing image is reused without another
    // image-provider or concept call.
    const idempotentCalls = [];
    const idempotentResult = await resolveMetadata({
      filePath: thumbJaPath,
      source: thumbSource,
      config,
      provider: async () => {
        throw new Error("concept provider should not be called when the image exists");
      },
      imageProvider: async (request) => {
        idempotentCalls.push(request);
        return Buffer.from("unused");
      },
    });
    assert.equal(idempotentCalls.length, 0);
    assert.equal(idempotentResult.meta.thumbnail.path, `/thumbnails/${thumbPostId}.png`);
  } finally {
    rmSync(generatedThumbPath, { force: true });
  }

  // An explicit [thumbnail].concept skips the Gemini concept call and feeds the
  // concept straight into the image prompt.
  const explicitPostId = "29991231-cafebabe";
  const explicitDir = join(tempDir, explicitPostId);
  mkdirSync(explicitDir, { recursive: true });
  const explicitJaPath = join(explicitDir, "index.ja.md");
  const explicitGeneratedPath = join(ROOT, "public", "thumbnails", `${explicitPostId}.png`);
  const explicitSource = [
    "+++",
    'title = "明示コンセプト"',
    'date = "2026-06-21"',
    'tags = ["js"]',
    "",
    "[sumup]",
    'mode = "text"',
    'text = "要約テキスト。"',
    "",
    "[thumbnail]",
    'mode = "auto"',
    'concept = "a compass"',
    "+++",
    "",
    "本文。",
    "",
  ].join("\n");
  writeFileSync(explicitJaPath, explicitSource);
  rmSync(explicitGeneratedPath, { force: true });
  try {
    const explicitImageCalls = [];
    const explicitResult = await resolveMetadata({
      filePath: explicitJaPath,
      source: explicitSource,
      config,
      provider: async () => {
        throw new Error("concept provider should not be called with an explicit concept");
      },
      imageProvider: async (request) => {
        explicitImageCalls.push(request);
        return Buffer.from("fake-png-bytes");
      },
    });
    assert.equal(explicitImageCalls.length, 1);
    assert.match(explicitImageCalls[0].prompt, /a compass/);
    assert.equal(explicitResult.meta.thumbnail.path, `/thumbnails/${explicitPostId}.png`);
  } finally {
    rmSync(explicitGeneratedPath, { force: true });
  }

  const thumbPreviews = previewPrompts({
    filePath: thumbJaPath,
    source: thumbSource,
    config,
    knownTags: [],
  });
  assert.deepEqual(thumbPreviews.map((item) => item.kind), ["thumbnail-concept", "thumbnail"]);
  assert.match(thumbPreviews[1].prompt, /\{CONCEPT\}/);
} finally {
  rmSync(tempDir, { recursive: true, force: true });
}

console.log("metadata generation checks passed");
