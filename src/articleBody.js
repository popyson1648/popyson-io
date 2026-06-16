/* Article bodies generated from per-post index.ja.md and index.en.md files.
   Block kinds: h2 | p | msg | code | ul | ol. h2 blocks become TOC entries. */
import { ARTICLE_BODIES } from "virtual:site-content";

(function () {
  window.ArticleBody = {
    byId: ARTICLE_BODIES,
    fallback: [],
    get(id) { return this.byId[id] || this.fallback; },
  };
})();
