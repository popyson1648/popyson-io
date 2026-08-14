function lineBounds(value, start, end) {
  const lineStart = value.lastIndexOf("\n", Math.max(0, start - 1)) + 1;
  const afterEnd = value.indexOf("\n", end);
  return { start: lineStart, end: afterEnd === -1 ? value.length : afterEnd };
}

export function wrapSelection(value, start, end, before, after = before, fallback = "テキスト") {
  const selected = value.slice(start, end) || fallback;
  const insertion = `${before}${selected}${after}`;
  return {
    value: `${value.slice(0, start)}${insertion}${value.slice(end)}`,
    selectionStart: start + before.length,
    selectionEnd: start + before.length + selected.length,
  };
}

export function toggleSelection(value, start, end, before, after = before, fallback = "テキスト") {
  const selected = value.slice(start, end);
  if (selected.startsWith(before) && selected.endsWith(after)) {
    const inner = selected.slice(before.length, selected.length - after.length);
    return {
      value: `${value.slice(0, start)}${inner}${value.slice(end)}`,
      selectionStart: start,
      selectionEnd: start + inner.length,
    };
  }
  if (
    start >= before.length &&
    value.slice(start - before.length, start) === before &&
    value.slice(end, end + after.length) === after
  ) {
    return {
      value: `${value.slice(0, start - before.length)}${selected}${value.slice(end + after.length)}`,
      selectionStart: start - before.length,
      selectionEnd: end - before.length,
    };
  }
  return wrapSelection(value, start, end, before, after, fallback);
}

export function prefixLines(value, start, end, prefix) {
  const bounds = lineBounds(value, start, end);
  const selected = value.slice(bounds.start, bounds.end);
  const insertion = selected
    .split("\n")
    .map((line) => `${prefix}${line}`)
    .join("\n");
  return {
    value: `${value.slice(0, bounds.start)}${insertion}${value.slice(bounds.end)}`,
    selectionStart: bounds.start,
    selectionEnd: bounds.start + insertion.length,
  };
}

function transformLines(value, start, end, targetPrefix, matcher) {
  const bounds = lineBounds(value, start, end);
  const lines = value.slice(bounds.start, bounds.end).split("\n");
  const prefixes = lines.map((line) => matcher.exec(line)?.[0] || "");
  const remove = prefixes.every((prefix) => prefix === targetPrefix);
  const transformed = lines.map((line, index) => {
    const plain = prefixes[index] ? line.slice(prefixes[index].length) : line;
    return `${remove ? "" : targetPrefix}${plain}`;
  });
  const insertion = transformed.join("\n");
  return {
    value: `${value.slice(0, bounds.start)}${insertion}${value.slice(bounds.end)}`,
    selectionStart: bounds.start,
    selectionEnd: bounds.start + insertion.length,
  };
}

function toggleLinePrefix(value, start, end, prefix) {
  const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return transformLines(value, start, end, prefix, new RegExp(`^${escaped}`));
}

function toggleHeading(value, start, end, prefix) {
  return transformLines(value, start, end, prefix, /^#{2,6} /);
}

function toggleList(value, start, end, prefix) {
  return transformLines(value, start, end, prefix, /^(?:- \[[ xX]\] |- |\d+\. )/);
}

function linkAroundSelection(value, start, end) {
  const before = value.slice(0, start);
  const after = value.slice(end);
  const open = before.endsWith("[");
  const match = /^\]\(([^)]+)\)/.exec(after);
  if (!open || !match) return null;
  return { from: start - 1, to: end + match[0].length, url: match[1] };
}

function toggleLink(value, start, end) {
  const selected = value.slice(start, end);
  const whole = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(selected);
  if (whole) {
    return {
      value: `${value.slice(0, start)}${whole[1]}${value.slice(end)}`,
      selectionStart: start,
      selectionEnd: start + whole[1].length,
    };
  }
  const around = linkAroundSelection(value, start, end);
  if (around) {
    return {
      value: `${value.slice(0, around.from)}${selected}${value.slice(around.to)}`,
      selectionStart: around.from,
      selectionEnd: around.from + selected.length,
    };
  }
  const label = selected || "リンク";
  const insertion = `[${label}](https://)`;
  const urlStart = start + label.length + 3;
  return {
    value: `${value.slice(0, start)}${insertion}${value.slice(end)}`,
    selectionStart: urlStart,
    selectionEnd: urlStart + "https://".length,
  };
}

