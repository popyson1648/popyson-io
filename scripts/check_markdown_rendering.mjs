import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import Markdown from "react-markdown";
import {
  markdownRemarkPlugins,
  safeMarkdownUrl,
} from "../src/markdownPipeline.js";
import {
  calloutMarkdownFixture,
  malformedMarkdownFixture,
  unsafeMarkdownFixture,
  validMarkdownFixture,
} from "./fixtures/markdown_rendering.mjs";

const e = React.createElement;

const components = {
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
    return e("aside", { "data-callout": type, "data-title": title || "" }, children);
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

const validHtml = render(validMarkdownFixture);
assert.match(validHtml, /<h1>H1<\/h1>/);
assert.match(validHtml, /<h2 id="feature-set">Feature Set<\/h2>/);
assert.match(validHtml, /<blockquote>/);
assert.match(validHtml, /<table>/);
assert.match(validHtml, /<input[^>]+type="checkbox"/);
assert.match(validHtml, /<del>strikethrough<\/del>/);
assert.match(validHtml, /<a href="https:\/\/example\.com">/);
assert.match(validHtml, /<img src="\/provisional_ogp_image\.png"/);
assert.match(validHtml, /data-lang="ts"/);
assert.match(validHtml, /indented code/);

const calloutHtml = render(calloutMarkdownFixture);
for (const type of ["note", "tip", "info", "warning", "danger"]) {
  assert.match(calloutHtml, new RegExp(`data-callout="${type}"`));
}
assert.match(calloutHtml, /data-title="Supported Markdown"/);
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
