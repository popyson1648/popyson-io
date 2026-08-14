import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";

import editorConfig from "../editor/vite.config.js";

const ROOT = process.cwd();

describe("editor build configuration", () => {
  // `npm run editor` builds with this config and serves the result with
  // `vite preview`, so anything public/ holds is only reachable when the build
  // copies it. About points its avatar at one of those files.
  test("serves the site's public directory", () => {
    expect(editorConfig.publicDir).toBe(resolve(ROOT, "public"));
    expect(existsSync(editorConfig.publicDir)).toBe(true);
  });
});
