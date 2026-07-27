import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

import {
  contentWatchFiles,
  loadSiteContent,
  normalizeNewsEntries,
  postIdPattern,
  relatedPostIds,
  rootDir,
} from "../scripts/content_loader.mjs";

describe("relatedPostIds", () => {
  const posts = [
    { id: "newest-two-tags", date: "2026-05-04", tags: ["react", "perf"] },
    { id: "target", date: "2026-05-03", tags: ["react", "build"] },
    { id: "older-two-tags", date: "2026-05-02", tags: ["react", "build"] },
    { id: "newer-one-tag", date: "2026-05-01", tags: ["build"] },
    { id: "no-shared-tags", date: "2026-04-30", tags: ["ops"] },
  ];

  test.each([
    {
      name: "orders by shared-tag score first, then newer date",
      current: posts[1],
      collection: posts,
      expected: ["older-two-tags", "newest-two-tags", "newer-one-tag"],
    },
    {
      name: "single-post content has no related IDs",
      current: { id: "only", date: "2026-01-01", tags: ["solo"] },
      collection: [{ id: "only", date: "2026-01-01", tags: ["solo"] }],
      expected: [],
    },
    {
      name: "empty post collections do not fail",
      current: { id: "missing", date: "2026-01-01", tags: [] },
      collection: [],
      expected: [],
    },
    {
      name: "partial draft-like post objects do not fail",
      current: { id: "target" },
      collection: [
        null,
        { id: "draft-without-tags" },
        { id: "draft-without-date", tags: ["build"] },
      ],
      expected: ["draft-without-tags", "draft-without-date"],
    },
    {
      name: "missing current post does not fail",
      current: null,
      collection: posts,
      expected: [],
    },
    {
      name: "missing post collection does not fail",
      current: posts[1],
      collection: null,
      expected: [],
    },
  ])("$name", ({ current, collection, expected }) => {
    expect(relatedPostIds(current, collection)).toEqual(expected);
  });
});

describe("loadSiteContent", () => {
  const content = loadSiteContent();

  test("returns a non-empty POSTS array sorted newest first", () => {
    expect(Array.isArray(content.POSTS)).toBe(true);
    expect(content.POSTS.length).toBeGreaterThan(0);
    expect(content.POSTS.map((post) => post.date)).toEqual(
      [...content.POSTS.map((post) => post.date)].sort((a, b) => b.localeCompare(a)),
    );
  });

  test("resolves localized metadata, date labels, summaries, tags, and thumbnail", () => {
    const firstPost = content.POSTS.find((post) => post.id === "20260521-a1b2c3d4");
    expect(firstPost).toBeDefined();
    expect({
      title: firstPost.title,
      date: firstPost.date,
      dateLabel: firstPost.dateLabel,
      tags: firstPost.tags,
      summary: firstPost.summary,
      thumbnail: firstPost.thumbnail,
    }).toEqual({
      title: { ja: "型で導く CLI 設計", en: "Type-Driven CLI Design" },
      date: "2026-05-21",
      dateLabel: { ja: "2026年5月21日", en: "May 21, 2026" },
      tags: ["CLI", "型", "DX"],
      summary: {
        ja: "サブコマンドと引数を型で表現すると、ヘルプ・補完・検証が一箇所から生える。手書きの分岐を消すまでの記録。",
        en: "When subcommands and arguments are expressed as types, help, completion and validation all grow from one place. Notes on deleting hand-written branches.",
      },
      thumbnail: "/provisional_ogp_image.png",
    });
  });

  test("derives bilingual h2 heading metadata from the Markdown body", () => {
    const firstPost = content.POSTS.find((post) => post.id === "20260521-a1b2c3d4");
    expect(content.ARTICLE_BODIES[firstPost.id].headings).toEqual([
      { id: "何が問題だったか", ja: "何が問題だったか", en: "What was wrong" },
      { id: "型で形を与える", ja: "型で形を与える", en: "Giving it a shape with types" },
      {
        id: "ヘルプ-補完-検証を導出する",
        ja: "ヘルプ・補完・検証を導出する",
        en: "Deriving help, completion, validation",
      },
      { id: "結果", ja: "結果", en: "The result" },
    ]);
  });

  test("preserves first-seen unique tag order", () => {
    expect(content.TAGS).toEqual(["CLI", "型", "DX"]);
  });

  // These assert the shape the loader produces, not the author's own wording:
  // the About TOML is edited often, and pinning its prose here would turn every
  // content tweak into a CI failure.
  test("pairs each Japanese record with the English one at the same index", () => {
    expect(content.PERSON.name.ja).toBeTruthy();
    expect(content.PERSON.name.en).toBeTruthy();
    for (const entry of content.PERSON.career) {
      expect(entry).toEqual({
        period: { ja: expect.any(String), en: expect.any(String) },
        role: { ja: expect.any(String), en: expect.any(String) },
        // An org is optional; the About page skips the line when it is empty.
        org: { ja: expect.any(String), en: expect.any(String) },
      });
      expect(entry.role.en).toBeTruthy();
    }
    for (const entry of content.PERSON.activities) {
      expect(entry).toEqual({
        title: { ja: expect.any(String), en: expect.any(String) },
        // Authored in the TOML; empty keeps the row static instead of expandable.
        description: { ja: expect.any(String), en: expect.any(String) },
      });
      expect(entry.title.en).toBeTruthy();
    }
  });

  test("localizes education entries alongside career entries", () => {
    expect(content.PERSON.education.length).toBeGreaterThan(0);
    for (const entry of content.PERSON.education) {
      expect(entry).toEqual({
        period: { ja: expect.any(String), en: expect.any(String) },
        school: { ja: expect.any(String), en: expect.any(String) },
        description: { ja: expect.any(String), en: expect.any(String) },
      });
      expect(entry.school.en).toBeTruthy();
    }
    // A period can carry words, so the English one must come from the English
    // file rather than falling through to the Japanese "現在".
    expect(content.PERSON.education.some((e) => e.period.ja.includes("現在"))).toBe(true);
    expect(content.PERSON.education.every((e) => !e.period.en.includes("現在"))).toBe(true);
  });

  test("keeps links without an href so they can render as plain text", () => {
    const textOnly = content.PERSON.links.filter((link) => !link.href);
    expect(textOnly.length).toBeGreaterThan(0);
    for (const link of textOnly) expect(link.label).toBeTruthy();
  });

  test("loads news for both locales from the files the about config points at", () => {
    expect(content.NEWS.ja).toHaveLength(content.NEWS.en.length);
    expect(content.NEWS.ja.length).toBeGreaterThan(0);
    for (const item of content.NEWS.ja) {
      expect(item).toMatchObject({
        date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
        dateLabel: { ja: expect.any(String), en: expect.any(String) },
        title: expect.any(String),
        description: expect.any(String),
      });
    }
    expect(content.NEWS.ja.map((item) => item.date)).toEqual(
      [...content.NEWS.ja.map((item) => item.date)].sort((a, b) => b.localeCompare(a)),
    );
    // `[news] count = 5` is the cap, not a requirement.
    expect(content.NEWS.ja.length).toBeLessThanOrEqual(5);
  });
});

