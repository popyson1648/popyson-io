/* Shared heading slug + section-anchor helpers.

   Both the build-time content loader (scripts/content_loader.mjs, which fills
   the TOC) and the runtime Markdown renderer (src/markdownPipeline.js, which
   sets the <h2> id) must derive the same slug from the same heading text, or
   TOC links stop matching their target. Keep this the single source of truth;
   this module intentionally has no heavy dependencies so the content loader can
   import it without pulling in the remark stack. */

export const SECTION_ID_PREFIX = "sec-";

export function slugifyHeading(value, seen) {
  const base = String(value)
    .trim()
    .toLowerCase()
    .replace(/[`*_~:[\](){}]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "") || "section";
  const count = seen.get(base) || 0;
  seen.set(base, count + 1);
  return count ? `${base}-${count + 1}` : base;
}

export function sectionId(slug) {
  return slug ? SECTION_ID_PREFIX + slug : "";
}
