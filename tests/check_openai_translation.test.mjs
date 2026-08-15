import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { afterEach, describe, expect, test } from "vitest";

import {
  buildTranslationRequest,
  discoverTranslationTargets,
  translatedFilesFromResponse,
  translateSnapshotWithOpenAI,
} from "../scripts/translate_with_openai.mjs";

const roots = [];

function temporaryRoot() {
  const root = mkdtempSync(join(tmpdir(), "openai-translation-"));
  roots.push(root);
  return root;
}

function put(root, path, content) {
  const target = join(root, path);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, content, "utf8");
}

function responseWith(files) {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      status: "completed",
      output: [
        {
          type: "message",
          content: [{ type: "output_text", text: JSON.stringify({ files }) }],
        },
      ],
    }),
  };
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe("OpenAI translation fallback", () => {
  test("discovers the one post target in an isolated snapshot", () => {
    const root = temporaryRoot();
    put(root, "src/content/posts/20260815-120000/index.ja.md", "日本語");
    put(root, "src/content/posts/20260815-120000/index.en.md", "Old English");
    put(root, "public/thumbnails/20260815-120000.png", "image");

    expect(discoverTranslationTargets(root)).toEqual([
      {
        sourcePath: "src/content/posts/20260815-120000/index.ja.md",
        targetPath: "src/content/posts/20260815-120000/index.en.md",
      },
    ]);
  });

  test("requires both About sources and returns both English targets", () => {
    const root = temporaryRoot();
    put(root, "src/content/about/about.ja.toml", 'name = "名前"');
    put(root, "src/content/about/news.ja.toml", 'title = "ニュース"');

    expect(discoverTranslationTargets(root)).toEqual([
      {
        sourcePath: "src/content/about/about.ja.toml",
        targetPath: "src/content/about/about.en.toml",
      },
      {
        sourcePath: "src/content/about/news.ja.toml",
        targetPath: "src/content/about/news.en.toml",
      },
    ]);
  });

  test("rejects an ambiguous snapshot", () => {
    const root = temporaryRoot();
    put(root, "src/content/posts/20260815-120000/index.ja.md", "一");
    put(root, "src/content/works/example/index.ja.md", "二");

    expect(() => discoverTranslationTargets(root)).toThrow(/exactly one translatable/);
  });

  test("builds a low-reasoning strict Responses API request", () => {
    const root = temporaryRoot();
    put(root, "src/content/works/example/index.ja.md", "日本語");
    const targets = discoverTranslationTargets(root);
    const request = buildTranslationRequest({
      model: "gpt-5.6-terra",
      instructions: "Translate safely.",
      root,
      targets,
    });

    expect(request).toMatchObject({
      model: "gpt-5.6-terra",
      reasoning: { effort: "low" },
      store: false,
      text: {
        verbosity: "low",
        format: { type: "json_schema", name: "translated_content", strict: true },
      },
    });
    expect(JSON.parse(request.input)).toEqual({
      sources: [{ path: targets[0].sourcePath, content: "日本語" }],
    });
    expect(request.text.format.schema.properties.files.minItems).toBe(1);
    expect(request.text.format.schema.properties.files.maxItems).toBe(1);
  });

  test("writes only the validated English target", async () => {
    const root = temporaryRoot();
    const ja = '+++\ntitle = "記事"\n+++\n\n本文。\n';
    const en = '+++\ntitle = "Article"\n+++\n\nBody.\n';
    const sourcePath = "src/content/posts/20260815-120000/index.ja.md";
    const targetPath = "src/content/posts/20260815-120000/index.en.md";
    put(root, sourcePath, ja);
    put(root, targetPath, "old");
    const calls = [];

    const result = await translateSnapshotWithOpenAI({
      snapshotRoot: root,
      apiKey: "test-key",
      fetchImpl: async (url, init) => {
        calls.push({ url, init });
        return responseWith([{ path: targetPath, content: en }]);
      },
    });

    expect(result).toEqual({ model: "gpt-5.6-terra", paths: [targetPath] });
    expect(readFileSync(join(root, sourcePath), "utf8")).toBe(ja);
    expect(readFileSync(join(root, targetPath), "utf8")).toBe(en);
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe("https://api.openai.com/v1/responses");
    expect(calls[0].init.headers.Authorization).toBe("Bearer test-key");
  });

  test("rejects duplicate or unexpected targets before writing", () => {
    const targets = [
      {
        sourcePath: "src/content/about/about.ja.toml",
        targetPath: "src/content/about/about.en.toml",
      },
      {
        sourcePath: "src/content/about/news.ja.toml",
        targetPath: "src/content/about/news.en.toml",
      },
    ];
    const data = {
      output: [
        {
          type: "message",
          content: [
            {
              type: "output_text",
              text: JSON.stringify({
                files: [
                  { path: targets[0].targetPath, content: "one" },
                  { path: targets[0].targetPath, content: "two" },
                ],
              }),
            },
          ],
        },
      ],
    };

    expect(() => translatedFilesFromResponse(data, targets)).toThrow(/invalid translation target/);
  });

  test("retries a transient API response without exposing its body", async () => {
    const root = temporaryRoot();
    const sourcePath = "src/content/works/example/index.ja.md";
    const targetPath = "src/content/works/example/index.en.md";
    put(root, sourcePath, "日本語");
    let calls = 0;

    await translateSnapshotWithOpenAI({
      snapshotRoot: root,
      apiKey: "test-key",
      fetchImpl: async () => {
        calls += 1;
        if (calls === 1) {
          return { ok: false, status: 429, text: async () => "private provider detail" };
        }
        return responseWith([{ path: targetPath, content: "English" }]);
      },
      retryOptions: { attempts: 2, delay: async () => {} },
    });

    expect(calls).toBe(2);
    expect(readFileSync(join(root, targetPath), "utf8")).toBe("English");
  });
});
