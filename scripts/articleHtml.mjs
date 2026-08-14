import rehypeShiki from "@shikijs/rehype";
import rehypeStringify from "rehype-stringify";
import remarkDirective from "remark-directive";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";
import { visit } from "unist-util-visit";

import { sectionId, slugifyHeading } from "../src/headingSlug.js";
import { resolveEmbed } from "./embedProviders.mjs";

const CALLOUT_TYPES = new Set(["note", "tip", "info", "warning", "danger"]);
const EMBED_TITLES = {
  youtube: "YouTube",
  docswell: "Docswell",
  speakerdeck: "Speaker Deck",
  vimeo: "Vimeo",
};
const articleProcessors = new Map();

function calloutVariant(type) {
  return type === "warning" ? "warn" : type;
}

function nodeText(node) {
  if (!node) return "";
  if (typeof node.value === "string") return node.value;
  if (!Array.isArray(node.children)) return "";
  return node.children.map(nodeText).join("");
}

function remarkCallouts() {
  return (tree) => {
    visit(tree, "containerDirective", (node) => {
      if (!CALLOUT_TYPES.has(node.name)) return;

      let title = node.attributes?.title || "";
      if (!title && node.children?.[0]?.data?.directiveLabel) {
        title = nodeText(node.children[0]);
        node.children = node.children.slice(1);
      }
      if (title) {
        node.children.unshift({
          type: "paragraph",
          children: [{ type: "text", value: title }],
          data: {
            hName: "div",
            hProperties: { className: ["msg-title"] },
          },
        });
      }
      node.data = {
        ...node.data,
        hName: "div",
        hProperties: {
          className: ["msg", `msg-${calloutVariant(node.name)}`],
          dataCfChange: "ch-message-boxes",
        },
      };
    });
  };
}

function embedLinkNode(url, label) {
  return {
    type: "paragraph",
    children: [
      {
        type: "link",
        url,
        children: [{ type: "text", value: label || url }],
      },
    ],
  };
}

function embedFrameNode(embed, title) {
  return {
    type: "element",
    tagName: "iframe",
    properties: {
      src: embed.src,
      title,
      loading: "lazy",
      allow: embed.allow,
      allowFullScreen: true,
      referrerPolicy: "strict-origin-when-cross-origin",
      frameBorder: "0",
    },
    children: [],
  };
}

function embedChildren(embed, title, url, label) {
  const frame = {
    type: "element",
    tagName: "div",
    properties: { className: ["embed-frame"] },
    children: [embedFrameNode(embed, title)],
  };
  if (!label) return [frame];
  return [
    frame,
    {
      type: "element",
      tagName: "p",
      properties: { className: ["embed-caption"] },
      children: [
        {
          type: "element",
          tagName: "a",
          properties: { href: url },
          children: [{ type: "text", value: label }],
        },
      ],
    },
  ];
}

// `::embed{url="…"}` turns a page URL into the iframe its service documents.
// Anything this renderer cannot embed — an unknown service, a typo, a scheme
// other than http(s) — becomes an ordinary link rather than an empty frame, so
// a mistake in the directive never swallows the reference.
function remarkEmbeds() {
  return (tree) => {
    visit(tree, "leafDirective", (node, index, parent) => {
      if (node.name !== "embed" || !parent || typeof index !== "number") return;

      const label = nodeText(node).trim();
      const url = String(node.attributes?.url || "").trim() || label;
      if (!url) return;

      const embed = resolveEmbed(url);
      if (!embed) {
        parent.children[index] = embedLinkNode(url, label === url ? "" : label);
        return;
      }

      const caption = label === url ? "" : label;
      const title = caption || EMBED_TITLES[embed.name] || embed.name;
      node.data = {
        ...node.data,
        hName: "div",
        hProperties: { className: ["embed"], dataEmbed: embed.name },
        hChildren: embedChildren(embed, title, url, caption),
      };
    });
  };
}

function directiveAttributes(node) {
  const entries = Object.entries(node.attributes || {}).filter(([, value]) => value != null);
  if (entries.length === 0) return "";
  // Values are emitted verbatim. The parser cannot produce one containing a
  // quote — `{key="a\"b"}` drops the attribute entirely — and it treats a
  // backslash as an ordinary character, so re-escaping here would change the
  // value rather than restore it.
  const pairs = entries.map(([key, value]) => (value === "" ? key : `${key}="${value}"`));
  return `{${pairs.join(" ")}}`;
}

// A line block, as Pandoc and reStructuredText write one: a leading vertical
// bar keeps the break between this line and the one above it. The break is a
// `<br>`, so the two lines sit a line-height apart — the same gap a wrapped
// line leaves — where a blank line would open a paragraph's worth of space.
const LINE_BLOCK_SOURCE = /^[ \t>]*\|/;
const LINE_BLOCK_VALUE = /^\|[ \t]?/;

