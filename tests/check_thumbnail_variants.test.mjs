import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import sharp from "sharp";
import { afterAll, beforeAll, describe, expect, test } from "vitest";

import {
  generateThumbnailVariants,
  variantPath,
  VARIANT_WIDTHS,
} from "../scripts/generate_thumbnail_variants.mjs";
import {
  thumbnailSrcSet,
  thumbnailVariantPath,
  THUMBNAIL_VARIANT_WIDTHS,
} from "../src/thumbnail.js";

let tempDir;

beforeAll(async () => {
  tempDir = mkdtempSync(join(tmpdir(), "thumbnail-variants-"));
  await sharp({
    create: {
      width: 512,
      height: 512,
      channels: 3,
      background: { r: 212, g: 255, b: 10 },
    },
  })
    .png()
    .toFile(join(tempDir, "20260730-a1b2c3d4.png"));
});

afterAll(() => {
  rmSync(tempDir, { recursive: true, force: true });
});

describe("thumbnail client paths", () => {
  test("maps generated PNGs to density-aware WebP candidates", () => {
    expect(THUMBNAIL_VARIANT_WIDTHS).toEqual([192, 384]);
    expect(thumbnailVariantPath("/thumbnails/20260730-a1b2c3d4.png", 192)).toBe(
      "/thumbnails/20260730-a1b2c3d4-192.webp",
    );
    expect(thumbnailSrcSet("/thumbnails/20260730-a1b2c3d4.png")).toBe(
      "/thumbnails/20260730-a1b2c3d4-192.webp 192w, /thumbnails/20260730-a1b2c3d4-384.webp 384w",
    );
  });

  test("leaves custom thumbnail paths on their original source", () => {
    expect(thumbnailVariantPath("/custom/thumbnail.png", 192)).toBe("");
    expect(thumbnailSrcSet("/custom/thumbnail.png")).toBeUndefined();
  });
});

describe("thumbnail variant generation", () => {
  test("writes deterministic lossless WebP variants and passes check mode", async () => {
    expect(VARIANT_WIDTHS).toEqual([192, 384]);

    const changed = await generateThumbnailVariants({ thumbnailDir: tempDir });
    expect(changed).toEqual(
      VARIANT_WIDTHS.map((width) => variantPath(join(tempDir, "20260730-a1b2c3d4.png"), width)),
    );

    for (const width of VARIANT_WIDTHS) {
      const output = variantPath(join(tempDir, "20260730-a1b2c3d4.png"), width);
      const metadata = await sharp(readFileSync(output)).metadata();
      expect(metadata).toMatchObject({ format: "webp", width, height: width });
    }

    await expect(
      generateThumbnailVariants({ thumbnailDir: tempDir, check: true }),
    ).resolves.toEqual([]);
  });
});
