import rehypeShiki from "@shikijs/rehype";
import rehypeStringify from "rehype-stringify";
import remarkDirective from "remark-directive";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";
import { visit } from "unist-util-visit";

import { sectionId, slugifyHeading } from "../src/headingSlug.js";

const CALLOUT_TYPES = new Set(["note", "tip", "info", "warning", "danger"]);
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

function directiveAttributes(node) {
  const entries = Object.entries(node.attributes || {}).filter(([, value]) => value != null);
  if (entries.length === 0) return "";
  const pairs = entries.map(([key, value]) => (value === "" ? key : `${key}="${value}"`));
  return `{${pairs.join(" ")}}`;
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
      if (node.depth !== 2) return;
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
  return String(markdown || "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/~~~[\s\S]*?~~~/g, " ")
    .replace(/^:::\w+(?:\[([^\]]*)\])?.*$/gm, " $1 ")
    .replace(/^:::\s*$/gm, " ")
    .replace(/<((?:https?:\/\/|mailto:)[^>\s]+)>/gi, " $1 ")
    .replace(/<[^>\n]*>/g, " ")
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[`*_~>#:[\](){}|\\-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
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
