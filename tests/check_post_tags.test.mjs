import { describe, expect, test } from "vitest";

import { localizedTags, translatePostTag } from "../src/postTags.js";

describe("localizedTags", () => {
  test("uses the requested locale and falls back safely", () => {
    expect(localizedTags({ ja: ["設計"], en: ["design"] }, "en")).toEqual(["design"]);
    expect(localizedTags({ ja: ["設計"] }, "en")).toEqual(["設計"]);
    expect(localizedTags({ en: ["design"] }, "ja")).toEqual(["design"]);
    expect(localizedTags(undefined, "ja")).toEqual([]);
  });

  test("retains compatibility with legacy tag arrays", () => {
    const tags = ["design"];
    expect(localizedTags(tags, "en")).toBe(tags);
  });
});

describe("translatePostTag", () => {
  const posts = [
    {
      id: "design",
      tags: {
        ja: ["ソフトウェア設計", "TypeScript", "設計原則"],
        en: ["software design", "TypeScript", "design principles"],
      },
    },
  ];

  test("maps a selected tag by its locale-pair position", () => {
    expect(translatePostTag(posts, "ソフトウェア設計", "ja", "en")).toBe("software design");
    expect(translatePostTag(posts, "design principles", "en", "ja")).toBe("設計原則");
    expect(translatePostTag(posts, "TypeScript", "ja", "en")).toBe("TypeScript");
  });

  test("keeps unknown and incomplete tags unchanged", () => {
    expect(translatePostTag(posts, "unknown", "ja", "en")).toBe("unknown");
    expect(translatePostTag([{ tags: { ja: ["設計"], en: [] } }], "設計", "ja", "en")).toBe("設計");
  });
});
