import { beforeEach, describe, expect, test } from "vitest";

import { makeDateLabel, normalizeIsoDate, localizedDateLabel } from "../src/dateLabel.js";
import { sectionId, slugifyHeading } from "../src/headingSlug.js";
import {
  allRoutes,
  configureMetaData,
  headModel,
  localized,
  routeToPath,
  SITE,
} from "../src/meta.js";
import { parseRoute } from "../src/routing.js";

describe("slugifyHeading", () => {
  test("lowercases and dashes an English heading with punctuation", () => {
    const slug = slugifyHeading("  Type-Driven CLI: Design (v2)  ", new Map());

    expect(slug).toBe("type-driven-cli-design-v2");
  });

  test("appends one-based suffixes to duplicate headings sharing a seen map", () => {
    const seen = new Map();

    const slugs = [
      slugifyHeading("Feature Set", seen),
      slugifyHeading("Feature Set", seen),
      slugifyHeading("Feature Set", seen),
    ];

    expect(slugs).toEqual(["feature-set", "feature-set-2", "feature-set-3"]);
  });

  test("keeps Japanese letters and numbers", () => {
    const slug = slugifyHeading("型で導く CLI 設計 2026", new Map());

    expect(slug).toBe("型で導く-cli-設計-2026");
  });

  test("falls back to a section slug when there are no letters or numbers", () => {
    const seen = new Map();

    expect(slugifyHeading("!!!", seen)).toBe("section");
    expect(slugifyHeading("***", seen)).toBe("section-2");
  });
});

describe("sectionId", () => {
  test("returns an empty string for an empty slug", () => {
    expect(sectionId("")).toBe("");
  });

  test("prefixes existing slugs with the section anchor", () => {
    expect(sectionId("feature-set")).toBe("sec-feature-set");
  });
});

describe("normalizeIsoDate", () => {
  test("returns ISO date strings unchanged", () => {
    expect(normalizeIsoDate("2026-02-07")).toBe("2026-02-07");
  });

  test("returns the UTC date portion of a valid Date", () => {
    expect(normalizeIsoDate(new Date("2026-02-07T23:45:00Z"))).toBe("2026-02-07");
  });

  test.each([
    ["2026-2-7"],
    [""],
    [null],
    [new Date("invalid")],
  ])("returns an empty string for invalid value %o", (value) => {
    expect(normalizeIsoDate(value)).toBe("");
  });
});

describe("makeDateLabel", () => {
  test("returns Japanese and English labels for a valid date", () => {
    expect(makeDateLabel("2026-02-07")).toEqual({ ja: "2026年2月7日", en: "Feb 7, 2026" });
  });

  test.each([
    ["2026-00-07"],
    ["2026-13-07"],
    ["2026-02-00"],
    ["2026-02-32"],
  ])("returns empty labels when month or day is out of range (%s)", (date) => {
    expect(makeDateLabel(date)).toEqual({ ja: "", en: "" });
  });
});

describe("localizedDateLabel", () => {
  test("falls back to Japanese, then the raw date, then empty", () => {
    expect(
      localizedDateLabel({ date: "2026-02-07", dateLabel: { ja: "2026年2月7日" } }, "en"),
    ).toBe("2026年2月7日");
    expect(localizedDateLabel({ date: "2026-02-07", dateLabel: {} }, "en")).toBe("2026-02-07");
    expect(localizedDateLabel(null, "en")).toBe("");
  });
});