// The bar is read from the source line rather than the parsed value, because
// the parser resolves `\|` to a bare `|`: by the time a text node carries the
// character, an escaped bar and a marker look alike. The source still tells
// them apart, so `\|` opens a line the way any other character does.
function lineBlockBreaks(node, sourceLines) {
  const startLine = node.position?.start?.line;
  if (!startLine) return null;

  const segments = node.value.split("\n");
  const nodes = [];
  let text = segments[0];
  for (let index = 1; index < segments.length; index += 1) {
    const source = sourceLines[startLine + index - 1] || "";
    if (LINE_BLOCK_SOURCE.test(source)) {
      nodes.push({ type: "text", value: text }, { type: "break" });
      text = segments[index].replace(LINE_BLOCK_VALUE, "");
      continue;
    }
    text += `\n${segments[index]}`;
  }
  if (nodes.length === 0) return null;
  return [...nodes, { type: "text", value: text }];
}

function remarkLineBlocks() {
  return (tree, file) => {
    const sourceLines = String(file).split("\n");
    visit(tree, "text", (node, index, parent) => {
      if (!parent || typeof index !== "number") return;
      if (!node.value.includes("\n")) return;
      const replacement = lineBlockBreaks(node, sourceLines);
      if (!replacement) return;
      parent.children.splice(index, 1, ...replacement);
      return index + replacement.length;
    });
  };
}

// remark-directive reads `:name` anywhere in a line, so ordinary prose like
// "12:30", "a:b", or "容量:4" parses as a directive. Only container directives
// carry meaning here (the callouts above); a text or leaf directive is written
// back as the source it came from. Without this they reach remark-rehype
// unhandled and render as an empty <div>, swallowing the text — which is why a
// colon in prose used to need escaping.
function remarkDirectiveFallback() {
  return (tree) => {
    visit(tree, ["textDirective", "leafDirective"], (node, index, parent) => {
      if (!parent || typeof index !== "number") return;
      // A directive an earlier plugin turned into markup is already handled.
      if (node.data?.hName) return;
      const marker = node.type === "textDirective" ? ":" : "::";
      const label = nodeText(node);
      const source = `${marker}${node.name}${label ? `[${label}]` : ""}${directiveAttributes(node)}`;
      parent.children[index] =
        node.type === "leafDirective"
          ? { type: "paragraph", children: [{ type: "text", value: source }] }
          : { type: "text", value: source };
    });
  };
}

function remarkHeadingIds() {
  return (tree) => {
    const seen = new Map();
    visit(tree, "heading", (node) => {
      const id = sectionId(slugifyHeading(nodeText(node), seen));
      node.data = {
        ...node.data,
        hProperties: {
          ...node.data?.hProperties,
          id,
        },
      };
    });
  };
}

function isLocalMarkdownUrl(value) {
  return (
    value.startsWith("#") ||
    value.startsWith("/") ||
    value.startsWith("./") ||
    value.startsWith("../")
  );
}

function hasAllowedMarkdownProtocol(value) {
  try {
    const parsed = new URL(value, "https://popyson.com");
    return (
      parsed.protocol === "http:" || parsed.protocol === "https:" || parsed.protocol === "mailto:"
    );
  } catch {
    return false;
  }
}

function safeMarkdownUrl(url) {
  const value = String(url || "").trim();
  if (!value) return "";
  if (isLocalMarkdownUrl(value)) return value;
  return hasAllowedMarkdownProtocol(value) ? value : "";
}

function replaceChild(parent, index, nodes) {
  if (!parent || typeof index !== "number") return;
  parent.children.splice(index, 1, ...nodes);
}

