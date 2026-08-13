import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

const editorRoot = readFileSync(join(process.cwd(), "src/editor/EditorRoot.jsx"), "utf8");
const editorApi = readFileSync(join(process.cwd(), "src/editor/editorApi.js"), "utf8");
const repository = readFileSync(
  join(process.cwd(), "workers/content-api/src/repository.ts"),
  "utf8",
);

const PAIRS = { "{": "}", "[": "]" };

// Returns the first brace- or bracket-delimited literal after `marker`, matched
// by depth so nested literals inside it do not end the block early.
function block(source, marker) {
  const start = source.indexOf(marker);
  expect(start, `missing block: ${marker}`).toBeGreaterThanOrEqual(0);
  const candidates = Object.keys(PAIRS)
    .map((character) => source.indexOf(character, start))
    .filter((index) => index >= 0);
  const open = Math.min(...candidates);
  const close = PAIRS[source[open]];
  let depth = 0;
  for (let index = open; index < source.length; index += 1) {
    if (source[index] === source[open]) depth += 1;
    if (source[index] === close) depth -= 1;
    if (depth === 0) return source.slice(open + 1, index);
  }
  throw new Error(`unclosed block: ${marker}`);
}

function mediaTypes(source) {
  return [...source.matchAll(/"(image\/[a-z0-9+.-]+)"/g)].map((match) => match[1]).sort();
}

// The Content API sniffs magic bytes and answers 415 for anything it cannot
// identify, so an image the editor offers but the Worker rejects fails only
// after the upload round trip. Keeping the two lists equal makes the editor
// refuse the file up front with its own message.
describe("editor and Content API accept the same images", () => {
  const supported = mediaTypes(block(repository, "const IMAGE_SIGNATURES"));

  test("the Worker still declares the media types this check assumes", () => {
    expect(supported).toEqual(["image/gif", "image/jpeg", "image/png", "image/webp"]);
  });

  test("the editor validates against exactly those media types", () => {
    expect(mediaTypes(block(editorRoot, "const ACCEPTED_IMAGE_TYPES"))).toEqual(supported);
  });

  test("the file picker offers exactly those media types", () => {
    const accept = /const IMAGE_ACCEPT =\s*"([^"]*)"/.exec(editorRoot);
    expect(accept, "missing IMAGE_ACCEPT").not.toBeNull();
    expect(accept[1].split(",").sort()).toEqual(supported);
  });

  test("the extension fallbacks map onto those media types", () => {
    const extensions = [
      ...block(editorRoot, "const ACCEPTED_IMAGE_EXTENSIONS").matchAll(/"([a-z0-9]+)"/g),
    ].map((match) => match[1]);
    expect(extensions.length).toBeGreaterThan(0);
    // `jpg` and `jpeg` both stand for image/jpeg, so compare the resolved set.
    const inferred = block(editorApi, "const inferredType = {");
    for (const extension of extensions) {
      const entry = new RegExp(`\\b${extension}:\\s*"(image/[a-z0-9+.-]+)"`).exec(inferred);
      expect(entry, `editorApi.js does not map .${extension}`).not.toBeNull();
      expect(supported).toContain(entry[1]);
    }
  });
});
