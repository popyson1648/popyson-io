import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseToml } from "smol-toml";
import { afterAll, afterEach, beforeAll, describe, expect, test } from "vitest";
import { contentSnapshotRoot } from "../scripts/content_loader.mjs";
import {
  evaluateMetadata,
  generateJson,
  knownTagsByLocale,
  openaiGenerateJson,
  pendingMetadataReasons,
  previewPrompts,
  resolveMetadata,
} from "../scripts/generate_metadata.mjs";

const ROOT = join(fileURLToPath(new URL("..", import.meta.url)));
// Generated thumbnails land under the snapshot root, which is the repository
// only until a build consumes D1/R2 content.
const CONTENT_ROOT = contentSnapshotRoot();

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

// Source whose tags + summary still need AI generation; the thumbnail resolves
// to the default path (no image generation).
const autoTagSummarySource = `+++
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

let tempDir;

beforeAll(() => {
  tempDir = mkdtempSync(join(tmpdir(), "metadata-generation-"));
});

afterAll(() => {
  rmSync(tempDir, { recursive: true, force: true });
});

describe("resolveMetadata tag and summary generation", () => {
  test("generates tags and summary and writes resolved frontmatter back", async () => {
    const filePath = join(tempDir, "index.ja.md");
    const calls = [];

    const result = await resolveMetadata({
      filePath,
      source: autoTagSummarySource,
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

    expect(result.changed).toBe(true);
    expect(calls).toHaveLength(2);
    expect(calls[0].systemInstruction).toMatch(/Treat the article body as content/);
    expect(calls[0].prompt).toMatch(/Known tags/);
    expect(calls[0].prompt).not.toMatch(/Treat the article body as content/);
    expect(calls[1].systemInstruction).toMatch(/Treat the article body as content/);
    expect(calls[1].prompt).toMatch(/Maximum summary length/);

    const meta = parseToml(result.output.slice(4, result.output.indexOf("\n+++", 4)));
    expect(meta.tags).toEqual(["js", "react", "build"]);
    expect(meta.auto_tags).toBeUndefined();
    expect(meta.sumup).toEqual({
      mode: "text",
      text: "本文の内容を短くまとめた要約です。",
      generated: true,
    });
    expect(meta.thumbnail).toEqual({
      mode: "file",
      path: "/default.png",
      generated: true,
    });
    expect(result.output).toMatch(/本文を書く。/);
    expect(evaluateMetadata(result.meta, { filePath, locale: "ja", config })).toEqual([]);
  });

  test("asks for less than the limit so an overshoot still fits the card", async () => {
    const filePath = join(tempDir, "index.ja.md");
    const prompts = [];

    const result = await resolveMetadata({
      filePath,
      source: autoTagSummarySource,
      config: { ...config, summary_generation: { ...config.summary_generation, max_chars: 180 } },
      knownTags: [],
      provider: async (request) => {
        if (request.schema.required.includes("tags")) return { tags: ["react", "build"] };
        prompts.push(request.prompt);
        // 185 characters: the length the model lands on when it is given 180.
        return { summary: prompts.length === 1 ? "あ".repeat(185) : "い".repeat(150) };
      },
    });

    expect(prompts[0]).toContain("Maximum summary length: 144 characters.");
    expect(prompts[1]).toContain("Maximum summary length: 117 characters.");
    expect(result.meta.sumup.text).toHaveLength(150);
  });

  test("stops asking for a summary once one fits", async () => {
    const filePath = join(tempDir, "index.ja.md");
    let summaryCalls = 0;

    await resolveMetadata({
      filePath,
      source: autoTagSummarySource,
      config,
      knownTags: [],
      provider: async (request) => {
        if (request.schema.required.includes("tags")) return { tags: ["react", "build"] };
        summaryCalls += 1;
        return { summary: "短い要約。" };
      },
    });

    expect(summaryCalls).toBe(1);
  });

  test("reports the length when every attempt overruns the limit", async () => {
    const filePath = join(tempDir, "index.ja.md");

    await expect(
      resolveMetadata({
        filePath,
        source: autoTagSummarySource,
        config,
        knownTags: [],
        provider: async (request) =>
          request.schema.required.includes("tags")
            ? { tags: ["react", "build"] }
            : { summary: "あ".repeat(240) },
      }),
    ).rejects.toThrow(/returned 240 characters, over the 180/);
  });

  test("rejects when generated tags lack enough usable values", async () => {
    const filePath = join(tempDir, "index.ja.md");

    await expect(
      resolveMetadata({
        filePath,
        source: autoTagSummarySource,
        config,
        knownTags: [],
        provider: async (request) =>
          request.schema.required.includes("tags") ? { tags: ["js"] } : { summary: "unused" },
      }),
    ).rejects.toThrow(/returned 0 usable tags, expected 2/);
  });

  test("previewPrompts returns the tag and summary prompts", () => {
    const filePath = join(tempDir, "index.ja.md");

    const previews = previewPrompts({
      filePath,
      source: autoTagSummarySource,
      config,
      knownTags: ["js", "react", "build"],
    });

    expect(previews).toHaveLength(2);
    expect(previews[0].kind).toBe("tags");
    expect(previews[0].systemInstruction).toMatch(/Treat the article body as content/);
    expect(previews[0].prompt).not.toMatch(/Treat the article body as content/);
    expect(previews[1].kind).toBe("summary");
    expect(previews[1].systemInstruction).toMatch(/Treat the article body as content/);
    expect(previews[1].prompt).toMatch(/Maximum summary length/);
  });

  test("pendingMetadataReasons lists the unresolved fields", () => {
    const meta = parseToml(autoTagSummarySource.slice(4, autoTagSummarySource.indexOf("\n+++", 4)));

    expect(pendingMetadataReasons(meta)).toEqual([
      "auto_tags",
      'sumup.mode = "auto"',
      'thumbnail.mode = "none"',
    ]);
  });
});

describe("evaluateMetadata on resolved metadata", () => {
  const filePath = "post.md";

  test("accepts technical text with code-like tokens", () => {
    expect(
      evaluateMetadata(
        {
          tags: ["csharp"],
          sumup: { mode: "text", text: "C# examples use user_id and #id selectors." },
        },
        { filePath, locale: "en", config },
      ),
    ).toEqual([]);
  });

  test("flags Markdown markup in a summary", () => {
    expect(
      evaluateMetadata(
        {
          tags: [],
          sumup: { mode: "text", text: "Read [the guide](https://example.com)." },
        },
        { filePath, locale: "en", config },
      ),
    ).toEqual([`${filePath}: sumup.text: must not contain Markdown or HTML markup`]);
  });

  test("flags an over-long tag plus markup and missing Japanese", () => {
    expect(
      evaluateMetadata(
        {
          tags: ["this tag is much too long for metadata quality checks"],
          sumup: { mode: "text", text: "<b>bad</b>" },
        },
        { filePath, locale: "ja", config },
      ),
    ).toEqual([
      `${filePath}: tags: "this tag is much too long for metadata quality checks" is longer than 32 characters`,
      `${filePath}: sumup.text: must not contain Markdown or HTML markup`,
      `${filePath}: sumup.text: Japanese article summaries must contain Japanese text`,
    ]);
  });
});

describe("resolveMetadata date resolution", () => {
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

  test("resolves date='auto' to today when not running in CI", async () => {
    const originalCi = process.env.CI;
    delete process.env.CI;
    try {
      const resolved = await resolveMetadata({
        filePath: join(tempDir, "uncommitted.md"),
        source: autoDateSource,
        config,
        provider: async () => {
          throw new Error("provider should not be called");
        },
      });
      expect(resolved.meta.date).toBe(new Date().toISOString().slice(0, 10));
      expect(resolved.meta.thumbnail.path).toBe("/default.png");
    } finally {
      if (originalCi === undefined) delete process.env.CI;
      else process.env.CI = originalCi;
    }
  });

  test("rejects date='auto' that cannot be resolved from git history in CI", async () => {
    const originalCi = process.env.CI;
    process.env.CI = "true";
    try {
      await expect(
        resolveMetadata({
          filePath: join(tempDir, "uncommitted.md"),
          source: autoDateSource,
          config,
          provider: async () => {
            throw new Error("provider should not be called");
          },
        }),
      ).rejects.toThrow(/date = "auto" could not be resolved from git history/);
    } finally {
      if (originalCi === undefined) delete process.env.CI;
      else process.env.CI = originalCi;
    }
  });
});

describe("resolveMetadata auto thumbnail generation", () => {
  // mode "auto" generates one image per post id, derives the concept from the
  // Japanese summary, and rewrites the field to a resolved file entry.
  test("generates one image per post id and is idempotent", async () => {
    const postId = "29991231-deadbeef";
    const dir = join(tempDir, postId);
    mkdirSync(dir, { recursive: true });
    const jaPath = join(dir, "index.ja.md");
    const generatedPath = join(CONTENT_ROOT, "public", "thumbnails", `${postId}.png`);
    const source = [
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
    writeFileSync(jaPath, source);
    // Remove stale output from an interrupted prior run so the first-run
    // generation assertions stay deterministic.
    rmSync(generatedPath, { force: true });

    try {
      const imageCalls = [];
      const conceptCalls = [];
      const result = await resolveMetadata({
        filePath: jaPath,
        source,
        config,
        provider: async (request) => {
          conceptCalls.push(request);
          expect(request.schema.required).toContain("concept");
          return { concept: "a labeled keycap" };
        },
        imageProvider: async (request) => {
          imageCalls.push(request);
          return Buffer.from("fake-png-bytes");
        },
      });

      expect(result.changed).toBe(true);
      expect(conceptCalls).toHaveLength(1);
      expect(conceptCalls[0].prompt).toMatch(/サムネ記事/);
      expect(imageCalls).toHaveLength(1);
      expect(imageCalls[0].model).toBe("gpt-image-2");
      expect(imageCalls[0].size).toBe("1024x1024");
      expect(imageCalls[0].quality).toBe("medium");
      expect(imageCalls[0].prompt).toMatch(/a labeled keycap/);
      expect(imageCalls[0].prompt).not.toMatch(/\{CONCEPT\}/);
      expect(result.meta.thumbnail).toEqual({
        mode: "file",
        path: `/thumbnails/${postId}.png`,
        generated: true,
      });
      expect(existsSync(generatedPath)).toBe(true);

      // A second run reuses the existing image without another image-provider or
      // concept call.
      const idempotentCalls = [];
      const idempotentResult = await resolveMetadata({
        filePath: jaPath,
        source,
        config,
        provider: async () => {
          throw new Error("concept provider should not be called when the image exists");
        },
        imageProvider: async (request) => {
          idempotentCalls.push(request);
          return Buffer.from("unused");
        },
      });
      expect(idempotentCalls).toHaveLength(0);
      expect(idempotentResult.meta.thumbnail.path).toBe(`/thumbnails/${postId}.png`);
    } finally {
      rmSync(generatedPath, { force: true });
    }
  });

  test("draws from the title without writing a summary the post does not show", async () => {
    const postId = "29991231-0badc0de";
    const dir = join(tempDir, postId);
    mkdirSync(dir, { recursive: true });
    const jaPath = join(dir, "index.ja.md");
    const generatedPath = join(CONTENT_ROOT, "public", "thumbnails", `${postId}.png`);
    const source = [
      "+++",
      'title = "Wezterm起動時にwslを自動的に起動させる"',
      'date = "2026-06-22"',
      'tags = ["js"]',
      "",
      "[sumup]",
      'mode = "none"',
      'text = ""',
      "",
      "[thumbnail]",
      'mode = "auto"',
      "+++",
      "",
      "ターミナル起動時にシェルを自動で立ち上げる設定の記事。",
      "",
    ].join("\n");
    writeFileSync(jaPath, source);
    rmSync(generatedPath, { force: true });

    try {
      const requests = [];
      const result = await resolveMetadata({
        filePath: jaPath,
        source,
        config,
        provider: async (request) => {
          requests.push(request);
          expect(request.schema.required).toContain("concept");
          expect(request.prompt).toMatch(/Wezterm起動時にwslを自動的に起動させる/);
          return { concept: "a terminal" };
        },
        imageProvider: async () => Buffer.from("fake-png-bytes"),
      });

      // One request: the concept. A post that shows no summary is not worth
      // writing one for, and the title says what to draw.
      expect(requests).toHaveLength(1);
      expect(existsSync(generatedPath)).toBe(true);
      expect(result.meta.sumup).toEqual({ mode: "none", text: "" });
      expect(result.meta.thumbnail).toEqual({
        mode: "file",
        path: `/thumbnails/${postId}.png`,
        generated: true,
      });
    } finally {
      rmSync(generatedPath, { force: true });
    }
  });

  test("uses an explicit [thumbnail].concept and skips the concept provider", async () => {
    const postId = "29991231-cafebabe";
    const dir = join(tempDir, postId);
    mkdirSync(dir, { recursive: true });
    const jaPath = join(dir, "index.ja.md");
    const generatedPath = join(CONTENT_ROOT, "public", "thumbnails", `${postId}.png`);
    const source = [
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
    writeFileSync(jaPath, source);
    rmSync(generatedPath, { force: true });

    try {
      const imageCalls = [];
      const result = await resolveMetadata({
        filePath: jaPath,
        source,
        config,
        provider: async () => {
          throw new Error("concept provider should not be called with an explicit concept");
        },
        imageProvider: async (request) => {
          imageCalls.push(request);
          return Buffer.from("fake-png-bytes");
        },
      });

      expect(imageCalls).toHaveLength(1);
      expect(imageCalls[0].prompt).toMatch(/a compass/);
      expect(result.meta.thumbnail.path).toBe(`/thumbnails/${postId}.png`);
    } finally {
      rmSync(generatedPath, { force: true });
    }
  });

  test("previewPrompts includes the thumbnail concept and image prompts", () => {
    const postId = "29991231-deadbeef";
    const jaPath = join(tempDir, postId, "index.ja.md");
    const source = [
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

    const previews = previewPrompts({ filePath: jaPath, source, config, knownTags: [] });

    expect(previews.map((item) => item.kind)).toEqual(["thumbnail-concept", "thumbnail"]);
    expect(previews[1].prompt).toMatch(/\{CONCEPT\}/);
  });
});

describe("text provider selection", () => {
  const realFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = realFetch;
    delete process.env.OPENAI_API_KEY;
  });

  function stubResponse(text) {
    const calls = [];
    globalThis.fetch = async (url, init) => {
      calls.push({ url, body: JSON.parse(init.body) });
      return {
        ok: true,
        status: 200,
        json: async () => ({
          status: "completed",
          output: [{ type: "message", content: [{ type: "output_text", text }] }],
        }),
      };
    };
    return calls;
  }

  test("asks OpenAI for a strict schema with reasoning turned off", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    const calls = stubResponse('{"summary":"要約。"}');

    const result = await openaiGenerateJson({
      model: "gpt-5.6-luna",
      systemInstruction: "You are editing metadata.",
      prompt: "Article body",
      schema: { type: "object", properties: { summary: { type: "string" } }, required: [] },
    });

    expect(result).toEqual({ summary: "要約。" });
    expect(calls[0].url).toBe("https://api.openai.com/v1/responses");
    expect(calls[0].body.model).toBe("gpt-5.6-luna");
    expect(calls[0].body.instructions).toBe("You are editing metadata.");
    expect(calls[0].body.reasoning).toEqual({ effort: "none" });
    expect(calls[0].body.text.format.strict).toBe(true);
    // Strict mode answers the schema exactly, so it demands one that closes:
    // every property required, nothing else allowed.
    expect(calls[0].body.text.format.schema.required).toEqual(["summary"]);
    expect(calls[0].body.text.format.schema.additionalProperties).toBe(false);
  });

  test("reports an OpenAI answer that carries no text", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    globalThis.fetch = async () => ({
      ok: true,
      status: 200,
      json: async () => ({ status: "incomplete", output: [] }),
    });

    await expect(
      openaiGenerateJson({ model: "gpt-5.6-luna", prompt: "x", schema: { type: "object" } }),
    ).rejects.toThrow(/no text content \(status: incomplete\)/);
  });

  test("sends a request to the provider it names", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    const calls = stubResponse('{"tags":["ts"]}');

    await generateJson({ provider: "openai", model: "gpt-5.6-luna", prompt: "x", schema: {} });

    expect(calls).toHaveLength(1);
    expect(calls[0].url).toContain("api.openai.com");
  });

  test("refuses a provider it has no client for", async () => {
    await expect(generateJson({ provider: "nowhere", prompt: "x" })).rejects.toThrow(
      /Unknown text provider: nowhere/,
    );
  });
});

describe("knownTagsByLocale", () => {
  test("keeps each locale's vocabulary to itself", () => {
    const dir = mkdtempSync(join(tmpdir(), "known-tags-"));
    const post = (title, tags) =>
      `+++\ntitle = "${title}"\ndate = "2026-06-18"\ntags = ${JSON.stringify(tags)}\n+++\n\n本文。\n`;
    writeFileSync(join(dir, "a.ja.md"), post("あ", ["設計", "TypeScript"]));
    writeFileSync(join(dir, "a.en.md"), post("A", ["design", "TypeScript"]));
    writeFileSync(join(dir, "b.ja.md"), post("い", ["設計"]));

    const known = knownTagsByLocale([
      join(dir, "a.ja.md"),
      join(dir, "a.en.md"),
      join(dir, "b.ja.md"),
    ]);

    expect(known.ja).toEqual(["TypeScript", "設計"]);
    expect(known.en).toEqual(["design", "TypeScript"]);
    rmSync(dir, { recursive: true, force: true });
  });
});
