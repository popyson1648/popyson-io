/* Splits authored prose into plain text and links so About descriptions can
   carry a bare URL. Only http/https is recognised — anything else stays text,
   which keeps javascript: and data: URLs out of the rendered markup. */

const URL_RE = /https?:\/\/[^\s<>"'`]+/g;

// Punctuation that ends a sentence rather than a URL. A closing bracket is only
// dropped when the URL has no matching opener, so Wikipedia-style paths survive.
const TRAILING = new Set([
  ".",
  ",",
  ";",
  ":",
  "!",
  "?",
  "。",
  "、",
  "）",
  ")",
  "」",
  "』",
  "】",
  "]",
]);
const CLOSERS = { ")": "(", "）": "（", "]": "[", "】": "【", "」": "「", "』": "『" };

function countChar(text, char) {
  let n = 0;
  for (const c of text) if (c === char) n += 1;
  return n;
}

function trimUrlTail(url) {
  let end = url.length;
  while (end > 0) {
    const char = url[end - 1];
    if (!TRAILING.has(char)) break;
    const opener = CLOSERS[char];
    // A balanced bracket belongs to the URL, so stop before eating it.
    if (opener && countChar(url.slice(0, end), opener) >= countChar(url.slice(0, end), char)) break;
    end -= 1;
  }
  return url.slice(0, end);
}

/**
 * Splits `text` into ordered parts for rendering.
 * @param {string} text
 * @returns {Array<{type: "text", value: string} | {type: "link", value: string, href: string}>}
 */
export function splitLinks(text) {
  const source = String(text || "");
  if (!source) return [];
  const parts = [];
  let cursor = 0;

  for (const match of source.matchAll(URL_RE)) {
    const raw = match[0];
    const href = trimUrlTail(raw);
    // The match was punctuation-only after trimming; leave it as text.
    if (!href || href === "http://" || href === "https://") continue;
    const start = match.index;
    if (start > cursor) parts.push({ type: "text", value: source.slice(cursor, start) });
    parts.push({ type: "link", value: href, href });
    cursor = start + href.length;
  }

  if (cursor < source.length) parts.push({ type: "text", value: source.slice(cursor) });
  return parts;
}
