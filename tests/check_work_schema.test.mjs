import { parse as parseToml } from "smol-toml";
import { describe, expect, test } from "vitest";
import { assertValidWorkMetadata, validateWorkMetadata } from "../scripts/workSchema.mjs";

function errorsFor(toml) {
  return validateWorkMetadata(parseToml(toml)).map((error) => error.field);
}

const validCases = [
  `
title = "LineWatch"
year = 2025
`,
  `
title = "LineWatch"
tagline = "ログを線で見る観測ツール"
summary = "説明。"
year = 2025
stack = ["Rust", "Canvas"]
thumbnail = "/works/linewatch/thumb.png"
hero = "/works/linewatch/hero.png"
`,
  `
title = "LineWatch"
year = 2025
stack = []
thumbnail = ""
hero = ""
`,
];

const invalidCases = [
  { field: "title", toml: `year = 2025` },
  { field: "title", toml: `title = ""\nyear = 2025` },
  { field: "title", toml: `title = 5\nyear = 2025` },
  { field: "year", toml: `title = "W"` },
  { field: "year", toml: `title = "W"\nyear = "2025"` },
  { field: "year", toml: `title = "W"\nyear = 2025.5` },
  { field: "stack", toml: `title = "W"\nyear = 2025\nstack = "Rust"` },
  { field: "stack", toml: `title = "W"\nyear = 2025\nstack = ["Rust", 1]` },
  { field: "tagline", toml: `title = "W"\nyear = 2025\ntagline = 1` },
  { field: "summary", toml: `title = "W"\nyear = 2025\nsummary = 1` },
  { field: "thumbnail", toml: `title = "W"\nyear = 2025\nthumbnail = "works/a.png"` },
  { field: "hero", toml: `title = "W"\nyear = 2025\nhero = "../a.png"` },
  { field: "thumbnail", toml: `title = "W"\nyear = 2025\nthumbnail = "//example.com/a.png"` },
  { field: "hero", toml: `title = "W"\nyear = 2025\nhero = "//example.com/a.png"` },
  { field: "detail", toml: `title = "W"\nyear = 2025\ndetail = ["legacy"]` },
];

describe("validateWorkMetadata", () => {
  test.each(validCases)("accepts valid metadata case %#", (toml) => {
    expect(validateWorkMetadata(parseToml(toml))).toEqual([]);
  });

  test.each(invalidCases)("reports a $field error", ({ toml, field }) => {
    expect(errorsFor(toml)).toContain(field);
  });

  test("requires year in the Japanese file", () => {
    expect(validateWorkMetadata({ title: "W" }, { locale: "ja" })).toEqual([
      { field: "year", reason: "is required" },
    ]);
  });

  test("does not require year in the English file, which never supplies it", () => {
    expect(validateWorkMetadata({ title: "W" }, { locale: "en" })).toEqual([]);
  });

  test("still rejects a malformed year in the English file", () => {
    expect(validateWorkMetadata({ title: "W", year: "2025" }, { locale: "en" })).toEqual([
      { field: "year", reason: "must be an integer" },
    ]);
  });

  test("rejects a non-table frontmatter", () => {
    expect(validateWorkMetadata("nope")).toEqual([
      { field: "frontmatter", reason: "must be a TOML table" },
    ]);
  });
});

describe("assertValidWorkMetadata", () => {
  test("throws a readable file-scoped message", () => {
    expect(() => assertValidWorkMetadata({ title: "" }, "works/a/index.ja.md")).toThrow(
      /works\/a\/index\.ja\.md: title: must be a non-empty string/,
    );
  });

  test("returns the metadata when it is valid", () => {
    const meta = { title: "LineWatch", year: 2025 };

    expect(assertValidWorkMetadata(meta, "works/a/index.ja.md")).toBe(meta);
  });
});
