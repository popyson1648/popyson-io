import sharp from "sharp";
import { describe, expect, test } from "vitest";

import {
  MAX_TITLE_SIZE,
  MIN_TITLE_SIZE,
  OGP_HEIGHT,
  OGP_WIDTH,
  TITLE_SAFE_HEIGHT,
  TITLE_SAFE_WIDTH,
  layoutTitle,
  renderArticleOgp,
} from "../scripts/generateOgpImages.mjs";
import { articleOgpPath, ogpTitleHash } from "../src/ogp.js";

const PATTERN_1_TITLE = `これはタイトルです｡${"あ".repeat(32)}`;
const PATTERN_2_TITLE = `これはタイトルです｡${"あ".repeat(58)}`;

describe("article OGP paths", () => {
  test("include locale and a stable title hash", () => {
    expect(ogpTitleHash("配列の走査")).toBe("d8f7da00");
    expect(articleOgpPath("20260101-aaaa1111", "ja", "配列の走査")).toBe(
      "/ogp/blog/20260101-aaaa1111-ja-d8f7da00.png",
    );
  });

  test("changes when localized title content changes", () => {
    expect(articleOgpPath("post-id", "ja", "短い題名")).not.toBe(
      articleOgpPath("post-id", "ja", "変更後の題名"),
    );
  });
});

describe("article OGP rendering", () => {
  test("uses the largest font size that preserves the title safe area", async () => {
    const pattern1 = await layoutTitle(PATTERN_1_TITLE, "ja");
    const pattern2 = await layoutTitle(PATTERN_2_TITLE, "ja");

    expect(pattern1.fontSize).toBe(MAX_TITLE_SIZE);
    expect(pattern2.fontSize).toBeLessThan(pattern1.fontSize);
    expect(pattern2.fontSize).toBeGreaterThanOrEqual(MIN_TITLE_SIZE);
    for (const layout of [pattern1, pattern2]) {
      expect(layout.width).toBeLessThanOrEqual(TITLE_SAFE_WIDTH);
      expect(layout.height).toBeLessThanOrEqual(TITLE_SAFE_HEIGHT);
    }
  });

  test("centers the rendered text block horizontally and vertically", async () => {
    const layout = await layoutTitle("配列の走査", "ja");

    expect(Math.abs(layout.left + layout.width / 2 - 596)).toBeLessThanOrEqual(0.5);
    expect(Math.abs(layout.top + layout.height / 2 - 211.5)).toBeLessThanOrEqual(0.5);
    expect(layout.left).toBeGreaterThanOrEqual(76);
    expect(layout.left + layout.width).toBeLessThanOrEqual(1116);
    expect(layout.top).toBeGreaterThanOrEqual(77);
    expect(layout.top + layout.height).toBeLessThanOrEqual(347);
  });

  test.each([
    ["配列の走査", "ja"],
    [PATTERN_2_TITLE, "ja"],
    ["TypeScript & React <入門>", "en"],
  ])("renders %s as a 1200x630 PNG", async (title, lang) => {
    const { png, fontSize, titleLayout } = await renderArticleOgp(title, lang);
    const metadata = await sharp(png).metadata();

    expect(fontSize).toBe(titleLayout.fontSize);
    expect(titleLayout.width).toBeLessThanOrEqual(TITLE_SAFE_WIDTH);
    expect(titleLayout.height).toBeLessThanOrEqual(TITLE_SAFE_HEIGHT);
    expect(metadata.format).toBe("png");
    expect(metadata.width).toBe(OGP_WIDTH);
    expect(metadata.height).toBe(OGP_HEIGHT);
  });
});
