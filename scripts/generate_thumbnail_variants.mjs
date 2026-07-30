import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

export const VARIANT_WIDTHS = [192, 384];

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const THUMBNAIL_DIR = join(ROOT, "public", "thumbnails");
const SOURCE_PATTERN = /^(\d{8}-(?:\d{6}|[a-f0-9]{8}))\.png$/;

export function variantPath(sourcePath, width) {
  const match = SOURCE_PATTERN.exec(basename(sourcePath));
  if (!match || !VARIANT_WIDTHS.includes(width)) return "";
  return join(dirname(sourcePath), `${match[1]}-${width}.webp`);
}

async function renderVariant(sourcePath, width) {
  return sharp(sourcePath)
    .resize({ width, withoutEnlargement: true })
    .webp({ lossless: true, effort: 6 })
    .toBuffer();
}

export async function generateThumbnailVariants({
  thumbnailDir = THUMBNAIL_DIR,
  check = false,
} = {}) {
  const sourceFiles = readdirSync(thumbnailDir)
    .filter((file) => SOURCE_PATTERN.test(file))
    .map((file) => join(thumbnailDir, file))
    .sort();
  const changed = [];
  const errors = [];

  for (const sourcePath of sourceFiles) {
    for (const width of VARIANT_WIDTHS) {
      const targetPath = variantPath(sourcePath, width);
      const expected = await renderVariant(sourcePath, width);
      const current = existsSync(targetPath) ? readFileSync(targetPath) : null;
      if (current?.equals(expected)) continue;
      if (check) {
        errors.push(`${targetPath}: missing or stale ${width}px thumbnail variant`);
      } else {
        writeFileSync(targetPath, expected);
        changed.push(targetPath);
      }
    }
  }

  if (errors.length > 0) throw new Error(errors.join("\n"));
  return changed;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  generateThumbnailVariants({ check: process.argv.includes("--check") })
    .then((changed) => {
      if (process.argv.includes("--check")) {
        console.log("thumbnail variant checks passed");
      } else if (changed.length === 0) {
        console.log("thumbnail variants already generated");
      } else {
        console.log(`generated ${changed.length} thumbnail variant(s)`);
      }
    })
    .catch((error) => {
      console.error(error.message);
      process.exit(1);
    });
}
