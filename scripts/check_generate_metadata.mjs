import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parse as parseToml } from "smol-toml";
import { evaluateMetadata, pendingMetadataReasons, previewPrompts, resolveMetadata } from "./generate_metadata.mjs";

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
} finally {
  rmSync(tempDir, { recursive: true, force: true });
}

console.log("metadata generation checks passed");
