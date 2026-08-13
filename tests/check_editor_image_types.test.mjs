import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

import {
  fileExtension,
  isHeicFile,
  isSupportedSource,
  isUploadableImage,
  MAX_UPLOAD_BYTES,
  prepareImageForUpload,
  scaledSize,
  UPLOAD_IMAGE_TYPES,
} from "../src/editor/imagePreparation.js";

const repository = readFileSync(
  join(process.cwd(), "workers/content-api/src/repository.ts"),
  "utf8",
);
const editorRoot = readFileSync(join(process.cwd(), "src/editor/EditorRoot.jsx"), "utf8");

function workerMediaTypes() {
  const start = repository.indexOf("const IMAGE_SIGNATURES");
  expect(start, "missing IMAGE_SIGNATURES").toBeGreaterThanOrEqual(0);
  const open = repository.indexOf("{", start);
  let depth = 0;
  for (let index = open; index < repository.length; index += 1) {
    if (repository[index] === "{") depth += 1;
    if (repository[index] === "}") depth -= 1;
    if (depth === 0) {
      const body = repository.slice(open, index);
      return [...body.matchAll(/"(image\/[a-z0-9+.-]+)"/g)].map((match) => match[1]).sort();
    }
  }
  throw new Error("unclosed IMAGE_SIGNATURES");
}

function file(name, type, size = 1) {
  return { name, type, size };
}

// The Content API sniffs magic bytes and answers 415 for anything it cannot
// identify. Uploads therefore have to land inside that set, whatever the editor
// let the author pick.
describe("uploads stay inside what the Content API stores", () => {
  const supported = workerMediaTypes();

  test("the Worker still declares the media types this check assumes", () => {
    expect(supported).toEqual(["image/gif", "image/jpeg", "image/png", "image/webp"]);
  });

  test("the upload set matches the Worker exactly", () => {
    expect([...UPLOAD_IMAGE_TYPES].sort()).toEqual(supported);
  });

  test("the file picker offers those types plus HEIC, which is converted", () => {
    const accept = /const IMAGE_ACCEPT =\s*"([^"]*)"/.exec(editorRoot);
    expect(accept, "missing IMAGE_ACCEPT").not.toBeNull();
    const offered = accept[1].split(",");
    for (const type of supported) expect(offered).toContain(type);
    // HEIC is deliberately outside the upload set: it is decoded before upload.
    expect(offered).toContain("image/heic");
    expect(UPLOAD_IMAGE_TYPES.has("image/heic")).toBe(false);
  });
});

describe("source file classification", () => {
  test("reads the extension case-insensitively", () => {
    expect(fileExtension("Photo.JPG")).toBe("jpg");
    expect(fileExtension("no-extension")).toBe("no-extension");
  });

  test("detects HEIC by media type and by extension", () => {
    expect(isHeicFile(file("a.heic", "image/heic"))).toBe(true);
    expect(isHeicFile(file("b.HEIF", ""))).toBe(true);
    expect(isHeicFile(file("c.jpg", "image/jpeg"))).toBe(false);
  });

  test("accepts HEIC as a source even though it is not an upload type", () => {
    expect(isUploadableImage(file("a.heic", "image/heic"))).toBe(false);
    expect(isSupportedSource(file("a.heic", "image/heic"))).toBe(true);
  });

  test("rejects unrelated files and empty ones", () => {
    expect(isSupportedSource(file("notes.pdf", "application/pdf"))).toBe(false);
    expect(isSupportedSource(file("empty.png", "image/png", 0))).toBe(false);
  });
});

describe("scaling arithmetic", () => {
  test("leaves an image inside the limit alone", () => {
    expect(scaledSize(1600, 900, 1920)).toEqual({ width: 1600, height: 900, scaled: false });
  });

  test("scales the longest edge down and keeps the aspect ratio", () => {
    expect(scaledSize(4032, 3024, 1920)).toEqual({ width: 1920, height: 1440, scaled: true });
    expect(scaledSize(3024, 4032, 1920)).toEqual({ width: 1440, height: 1920, scaled: true });
  });

  test("never rounds an edge down to zero", () => {
    expect(scaledSize(10000, 3, 1920).height).toBe(1);
  });
});

describe("animated GIFs", () => {
  test("passes a GIF through untouched so its frames survive", async () => {
    const gif = new File([new Uint8Array(8)], "loop.gif", { type: "image/gif" });
    const { file: prepared } = await prepareImageForUpload(gif);
    expect(prepared).toBe(gif);
  });

  test("refuses an oversized GIF rather than flattening it to one frame", async () => {
    const gif = new File([new Uint8Array(8)], "big.gif", { type: "image/gif" });
    Object.defineProperty(gif, "size", { value: MAX_UPLOAD_BYTES + 1 });
    await expect(prepareImageForUpload(gif)).rejects.toThrow(/アニメーション/);
  });
});
