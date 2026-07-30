/**
 * Resolve locale-specific tags while retaining support for the plain arrays
 * used by older fixtures and consumers.
 */
export function localizedTags(tags, lang) {
  if (Array.isArray(tags)) return tags;
  const exact = tags?.[lang];
  if (Array.isArray(exact)) return exact;
  if (Array.isArray(tags?.ja)) return tags.ja;
  if (Array.isArray(tags?.en)) return tags.en;
  return [];
}

/**
 * Locale tag arrays are paired by position in each article's front matter.
 * Find the selected source tag in its article, then return the corresponding
 * target-locale tag so language switching preserves the active concept.
 */
export function translatePostTag(posts, tag, fromLang, toLang) {
  if (!tag || !Array.isArray(posts)) return tag;
  for (const post of posts) {
    const sourceTags = localizedTags(post?.tags, fromLang);
    const index = sourceTags.indexOf(tag);
    if (index < 0) continue;
    return localizedTags(post?.tags, toLang)[index] || tag;
  }
  return tag;
}
