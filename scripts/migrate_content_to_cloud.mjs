import { readFileSync, readdirSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { ContentCloudClient, sha256 } from "./contentCloudClient.mjs";
import {
  EDITOR_KINDS,
  readEditorContent,
  serializeEditorAbout,
  serializeEditorMarkdown,
} from "./contentEditorModel.mjs";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const MEDIA_TYPES = new Map([
  [".gif", "image/gif"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".png", "image/png"],
  [".webp", "image/webp"],
]);

function idsFor(kind) {
  const config = EDITOR_KINDS[kind];
  if (config.fixed) return ["about"];
  return readdirSync(config.dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && config.idPattern.test(entry.name))
    .map((entry) => entry.name)
    .sort();
}

// About serializes to a TOML bundle, so it is carried as JSON; the Markdown
// kinds are already one document per locale.
function serializeLocale(content, locale) {
  if (content.kind === "about") {
    return JSON.stringify(serializeEditorAbout(locale, content.files[locale].meta));
  }
  return serializeEditorMarkdown(
    content.kind,
    locale,
    content.files[locale].meta,
    content.files[locale].body,
  );
}

function sourcePair(content) {
  return {
    sourceJa: serializeLocale(content, "ja"),
    sourceEn: serializeLocale(content, "en"),
  };
}

function migrationItems() {
  return ["post", "work", "about"].flatMap((kind) =>
    idsFor(kind).map((id) => {
      const content = readEditorContent(kind, id);
      return {
        kind,
        id,
        visibility: "public",
        ...sourcePair(content),
        documents: { files: content.files },
        metadata: {
          migratedFrom: `src/content/${kind === "post" ? "posts" : kind === "work" ? "works" : "about"}`,
        },
        createdBy: "repository-migration",
      };
    }),
  );
}

function thumbnailAssets() {
  const directory = join(ROOT, "public/thumbnails");
  return readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && MEDIA_TYPES.has(extname(entry.name).toLowerCase()))
    .map((entry) => ({
      kind: "post",
      id: entry.name.replace(/\.[^.]+$/, ""),
      file: join(directory, entry.name),
      logicalPath: `thumbnails/${entry.name}`,
      mediaType: MEDIA_TYPES.get(extname(entry.name).toLowerCase()),
      role: "thumbnail",
    }));
}

/**
 * @param {{ client?: ContentCloudClient, dryRun?: boolean }} [options]
 */
export async function migrate({ client, dryRun = false } = {}) {
  const items = migrationItems();
  const assets = thumbnailAssets();
  if (dryRun) {
    return {
      items: items.map(({ kind, id, sourceJa, sourceEn }) => ({
        kind,
        id,
        sourceBytes: Buffer.byteLength(sourceJa) + Buffer.byteLength(sourceEn),
      })),
      assets: assets.map(({ id, logicalPath, file }) => ({
        id,
        logicalPath,
        bytes: readFileSync(file).byteLength,
      })),
    };
  }

  const cloud = client || new ContentCloudClient();
  const existing = new Set((await cloud.list()).items.map((item) => `${item.kind}/${item.id}`));
  for (const item of items) {
    if (existing.has(`${item.kind}/${item.id}`)) {
      throw new Error(`Refusing to overwrite existing cloud content: ${item.kind}/${item.id}`);
    }
    await cloud.create(item);
    console.log(JSON.stringify({ event: "content_migrated", kind: item.kind, id: item.id }));
  }

  for (const asset of assets) {
    const bytes = readFileSync(asset.file);
    const uploaded = await cloud.uploadAsset(bytes, asset.mediaType);
    if (uploaded.id !== sha256(bytes))
      throw new Error(`Checksum mismatch for ${asset.logicalPath}`);
    await cloud.attachAsset(asset.kind, asset.id, {
      assetId: uploaded.id,
      logicalPath: asset.logicalPath,
      role: asset.role,
    });
    console.log(
      JSON.stringify({ event: "asset_migrated", id: uploaded.id, bytes: bytes.byteLength }),
    );
  }
  return { itemCount: items.length, assetCount: assets.length };
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const result = await migrate({ dryRun: process.argv.includes("--dry-run") });
  console.log(JSON.stringify(result, null, 2));
}
