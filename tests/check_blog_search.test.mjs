import { describe, expect, test } from "vitest";

import {
  mergePagefindResults,
  mergePostSearchResults,
  normalizeSearchText,
  searchLocalPosts,
  searchPagefindAnyTerms,
  tokenizeSearchQuery,
} from "../src/blogSearch.js";

const result = (id, score) => ({ id, score, data: () => id });

describe("Blog search query handling", () => {
  test("normalizes compatibility characters and splits all whitespace", () => {
    expect(normalizeSearchText(" ＡLGORITHM ")).toBe(" algorithm ");
    expect(tokenizeSearchQuery(" 設計\tアルゴリズム\n設計 ")).toEqual(["設計", "アルゴリズム"]);
  });

  test("merges any-word results and removes duplicate articles", () => {
    const design = result("design", 2);
    const bothFromDesign = result("both", 1);
    const algorithm = result("algorithm", 3);
    const bothFromAlgorithm = result("both", 4);

    expect(
      mergePagefindResults([
        [design, bothFromDesign],
        [algorithm, bothFromAlgorithm],
      ]),
    ).toEqual([bothFromAlgorithm, algorithm, design]);
  });

  test("uses aggregate relevance, stable order, and the requested limit", () => {
    const first = result("first", 2);
    const second = result("second", 2);
    const high = result("high", 5);

    expect(mergePagefindResults([[first, second, high]], 2)).toEqual([high, first]);
    expect(mergePagefindResults([[first]], 0)).toEqual([]);
  });

  test("searches each unique word through Pagefind", async () => {
    const pagefind = {
      search: async (query, options) => ({
        results: [result(`${query}-${options.filters.lang[0]}`, 1)],
      }),
    };

    await expect(
      searchPagefindAnyTerms(pagefind, "設計 アルゴリズム 設計", { filters: { lang: ["ja"] } }, 8),
    ).resolves.toEqual([
      expect.objectContaining({ id: "設計-ja" }),
      expect.objectContaining({ id: "アルゴリズム-ja" }),
    ]);
  });

  test("finds any-word matches locally when Pagefind is unavailable", () => {
    const docs = [
      {
        p: { id: "design" },
        title: "設計の記事",
        tags: "#ソフトウェア設計",
        body: "凝集度について",
      },
      {
        p: { id: "algorithm" },
        title: "償却計算量",
        tags: "#アルゴリズム",
        body: "データ構造について",
      },
    ];

    expect(searchLocalPosts(docs, "設計 アルゴリズム", 8)).toEqual([
      { p: { id: "design" }, where: "title", snippet: "" },
      { p: { id: "algorithm" }, where: "tag", snippet: "" },
    ]);
  });

  test("prefers indexed records and appends unique local fallbacks", () => {
    const indexed = { p: { id: "design" }, where: "body", snippet: "indexed" };
    const localDuplicate = { p: { id: "design" }, where: "title", snippet: "" };
    const localOnly = { p: { id: "algorithm" }, where: "tag", snippet: "" };

    expect(mergePostSearchResults([indexed], [localDuplicate, localOnly], 8)).toEqual([
      indexed,
      localOnly,
    ]);
  });
});
