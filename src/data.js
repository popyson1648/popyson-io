/* ============================================================
   Content data — bilingual (ja / en). Software-engineer persona.
   Plain JS: assigns window.BlogData.

   READING is generated from Instapaper (see scripts/fetch_instapaper.mjs)
   and imported from reading.json. unread -> done:false, archive -> done:true.
   ============================================================ */
import readingData from "./reading.json";
import aboutData from "./content/about.toml";
import { POSTS } from "./posts.js";
import { APPS } from "./apps.js";

(function () {
  // About page content lives in src/content/about.toml (bilingual). Keep the
  // PERSON shape in sync with src/pages.jsx (AboutPage).
  const PERSON = aboutData.person;

  const TAGS = ["Rust", "TypeScript", "分散システム", "DX", "型", "CLI", "観測性", "設計"];

  /* Generated from Instapaper; see scripts/fetch_instapaper.mjs.
     Each item: { id, title, url, source, date, done }. */
  const READING = Array.isArray(readingData.items) ? readingData.items : [];

  window.BlogData = { PERSON, TAGS, POSTS, APPS, READING };
})();
