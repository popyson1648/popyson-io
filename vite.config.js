import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
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
  plugins: [react(), rssFeed()],
});
