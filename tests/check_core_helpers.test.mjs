import assert from "node:assert/strict";
import { test } from "vitest";

import { makeDateLabel, normalizeIsoDate, localizedDateLabel } from "../src/dateLabel.js";
import { sectionId, slugifyHeading } from "../src/headingSlug.js";
import { allRoutes, configureMetaData, headModel, localized, routeToPath, SITE } from "../src/meta.js";
import { parseRoute } from "../src/routing.js";

test("slugifyHeading_whenEnglishHeadingContainsPunctuation_returnsStableLowercaseSlug", () => {
  const seen = new Map();

  const slug = slugifyHeading("  Type-Driven CLI: Design (v2)  ", seen);

  assert.equal(slug, "type-driven-cli-design-v2");
});

test("slugifyHeading_whenDuplicateHeadingsShareSeenMap_appendsOneBasedSuffixes", () => {
  const seen = new Map();

  const first = slugifyHeading("Feature Set", seen);
  const second = slugifyHeading("Feature Set", seen);
  const third = slugifyHeading("Feature Set", seen);

  assert.deepEqual([first, second, third], ["feature-set", "feature-set-2", "feature-set-3"]);
});

test("slugifyHeading_whenHeadingContainsJapanese_keepsLettersAndNumbers", () => {
  const seen = new Map();

  const slug = slugifyHeading("型で導く CLI 設計 2026", seen);

  assert.equal(slug, "型で導く-cli-設計-2026");
});

test("slugifyHeading_whenHeadingHasNoLettersOrNumbers_returnsSectionFallback", () => {
  const seen = new Map();

  const first = slugifyHeading("!!!", seen);
  const second = slugifyHeading("***", seen);

  assert.deepEqual([first, second], ["section", "section-2"]);
});

test("sectionId_whenSlugIsEmpty_returnsEmptyString", () => {
  const id = sectionId("");

  assert.equal(id, "");
});

test("sectionId_whenSlugExists_prefixesSectionAnchor", () => {
  const id = sectionId("feature-set");

  assert.equal(id, "sec-feature-set");
});

test("normalizeIsoDate_whenValueIsIsoDateString_returnsSameString", () => {
  const date = normalizeIsoDate("2026-02-07");

  assert.equal(date, "2026-02-07");
});

test("normalizeIsoDate_whenValueIsValidDate_returnsUtcDatePortion", () => {
  const date = normalizeIsoDate(new Date("2026-02-07T23:45:00Z"));

  assert.equal(date, "2026-02-07");
});

test("normalizeIsoDate_whenValueIsInvalid_returnsEmptyString", () => {
  const values = ["2026-2-7", "", null, new Date("invalid")];

  const normalized = values.map((value) => normalizeIsoDate(value));

  assert.deepEqual(normalized, ["", "", "", ""]);
});

test("makeDateLabel_whenDateIsValid_returnsJapaneseAndEnglishLabels", () => {
  const label = makeDateLabel("2026-02-07");

  assert.deepEqual(label, { ja: "2026年2月7日", en: "Feb 7, 2026" });
});

test("makeDateLabel_whenMonthOrDayIsOutsideAcceptedRange_returnsEmptyLabels", () => {
  const labels = [
    makeDateLabel("2026-00-07"),
    makeDateLabel("2026-13-07"),
    makeDateLabel("2026-02-00"),
    makeDateLabel("2026-02-32"),
  ];

  assert.deepEqual(labels, [
    { ja: "", en: "" },
    { ja: "", en: "" },
    { ja: "", en: "" },
    { ja: "", en: "" },
  ]);
});

test("localizedDateLabel_whenRequestedLanguageIsMissing_fallsBackToJapaneseThenDate", () => {
  const labelFromJa = localizedDateLabel({ date: "2026-02-07", dateLabel: { ja: "2026年2月7日" } }, "en");
  const labelFromDate = localizedDateLabel({ date: "2026-02-07", dateLabel: {} }, "en");
  const labelFromMissingItem = localizedDateLabel(null, "en");

  assert.deepEqual([labelFromJa, labelFromDate, labelFromMissingItem], ["2026年2月7日", "2026-02-07", ""]);
});

test("parseRoute_whenPathIsRoot_returnsJapaneseAboutRoute", () => {
  const route = parseRoute("/", "");

  assert.deepEqual(route, { name: "about", lang: "ja" });
});

