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
    expect(ruleBody(".prose a")).toMatch(/word-break:\s*break-word/);
  });

  test("uses larger, depth-sensitive unordered-list markers", () => {
    expect(ruleBody(".prose ul")).toMatch(/list-style-type:\s*disc/);
    expect(ruleBody(".prose ul ul")).toMatch(/list-style-type:\s*circle/);
    expect(ruleBody(".prose ul ul ul")).toMatch(/list-style-type:\s*square/);
    expect(ruleBody(".prose ul li::marker")).toMatch(/font-size:\s*1\.2em/);
  });

  test("keeps list rows and nested groups compact", () => {
    expect(ruleBody(".prose ul li")).toMatch(/margin:\s*4px 0/);
    expect(ruleBody(".prose li > ul")).toMatch(/margin:\s*4px 0/);
  });

  test("matches related thumbnails to the square Blog-index treatment", () => {
    expect(ruleBody("img.rel-thumb")).toMatch(
      /border:\s*var\(--line-w\) solid var\(--line-strong\)/,
    );
    expect(ruleBody("img.rel-thumb")).toMatch(/border-radius:\s*var\(--r\)/);
  });
});
