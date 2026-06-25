import { rmSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import * as pagefind from "pagefind";

import { loadSiteContent, renderArticleBodies } from "./content_loader.mjs";
import { localized } from "../src/meta.js";

const ROOT = join(fileURLToPath(new URL("..", import.meta.url)));
const DIST = join(ROOT, "dist");
const PAGEFIND_DIR = join(DIST, "pagefind");
const LOCALES = ["ja", "en"];

function localizedField(field, lang) {
  return field?.[lang] || field?.ja || "";
}

function articleContent(post, body, lang) {
  return [
    localizedField(post.title, lang),
    localizedField(post.summary, lang),
    ...(post.tags || []),
    body?.text || "",
  ]
    .filter(Boolean)
    .join("\n");
}

async function main() {
  try {
    const content = await renderArticleBodies(loadSiteContent());
    const { index, errors } = await pagefind.createIndex();
    if (!index || errors.length) {
      throw new Error(`failed to create Pagefind index: ${errors.join(", ")}`);
    }

    let count = 0;
    for (const post of content.POSTS) {
      for (const lang of LOCALES) {
        const body = content.ARTICLE_BODIES[post.id]?.[lang] || content.ARTICLE_BODIES[post.id]?.ja;
        const response = await index.addCustomRecord({
          url: localized(`/blog/${post.id}/`, lang),
          content: articleContent(post, body, lang),
          language: lang,
          meta: {
            title: localizedField(post.title, lang),
            summary: localizedField(post.summary, lang),
          },
          filters: {
            lang: [lang],
            tag: post.tags || [],
          },
          sort: {
            date: post.date,
          },
        });
        if (response.errors.length) {
          throw new Error(`failed to index ${post.id} (${lang}): ${response.errors.join(", ")}`);
        }
        count += 1;
      }
    }

    rmSync(PAGEFIND_DIR, { recursive: true, force: true });
    const response = await index.writeFiles({ outputPath: PAGEFIND_DIR });
    if (response.errors.length) {
      throw new Error(`failed to write Pagefind index: ${response.errors.join(", ")}`);
    }

    console.log(`[pagefind] indexed ${count} article records to dist/pagefind`);
  } finally {
    await pagefind.close();
  }
}

main();