function rehypeSafeUrls() {
  return (tree) => {
    visit(tree, "element", (node, index, parent) => {
      if (node.tagName === "a") {
        const href = safeMarkdownUrl(node.properties?.href);
        if (!href) {
          replaceChild(parent, index, node.children || []);
          return index;
        }
        node.properties.href = href;
        if (/^https?:\/\//i.test(href)) node.properties.rel = "noreferrer";
      }

      if (node.tagName === "img") {
        const src = safeMarkdownUrl(node.properties?.src);
        if (!src) {
          replaceChild(parent, index, []);
          return index;
        }
        node.properties.src = src;
        node.properties.loading = "lazy";
      }
    });
  };
}

function rehypeCalloutBody() {
  return (tree) => {
    visit(tree, "element", (node) => {
      const className = node.properties?.className;
      if (!Array.isArray(className) || !className.includes("msg")) return;
      node.children = [
        {
          type: "element",
          tagName: "div",
          properties: { className: ["msg-body"] },
          children: node.children || [],
        },
      ];
    });
  };
}

function getLanguage(codeNode) {
  const className = codeNode?.properties?.className || [];
  const classes = Array.isArray(className) ? className : String(className).split(/\s+/);
  const languageClass = classes.find((item) => String(item).startsWith("language-"));
  return languageClass ? String(languageClass).replace(/^language-/, "") : "text";
}

function iconPath(kind) {
  if (kind === "check")
    return [
      { type: "element", tagName: "path", properties: { d: "M5 12l5 5 9-10" }, children: [] },
    ];
  return [
    {
      type: "element",
      tagName: "rect",
      properties: { x: "9", y: "9", width: "11", height: "11", rx: "1.5" },
      children: [],
    },
    {
      type: "element",
      tagName: "path",
      properties: { d: "M5 15V5a1 1 0 0 1 1-1h10" },
      children: [],
    },
  ];
}

function copyIcon(kind = "copy") {
  return {
    type: "element",
    tagName: "svg",
    properties: {
      width: "13",
      height: "13",
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "1.7",
      strokeLinecap: "round",
      strokeLinejoin: "round",
      ariaHidden: "true",
      dataIcon: kind,
    },
    children: iconPath(kind),
  };
}

function findCodeNode(preNode) {
  return preNode.children?.find((child) => child.type === "element" && child.tagName === "code");
}

function codeToolbarNode(preNode, copyLabel) {
  const lang = getLanguage(findCodeNode(preNode));
  return {
    type: "element",
    tagName: "div",
    properties: { className: ["code"], dataCfChange: "ch-code-block" },
    children: [
      {
        type: "element",
        tagName: "div",
        properties: { className: ["code-bar"] },
        children: [
          {
            type: "element",
            tagName: "span",
            properties: { className: ["code-lang"] },
            children: [{ type: "text", value: lang }],
          },
          {
            type: "element",
            tagName: "button",
            properties: {
              className: ["btn", "btn-ghost", "code-copy"],
              type: "button",
              ariaLabel: copyLabel,
              style: "padding: 2px 6px",
            },
            children: [copyIcon("copy")],
          },
        ],
      },
      {
        type: "element",
        tagName: "div",
        properties: { className: ["code-highlight"] },
        children: [preNode],
      },
    ],
  };
}

function transformCodeBlocks(parent, copyLabel) {
  if (!Array.isArray(parent.children)) return;
  for (let index = 0; index < parent.children.length; index += 1) {
    const node = parent.children[index];
    if (node.type !== "element") continue;
    if (node.tagName !== "pre") {
      transformCodeBlocks(node, copyLabel);
      continue;
    }
    parent.children.splice(index, 1, codeToolbarNode(node, copyLabel));
  }
}

function rehypeCodeToolbar(copyLabel) {
  return (tree) => {
    transformCodeBlocks(tree, copyLabel);
  };
}

export function markdownToPlainText(markdown) {
  return (
    String(markdown || "")
      .replace(/```[\s\S]*?```/g, " ")
      .replace(/~~~[\s\S]*?~~~/g, " ")
      // An embed contributes nothing readable: its caption is optional and its
      // URL is machinery, not prose worth matching a search query against.
      .replace(/^::embed(?:\[([^\]]*)\])?.*$/gm, (_, label) =>
        label && !/^https?:\/\//i.test(label) ? ` ${label} ` : " ",
      )
      .replace(/^:::\w+(?:\[([^\]]*)\])?.*$/gm, " $1 ")
      .replace(/^:::\s*$/gm, " ")
      .replace(/<((?:https?:\/\/|mailto:)[^>\s]+)>/gi, " $1 ")
      .replace(/<[^>\n]*>/g, " ")
      .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/[`*_~>#:[\](){}|\\-]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
  );
}

function articleProcessor(copyLabel) {
  if (!articleProcessors.has(copyLabel)) {
    articleProcessors.set(
      copyLabel,
      unified()
        .use(remarkParse)
        .use(remarkGfm)
        .use(remarkDirective)
        .use(remarkCallouts)
        .use(remarkEmbeds)
        .use(remarkLineBlocks)
        .use(remarkDirectiveFallback)
        .use(remarkHeadingIds)
        .use(remarkRehype)
        .use(rehypeSafeUrls)
        .use(rehypeCalloutBody)
        .use(rehypeCodeToolbar, copyLabel)
        .use(rehypeShiki, {
          themes: {
            light: "github-light",
            dark: "github-dark",
          },
          defaultColor: false,
        })
        .use(rehypeStringify),
    );
  }
  return articleProcessors.get(copyLabel);
}

export async function renderArticleHtml(markdown, { copyLabel = "Copy code" } = {}) {
  const file = await articleProcessor(copyLabel).process(String(markdown || ""));
  return String(file);
}

export async function renderArticleBody(markdown, options) {
  return {
    html: await renderArticleHtml(markdown, options),
    text: markdownToPlainText(markdown).toLowerCase(),
  };
}
