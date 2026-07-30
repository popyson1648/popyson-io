import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, test } from "vitest";

import { loadSiteContent } from "../scripts/content_loader.mjs";
import { searchPagefindAnyTerms } from "../src/blogSearch.js";

const DIST = resolve("dist");
// Pagefind only indexes article bodies, and with no posts the build emits no
// index at all — there is nothing to search, so the suite has nothing to say.
const POSTS = loadSiteContent().POSTS;
const HAS_POSTS = POSTS.length > 0;
// Asserted against whichever post the site currently ships, so adding or
// removing posts does not strand the suite on a post that no longer exists.
const POST = POSTS[0];
const CONTENT_TYPES = {
  ".css": "text/css",
  ".html": "text/html",
  ".js": "text/javascript",
  ".json": "application/json",
  ".pagefind": "application/octet-stream",
  ".pf_filter": "application/octet-stream",
  ".pf_fragment": "application/octet-stream",
  ".pf_index": "application/octet-stream",
  ".pf_meta": "application/octet-stream",
  ".wasm": "application/wasm",
};

function serveDist() {
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url || "/", "http://127.0.0.1");
      const pathname = url.pathname === "/" ? "/index.html" : decodeURIComponent(url.pathname);
      const file = join(DIST, pathname);
      const data = await readFile(file);
      res.setHeader("Content-Type", CONTENT_TYPES[extname(file)] || "application/octet-stream");
      res.end(data);
    } catch {
      res.statusCode = 404;
      res.end("not found");
    }
  });

  return new Promise((resolveServer, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolveServer(server));
  });
}

// Every match, not just the top one: ranking is deterministic but not part of
// what this suite is asserting.
async function searchWithLang(pagefind, base, lang, query) {
  await pagefind.destroy();
  document.documentElement.lang = lang;
  await pagefind.options({ basePath: `${base}/pagefind/`, excerptLength: 20 });
  const response = await pagefind.search(query, { filters: { lang: [lang] } });
  return Promise.all(response.results.map((result) => result.data()));
}

describe.skipIf(!HAS_POSTS)("Pagefind search over the built dist/", () => {
  let server;
  let base;
  let pagefind;

  beforeAll(async () => {
    server = await serveDist();
    base = `http://127.0.0.1:${server.address().port}`;

    globalThis.location = /** @type {Location} */ ({ href: `${base}/`, origin: base });
    globalThis.document = /** @type {Document} */ ({
      currentScript: null,
      documentElement: { lang: "ja" },
      querySelector(selector) {
        return selector === "html" ? { getAttribute: () => this.documentElement.lang } : null;
      },
    });

    pagefind = await import(`file://${join(DIST, "pagefind/pagefind.js")}?ts=${Date.now()}`);
  });

  afterAll(() => {
    server?.close();
  });

  test("finds the Japanese article for a Japanese query", async () => {
    const results = await searchWithLang(pagefind, base, "ja", POST.title.ja);

    expect(results).toContainEqual(
      expect.objectContaining({
        url: `${base}/blog/${POST.id}/`,
        meta: expect.objectContaining({ title: POST.title.ja }),
      }),
    );
  });

  test("finds the English article for an English query", async () => {
    const results = await searchWithLang(pagefind, base, "en", POST.title.en);

    expect(results).toContainEqual(
      expect.objectContaining({
        url: `${base}/en/blog/${POST.id}/`,
        meta: expect.objectContaining({ title: POST.title.en }),
      }),
    );
  });

  test("indexes and filters with only the selected locale's tags", async () => {
    const pairedPost = POSTS.find(
      (post) =>
        post.tags.en.some((tag, index) => tag !== post.tags.ja[index]) &&
        post.tags.en.some((tag) => /[a-z]/i.test(tag)),
    );
    expect(pairedPost).toBeTruthy();
    const englishTag = pairedPost.tags.en.find(
      (tag, index) => tag !== pairedPost.tags.ja[index] && /[a-z]/i.test(tag),
    );
    const japaneseTag = pairedPost.tags.ja[pairedPost.tags.en.indexOf(englishTag)];

    const englishResults = await searchWithLang(pagefind, base, "en", englishTag);
    expect(englishResults.map((result) => result.url)).toContain(
      `${base}/en/blog/${pairedPost.id}/`,
    );

    await pagefind.destroy();
    document.documentElement.lang = "en";
    await pagefind.options({ basePath: `${base}/pagefind/`, excerptLength: 20 });
    const filtered = await pagefind.search(englishTag, {
      filters: { lang: ["en"], tag: [englishTag] },
    });
    const records = await Promise.all(filtered.results.map((result) => result.data()));
    expect(records.map((result) => result.url)).toContain(`${base}/en/blog/${pairedPost.id}/`);

    const leaked = await pagefind.search(japaneseTag, { filters: { lang: ["en"] } });
    expect(leaked.results).toHaveLength(0);
  });

  test("merges matches from whitespace-separated Japanese words", async () => {
    const design = await searchWithLang(pagefind, base, "ja", "設計");
    const algorithm = await searchWithLang(pagefind, base, "ja", "アルゴリズム");
    const expectedUrls = [...new Set([...design, ...algorithm].map((result) => result.url))];
    expect(expectedUrls.length).toBeGreaterThan(1);

    await pagefind.destroy();
    document.documentElement.lang = "ja";
    await pagefind.options({ basePath: `${base}/pagefind/`, excerptLength: 20 });
    const merged = await searchPagefindAnyTerms(
      pagefind,
      "設計 アルゴリズム",
      { filters: { lang: ["ja"] } },
      8,
    );
    const records = await Promise.all(merged.map((result) => result.data()));

    expect(records.map((result) => result.url)).toEqual(expect.arrayContaining(expectedUrls));
  });
});
