import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

import {
  contentWatchFiles,
  loadSiteContent,
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

  test("localizes about content by matching Japanese and English records", () => {
    expect({
      initials: content.PERSON.initials,
      name: content.PERSON.name,
      firstCareer: content.PERSON.career[0],
      firstActivity: content.PERSON.activities[0],
    }).toEqual({
      initials: "RS",
      name: { ja: "佐藤 玲", en: "Rei Sato" },
      firstCareer: {
        period: "2022 — now",
        role: { ja: "シニアエンジニア / 基盤チーム", en: "Senior Engineer / Platform" },
        org: { ja: "Tate Systems", en: "Tate Systems" },
      },
      firstActivity: {
        ja: "技術カンファレンスでの登壇（分散トレーシング、型駆動設計）",
        en: "Conference talks on distributed tracing and type-driven design",
      },
    });
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
  ])("includes %s", (relativePath) => {
    expect(watchedFiles).toContain(join(root, relativePath));
  });

  test("only returns existing checked-in files", () => {
    expect(watchedFiles.every((file) => existsSync(file))).toBe(true);
  });
});
