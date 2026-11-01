import rehypeShiki from "@shikijs/rehype";
import { createArticleRenderer } from "./articleRenderer.mjs";
export { markdownToPlainText } from "./articleRenderer.mjs";
export const { renderArticleHtml, renderArticleBody } = createArticleRenderer(rehypeShiki);
