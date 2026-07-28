const CJK_RE = /[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/gu;
const FENCE_RE = /^\s*(`{3,}|~{3,})(.*)$/;
const CJK_PER_MINUTE = 600;
const WORDS_PER_MINUTE = 250;

function stripMarkdown(markdown) {
  const lines = String(markdown || "")
    .replace(/\r\n/g, "\n")
    .split("\n");

  const kept = [];
  let fence = null;
  for (const line of lines) {
    const match = FENCE_RE.exec(line);
    if (match) {
      const [, delimiter, rest] = match;
      if (!fence) {
        fence = { char: delimiter[0], length: delimiter.length };
        continue;
      }
      // CommonMark closes a block only on the same character, at least as
      // long, with nothing after it — so a ``` inside a ```` block is content.
      if (delimiter[0] === fence.char && delimiter.length >= fence.length && rest.trim() === "") {
        fence = null;
        continue;
      }
    }
    if (!fence) kept.push(line);
  }

  return kept
    .join("\n")
    .replace(/`[^`\n]*`/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/^\s{0,3}>\s?/gm, "")
    .replace(/^\s*([-*+]|\d+\.)\s+/gm, "")
    .replace(/[*_~]/g, "");
}

/**
 * Reading time in whole minutes, counting CJK characters and other words
 * separately so a mixed-script article is not under- or over-counted.
 */
export function estimateReadingMinutes(markdown) {
  const text = stripMarkdown(markdown);
  const cjk = text.match(CJK_RE)?.length || 0;
  const words = text.replace(CJK_RE, " ").split(/\s+/).filter(Boolean).length;
  const minutes = cjk / CJK_PER_MINUTE + words / WORDS_PER_MINUTE;
  return Math.max(1, Math.ceil(minutes));
}
