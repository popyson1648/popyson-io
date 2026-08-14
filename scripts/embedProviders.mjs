/*
 * Embed providers for the `::embed{url="…"}` directive.
 *
 * A provider turns a page URL an author can copy from the address bar into the
 * iframe URL the service documents for embedding. Adding a service means adding
 * one entry here; nothing else in the renderer knows about individual services.
 */

const YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "music.youtube.com",
  "youtube-nocookie.com",
  "www.youtube-nocookie.com",
  "youtu.be",
]);

const DOCSWELL_HOSTS = new Set(["docswell.com", "www.docswell.com"]);
const SPEAKERDECK_HOSTS = new Set(["speakerdeck.com", "www.speakerdeck.com"]);
const VIMEO_HOSTS = new Set(["vimeo.com", "www.vimeo.com", "player.vimeo.com"]);

const YOUTUBE_ID = /^[\w-]{11}$/;
const DOCSWELL_ID = /^[A-Za-z0-9]+$/;
// Speaker Deck player ids are hex: 32 characters today, 24 on older decks.
const SPEAKERDECK_ID = /^(?:[0-9a-f]{24}|[0-9a-f]{32})$/i;
const VIMEO_ID = /^\d+$/;

// `allow` mirrors what YouTube's own embed code ships. Without it the player
// falls back to a degraded mode (no fullscreen button, no picture-in-picture).
const YOUTUBE_ALLOW =
  "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";

function segments(pathname) {
  return pathname.split("/").filter(Boolean);
}

// `?t=90`, `?t=1m30s`, and `?start=90` all mean the same thing to the player,
// which only accepts whole seconds on the embed URL.
function youtubeStartSeconds(url) {
  const raw = url.searchParams.get("start") || url.searchParams.get("t") || "";
  if (!raw) return 0;
  if (/^\d+$/.test(raw)) return Number(raw);
  const match = raw.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/);
  if (!match || !match[0]) return 0;
  const [, hours, minutes, seconds] = match;
  return Number(hours || 0) * 3600 + Number(minutes || 0) * 60 + Number(seconds || 0);
}

function youtubeVideoId(url) {
  if (url.hostname === "youtu.be") return segments(url.pathname)[0] || "";
  const parts = segments(url.pathname);
  if (parts[0] === "watch") return url.searchParams.get("v") || "";
  if (parts[0] === "embed" || parts[0] === "shorts" || parts[0] === "live") return parts[1] || "";
  return "";
}

function youtube(url) {
  const id = youtubeVideoId(url);
  if (!YOUTUBE_ID.test(id)) return null;
  const start = youtubeStartSeconds(url);
  // youtube-nocookie.com is YouTube's own privacy-enhanced host: it defers
  // profiling cookies until the visitor actually plays the video.
  const src = `https://www.youtube-nocookie.com/embed/${id}${start > 0 ? `?start=${start}` : ""}`;
  return { name: "youtube", src, allow: YOUTUBE_ALLOW };
}

// A public deck lives at /s/<user>/<id>-<slug>, and the embed is keyed by the
// leading id alone. /slide/<id> and /slide/<id>/embed are the same deck.
function docswellSlideId(url) {
  const parts = segments(url.pathname);
  if (parts[0] === "s") return (parts[2] || "").split("-")[0];
  if (parts[0] === "slide") return parts[1] || "";
  return "";
}

function docswell(url) {
  const id = docswellSlideId(url);
  if (!DOCSWELL_ID.test(id)) return null;
  return { name: "docswell", src: `https://www.docswell.com/slide/${id}/embed` };
}

// Speaker Deck keys its player by a hex id that only appears in the embed code,
// not in the talk URL, so the author has to paste the /player/<id> URL. A talk
// URL falls through to a link, which is the honest outcome: there is nothing to
// derive the player id from.
function speakerdeck(url) {
  const parts = segments(url.pathname);
  if (parts.length !== 2 || parts[0] !== "player" || !SPEAKERDECK_ID.test(parts[1])) return null;
  return { name: "speakerdeck", src: `https://speakerdeck.com/player/${parts[1]}` };
}

function vimeo(url) {
  const parts = segments(url.pathname);
  const id = parts[0] === "video" ? parts[1] : parts[0];
  if (!VIMEO_ID.test(id || "")) return null;
  return {
    name: "vimeo",
    src: `https://player.vimeo.com/video/${id}`,
    allow: "autoplay; fullscreen; picture-in-picture",
  };
}

const PROVIDERS = [
  { hosts: YOUTUBE_HOSTS, resolve: youtube },
  { hosts: DOCSWELL_HOSTS, resolve: docswell },
  { hosts: SPEAKERDECK_HOSTS, resolve: speakerdeck },
  { hosts: VIMEO_HOSTS, resolve: vimeo },
];

/**
 * Resolve a page URL to an embeddable iframe. Returns null for anything this
 * renderer cannot embed, which the caller renders as an ordinary link.
 *
 * @param {string} url
 * @returns {{ name: string, src: string, allow?: string } | null}
 */
export function resolveEmbed(url) {
  const value = String(url || "").trim();
  if (!value) return null;
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
  const provider = PROVIDERS.find((entry) => entry.hosts.has(parsed.hostname.toLowerCase()));
  return provider ? provider.resolve(parsed) : null;
}
