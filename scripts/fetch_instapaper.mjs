/* ============================================================
   Fetch the reading list from Instapaper and write a JSON
   snapshot to src/reading.json.

   - unread folder  -> done: false (未読)
   - archive folder -> done: true  (読了)

   Instapaper Full API has no CORS support and requires a signed
   request with a consumer secret, so this MUST run server-side
   (locally via 1Password or in CI). The browser only ever reads
   the committed JSON snapshot.

   Usage (via 1Password):
     op run --env-file=.op.env -- node scripts/fetch_instapaper.mjs

   Required env:
     INSTAPAPER_CONSUMER_KEY
     INSTAPAPER_CONSUMER_SECRET
     INSTAPAPER_OAUTH_TOKEN
     INSTAPAPER_OAUTH_TOKEN_SECRET
   ============================================================ */
import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { oauthPost, requireEnv } from "./instapaper_oauth.mjs";
import { makeDateLabel } from "../src/dateLabel.js";

const OUT_PATH = resolve(dirname(fileURLToPath(import.meta.url)), "../src/reading.json");

/* Derive a clean display source (hostname without leading www.). */
function hostnameOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

/* Instapaper `time` is a Unix timestamp (seconds). Format as
   YYYY-MM-DD in UTC to match the existing data shape. */
function toDate(time) {
  const n = Number(time);
  if (!Number.isFinite(n) || n <= 0) return "";
  return new Date(n * 1000).toISOString().slice(0, 10);
}

async function listFolder({ folderId, creds }) {
  const text = await oauthPost({
    path: "/bookmarks/list",
    params: { folder_id: folderId, limit: "500" },
    consumerKey: creds.INSTAPAPER_CONSUMER_KEY,
    consumerSecret: creds.INSTAPAPER_CONSUMER_SECRET,
    token: creds.INSTAPAPER_OAUTH_TOKEN,
    tokenSecret: creds.INSTAPAPER_OAUTH_TOKEN_SECRET,
  });

  const data = JSON.parse(text);
  /* The list endpoint returns a mixed array (user, bookmarks,
     highlights, meta). Keep only actual bookmark entries. */
  const bookmarks = Array.isArray(data)
    ? data.filter((d) => d && d.type === "bookmark")
    : Array.isArray(data.bookmarks)
      ? data.bookmarks
      : [];
  return bookmarks;
}

function normalize(bookmark, done) {
  const url = bookmark.url ?? "";
  const date = toDate(bookmark.time);
  return {
    id: bookmark.bookmark_id ?? bookmark.hash ?? url,
    title: (bookmark.title || url || "").trim(),
    url,
    source: hostnameOf(url),
    date,
    dateLabel: makeDateLabel(date),
    done,
  };
}

async function main() {
  const creds = requireEnv([
    "INSTAPAPER_CONSUMER_KEY",
    "INSTAPAPER_CONSUMER_SECRET",
    "INSTAPAPER_OAUTH_TOKEN",
    "INSTAPAPER_OAUTH_TOKEN_SECRET",
  ]);

  const [unread, archived] = await Promise.all([
    listFolder({ folderId: "unread", creds }),
    listFolder({ folderId: "archive", creds }),
  ]);

  const items = [
    ...unread.map((b) => normalize(b, false)),
    ...archived.map((b) => normalize(b, true)),
  ]
    /* Newest first, like a reading log. */
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

  const payload = {
    generatedAt: new Date().toISOString(),
    items,
  };

  await writeFile(OUT_PATH, JSON.stringify(payload, null, 2) + "\n", "utf8");
  console.log(
    `Wrote ${items.length} items (${unread.length} unread, ${archived.length} archived) to ${OUT_PATH}`,
  );
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
