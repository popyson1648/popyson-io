/* ============================================================
   Content data — bilingual (ja / en). Software-engineer persona.
   Plain JS: assigns window.BlogData.

   READING is generated from Instapaper (see scripts/fetch_instapaper.mjs)
   and imported from reading.json. unread -> done:false, archive -> done:true.
   ============================================================ */
import readingData from "./reading.json";
import { PERSON, POSTS, TAGS } from "virtual:site-content";
import { APPS } from "./apps.js";

(function () {
  /* Generated from Instapaper; see scripts/fetch_instapaper.mjs.
     Each item: { id, title, url, source, date, done }. */
  const READING = Array.isArray(readingData.items) ? readingData.items : [];

  window.BlogData = { PERSON, TAGS, POSTS, APPS, READING };
})();
