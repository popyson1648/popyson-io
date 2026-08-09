import { describe, expect, test } from "vitest";

import {
  insertImageMarkdown,
  markdownEdit,
  writingMetrics,
} from "../src/editor/markdownEditing.js";

describe("editor Markdown commands", () => {
  test("wraps the selected text in bold markers", () => {
    expect(markdownEdit("bold", "abc", 1, 2)).toEqual({
      value: "a**b**c",
      selectionStart: 3,
      selectionEnd: 4,
    });
  });

  test("removes bold markers when the preserved inner selection is formatted again", () => {
    expect(markdownEdit("bold", "a**b**c", 3, 4)).toEqual({
      value: "abc",
      selectionStart: 1,
      selectionEnd: 2,
    });
  });

  test("removes bold markers when the selection includes them", () => {
    expect(markdownEdit("bold", "**text**", 0, 8)).toEqual({
      value: "text",
      selectionStart: 0,
      selectionEnd: 4,
    });
  });

  test("transforms heading levels and removes the active heading", () => {
    expect(markdownEdit("h2", "### Heading", 0, 11).value).toBe("## Heading");
    expect(markdownEdit("h2", "## Heading", 0, 10).value).toBe("Heading");
  });

  test("toggles task prefixes without accumulating them", () => {
    expect(markdownEdit("task", "- [ ] one", 0, 9).value).toBe("one");
  });

  test("selects the URL placeholder when creating a link and unlinks on repeat", () => {
    const linked = markdownEdit("link", "text", 0, 4);
    expect(linked).toEqual({
      value: "[text](https://)",
      selectionStart: 7,
      selectionEnd: 15,
    });
    expect(markdownEdit("link", linked.value, 1, 5).value).toBe("text");
  });

  test("prefixes every selected line as a task", () => {
    expect(markdownEdit("task", "one\ntwo", 0, 7).value).toBe("- [ ] one\n- [ ] two");
  });

  test("inserts the stable uploaded image URL as Markdown", () => {
    expect(
      insertImageMarkdown("before\n", 7, 7, "/content-assets/posts/id/diagram.png", "diagram")
        .value,
    ).toBe("before\n![diagram](/content-assets/posts/id/diagram.png)\n");
  });

  test("reports writing metrics for mixed text", () => {
    expect(writingMetrics("日本語 text\nnext")).toEqual({
      characters: 13,
      lines: 2,
      minutes: 1,
    });
  });
});
