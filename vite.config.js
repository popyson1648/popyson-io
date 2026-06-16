import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { parse as parseToml } from "smol-toml";
import { POSTS } from "./src/posts.js";

const SITE_URL = "https://popyson.com";
const SITE_TITLE = "popyson.com";
const SITE_DESC = "分散システム、開発者ツール、設計について書く個人ブログ。";

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function buildFeed() {
  const items = [...POSTS]
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
    .map((p) => {
      // Path-form links, on the premise of the path-routing migration
      // planned in .plans/ogp-full-prerender.md (implemented next on its
      // own branch). Keep this in sync if that routing scheme changes.
      const link = `${SITE_URL}/blog/${p.id}`;
      const pubDate = new Date(`${p.date}T00:00:00Z`).toUTCString();
      return [
        "    <item>",
        `      <title>${escapeXml(p.title.ja)}</title>`,
        `      <link>${escapeXml(link)}</link>`,
        `      <guid isPermaLink="true">${escapeXml(link)}</guid>`,
        `      <pubDate>${pubDate}</pubDate>`,
        `      <description>${escapeXml(p.summary.ja)}</description>`,
        ...p.tags.map((t) => `      <category>${escapeXml(t)}</category>`),
        "    </item>",
      ].join("\n");
    })
    .join("\n");

  const lastBuildDate = new Date().toUTCString();
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    "  <channel>",
    `    <title>${escapeXml(SITE_TITLE)}</title>`,
    `    <link>${SITE_URL}/</link>`,
    `    <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml" />`,
    `    <description>${escapeXml(SITE_DESC)}</description>`,
    "    <language>ja</language>",
    `    <lastBuildDate>${lastBuildDate}</lastBuildDate>`,
    items,
    "  </channel>",
    "</rss>",
    "",
  ].join("\n");
}

// --- Structured content (TOML) ---------------------------------------------
// Single source of truth for the color theme (src/content/theme.toml) and the
// About page content (src/content/about.toml). See the imported files.
const THEME_TOML = fileURLToPath(new URL("./src/content/theme.toml", import.meta.url));
const VIRTUAL_THEME_ID = "virtual:theme.css";
const RESOLVED_THEME_ID = "\0" + VIRTUAL_THEME_ID;

// Build `selector { --key: value; ... }` from a [light]/[dark] TOML table.
// Each key becomes a CSS custom property (`bg` -> `--bg`); values are raw CSS.
function cssBlock(selector, table) {
  const body = Object.entries(table)
    .map(([key, value]) => `  --${key}: ${value};`)
    .join("\n");
  return `${selector} {\n${body}\n}`;
}

function generateThemeCss() {
  const theme = parseToml(readFileSync(THEME_TOML, "utf8"));
  const blocks = [];
  if (theme.light) blocks.push(cssBlock(':root, [data-theme="light"]', theme.light));
  if (theme.dark) blocks.push(cssBlock('[data-theme="dark"]', theme.dark));
  return blocks.join("\n\n") + "\n";
}

// Two jobs:
//   1. `import "virtual:theme.css"` -> CSS generated from theme.toml at
//      build/dev time, so colors ship in the bundled (and prerendered) CSS.
//   2. `import x from "./*.toml"` -> the parsed object as an ES module
//      (used by src/data.js for the About content).
function tomlContent() {
  return {
    name: "toml-content",
    resolveId(id) {
      if (id === VIRTUAL_THEME_ID) return RESOLVED_THEME_ID;
      return null;
    },
    load(id) {
      if (id === RESOLVED_THEME_ID) {
        // Tell Vite the virtual CSS depends on theme.toml (it is not otherwise
        // in the module graph), so edits invalidate this module and trigger HMR.
        this.addWatchFile(THEME_TOML);
        return generateThemeCss();
      }
      return null;
    },
    transform(_code, id) {
      if (id.endsWith(".toml")) {
        const data = parseToml(readFileSync(id, "utf8"));
        return { code: `export default ${JSON.stringify(data)};`, map: null };
      }
      return null;
    },
  };
}

// Emit a real RSS feed at /feed.xml during build (production only).
function rssFeed() {
  return {
    name: "rss-feed",
    generateBundle() {
      this.emitFile({ type: "asset", fileName: "feed.xml", source: buildFeed() });
    },
  };
}

export default defineConfig({
  plugins: [react(), tomlContent(), rssFeed()],
});
