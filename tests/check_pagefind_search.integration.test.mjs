import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, test } from "vitest";

import { loadSiteContent } from "../scripts/content_loader.mjs";

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

// Pagefind tokenizes a query the same way it tokenizes a page, and punctuation
// ends a token. Searching a raw title therefore says nothing about the index
// when the title carries punctuation: "切替検証用（自動削除）" matches nothing
// even though the article is indexed. Query the longest punctuation-free run of
// the title instead, which is what a reader would actually type.
function queryFor(title) {
  const segments = title.split(/[\s\p{P}\p{S}]+/u).filter(Boolean);
  return segments.reduce(
    (longest, segment) => (segment.length > longest.length ? segment : longest),
    "",
  );
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
    const results = await searchWithLang(pagefind, base, "ja", queryFor(POST.title.ja));

    expect(results).toContainEqual(
      expect.objectContaining({
        url: `${base}/blog/${POST.id}/`,
        meta: expect.objectContaining({ title: POST.title.ja }),
      }),
    );
  });

  test("finds the English article for an English query", async () => {
    const results = await searchWithLang(pagefind, base, "en", queryFor(POST.title.en));

    expect(results).toContainEqual(
      expect.objectContaining({
        url: `${base}/en/blog/${POST.id}/`,
        meta: expect.objectContaining({ title: POST.title.en }),
      }),
    );
  });
});
