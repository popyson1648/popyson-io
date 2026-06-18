import assert from "node:assert/strict";

import { markdownToPlainText, renderArticleHtml } from "./articleHtml.mjs";
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

assert.equal(sectionId(slugifyHeading("Feature Set", new Map())), "sec-feature-set");
assert.equal(sectionId(""), "");

const plain = markdownToPlainText("see <https://example.com> and <b>x</b> here");
assert.match(plain, /example\.com/);
assert.doesNotMatch(plain, /<b>/);

const calloutPlain = markdownToPlainText(":::warning[Supported Markdown]\nUse it.\n:::");
assert.match(calloutPlain, /Supported Markdown/);
assert.doesNotMatch(calloutPlain, /warning/);

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

const calloutHtml = await renderArticleHtml(calloutMarkdownFixture, { copyLabel: "Copy code" });
for (const type of ["note", "tip", "info", "danger"]) {
  assert.match(calloutHtml, new RegExp(`class="msg msg-${type}"`));
}
assert.match(calloutHtml, /class="msg msg-warn"/);
assert.doesNotMatch(calloutHtml, /msg-warning/);
assert.match(calloutHtml, /<div class="msg-title">Supported Markdown<\/div>/);
assert.match(calloutHtml, /<strong>bold<\/strong>/);
assert.match(calloutHtml, /class="code-lang">ts<\/span>/);

const malformedHtml = await renderArticleHtml(malformedMarkdownFixture, { copyLabel: "Copy code" });
assert.match(malformedHtml, /Paragraph with/);
assert.match(malformedHtml, /unterminated code block/);

const unsafeHtml = await renderArticleHtml(unsafeMarkdownFixture, { copyLabel: "Copy code" });
assert.doesNotMatch(unsafeHtml, /<strong>raw html/);
assert.match(unsafeHtml, /raw html must stay inert/);
assert.doesNotMatch(unsafeHtml, /javascript:/i);
assert.doesNotMatch(unsafeHtml, /<img/i);

console.log("markdown rendering fixtures passed");
