import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";

import {
  contentWatchFiles,
  loadSiteContent,
  postIdPattern,
  relatedPostIds,
  rootDir,
} from "../scripts/content_loader.mjs";

const posts = [
  { id: "newest-two-tags", date: "2026-05-04", tags: ["react", "perf"] },
  { id: "target", date: "2026-05-03", tags: ["react", "build"] },
  { id: "older-two-tags", date: "2026-05-02", tags: ["react", "build"] },
  { id: "newer-one-tag", date: "2026-05-01", tags: ["build"] },
  { id: "no-shared-tags", date: "2026-04-30", tags: ["ops"] },
];

assert.deepEqual(
  relatedPostIds(posts[1], posts),
  ["older-two-tags", "newest-two-tags", "newer-one-tag"],
  "related posts keep shared-tag score first, then newer date",
);

assert.deepEqual(
  relatedPostIds({ id: "only", date: "2026-01-01", tags: ["solo"] }, [
    { id: "only", date: "2026-01-01", tags: ["solo"] },
  ]),
  [],
  "single-post content has no related IDs",
);

assert.deepEqual(
  relatedPostIds({ id: "missing", date: "2026-01-01", tags: [] }, []),
  [],
  "empty post collections do not fail",
);

assert.deepEqual(
  relatedPostIds({ id: "target" }, [
    null,
    { id: "draft-without-tags" },
    { id: "draft-without-date", tags: ["build"] },
  ]),
  ["draft-without-tags", "draft-without-date"],
  "partial draft-like post objects do not fail",
);

assert.deepEqual(
  relatedPostIds(null, posts),
  [],
  "missing current post does not fail",
);

assert.deepEqual(
  relatedPostIds(posts[1], null),
  [],
  "missing post collection does not fail",
);

const content = loadSiteContent();

assert.ok(Array.isArray(content.POSTS), "loadSiteContent returns a POSTS array");
assert.ok(content.POSTS.length > 0, "loadSiteContent finds checked-in posts");
assert.deepEqual(
  content.POSTS.map((post) => post.date),
  [...content.POSTS.map((post) => post.date)].sort((a, b) => b.localeCompare(a)),
  "loadSiteContent returns posts sorted newest first",
);

const firstPost = content.POSTS.find((post) => post.id === "20260521-a1b2c3d4");
assert.ok(firstPost, "fixture article is present in loaded content");
assert.deepEqual(
  {
    title: firstPost.title,
    date: firstPost.date,
    dateLabel: firstPost.dateLabel,
    tags: firstPost.tags,
    summary: firstPost.summary,
    thumbnail: firstPost.thumbnail,
  },
  {
    title: { ja: "型で導く CLI 設計", en: "Type-Driven CLI Design" },
    date: "2026-05-21",
    dateLabel: { ja: "2026年5月21日", en: "May 21, 2026" },
    tags: ["CLI", "型", "DX"],
    summary: {
      ja: "サブコマンドと引数を型で表現すると、ヘルプ・補完・検証が一箇所から生える。手書きの分岐を消すまでの記録。",
      en: "When subcommands and arguments are expressed as types, help, completion and validation all grow from one place. Notes on deleting hand-written branches.",
    },
    thumbnail: "/provisional_ogp_image.png",
  },
  "loadSiteContent resolves localized metadata, date labels, summaries, tags, and thumbnail",
);

assert.deepEqual(
  content.ARTICLE_BODIES[firstPost.id].headings,
  [
    { id: "何が問題だったか", ja: "何が問題だったか", en: "What was wrong" },
    { id: "型で形を与える", ja: "型で形を与える", en: "Giving it a shape with types" },
    { id: "ヘルプ-補完-検証を導出する", ja: "ヘルプ・補完・検証を導出する", en: "Deriving help, completion, validation" },
    { id: "結果", ja: "結果", en: "The result" },
  ],
  "loadSiteContent derives bilingual h2 heading metadata from markdown bodies",
);

assert.deepEqual(content.TAGS, ["CLI", "型", "DX"], "loadSiteContent preserves first-seen unique tag order");

assert.deepEqual(
  {
    initials: content.PERSON.initials,
    name: content.PERSON.name,
    firstCareer: content.PERSON.career[0],
    firstActivity: content.PERSON.activities[0],
  },
  {
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
  },
  "loadSiteContent localizes about content by matching Japanese and English records",
);

assert.ok(postIdPattern().test("20260521-a1b2c3d4"), "postIdPattern accepts generated post directory names");
assert.equal(postIdPattern().test("20260521-A1B2C3D4"), false, "postIdPattern rejects uppercase hex");
assert.equal(postIdPattern().test("draft"), false, "postIdPattern rejects non-generated names");

const root = rootDir();
const watchedFiles = contentWatchFiles();
assert.ok(
  watchedFiles.includes(join(root, "src/content/metadata.toml")),
  "contentWatchFiles includes metadata config",
);
assert.ok(
  watchedFiles.includes(join(root, "src/content/prompts/tag-generation.md")),
  "contentWatchFiles includes configured tag-generation prompt",
);
assert.ok(
  watchedFiles.includes(join(root, "src/content/posts/20260521-a1b2c3d4/index.ja.md")),
  "contentWatchFiles includes Japanese article markdown",
);
assert.ok(
  watchedFiles.every((file) => existsSync(file)),
  "contentWatchFiles only returns existing checked-in files for the current repository",
);

console.log("content loader checks passed");
