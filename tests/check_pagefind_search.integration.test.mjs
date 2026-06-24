import assert from "node:assert/strict";
import { test } from "vitest";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, resolve } from "node:path";

const DIST = resolve("dist");
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

async function searchWithLang(pagefind, base, lang, query) {
  await pagefind.destroy();
  document.documentElement.lang = lang;
  await pagefind.options({ basePath: `${base}/pagefind/`, excerptLength: 20 });
  const response = await pagefind.search(query, { filters: { lang: [lang] } });
  const first = response.results[0] ? await response.results[0].data() : null;
  return { count: response.results.length, first };
}

test("pagefindSearch_findsLocalizedArticlesInBuiltDist", async () => {
const server = await serveDist();
const { port } = server.address();
const base = `http://127.0.0.1:${port}`;

globalThis.location = /** @type {Location} */ ({
  href: `${base}/`,
  origin: base,
});
globalThis.document = /** @type {Document} */ ({
  currentScript: null,
  documentElement: { lang: "ja" },
  querySelector(selector) {
    return selector === "html"
      ? { getAttribute: () => this.documentElement.lang }
      : null;
  },
});

try {
  const pagefind = await import(`file://${join(DIST, "pagefind/pagefind.js")}?ts=${Date.now()}`);
  const ja = await searchWithLang(pagefind, base, "ja", "サブコマンド");
  const en = await searchWithLang(pagefind, base, "en", "subcommands");

  assert.equal(ja.count, 1, "Japanese query should find one Japanese article");
  assert.equal(ja.first?.url, `${base}/blog/20260521-a1b2c3d4/`);
  assert.equal(ja.first?.meta?.title, "型で導く CLI 設計");

  assert.equal(en.count, 1, "English query should find one English article");
  assert.equal(en.first?.url, `${base}/en/blog/20260521-a1b2c3d4/`);
  assert.equal(en.first?.meta?.title, "Type-Driven CLI Design");

  await pagefind.destroy();
} finally {
  server.close();
}
});
