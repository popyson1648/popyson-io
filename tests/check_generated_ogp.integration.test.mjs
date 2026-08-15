import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { describe, expect, test } from "vitest";

import { loadSiteContent } from "../scripts/content_loader.mjs";
import { SITE } from "../src/meta.js";
import { articleOgpPath } from "../src/ogp.js";

const DIST = join(dirname(fileURLToPath(import.meta.url)), "..", "dist");
const content = loadSiteContent();

describe("generated article OGP images", () => {
  test("exist for every article locale and are linked from prerendered metadata", async () => {
    for (const post of content.POSTS) {
      for (const lang of ["ja", "en"]) {
        const title = post.title[lang] || post.title.ja;
        const publicPath = articleOgpPath(post.id, lang, title);
        const imageFile = join(DIST, publicPath.slice(1));
        expect(existsSync(imageFile), `missing ${publicPath}`).toBe(true);

        const metadata = await sharp(imageFile).metadata();
        expect([metadata.width, metadata.height]).toEqual([1200, 630]);

        const routeDir = lang === "en" ? join("en", "blog", post.id) : join("blog", post.id);
        const html = readFileSync(join(DIST, routeDir, "index.html"), "utf8");
        const absoluteUrl = SITE.url + publicPath;
        expect(html).toContain(`<meta property="og:image" content="${absoluteUrl}" />`);
        expect(html).toContain(`<meta name="twitter:image" content="${absoluteUrl}" />`);
      }
    }
  });
});
