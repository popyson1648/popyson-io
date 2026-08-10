import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, test } from "vitest";

const editorDist = join(process.cwd(), "editor", "dist");
const assetsDir = join(editorDist, "assets");

describe("editor production bundle", () => {
  test("keeps CodeMirror out of the initial editor download", () => {
    const html = readFileSync(join(editorDist, "editor.html"), "utf8");
    const entryName = html.match(/src="\/assets\/(editor-[^"]+\.js)"/)?.[1];
    const preloadNames = [
      ...html.matchAll(/rel="modulepreload"[^>]+href="\/assets\/([^"]+\.js)"/g),
    ].map(([, name]) => name);
    const markdownChunks = readdirSync(assetsDir).filter((name) =>
      /^MarkdownEditor-.+\.js$/.test(name),
    );

    expect(entryName).toBeTruthy();
    expect(markdownChunks).toHaveLength(1);
    expect(html).not.toContain(`/assets/${markdownChunks[0]}`);

    const initialJavaScriptBytes = [entryName, ...preloadNames].reduce(
      (total, name) => total + statSync(join(assetsDir, name)).size,
      0,
    );
    expect(initialJavaScriptBytes).toBeLessThan(650_000);
  });
});
