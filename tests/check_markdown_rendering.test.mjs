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

    const richPlain = markdownToPlainText(
      [
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
      ].join("\n"),
    );
    expect(richPlain).toBe("Intro Alt Text Guide Tip Title Body text.");
    expect(richPlain).not.toMatch(/secretImplementation/);
  });
});

describe("renderArticleHtml", () => {
  test("renders valid Markdown server-side with Shiki highlighting", async () => {
    const html = await renderArticleHtml(validMarkdownFixture, { copyLabel: "Copy code" });

    expect(html).not.toMatch(/react-markdown|micromark/i);
    expectMatchesAll(html, [
      /<h1 id="sec-h1">H1<\/h1>/,
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
    const html = await renderArticleHtml(
      ["## Feature Set", "", "## Feature Set", "", "## 型で導く CLI 設計"].join("\n"),
      { copyLabel: "Copy code" },
    );

    expectMatchesAll(html, [
      /<h2 id="sec-feature-set">Feature Set<\/h2>/,
      /<h2 id="sec-feature-set-2">Feature Set<\/h2>/,
      /<h2 id="sec-型で導く-cli-設計">型で導く CLI 設計<\/h2>/,
    ]);
  });

  test("gives every ATX heading level a targetable id", async () => {
    const html = await renderArticleHtml(
      ["# One", "## Two", "### Three", "#### Four", "##### Five", "###### Six"].join("\n\n"),
    );

    for (const [level, slug] of ["one", "two", "three", "four", "five", "six"].entries()) {
      expect(html).toContain(`<h${level + 1} id="sec-${slug}">`);
    }
  });

  test("renders dash, plus, and asterisk unordered-list markers as list items", async () => {
    const html = await renderArticleHtml(["- dash", "", "+ plus", "", "* asterisk"].join("\n"));

    expectMatchesAll(html, [/<li>dash<\/li>/, /<li>plus<\/li>/, /<li>asterisk<\/li>/]);
    expect(html.match(/<ul>/g)).toHaveLength(3);
  });

  test("preserves nested unordered-list structure for depth-specific markers", async () => {
    const html = await renderArticleHtml(["- root", "  - child", "    - grandchild"].join("\n"));

    expect(html).toMatch(
      /<ul>\s*<li>root\s*<ul>\s*<li>child\s*<ul>\s*<li>grandchild<\/li>\s*<\/ul>\s*<\/li>\s*<\/ul>\s*<\/li>\s*<\/ul>/,
    );
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
    const html = await renderArticleHtml(':::note{title="From attribute"}\nContent.\n:::');

    expectMatchesAll(html, [
      /class="msg msg-note"/,
      /<div class="msg-title">From attribute<\/div>/,
      /<p>Content\.<\/p>/,
    ]);
  });

  test.each([
    ["a capacity", "現在の配列 (容量:4) を拡張する｡", "現在の配列 (容量:4) を拡張する｡"],
    ["a clock time", "開始は 12:30 です｡", "開始は 12:30 です｡"],
    ["a ratio", "比率は a:b になる｡", "比率は a:b になる｡"],
  ])("keeps %s written with a colon out of directive parsing", async (_name, markdown, text) => {
    const html = await renderArticleHtml(markdown);

    expect(html).toContain(`<p>${text}</p>`);
    expect(html).not.toMatch(/<div><\/div>/);
  });

  test("writes an unhandled text or leaf directive back as source", async () => {
    const html = await renderArticleHtml(':unknown[label]{key="value"}\n\n::block[label]');

    expect(html).toMatch(/:unknown\[label\]\{key="value"\}/);
    expect(html).toMatch(/<p>::block\[label\]<\/p>/);
  });

  test("writes directive attributes back as parsed", async () => {
    const html = await renderArticleHtml(':unknown{key="a\\\\d" flag}');

    expect(html).toContain(':unknown{key="a\\\\d" flag}');
  });

  test("keeps a colon inside a callout body", async () => {
    const html = await renderArticleHtml(":::note[題]\n中身 (容量:4)｡\n:::");

    expectMatchesAll(html, [/class="msg msg-note"/, /<p>中身 \(容量:4\)｡<\/p>/]);
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
    const html = await renderArticleHtml(
      [
        "[mail](mailto:test@example.com)",
        "[relative](../guide)",
        "[hash](#section)",
        "[bad](vbscript:alert(1))",
        "![relative image](./image.png)",
        "![bad image](data:text/html;base64,PHNjcmlwdD4=)",
      ].join("\n"),
    );

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

describe("line blocks", () => {
  test.each([
    ["a bar and a space", "AAA\n| BBB"],
    ["a bar written tight against the text", "AAA\n|BBB"],
  ])("breaks the line after %s", async (_name, markdown) => {
    const html = await renderArticleHtml(markdown);

    expect(html).toBe("<p>AAA<br>\nBBB</p>");
  });

  test("breaks every marked line and leaves the rest as one line", async () => {
    const html = await renderArticleHtml(["AAA", "| BBB", "| CCC", "DDD"].join("\n"));

    expect(html).toBe("<p>AAA<br>\nBBB<br>\nCCC\nDDD</p>");
  });

  test("keeps the inline markup that follows the marker", async () => {
    const html = await renderArticleHtml("AAA\n| **BBB** CCC");

    expect(html).toBe("<p>AAA<br>\n<strong>BBB</strong> CCC</p>");
  });

  test.each([
    ["two trailing spaces", "AAA  \n| BBB"],
    ["a trailing backslash", "AAA\\\n| BBB"],
  ])("drops the bar after a line broken by %s", async (_name, markdown) => {
    const html = await renderArticleHtml(markdown);

    expect(html).toBe("<p>AAA<br>\nBBB</p>");
  });

  test.each([
    ["a tab", "AAA\n|\tBBB"],
    ["several spaces", "AAA\n|   BBB"],
  ])("starts the line at its first character when the bar is followed by %s", async (_n, md) => {
    const html = await renderArticleHtml(md);

    expect(html).toBe("<p>AAA<br>\nBBB</p>");
  });

  test("writes an escaped bar as a bar on the same line", async () => {
    const html = await renderArticleHtml("AAA\n\\| BBB");

    expect(html).toBe("<p>AAA\n| BBB</p>");
  });

  test.each([
    ["a blockquote", "> AAA\n> | BBB", "<blockquote>\n<p>AAA<br>\nBBB</p>\n</blockquote>"],
    ["a list item", "- AAA\n  | BBB", "<ul>\n<li>AAA<br>\nBBB</li>\n</ul>"],
  ])("breaks the line inside %s", async (_name, markdown, expected) => {
    const html = await renderArticleHtml(markdown);

    expect(html).toBe(expected);
  });

  test("breaks the line inside a callout body", async () => {
    const html = await renderArticleHtml(":::note[題]\n本文\n| 続き\n:::");

    expectMatchesAll(html, [/class="msg msg-note"/, /<p>本文<br>\n続き<\/p>/]);
  });

  test("still reads a table from bars that open a block", async () => {
    const html = await renderArticleHtml(
      ["段落", "", "| 列1 | 列2 |", "| --- | --- |", "| 値1 | 値2 |"].join("\n"),
    );

    expectMatchesAll(html, [/<p>段落<\/p>/, /<th>列1<\/th>/, /<td>値1<\/td>/]);
    expect(html).not.toMatch(/<br>/);
  });

  test("leaves the marker out of the search text", () => {
    expect(markdownToPlainText("AAA\n| BBB")).toBe("AAA BBB");
  });
});

describe("embed directive", () => {
  test("embeds a Docswell deck from its public page URL", async () => {
    const html = await renderArticleHtml(
      '::embed{url="https://www.docswell.com/s/popyson1648/57NLRN-2026-08-07-222150"}',
    );

    expectMatchesAll(html, [
      /<div class="embed" data-embed="docswell">/,
      /<iframe src="https:\/\/www\.docswell\.com\/slide\/57NLRN\/embed"/,
      /title="Docswell"/,
      /loading="lazy"/,
      /allowfullscreen/,
    ]);
  });

  test("embeds a Docswell deck from a slide URL", async () => {
    const html = await renderArticleHtml('::embed{url="https://www.docswell.com/slide/57NLRN"}');

    expect(html).toMatch(/<iframe src="https:\/\/www\.docswell\.com\/slide\/57NLRN\/embed"/);
  });

  test("embeds every YouTube URL shape through the no-cookie host", async () => {
    const sources = [
      "https://youtu.be/dQw4w9WgXcQ",
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PL1",
      "https://www.youtube.com/shorts/dQw4w9WgXcQ",
      "https://www.youtube.com/live/dQw4w9WgXcQ",
      "https://m.youtube.com/watch?v=dQw4w9WgXcQ",
    ];

    for (const url of sources) {
      const html = await renderArticleHtml(`::embed{url="${url}"}`);
      expect(html, url).toMatch(
        /<iframe src="https:\/\/www\.youtube-nocookie\.com\/embed\/dQw4w9WgXcQ"/,
      );
      expect(html, url).toMatch(/data-embed="youtube"/);
    }
  });

  test("keeps the YouTube start time in seconds", async () => {
    const fromClock = await renderArticleHtml(
      '::embed{url="https://youtu.be/dQw4w9WgXcQ?t=1m30s"}',
    );
    const fromSeconds = await renderArticleHtml(
      '::embed{url="https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=90"}',
    );

    expect(fromClock).toMatch(/embed\/dQw4w9WgXcQ\?start=90"/);
    expect(fromSeconds).toMatch(/embed\/dQw4w9WgXcQ\?start=90"/);
  });

  test("adds a linked caption when the directive carries a label", async () => {
    const html = await renderArticleHtml(
      '::embed[登壇資料]{url="https://www.docswell.com/slide/57NLRN"}',
    );

    expectMatchesAll(html, [
      /title="登壇資料"/,
      /<p class="embed-caption"><a href="https:\/\/www\.docswell\.com\/slide\/57NLRN" rel="noreferrer">登壇資料<\/a><\/p>/,
    ]);
  });

  test("accepts the URL as the label when no attribute is given", async () => {
    const html = await renderArticleHtml("::embed[https://vimeo.com/123456]");

    expect(html).toMatch(/<iframe src="https:\/\/player\.vimeo\.com\/video\/123456"/);
    expect(html).not.toMatch(/embed-caption/);
  });

  test("embeds a Speaker Deck player id and rejects anything else", async () => {
    const embedded = await renderArticleHtml(
      '::embed{url="https://speakerdeck.com/player/0123456789abcdef0123456789abcdef"}',
    );
    expect(embedded).toMatch(
      /<iframe src="https:\/\/speakerdeck\.com\/player\/0123456789abcdef0123456789abcdef"/,
    );

    for (const url of [
      "https://speakerdeck.com/popyson1648/a-talk",
      "https://speakerdeck.com/player/not-a-hex-id",
      "https://speakerdeck.com/player/0123456789abcdef0123456789abcdef/extra",
    ]) {
      const html = await renderArticleHtml(`::embed{url="${url}"}`);
      expect(html, url).not.toMatch(/<iframe/);
      expect(html, url).toMatch(new RegExp(`<a href="${url}"`));
    }
  });

  test("embeds every X post URL shape through the platform frame", async () => {
    const sources = [
      "https://x.com/jack/status/20",
      "https://twitter.com/jack/status/20?s=20",
      "https://mobile.twitter.com/jack/statuses/20",
      "https://x.com/i/web/status/20",
      "https://x.com/jack/status/20/photo/1",
    ];

    for (const url of sources) {
      const html = await renderArticleHtml(`::embed{url="${url}"}`);
      expect(html, url).toMatch(
        /<iframe src="https:\/\/platform\.twitter\.com\/embed\/Tweet\.html\?id=20&#x26;dnt=true&#x26;theme=light"/,
      );
      expect(html, url).toMatch(/data-embed="x"/);
      expect(html, url).toMatch(/title="X"/);
    }
  });

  test("embeds an Instagram post, reel, and IGTV item with its caption", async () => {
    const sources = [
      ["https://www.instagram.com/p/Dbd3EBdnW_u/", "p"],
      ["https://instagram.com/nasa/p/Dbd3EBdnW_u/", "p"],
      ["https://www.instagram.com/reel/Dbd3EBdnW_u/?igsh=x", "reel"],
      ["https://www.instagram.com/reels/Dbd3EBdnW_u/", "reel"],
      ["https://www.instagram.com/tv/Dbd3EBdnW_u/", "tv"],
    ];

    for (const [url, kind] of sources) {
      const html = await renderArticleHtml(`::embed{url="${url}"}`);
      expect(html, url).toMatch(
        new RegExp(
          `<iframe src="https://www\\.instagram\\.com/${kind}/Dbd3EBdnW_u/embed/captioned/"`,
        ),
      );
      expect(html, url).toMatch(/data-embed="instagram"/);
      expect(html, url).toMatch(/title="Instagram"/);
    }
  });

  test.each([
    ["an X profile", "https://x.com/jack"],
    ["an X post id that is not a number", "https://x.com/jack/status/not-an-id"],
    ["an Instagram profile", "https://www.instagram.com/nasa/"],
    ["an Instagram post without a code", "https://www.instagram.com/p/"],
  ])("links %s rather than framing it", async (_name, url) => {
    const html = await renderArticleHtml(`::embed{url="${url}"}`);

    expect(html).not.toMatch(/<iframe/);
    expect(html).toMatch(new RegExp(`<a href="${url}"`));
  });

  test("falls back to a link for a service it cannot embed", async () => {
    const html = await renderArticleHtml('::embed[Notes]{url="https://example.com/page"}');

    expect(html.trim()).toBe(
      '<p><a href="https://example.com/page" rel="noreferrer">Notes</a></p>',
    );
  });

  test("refuses to embed a URL that is not http(s)", async () => {
    const html = await renderArticleHtml('::embed{url="javascript:alert(1)"}');

    expect(html).not.toMatch(/<iframe/);
    expect(html).not.toMatch(/href/);
  });

  test("keeps embeds out of the search text", async () => {
    const plain = markdownToPlainText(
      [
        "Intro",
        "",
        '::embed[登壇資料]{url="https://youtu.be/dQw4w9WgXcQ"}',
        "",
        "::embed[https://vimeo.com/123456]",
      ].join("\n"),
    );

    expect(plain).toBe("Intro 登壇資料");
  });
});
