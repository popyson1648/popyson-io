import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, test } from "vitest";

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

describe("Pagefind search over the built dist/", () => {
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
    const ja = await searchWithLang(pagefind, base, "ja", "サブコマンド");

    expect(ja.count).toBe(1);
    expect(ja.first?.url).toBe(`${base}/blog/20260521-a1b2c3d4/`);
    expect(ja.first?.meta?.title).toBe("型で導く CLI 設計");
  });

  test("finds the English article for an English query", async () => {
    const en = await searchWithLang(pagefind, base, "en", "subcommands");

    expect(en.count).toBe(1);
    expect(en.first?.url).toBe(`${base}/en/blog/20260521-a1b2c3d4/`);
    expect(en.first?.meta?.title).toBe("Type-Driven CLI Design");
  });
});
