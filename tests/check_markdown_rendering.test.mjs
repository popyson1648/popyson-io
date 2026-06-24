import { describe, expect, test } from "vitest";

import { markdownToPlainText, renderArticleHtml } from "../scripts/articleHtml.mjs";
import { sectionId, slugifyHeading } from "../src/headingSlug.js";
import {
  calloutMarkdownFixture,
  malformedMarkdownFixture,
  unsafeMarkdownFixture,
  validMarkdownFixture,
} from "./fixtures/markdown_rendering.mjs";

function expectMatchesAll(value, patterns) {
  for (const pattern of patterns) {
    expect(value).toMatch(pattern);
  }
}

describe("markdownToPlainText", () => {
  test("strips markup and code while keeping readable text", () => {
    expect(sectionId(slugifyHeading("Feature Set", new Map()))).toBe("sec-feature-set");
    expect(sectionId("")).toBe("");

    const plain = markdownToPlainText("see <https://example.com> and <b>x</b> here");
    expect(plain).toMatch(/example\.com/);
    expect(plain).not.toMatch(/<b>/);

    const calloutPlain = markdownToPlainText(":::warning[Supported Markdown]\nUse it.\n:::");
    expect(calloutPlain).toMatch(/Supported Markdown/);
    expect(calloutPlain).not.toMatch(/warning/);

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
    expect(richPlain).toBe("Intro Alt Text Guide Tip Title Body text.");
    expect(richPlain).not.toMatch(/secretImplementation/);
  });
});

describe("renderArticleHtml", () => {
  test("renders valid Markdown server-side with Shiki highlighting", async () => {
    const html = await renderArticleHtml(validMarkdownFixture, { copyLabel: "Copy code" });

    expect(html).not.toMatch(/react-markdown|micromark/i);
    expectMatchesAll(html, [
      /<h1>H1<\/h1>/,
      /<h2 id="sec-feature-set">Feature Set<\/h2>/,
      /<blockquote>/,
      /<table>/,
      /<input[^>]+type="checkbox"/,
      /<del>strikethrough<\/del>/,
      /<a href="https:\/\/example\.com" rel="noreferrer">/,
      /<img src="\/provisional_ogp_image\.png"[^>]+loading="lazy"/,
      /class="code"[^>]+data-cf-change="ch-code-block"/,
      /class="code-lang">ts<\/span>/,
      /class="btn btn-ghost code-copy"[^>]+aria-label="Copy code"/,
      /class="shiki shiki-themes github-light github-dark"/,
      /--shiki-light:/,
      /--shiki-dark:/,
      /indented code/,
    ]);
  });

  test("gives duplicate headings stable suffixed ids", async () => {
    const html = await renderArticleHtml([
      "## Feature Set",
      "",
      "## Feature Set",
      "",
      "## 型で導く CLI 設計",
    ].join("\n"), { copyLabel: "Copy code" });

    expectMatchesAll(html, [
      /<h2 id="sec-feature-set">Feature Set<\/h2>/,
      /<h2 id="sec-feature-set-2">Feature Set<\/h2>/,
      /<h2 id="sec-型で導く-cli-設計">型で導く CLI 設計<\/h2>/,
    ]);
  });

  test("renders callout directives with titles and types", async () => {
    const html = await renderArticleHtml(calloutMarkdownFixture, { copyLabel: "Copy code" });

    for (const type of ["note", "tip", "info", "danger"]) {
      expect(html).toMatch(new RegExp(`class="msg msg-${type}"`));
    }
    expect(html).toMatch(/class="msg msg-warn"/);
    expect(html).not.toMatch(/msg-warning/);
    expect(html).toMatch(/<div class="msg-title">Supported Markdown<\/div>/);
    expect(html).toMatch(/<strong>bold<\/strong>/);
    expect(html).toMatch(/class="code-lang">ts<\/span>/);
  });

  test("reads a callout title from a directive attribute", async () => {
    const html = await renderArticleHtml(":::note{title=\"From attribute\"}\nContent.\n:::");

    expectMatchesAll(html, [
      /class="msg msg-note"/,
      /<div class="msg-title">From attribute<\/div>/,
      /<p>Content\.<\/p>/,
    ]);
  });

  test("labels plain code blocks as text", async () => {
    const html = await renderArticleHtml("```\nplain code\n```", { copyLabel: "Copy code" });

    expect(html).toMatch(/class="code-lang">text<\/span>/);
    expect(html).toMatch(/aria-label="Copy code"/);
  });

  test("recovers from malformed Markdown", async () => {
    const html = await renderArticleHtml(malformedMarkdownFixture, { copyLabel: "Copy code" });

    expect(html).toMatch(/Paragraph with/);
    expect(html).toMatch(/unterminated code block/);
  });

  test("keeps unsafe raw HTML inert", async () => {
    const html = await renderArticleHtml(unsafeMarkdownFixture, { copyLabel: "Copy code" });

    expect(html).not.toMatch(/<strong>raw html/);
    expect(html).toMatch(/raw html must stay inert/);
    expect(html).not.toMatch(/javascript:/i);
    expect(html).not.toMatch(/<img/i);
  });

  test("blocks unsafe link and image URLs", async () => {
    const html = await renderArticleHtml([
      "[mail](mailto:test@example.com)",
      "[relative](../guide)",
      "[hash](#section)",
      "[bad](vbscript:alert(1))",
      "![relative image](./image.png)",
      "![bad image](data:text/html;base64,PHNjcmlwdD4=)",
    ].join("\n"));

    expectMatchesAll(html, [
      /<a href="mailto:test@example.com">mail<\/a>/,
      /<a href="\.\.\/guide">relative<\/a>/,
      /<a href="#section">hash<\/a>/,
      /bad/,
      /<img src="\.\/image\.png" alt="relative image" loading="lazy">/,
    ]);
    expect(html).not.toMatch(/vbscript:/i);
    expect(html).not.toMatch(/data:text\/html/i);
    expect(html).not.toMatch(/bad image/);
  });
});
