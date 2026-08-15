import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

const css = readFileSync(join(process.cwd(), "src/app.css"), "utf8");

function ruleBody(selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = css.match(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`));
  expect(match, `missing CSS rule: ${selector}`).not.toBeNull();
  return match[1];
}

describe("article prose refinements", () => {
  test("wraps long article links without widening the viewport", () => {
    expect(ruleBody(".prose a")).toMatch(/overflow-wrap:\s*anywhere/);
  });

  test("uses larger, depth-sensitive unordered-list markers", () => {
    expect(ruleBody(".prose ul")).toMatch(/list-style-type:\s*disc/);
    expect(ruleBody(".prose ul ul")).toMatch(/list-style-type:\s*circle/);
    expect(ruleBody(".prose ul ul ul")).toMatch(/list-style-type:\s*square/);
    expect(ruleBody(".prose ul li::marker")).toMatch(/font-size:\s*1\.2em/);
  });

  test("keeps list rows and nested groups compact", () => {
    expect(ruleBody(".prose li")).toMatch(/margin:\s*4px 0/);
    expect(ruleBody(".prose li > :is(ul, ol)")).toMatch(/margin:\s*4px 0/);
    expect(ruleBody(".prose li > p:has(+ :is(ul, ol))")).toMatch(/margin-block-end:\s*4px/);
  });

  test("uses one compact logical indentation system for all list kinds", () => {
    expect(ruleBody(".prose ul,\n.prose ol")).toMatch(/padding-inline-start:\s*1\.5em/);
    expect(ruleBody(".prose :is(ul, ol) :is(ul, ol)")).toMatch(/padding-inline-start:\s*0\.5em/);
    expect(ruleBody(".prose li")).toMatch(/padding-inline-start:\s*0\.25em/);
    expect(css).toMatch(/\.prose ol\s*\{[^}]*list-style-type:\s*decimal/s);
    expect(ruleBody(".prose ol li::marker")).toMatch(/font-variant-numeric:\s*tabular-nums/);
    expect(css).not.toMatch(/counter-increment:\s*li/);
  });

  test("keeps embeds on a 16:9 frame that fills the column", () => {
    expect(ruleBody(".prose .embed-frame")).toMatch(/aspect-ratio:\s*16 \/ 9/);
    expect(ruleBody(".prose .embed-frame iframe")).toMatch(/width:\s*100%/);
    expect(ruleBody(".prose .embed-frame iframe")).toMatch(/height:\s*100%/);
  });

  test("holds a post embed at its own width and height until it measures itself", () => {
    expect(ruleBody('.prose .embed[data-embed="x"] .embed-frame')).toMatch(/height:\s*420px/);
    expect(ruleBody('.prose .embed[data-embed="instagram"] .embed-frame')).toMatch(
      /height:\s*640px/,
    );
    expect(ruleBody('.prose .embed[data-embed="instagram"]')).toMatch(/max-width:\s*550px/);
    expect(ruleBody('.prose .embed[data-embed="instagram"] .embed-frame')).toMatch(
      /aspect-ratio:\s*auto/,
    );
  });

  test("leaves a post embed the card border the service draws itself", () => {
    expect(ruleBody('.prose .embed[data-embed="x"] .embed-frame')).toMatch(/border:\s*0/);
    expect(ruleBody('.prose .embed[data-embed="instagram"] .embed-frame')).toMatch(/border:\s*0/);
  });

  test("matches related thumbnails to the square Blog-index treatment", () => {
    expect(ruleBody("img.rel-thumb")).toMatch(
      /border:\s*var\(--line-w\) solid var\(--line-strong\)/,
    );
    expect(ruleBody("img.rel-thumb")).toMatch(/border-radius:\s*var\(--r\)/);
  });
});