export function linkSelection(value, start, end, url) {
  const label = value.slice(start, end);
  if (!label || !/^https?:\/\/\S+$/i.test(String(url || ""))) return null;
  const insertion = `[${label}](${url})`;
  return {
    value: `${value.slice(0, start)}${insertion}${value.slice(end)}`,
    selectionStart: start + 1,
    selectionEnd: start + 1 + label.length,
  };
}

export function insertBlock(value, start, end, template, selectText = "") {
  const leading = start > 0 && value[start - 1] !== "\n" ? "\n\n" : "";
  const trailing = end < value.length && value[end] !== "\n" ? "\n\n" : "\n";
  const insertion = `${leading}${template}${trailing}`;
  const selectionIndex = selectText ? insertion.indexOf(selectText) : insertion.length;
  return {
    value: `${value.slice(0, start)}${insertion}${value.slice(end)}`,
    selectionStart: start + Math.max(0, selectionIndex),
    selectionEnd: start + Math.max(0, selectionIndex) + selectText.length,
  };
}

export function markdownEdit(command, value, start, end) {
  switch (command) {
    case "bold":
      return toggleSelection(value, start, end, "**");
    case "italic":
      return toggleSelection(value, start, end, "_");
    case "strike":
      return toggleSelection(value, start, end, "~~");
    case "inline-code":
      return toggleSelection(value, start, end, "`", "`", "code");
    case "link":
      return toggleLink(value, start, end);
    case "h2":
      return toggleHeading(value, start, end, "## ");
    case "h3":
      return toggleHeading(value, start, end, "### ");
    case "quote":
      return toggleLinePrefix(value, start, end, "> ");
    case "list":
      return toggleList(value, start, end, "- ");
    case "task":
      return toggleList(value, start, end, "- [ ] ");
    case "code":
      return insertBlock(value, start, end, "```text\nコード\n```", "コード");
    case "table":
      return insertBlock(value, start, end, "| 列1 | 列2 |\n| --- | --- |\n| 値1 | 値2 |");
    case "callout":
      return insertBlock(value, start, end, ":::note[補足]\n内容\n:::", "内容");
    case "embed":
      // The URL is selected so pasting over it is the whole interaction:
      // YouTube, Docswell, and the rest are told apart at render time.
      return insertBlock(value, start, end, '::embed{url="https://"}', "https://");
    default:
      return { value, selectionStart: start, selectionEnd: end };
  }
}

export function insertImageMarkdown(value, start, end, url, alt = "画像") {
  const edit = insertBlock(value, start, end, `![${alt}](${url})`);
  const markerStart = edit.value.lastIndexOf(`![${alt}](${url})`, edit.selectionStart);
  return {
    ...edit,
    selectionStart: markerStart + 2,
    selectionEnd: markerStart + 2 + alt.length,
  };
}

export function markdownCommandState(command, value, start, end) {
  const selected = value.slice(start, end);
  const wrappers = {
    bold: ["**", "**"],
    italic: ["_", "_"],
    strike: ["~~", "~~"],
    "inline-code": ["`", "`"],
  };
  if (wrappers[command]) {
    const [before, after] = wrappers[command];
    return (
      (selected.startsWith(before) && selected.endsWith(after)) ||
      (start >= before.length &&
        value.slice(start - before.length, start) === before &&
        value.slice(end, end + after.length) === after)
    );
  }
  if (command === "link")
    return /^\[[^\]]+\]\([^)]+\)$/.test(selected) || !!linkAroundSelection(value, start, end);
  const bounds = lineBounds(value, start, end);
  const lines = value.slice(bounds.start, bounds.end).split("\n");
  const prefixes = { h2: "## ", h3: "### ", quote: "> ", list: "- ", task: "- [ ] " };
  return prefixes[command] ? lines.every((line) => line.startsWith(prefixes[command])) : false;
}

export function writingMetrics(markdown) {
  const value = String(markdown || "");
  const lines = value ? value.split("\n").length : 0;
  const cjk = value.match(/[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/gu)?.length || 0;
  const words = value
    .replace(/[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/gu, " ")
    .split(/\s+/)
    .filter(Boolean).length;
  return {
    characters: value.length,
    lines,
    minutes: Math.max(1, Math.ceil(cjk / 600 + words / 250)),
  };
}
