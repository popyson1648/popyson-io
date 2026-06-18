/* ============================================================
   Build-time prerenderer.

   Social crawlers (X, Facebook, LINE, Slack, Discord) and search engines
   do not execute the SPA's JavaScript, so per-route metadata must already
   be present in the served HTML. After `vite build`, this script clones the
   built dist/index.html template and bakes a route-specific <head>
   (title, description, canonical, hreflang, Open Graph, Twitter Card) into a
   standalone HTML file for every route and locale. Each file still loads the
   same SPA bundle, so client navigation works normally after mount.

   It also emits sitemap.xml (with hreflang alternates) and robots.txt so the
   ja / en URLs are independently discoverable.

   Route metadata is shared with the runtime via src/meta.js — the single
   source of truth, so prerendered and live <head>s never drift.
   ============================================================ */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { loadSiteContent, renderArticleBodies } from "./content_loader.mjs";
import { SITE, allRoutes, configureMetaData, headModel } from "../src/meta.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DIST = join(ROOT, "dist");

function esc(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderHeadBlock(m) {
  const lines = [
    `<!-- OG:START -->`,
    `  <link rel="canonical" href="${esc(m.canonical)}" />`,
    ...m.alternates.map((a) => `  <link rel="alternate" hreflang="${a.hreflang}" href="${esc(a.href)}" />`),
    `  <meta property="og:type" content="${esc(m.og.type)}" />`,
    `  <meta property="og:site_name" content="${esc(m.og.site_name)}" />`,
    `  <meta property="og:title" content="${esc(m.og.title)}" />`,
    `  <meta property="og:description" content="${esc(m.og.description)}" />`,
    `  <meta property="og:url" content="${esc(m.og.url)}" />`,
    `  <meta property="og:image" content="${esc(m.og.image)}" />`,
    `  <meta property="og:locale" content="${esc(m.og.locale)}" />`,
    `  <meta property="og:locale:alternate" content="${esc(m.og.localeAlternate)}" />`,
    `  <meta name="twitter:card" content="${esc(m.twitter.card)}" />`,
    `  <meta name="twitter:site" content="${esc(m.twitter.site)}" />`,
    `  <meta name="twitter:creator" content="${esc(m.twitter.creator)}" />`,
    `  <meta name="twitter:title" content="${esc(m.twitter.title)}" />`,
    `  <meta name="twitter:description" content="${esc(m.twitter.description)}" />`,
    `  <meta name="twitter:image" content="${esc(m.twitter.image)}" />`,
    `  <!-- OG:END -->`,
  ];
  return lines.join("\n");
}

function injectHead(template, m) {
  let html = template;
  html = html.replace(/<html lang="[^"]*">/, `<html lang="${esc(m.lang)}">`);
  html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(m.title)}</title>`);
  html = html.replace(
    /<meta name="description" content="[^"]*" \/>/,
    `<meta name="description" content="${esc(m.description)}" />`,
  );
  html = html.replace(/<!-- OG:START[\s\S]*?OG:END -->/, renderHeadBlock(m));
  return html;
}

function renderArticleRoot(route, lang, content) {
  if (route.name !== "article") return "";
  const post = content.POSTS.find((item) => item.id === route.id);
  const body = content.ARTICLE_BODIES[route.id]?.[lang] || content.ARTICLE_BODIES[route.id]?.ja;
  if (!post || !body?.html) return "";
  const title = post.title?.[lang] || post.title?.ja || "";
  return `<article class="article prerendered-article"><div class="article-head"><h1>${esc(title)}</h1></div><div class="prose">${body.html}</div></article>`;
}

function injectRoot(template, rootHtml) {
  return template.replace(/<div id="root">[\s\S]*?<\/div>/, () => `<div id="root">${rootHtml}</div>`);
}

function buildSitemap(models) {
  // One <url> per canonical, with hreflang alternates (Google's format).
  const seen = new Map();
  for (const m of models) {
    if (!seen.has(m.canonical)) seen.set(m.canonical, m);
  }
  const urls = [...seen.values()]
    .map((m) => {
      const links = m.alternates
        .map((a) => `    <xhtml:link rel="alternate" hreflang="${a.hreflang}" href="${esc(a.href)}" />`)
        .join("\n");
      return `  <url>\n    <loc>${esc(m.canonical)}</loc>\n${links}\n  </url>`;
    })
    .join("\n");
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    urls,
    "</urlset>",
    "",
  ].join("\n");
}

function buildRobots() {
  return [
    "User-agent: *",
    "Allow: /",
    "",
    `Sitemap: ${SITE.url}/sitemap.xml`,
    "",
  ].join("\n");
}

async function main() {
  const content = await renderArticleBodies(loadSiteContent());
  configureMetaData(content);
  const template = readFileSync(join(DIST, "index.html"), "utf8");
  const routes = allRoutes();
  const models = [];
  let count = 0;

  for (const { dir, route, lang } of routes) {
    const m = headModel(route, lang);
    models.push(m);
    const html = injectRoot(injectHead(template, m), renderArticleRoot(route, lang, content));
    const outDir = dir ? join(DIST, dir) : DIST;
    mkdirSync(outDir, { recursive: true });
    writeFileSync(join(outDir, "index.html"), html);
    count += 1;
  }

  writeFileSync(join(DIST, "sitemap.xml"), buildSitemap(models));
  writeFileSync(join(DIST, "robots.txt"), buildRobots());

  console.log(`[prerender] wrote ${count} HTML files + sitemap.xml + robots.txt`);
}

main();
