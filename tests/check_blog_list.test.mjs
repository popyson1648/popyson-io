import { describe, expect, test } from "vitest";

import { filterAndSortBlogRows } from "../src/blogList.js";

const rows = [
  {
    raw: { id: "new-alpha" },
    title: "Alpha Design",
    body: "React architecture, design, and testing",
    tags: ["react", "design"],
    date: "2026-07-30",
    kana: "あるふぁ",
  },
  {
    raw: { id: "old-beta" },
    title: "beta tools",
    body: "Command-line workflow",
    tags: ["tools"],
    date: "2026-07-28",
    kana: "べーた",
  },
  {
    raw: { id: "new-gamma" },
    title: "Gamma",
    body: "TypeScript design notes",
    tags: ["typescript", "design"],
    date: "2026-07-30",
    kana: "がんま",
  },
];

const ids = (result) => result.map((row) => row.raw.id);
const emptyFilters = { tags: [], title: "", body: "" };

describe("filterAndSortBlogRows", () => {
  test("preserves stable source order for equal dates", () => {
    expect(ids(filterAndSortBlogRows(rows, emptyFilters, "date", "desc"))).toEqual([
      "new-alpha",
      "new-gamma",
      "old-beta",
    ]);
  });

  test.each([
    ["date ascending", emptyFilters, "date", "asc", ["old-beta", "new-alpha", "new-gamma"]],
    ["kana ascending", emptyFilters, "kana", "asc", ["new-alpha", "new-gamma", "old-beta"]],
    ["kana descending", emptyFilters, "kana", "desc", ["old-beta", "new-gamma", "new-alpha"]],
    ["case-insensitive title", { ...emptyFilters, title: "ALPHA" }, "date", "desc", ["new-alpha"]],
    [
      "case-insensitive body",
      { ...emptyFilters, body: "typescript" },
      "date",
      "desc",
      ["new-gamma"],
    ],
    [
      "any selected tag",
      { ...emptyFilters, tags: ["tools", "react"] },
      "date",
      "desc",
      ["new-alpha", "old-beta"],
    ],
    [
      "combined filters",
      { tags: ["design"], title: "a", body: "design" },
      "date",
      "desc",
      ["new-alpha", "new-gamma"],
    ],
  ])("%s", (_name, filters, sortKey, sortDir, expected) => {
    expect(ids(filterAndSortBlogRows(rows, filters, sortKey, sortDir))).toEqual(expected);
  });
});