describe("parseRoute", () => {
  test("treats the root path as the Japanese About route", () => {
    expect(parseRoute("/", "")).toEqual({ name: "about", lang: "ja" });
  });

  test("strips the /en prefix and sets the English language", () => {
    expect(parseRoute("/en", "")).toEqual({ name: "about", lang: "en" });
    expect(parseRoute("/en/blog", "")).toEqual({ name: "blog", tag: null, lang: "en" });
    expect(parseRoute("/en/blog/20260521-a1b2c3d4", "?tag=ignored")).toEqual({
      name: "article",
      id: "20260521-a1b2c3d4",
      lang: "en",
    });
  });

  test("reads a blog tag from the query string", () => {
    expect(parseRoute("/blog", "?tag=react")).toEqual({ name: "blog", tag: "react", lang: "ja" });
  });

  test("parses an app detail path", () => {
    expect(parseRoute("/app/linewatch", "")).toEqual({
      name: "appDetail",
      id: "linewatch",
      lang: "ja",
    });
  });

  test("falls back to the About route for unknown paths", () => {
    expect(parseRoute("/unknown/path", "")).toEqual({ name: "about", lang: "ja" });
  });
});

describe("localized", () => {
  test.each([
    ["/", "en", "/en"],
    ["/blog", "en", "/en/blog"],
    ["/blog?tag=react", "en", "/en/blog?tag=react"],
    ["/blog", "ja", "/blog"],
  ])("localizes %s for %s", (path, lang, expected) => {
    expect(localized(path, lang)).toBe(expected);
  });
});

describe("routeToPath", () => {
  test.each([
    [{ name: "about" }, "/"],
    [{ name: "blog" }, "/blog"],
    [{ name: "article", id: "post-id" }, "/blog/post-id"],
    [{ name: "app" }, "/app"],
    [{ name: "appDetail", id: "linewatch" }, "/app/linewatch"],
    [{ name: "reading" }, "/reading"],
    [{ name: "rss" }, "/rss"],
    [{ name: "missing" }, "/"],
  ])("maps %o to its canonical locale-less path", (route, expected) => {
    expect(routeToPath(route)).toBe(expected);
  });
});

describe("headModel", () => {
  beforeEach(() => {
    configureMetaData({ POSTS: [] });
  });

  test("uses localized title/summary and canonical URL when the article exists", () => {
    configureMetaData({
      POSTS: [
        {
          id: "post-id",
          title: { ja: "日本語タイトル", en: "English Title" },
          summary: { ja: "日本語要約", en: "English summary" },
          tags: [],
        },
      ],
    });

    const model = headModel({ name: "article", id: "post-id" }, "en");

    expect(model.lang).toBe("en");
    expect(model.title).toBe(`English Title | ${SITE.name}`);
    expect(model.description).toBe("English summary");
    expect(model.canonical).toBe(`${SITE.url}/en/blog/post-id`);
    expect(model.alternates).toEqual([
      { hreflang: "ja", href: `${SITE.url}/blog/post-id` },
      { hreflang: "en", href: `${SITE.url}/en/blog/post-id` },
      { hreflang: "x-default", href: `${SITE.url}/blog/post-id` },
    ]);
    expect(model.og.locale).toBe("en_US");
    expect(model.og.localeAlternate).toBe("ja_JP");
  });

  test("falls back to About metadata when the article is missing", () => {
    const model = headModel({ name: "article", id: "missing" }, "ja");

    expect(model.title).toBe(`About | ${SITE.name}`);
    expect(model.canonical).toBe(`${SITE.url}/blog/missing`);
    expect(model.og.locale).toBe("ja_JP");
  });
});

describe("allRoutes", () => {
  test("expands posts, apps, and locales when posts are configured", () => {
    configureMetaData({
      POSTS: [
        { id: "new-post", title: { ja: "新記事" }, summary: { ja: "要約" }, tags: [] },
        { id: "old-post", title: { ja: "旧記事" }, summary: { ja: "要約" }, tags: [] },
      ],
    });

    const keys = allRoutes().map(
      ({ dir, route, lang }) => `${lang}:${dir}:${route.name}:${route.id || ""}`,
    );

    expect(keys).toEqual(
      expect.arrayContaining([
        "ja::about:",
        "en:en:about:",
        "ja:blog/new-post:article:new-post",
        "en:en/blog/new-post:article:new-post",
        "ja:app/linewatch:appDetail:linewatch",
        "en:en/app/linewatch:appDetail:linewatch",
      ]),
    );
  });
});
