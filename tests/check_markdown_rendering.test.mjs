import assert from "node:assert/strict";
import { test } from "vitest";

import { markdownToPlainText, renderArticleHtml } from "../scripts/articleHtml.mjs";
import { sectionId, slugifyHeading } from "../src/headingSlug.js";
import {
  calloutMarkdownFixture,
  malformedMarkdownFixture,
  unsafeMarkdownFixture,
  validMarkdownFixture,
} from "./fixtures/markdown_rendering.mjs";

function assertNoClientMarkdownStack(html) {
  assert.doesNotMatch(html, /react-markdown|micromark/i);
}

function assertIncludesAll(value, needles) {
  for (const needle of needles) {
    assert.match(value, needle);
  }
}

test("markdownToPlainText_stripsMarkupAndCodeWhileKeepingReadableText", () => {
  assert.equal(sectionId(slugifyHeading("Feature Set", new Map())), "sec-feature-set");
  assert.equal(sectionId(""), "");

  const plain = markdownToPlainText("see <https://example.com> and <b>x</b> here");
  assert.match(plain, /example\.com/);
  assert.doesNotMatch(plain, /<b>/);

  const calloutPlain = markdownToPlainText(":::warning[Supported Markdown]\nUse it.\n:::");
  assert.match(calloutPlain, /Supported Markdown/);
  assert.doesNotMatch(calloutPlain, /warning/);

  const richPlain = markdownToPlainText([
    "Intro",
    "",
    "```js",
    "secretImplementation()",
    "```",
    "",
    "![Alt Text](/image.png)",
    "[Guide](/guide)",
    "",
    ":::tip[Tip Title]",
    "Body text.",
    ":::",
  ].join("\n"));
  assert.equal(richPlain, "Intro Alt Text Guide Tip Title Body text.");
  assert.doesNotMatch(richPlain, /secretImplementation/);
});

test("renderArticleHtml_rendersValidMarkdownServerSideWithShikiHighlighting", async () => {
  const validHtml = await renderArticleHtml(validMarkdownFixture, { copyLabel: "Copy code" });
  assertNoClientMarkdownStack(validHtml);
  assert.match(validHtml, /<h1>H1<\/h1>/);
  assert.match(validHtml, /<h2 id="sec-feature-set">Feature Set<\/h2>/);
  assert.match(validHtml, /<blockquote>/);
  assert.match(validHtml, /<table>/);
  assert.match(validHtml, /<input[^>]+type="checkbox"/);
  assert.match(validHtml, /<del>strikethrough<\/del>/);
  assert.match(validHtml, /<a href="https:\/\/example\.com" rel="noreferrer">/);
  assert.match(validHtml, /<img src="\/provisional_ogp_image\.png"[^>]+loading="lazy"/);
  assert.match(validHtml, /class="code"[^>]+data-cf-change="ch-code-block"/);
  assert.match(validHtml, /class="code-lang">ts<\/span>/);
  assert.match(validHtml, /class="btn btn-ghost code-copy"[^>]+aria-label="Copy code"/);
  assert.match(validHtml, /class="shiki shiki-themes github-light github-dark"/);
  assert.match(validHtml, /--shiki-light:/);
  assert.match(validHtml, /--shiki-dark:/);
  assert.match(validHtml, /indented code/);
});

test("renderArticleHtml_givesDuplicateHeadingsStableSuffixedIds", async () => {
  const duplicateHeadingHtml = await renderArticleHtml([
    "## Feature Set",
    "",
    "## Feature Set",
    "",
    "## 型で導く CLI 設計",
  ].join("\n"), { copyLabel: "Copy code" });
  assertIncludesAll(duplicateHeadingHtml, [
    /<h2 id="sec-feature-set">Feature Set<\/h2>/,
    /<h2 id="sec-feature-set-2">Feature Set<\/h2>/,
    /<h2 id="sec-型で導く-cli-設計">型で導く CLI 設計<\/h2>/,
  ]);
});

test("renderArticleHtml_rendersCalloutDirectivesWithTitlesAndTypes", async () => {
  const calloutHtml = await renderArticleHtml(calloutMarkdownFixture, { copyLabel: "Copy code" });
  for (const type of ["note", "tip", "info", "danger"]) {
    assert.match(calloutHtml, new RegExp(`class="msg msg-${type}"`));
  }
  assert.match(calloutHtml, /class="msg msg-warn"/);
  assert.doesNotMatch(calloutHtml, /msg-warning/);
  assert.match(calloutHtml, /<div class="msg-title">Supported Markdown<\/div>/);
  assert.match(calloutHtml, /<strong>bold<\/strong>/);
  assert.match(calloutHtml, /class="code-lang">ts<\/span>/);

  const attributeTitleCalloutHtml = await renderArticleHtml(":::note{title=\"From attribute\"}\nContent.\n:::");
  assertIncludesAll(attributeTitleCalloutHtml, [
    /class="msg msg-note"/,
    /<div class="msg-title">From attribute<\/div>/,
    /<p>Content\.<\/p>/,
  ]);
});

test("renderArticleHtml_labelsPlainCodeBlocksAsText", async () => {
  const plainCodeHtml = await renderArticleHtml("```\nplain code\n```", { copyLabel: "Copy code" });
  assert.match(plainCodeHtml, /class="code-lang">text<\/span>/);
  assert.match(plainCodeHtml, /aria-label="Copy code"/);
});

test("renderArticleHtml_recoversFromMalformedMarkdown", async () => {
  const malformedHtml = await renderArticleHtml(malformedMarkdownFixture, { copyLabel: "Copy code" });
  assert.match(malformedHtml, /Paragraph with/);
  assert.match(malformedHtml, /unterminated code block/);
});

test("renderArticleHtml_keepsUnsafeRawHtmlInert", async () => {
  const unsafeHtml = await renderArticleHtml(unsafeMarkdownFixture, { copyLabel: "Copy code" });
  assert.doesNotMatch(unsafeHtml, /<strong>raw html/);
  assert.match(unsafeHtml, /raw html must stay inert/);
  assert.doesNotMatch(unsafeHtml, /javascript:/i);
  assert.doesNotMatch(unsafeHtml, /<img/i);
});

test("renderArticleHtml_blocksUnsafeLinkAndImageUrls", async () => {
  const urlSafetyHtml = await renderArticleHtml([
    "[mail](mailto:test@example.com)",
    "[relative](../guide)",
    "[hash](#section)",
    "[bad](vbscript:alert(1))",
    "![relative image](./image.png)",
    "![bad image](data:text/html;base64,PHNjcmlwdD4=)",
  ].join("\n"));
  assertIncludesAll(urlSafetyHtml, [
    /<a href="mailto:test@example.com">mail<\/a>/,
    /<a href="\.\.\/guide">relative<\/a>/,
    /<a href="#section">hash<\/a>/,
    /bad/,
    /<img src="\.\/image\.png" alt="relative image" loading="lazy">/,
  ]);
  assert.doesNotMatch(urlSafetyHtml, /vbscript:/i);
  assert.doesNotMatch(urlSafetyHtml, /data:text\/html/i);
  assert.doesNotMatch(urlSafetyHtml, /bad image/);
});
