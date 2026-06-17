/* Article bodies generated from per-post index.ja.md and index.en.md files. */
import { ARTICLE_BODIES } from "virtual:site-content";

(function () {
  window.ArticleBody = {
    byId: ARTICLE_BODIES,
    fallback: { ja: "", en: "", headings: [] },
    get(id) { return this.byId[id] || this.fallback; },
  };
})();
