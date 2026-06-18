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

/**
 * Retrieves a localized field value with fallback to Japanese.
 * @param {Object} field - An object containing localized values keyed by language code.
 * @return {string} The value for the given language, the Japanese variant, or an empty string if neither is available.
 */
function localizedField(field, lang) {
  return field?.[lang] || field?.ja || "";
}

/**
 * Builds searchable text content from localized post metadata and article body.
 * @param {Object} post - The post object containing localized title, summary, and tags.
 * @param {Object} body - The article body with a text property, or null/undefined.
 * @param {string} lang - The language code for selecting localized fields.
 * @returns {string} A newline-delimited string containing the post's localized title, summary, tags, and body text.
 */
function articleContent(post, body, lang) {
  return [
    localizedField(post.title, lang),
    localizedField(post.summary, lang),
    ...(post.tags || []),
    body?.text || "",
  ].filter(Boolean).join("\n");
}

/**
 * Builds and writes a Pagefind search index for localized blog articles.
 * @throws {Error} If index creation, article indexing, or file writing fails.
 */
async function main() {
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

  await pagefind.close();
  console.log(`[pagefind] indexed ${count} article records to dist/pagefind`);
}

main();
