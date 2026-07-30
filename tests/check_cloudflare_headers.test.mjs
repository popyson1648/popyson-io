import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, test } from "vitest";

const headers = readFileSync(resolve("public/_headers"), "utf8");

describe("Cloudflare Pages headers", () => {
  test("caches only fingerprinted Vite assets as immutable", () => {
    expect(headers.trim()).toBe(
      ["/assets/*", "  Cache-Control: public, max-age=31556952, immutable"].join("\n"),
    );
    expect(headers).not.toMatch(/^\/\*/m);
    expect(headers).not.toMatch(/^\/thumbnails\//m);
    expect(headers).not.toMatch(/^\/pagefind\//m);
  });
});
