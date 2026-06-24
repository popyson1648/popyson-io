import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, test } from "vitest";

import { evaluateMetadata, hasPendingMetadata, pendingMetadataReasons, resolveMetadata } from "../scripts/generate_metadata.mjs";
import { parseFrontmatterForCheck, parseMarkdownFrontmatter } from "../scripts/frontmatter.mjs";
import { assertValidMetadata, dateToIsoDate, validateMetadata } from "../scripts/metadataSchema.mjs";

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

describe("dateToIsoDate", () => {
  test("uses the value's ISO toString", () => {
    expect(dateToIsoDate({ toString: () => "2026-02-07" })).toBe("2026-02-07");
  });
});

describe("parseMarkdownFrontmatter", () => {
  test("normalizes a BOM and CRLF and returns meta and body", () => {
    const source = "﻿+++\r\ntitle = \"Post\"\r\ndate = \"2026-02-07\"\r\n+++\r\n\r\nBody.\r\n";

    const parsed = parseMarkdownFrontmatter(source, "post.md");

    expect(parsed.meta.title).toBe("Post");
    expect(parsed.meta.date).toBe("2026-02-07");
    expect(parsed.body).toBe("Body.\n");
  });
});

describe("parseFrontmatterForCheck", () => {
  test("reports a missing opening delimiter", () => {
    expect(parseFrontmatterForCheck("title = \"Post\"")).toEqual({
      errors: [{ field: "frontmatter", reason: "must start with TOML frontmatter delimited by +++" }],
    });
  });

  test("reports a missing closing delimiter", () => {
    expect(parseFrontmatterForCheck("+++\ntitle = \"Post\"\n")).toEqual({
      errors: [{ field: "frontmatter", reason: "is missing closing +++ delimiter" }],
    });
  });

  test("reports a readable TOML error", () => {
    const parsed = parseFrontmatterForCheck("+++\ntitle =\n+++\n");

    expect(parsed.errors[0].field).toBe("frontmatter");
    expect(parsed.errors[0].reason).toMatch(/^is not valid TOML:/);
  });
});

describe("validateMetadata", () => {
  test("rejects a non-table input", () => {
    expect(validateMetadata(["not", "a", "table"])).toEqual([
      { field: "frontmatter", reason: "must be a TOML table" },
    ]);
  });

  test("reports every observable error in field order", () => {
    const errors = validateMetadata({
      title: "",
      date: "soon",
      tags: ["js", 1],
      reading: 0,
      legacy: true,
    });

    expect(errors.map((error) => error.field)).toEqual(["legacy", "title", "date", "tags", "reading"]);
  });
});

describe("assertValidMetadata", () => {
  test("throws a readable file-scoped message", () => {
    expect(() => assertValidMetadata({ title: "", date: "soon" }, "post.md")).toThrow(
      /post\.md: title: must be a non-empty string\npost\.md: date: must be YYYY-MM-DD or "auto"/,
    );
  });
});

describe("evaluateMetadata", () => {
  test("reports tag quality errors when tags exceed limits", () => {
    const errors = evaluateMetadata({
      tags: ["valid", "toolongtag", "!!!", "extra"],
      sumup: { mode: "none" },
    }, { filePath: "post.md", locale: "en", config });

    expect(errors).toEqual([
      "post.md: tags: must contain at most 3 tags",
      'post.md: tags: "toolongtag" is longer than 8 characters',
      'post.md: tags: "!!!" must contain a letter or number',
    ]);
  });

  test("reports markup and missing-Japanese errors for a Japanese summary", () => {
    const errors = evaluateMetadata({
      tags: [],
      sumup: { mode: "text", text: "**English only**" },
    }, { filePath: "post.ja.md", locale: "ja", config });

    expect(errors).toEqual([
      "post.ja.md: sumup.text: must not contain Markdown or HTML markup",
      "post.ja.md: sumup.text: Japanese article summaries must contain Japanese text",
    ]);
  });
});

describe("hasPendingMetadata / pendingMetadataReasons", () => {
  test("detects remaining generated fields", () => {
    expect(hasPendingMetadata({
      title: "Post",
      date: "auto",
      auto_tags: { count: 2 },
      sumup: { mode: "auto" },
      thumbnail: { mode: "none" },
    })).toBe(true);
  });

  test("lists stable human-readable reasons for remaining generated fields", () => {
    expect(pendingMetadataReasons({
      date: "auto",
      auto_tags: {},
      sumup: { mode: "auto" },
      thumbnail: { mode: "none" },
    })).toEqual(['date = "auto"', "auto_tags", 'sumup.mode = "auto"', 'thumbnail.mode = "none"']);
  });
});

describe("resolveMetadata", () => {
  test("returns unchanged without calling the provider when already resolved", async () => {
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

    expect(result.changed).toBe(false);
    expect(result.meta.title).toBe("Resolved");
    expect(result.meta.thumbnail.path).toBe("/default.png");
    expect(result.output).toMatch(/Body\./);
  });

  test("throws a readable error when generated tags lack enough usable values", async () => {
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

    await expect(resolveMetadata({
      filePath: join(tmpdir(), "needs-tags.en.md"),
      source,
      config,
      knownTags: ["js"],
      provider: async () => ({ tags: ["js", "", "JS"] }),
    })).rejects.toThrow(/AI metadata generation returned 0 usable tags, expected 2/);
  });
});