describe("normalizeNewsEntries", () => {
  const entries = [
    { date: "2026-01-10", title: "middle" },
    {
      date: "2026-03-02",
      title: "newest",
      description: "with detail",
      href: "https://example.com",
    },
    { date: "2025-12-24", title: "oldest" },
  ];

  test("sorts newest first, carries description, and attaches bilingual date labels", () => {
    expect(normalizeNewsEntries(entries)).toEqual([
      {
        date: "2026-03-02",
        dateLabel: { ja: "2026年3月2日", en: "Mar 2, 2026" },
        title: "newest",
        description: "with detail",
        href: "https://example.com",
      },
      {
        date: "2026-01-10",
        dateLabel: { ja: "2026年1月10日", en: "Jan 10, 2026" },
        title: "middle",
        description: "",
      },
      {
        date: "2025-12-24",
        dateLabel: { ja: "2025年12月24日", en: "Dec 24, 2025" },
        title: "oldest",
        description: "",
      },
    ]);
  });

  test("caps the list at count and omits href when absent", () => {
    const shown = normalizeNewsEntries(entries, 2);
    expect(shown.map((item) => item.title)).toEqual(["newest", "middle"]);
    expect(shown[1]).not.toHaveProperty("href");
  });

  test.each([
    { name: "no count shows everything", count: undefined, expected: 3 },
    { name: "zero count shows everything", count: 0, expected: 3 },
    { name: "count above the list length is harmless", count: 99, expected: 3 },
  ])("$name", ({ count, expected }) => {
    expect(normalizeNewsEntries(entries, count)).toHaveLength(expected);
  });

  test("rejects an entry without a usable date", () => {
    expect(() =>
      normalizeNewsEntries([{ date: "2026/03/02", title: "bad" }], 5, "news.ja.toml"),
    ).toThrow(/news.ja.toml: news entry "bad" needs a YYYY-MM-DD date/);
  });

  test("treats missing entries as an empty list", () => {
    expect(normalizeNewsEntries(undefined, 5)).toEqual([]);
  });
});

describe("postIdPattern", () => {
  test.each([
    ["20260521-a1b2c3d4", true],
    ["20260521-A1B2C3D4", false],
    ["draft", false],
  ])("matches %s -> %s", (id, expected) => {
    expect(postIdPattern().test(id)).toBe(expected);
  });
});

describe("contentWatchFiles", () => {
  const root = rootDir();
  const watchedFiles = contentWatchFiles();

  test.each([
    ["src/content/metadata.toml"],
    ["src/content/prompts/tag-generation.md"],
    ["src/content/posts/20260521-a1b2c3d4/index.ja.md"],
    ["src/content/about/news.ja.toml"],
    ["src/content/about/news.en.toml"],
  ])("includes %s", (relativePath) => {
    expect(watchedFiles).toContain(join(root, relativePath));
  });

  test("only returns existing checked-in files", () => {
    expect(watchedFiles.every((file) => existsSync(file))).toBe(true);
  });
});
