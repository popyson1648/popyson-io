import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import Markdown from "react-markdown";
import {
  calloutVariant,
  markdownRemarkPlugins,
  safeMarkdownUrl,
} from "../src/markdownPipeline.js";
import { sectionId, slugifyHeading } from "../src/headingSlug.js";
import {
  calloutMarkdownFixture,
  malformedMarkdownFixture,
  unsafeMarkdownFixture,
  validMarkdownFixture,
} from "./fixtures/markdown_rendering.mjs";

const e = React.createElement;

// blog.jsx renders the real article with JSX components that depend on browser
// APIs (AppCtx, Shiki) and cannot be imported into plain Node. To still cover
// the renderer's risky decisions, these test components mirror blog.jsx's
// markup but call the *same* shared helpers (calloutVariant, sectionId,
// safeMarkdownUrl) that blog.jsx uses — so the two cannot silently diverge.
const headingId = (node) => node?.properties?.id || "";

const components = {
  h2({ node, children }) {
    const id = sectionId(headingId(node));
    return e("h2", { id: id || undefined }, children);
  },
  a({ children, href }) {
    const safeHref = safeMarkdownUrl(href);
    if (!safeHref) return e("span", null, children);
    return e("a", { href: safeHref }, children);
  },
  img({ src, alt }) {
    const safeSrc = safeMarkdownUrl(src);
    if (!safeSrc) return null;
    return e("img", { src: safeSrc, alt: alt || "" });
  },
  pre({ children }) {
    const child = React.Children.toArray(children)[0];
    const className = React.isValidElement(child) ? child.props.className || "" : "";
    const match = /language-([^\s]+)/.exec(className);
    const code = React.isValidElement(child) ? child.props.children : children;
    return e("pre", { "data-lang": match?.[1] || "text" }, e("code", null, code));
  },
  code({ className, children }) {
    return e("code", { className }, children);
  },
  callout({ type, title, children }) {
    return e(
      "div",
      { className: "msg msg-" + calloutVariant(type) },
      e(
        "div",
        { className: "msg-body" },
        title ? e("div", { className: "msg-title" }, title) : null,
        children,
      ),
    );
  },
};

function render(markdown) {
  return renderToStaticMarkup(e(Markdown, {
    remarkPlugins: markdownRemarkPlugins,
    skipHtml: true,
    urlTransform: safeMarkdownUrl,
    components,
  }, markdown));
}

// Shared heading/anchor helpers: the slug and section id used here are the same
// ones the build-time TOC (content_loader.mjs) and blog.jsx rely on.
assert.equal(sectionId(slugifyHeading("Feature Set", new Map())), "sec-feature-set");
assert.equal(sectionId(""), "");
assert.equal(calloutVariant("warning"), "warn");
assert.equal(calloutVariant("note"), "note");

const validHtml = render(validMarkdownFixture);
assert.match(validHtml, /<h1>H1<\/h1>/);
// h2 carries the shared `sec-`-prefixed slug so the TOC anchor resolves.
assert.match(validHtml, /<h2 id="sec-feature-set">Feature Set<\/h2>/);
assert.match(validHtml, /<blockquote>/);
assert.match(validHtml, /<table>/);
assert.match(validHtml, /<input[^>]+type="checkbox"/);
assert.match(validHtml, /<del>strikethrough<\/del>/);
assert.match(validHtml, /<a href="https:\/\/example\.com">/);
assert.match(validHtml, /<img src="\/provisional_ogp_image\.png"/);
assert.match(validHtml, /data-lang="ts"/);
assert.match(validHtml, /indented code/);

const calloutHtml = render(calloutMarkdownFixture);
// Each callout type maps to its `.msg-*` variant via the shared helper.
for (const type of ["note", "tip", "info", "danger"]) {
  assert.match(calloutHtml, new RegExp(`class="msg msg-${type}"`));
}
assert.match(calloutHtml, /class="msg msg-warn"/);
assert.doesNotMatch(calloutHtml, /msg-warning/);
assert.match(calloutHtml, /<div class="msg-title">Supported Markdown<\/div>/);
assert.match(calloutHtml, /<strong>bold<\/strong>/);
assert.match(calloutHtml, /data-lang="ts"/);

const malformedHtml = render(malformedMarkdownFixture);
assert.match(malformedHtml, /Paragraph with/);
assert.match(malformedHtml, /unterminated code block/);

const unsafeHtml = render(unsafeMarkdownFixture);
assert.doesNotMatch(unsafeHtml, /<strong>raw html/);
assert.match(unsafeHtml, /raw html must stay inert/);
assert.doesNotMatch(unsafeHtml, /javascript:/i);
assert.doesNotMatch(unsafeHtml, /<img/i);

console.log("markdown rendering fixtures passed");