test("parseRoute_whenPathHasEnglishPrefix_stripsPrefixAndSetsEnglishLanguage", () => {
  const routes = [
    parseRoute("/en", ""),
    parseRoute("/en/blog", ""),
    parseRoute("/en/blog/20260521-a1b2c3d4", "?tag=ignored"),
  ];

  assert.deepEqual(routes, [
    { name: "about", lang: "en" },
    { name: "blog", tag: null, lang: "en" },
    { name: "article", id: "20260521-a1b2c3d4", lang: "en" },
  ]);
});

test("parseRoute_whenBlogTagQueryExists_returnsBlogRouteWithTag", () => {
  const route = parseRoute("/blog", "?tag=react");

  assert.deepEqual(route, { name: "blog", tag: "react", lang: "ja" });
});

test("parseRoute_whenPathTargetsAppDetail_returnsAppDetailRoute", () => {
  const route = parseRoute("/app/linewatch", "");

  assert.deepEqual(route, { name: "appDetail", id: "linewatch", lang: "ja" });
});

test("parseRoute_whenPathIsUnknown_fallsBackToAboutRoute", () => {
  const route = parseRoute("/unknown/path", "");

  assert.deepEqual(route, { name: "about", lang: "ja" });
});

test("localized_whenLanguageIsEnglish_prefixesPathAndKeepsQuery", () => {
  const paths = [
    localized("/", "en"),
    localized("/blog", "en"),
    localized("/blog?tag=react", "en"),
    localized("/blog", "ja"),
  ];

  assert.deepEqual(paths, ["/en", "/en/blog", "/en/blog?tag=react", "/blog"]);
});

test("routeToPath_whenRouteIsKnown_returnsCanonicalLocaleLessPath", () => {
  const paths = [
    routeToPath({ name: "about" }),
    routeToPath({ name: "blog" }),
    routeToPath({ name: "article", id: "post-id" }),
    routeToPath({ name: "app" }),
    routeToPath({ name: "appDetail", id: "linewatch" }),
    routeToPath({ name: "reading" }),
    routeToPath({ name: "rss" }),
    routeToPath({ name: "missing" }),
  ];

  assert.deepEqual(paths, ["/", "/blog", "/blog/post-id", "/app", "/app/linewatch", "/reading", "/rss", "/"]);
});

test("headModel_whenArticleExists_usesLocalizedTitleSummaryAndCanonicalUrl", () => {
  configureMetaData({
    POSTS: [{
      id: "post-id",
      title: { ja: "日本語タイトル", en: "English Title" },
      summary: { ja: "日本語要約", en: "English summary" },
      tags: [],
    }],
  });

  const model = headModel({ name: "article", id: "post-id" }, "en");

  assert.equal(model.lang, "en");
  assert.equal(model.title, `English Title | ${SITE.name}`);
  assert.equal(model.description, "English summary");
  assert.equal(model.canonical, `${SITE.url}/en/blog/post-id`);
  assert.deepEqual(model.alternates, [
    { hreflang: "ja", href: `${SITE.url}/blog/post-id` },
    { hreflang: "en", href: `${SITE.url}/en/blog/post-id` },
    { hreflang: "x-default", href: `${SITE.url}/blog/post-id` },
  ]);
  assert.equal(model.og.locale, "en_US");
  assert.equal(model.og.localeAlternate, "ja_JP");
});

test("headModel_whenArticleIsMissing_fallsBackToAboutMetadata", () => {
  configureMetaData({ POSTS: [] });

  const model = headModel({ name: "article", id: "missing" }, "ja");

  assert.equal(model.title, `About | ${SITE.name}`);
  assert.equal(model.canonical, `${SITE.url}/blog/missing`);
  assert.equal(model.og.locale, "ja_JP");
});

test("allRoutes_whenPostsAreConfigured_expandsPostsAppsAndLocales", () => {
  configureMetaData({
    POSTS: [
      { id: "new-post", title: { ja: "新記事" }, summary: { ja: "要約" }, tags: [] },
      { id: "old-post", title: { ja: "旧記事" }, summary: { ja: "要約" }, tags: [] },
    ],
  });

  const routes = allRoutes();
  const keys = routes.map(({ dir, route, lang }) => `${lang}:${dir}:${route.name}:${route.id || ""}`);

  assert.ok(keys.includes("ja::about:"));
  assert.ok(keys.includes("en:en:about:"));
  assert.ok(keys.includes("ja:blog/new-post:article:new-post"));
  assert.ok(keys.includes("en:en/blog/new-post:article:new-post"));
  assert.ok(keys.includes("ja:app/linewatch:appDetail:linewatch"));
  assert.ok(keys.includes("en:en/app/linewatch:appDetail:linewatch"));
});
