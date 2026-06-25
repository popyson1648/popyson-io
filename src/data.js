/* ============================================================
   Content data — bilingual (ja / en). Software-engineer persona.
   Plain JS: assigns window.BlogData.

   READING is generated from Instapaper (see scripts/fetch_instapaper.mjs)
   and imported from reading.json. unread -> done:false, archive -> done:true.
   ============================================================ */
import readingData from "./reading.json";
import { PERSON, POSTS, TAGS } from "virtual:site-content";
import { APPS } from "./apps.js";
import { makeDateLabel } from "./dateLabel.js";

(function () {
  /* Generated from Instapaper; see scripts/fetch_instapaper.mjs.
     Each item: { id, title, url, source, date, dateLabel, done }. */
  const READING = Array.isArray(readingData.items)
    ? readingData.items.map((item) => ({
        ...item,
        dateLabel: item.dateLabel || makeDateLabel(item.date),
      }))
    : [];

  window.BlogData = { PERSON, TAGS, POSTS, APPS, READING };
})();
