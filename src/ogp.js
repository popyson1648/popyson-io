const ARTICLE_OGP_DIR = "/ogp/blog";

export function ogpTitleHash(title) {
  let hash = 0x811c9dc5;
  for (const character of String(title)) {
    const codePoint = character.codePointAt(0);
    hash ^= codePoint;
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function articleOgpPath(id, lang, title) {
  return `${ARTICLE_OGP_DIR}/${id}-${lang}-${ogpTitleHash(title)}.png`;
}
