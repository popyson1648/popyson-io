import rehypeShiki from "@shikijs/rehype/core";
import { createHighlighterCore } from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";
import javascript from "shiki/langs/javascript.mjs";
import typescript from "shiki/langs/typescript.mjs";
import tsx from "shiki/langs/tsx.mjs";
import jsx from "shiki/langs/jsx.mjs";
import json from "shiki/langs/json.mjs";
import bash from "shiki/langs/bash.mjs";
import python from "shiki/langs/python.mjs";
import css from "shiki/langs/css.mjs";
import html from "shiki/langs/html.mjs";
import toml from "shiki/langs/toml.mjs";
import yaml from "shiki/langs/yaml.mjs";
import light from "shiki/themes/github-light.mjs";
import dark from "shiki/themes/github-dark.mjs";
import { createArticleRenderer } from "../../../scripts/articleRenderer.mjs";

// Workers disallow runtime WASM compilation. Use Shiki's JS engine, and keep
// the preview grammar set bounded; other languages retain escaped plain text.
let renderer: Promise<ReturnType<typeof createArticleRenderer>> | undefined;
export async function renderArticleHtml(markdown: string, options = {}) {
  renderer ||= createHighlighterCore({
    themes: [light, dark],
    langs: [javascript, typescript, tsx, jsx, json, bash, python, css, html, toml, yaml],
    engine: createJavaScriptRegexEngine({ forgiving: true }),
  }).then((highlighter) =>
    createArticleRenderer((settings: Parameters<typeof rehypeShiki>[1]) =>
      rehypeShiki(highlighter, { ...settings, fallbackLanguage: "text" }),
    ),
  );
  return (await renderer).renderArticleHtml(markdown, options);
}
