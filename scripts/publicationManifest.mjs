import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

export const PUBLICATION_MANIFEST_PATH = "src/content/publication.json";
export const JAPANESE_ENGLISH_SOURCE = "japanese-source";
const TRANSLATED_ENGLISH_SOURCE = "translated";

function metadataObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

export function englishSourceState(entry) {
  if (typeof entry?.translationEnabled === "boolean") {
    return entry.translationEnabled ? TRANSLATED_ENGLISH_SOURCE : JAPANESE_ENGLISH_SOURCE;
  }
  const metadata = metadataObject(entry?.revision?.metadata);
  const translation = metadataObject(metadata.translation);
  return translation.en === JAPANESE_ENGLISH_SOURCE
    ? JAPANESE_ENGLISH_SOURCE
    : TRANSLATED_ENGLISH_SOURCE;
}

export function revisionMetadataWithTranslation(entry) {
  const metadata = metadataObject(entry?.revision?.metadata);
  if (typeof entry?.translationEnabled !== "boolean") return metadata;
  const translation = metadataObject(metadata.translation);
  return {
    ...metadata,
    translation: {
      ...translation,
      en: englishSourceState(entry),
    },
  };
}

export function writePublicationManifest(root, entries) {
  const items = Object.fromEntries(
    entries
      .filter((entry) => englishSourceState(entry) === JAPANESE_ENGLISH_SOURCE)
      .map((entry) => [`${entry.item.kind}:${entry.item.id}`, { englishSource: "japanese" }])
      .sort(([left], [right]) => left.localeCompare(right)),
  );
  const filePath = join(root, PUBLICATION_MANIFEST_PATH);
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify({ version: 1, items }, null, 2)}\n`, "utf8");
  return filePath;
}

export function readPublicationManifest(root) {
  const filePath = join(root, PUBLICATION_MANIFEST_PATH);
  if (!existsSync(filePath)) return { version: 1, items: {} };
  let value;
  try {
    value = JSON.parse(readFileSync(filePath, "utf8"));
  } catch {
    throw new Error(`${filePath}: publication manifest must be valid JSON`);
  }
  if (
    value?.version !== 1 ||
    !value.items ||
    typeof value.items !== "object" ||
    Array.isArray(value.items)
  ) {
    throw new Error(`${filePath}: publication manifest has an unsupported shape`);
  }
  return value;
}

export function japaneseSourceItemIds(root, kind) {
  const prefix = `${kind}:`;
  return new Set(
    Object.entries(readPublicationManifest(root).items)
      .filter(
        ([key, item]) =>
          key.startsWith(prefix) &&
          item &&
          typeof item === "object" &&
          item.englishSource === "japanese",
      )
      .map(([key]) => key.slice(prefix.length)),
  );
}
