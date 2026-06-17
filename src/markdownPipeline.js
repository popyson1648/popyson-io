import remarkDirective from "remark-directive";
import remarkGfm from "remark-gfm";
import { visit } from "unist-util-visit";

export const CALLOUT_TYPES = new Set(["note", "tip", "info", "warning", "danger"]);

export function remarkCallouts() {
  return (tree) => {
    visit(tree, "containerDirective", (node) => {
      if (!CALLOUT_TYPES.has(node.name)) return;
      let title = node.attributes?.title || "";
      if (!title && node.children?.[0]?.data?.directiveLabel) {
        title = nodeText(node.children[0]);
        node.children = node.children.slice(1);
      }
      node.data = {
        ...node.data,
        hName: "callout",
        hProperties: {
          type: node.name,
          title,
        },
      };
    });
  };
}

export function remarkHeadingIds() {
  return (tree) => {
    const seen = new Map();
    visit(tree, "heading", (node) => {
      if (node.depth !== 2) return;
      const id = slugifyHeading(nodeText(node), seen);
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

function nodeText(node) {
  if (!node) return "";
  if (typeof node.value === "string") return node.value;
  if (!Array.isArray(node.children)) return "";
  return node.children.map(nodeText).join("");
}

function slugifyHeading(value, seen) {
  const base = String(value)
    .trim()
    .toLowerCase()
    .replace(/[`*_~:[\](){}]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "") || "section";
  const count = seen.get(base) || 0;
  seen.set(base, count + 1);
  return count ? `${base}-${count + 1}` : base;
}

export const markdownRemarkPlugins = [remarkGfm, remarkDirective, remarkCallouts, remarkHeadingIds];

export function safeMarkdownUrl(url) {
  const value = String(url || "").trim();
  if (!value) return "";
  if (
    value.startsWith("#") ||
    value.startsWith("/") ||
    value.startsWith("./") ||
    value.startsWith("../")
  ) {
    return value;
  }

  try {
    const parsed = new URL(value, "https://popyson.com");
    if (parsed.protocol === "http:" || parsed.protocol === "https:" || parsed.protocol === "mailto:") {
      return value;
    }
  } catch {
    return "";
  }

  return "";
}

export function markdownToPlainText(markdown) {
  return String(markdown || "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/~~~[\s\S]*?~~~/g, " ")
    .replace(/<[^>\n]*>/g, " ")
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[`*_~>#:[\](){}|\\-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
