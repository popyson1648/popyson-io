export const THUMBNAIL_VARIANT_WIDTHS = [192, 384];

const GENERATED_THUMBNAIL_PATTERN = /^\/thumbnails\/(\d{8}-(?:\d{6}|[a-f0-9]{8}))\.png$/;

export function thumbnailVariantPath(path, width) {
  const match = GENERATED_THUMBNAIL_PATTERN.exec(String(path || ""));
  if (!match || !THUMBNAIL_VARIANT_WIDTHS.includes(width)) return "";
  return `/thumbnails/${match[1]}-${width}.webp`;
}

export function thumbnailSrcSet(path) {
  const candidates = THUMBNAIL_VARIANT_WIDTHS.map((width) => {
    const variant = thumbnailVariantPath(path, width);
    return variant ? `${variant} ${width}w` : "";
  }).filter(Boolean);
  return candidates.length > 0 ? candidates.join(", ") : undefined;
}
