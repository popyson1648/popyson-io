import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

const css = readFileSync(join(process.cwd(), "src/editor/editor.css"), "utf8");

function blockBody(source, marker) {
  const start = source.indexOf(marker);
  expect(start, `missing CSS block: ${marker}`).toBeGreaterThanOrEqual(0);
  const open = source.indexOf("{", start);
  let depth = 0;
  for (let index = open; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    if (source[index] === "}") depth -= 1;
    if (depth === 0) return source.slice(open + 1, index);
  }
  throw new Error(`unclosed CSS block: ${marker}`);
}

function ruleBody(source, selector) {
  return blockBody(source, selector);
}

describe("editor control alignment", () => {
  test("centers SmartHR button content on both axes", () => {
    const button = ruleBody(css, ".editor-app .smarthr-ui-Button:not(.editor-content-item)");
    const content = ruleBody(css, ".editor-app .smarthr-ui-Button > .smarthr-ui-Button-body,");
    expect(button).toMatch(/align-items:\s*center/);
    expect(button).toMatch(/justify-content:\s*center/);
    expect(button).toMatch(/text-align:\s*center/);
    expect(content).toMatch(/display:\s*inline-flex/);
    expect(content).toMatch(/align-items:\s*center/);
    expect(content).toMatch(/justify-content:\s*center/);
    expect(content).toMatch(/line-height:\s*1\s*!important/);
  });

  test("uses the same center line for icons, status labels, and compact commands", () => {
    const icons = ruleBody(css, ".editor-app .smarthr-ui-Button .smarthr-ui-Icon {");
    const status = ruleBody(css, ".editor-app .smarthr-ui-StatusLabel");
    const compact = ruleBody(css, ".editor-command-label");
    expect(icons).toMatch(/transform:\s*none\s*!important/);
    expect(status).toMatch(/align-items:\s*center/);
    expect(status).toMatch(/justify-content:\s*center/);
    expect(status).toMatch(/line-height:\s*1\s*!important/);
    expect(compact).toMatch(/display:\s*inline-flex/);
    expect(compact).toMatch(/align-items:\s*center/);
    expect(compact).toMatch(/justify-content:\s*center/);
    expect(compact).toMatch(/line-height:\s*1/);
  });
});

describe("editor mobile toolbar", () => {
  const mobile = blockBody(css, "@media (max-width: 900px)");

  test("wraps controls into a shared compact toolbar without scrolling", () => {
    const toolbar = ruleBody(mobile, ".editor-toolbar");
    expect(toolbar).toMatch(/display:\s*flex/);
    expect(toolbar).toMatch(/flex-wrap:\s*wrap/);
    expect(toolbar).toMatch(/gap:\s*3px/);
    expect(toolbar).toMatch(/padding:\s*4px 6px/);
    expect(toolbar).not.toMatch(/overflow-x:\s*(auto|scroll)/);
  });

  test("keeps groups dense and uses 32px visual controls", () => {
    const groups = ruleBody(mobile, ".editor-toolbar-group,");
    const actions = ruleBody(mobile, ".editor-toolbar-actions");
    const buttons = ruleBody(mobile, ".editor-toolbar-actions button");
    expect(groups).toMatch(/display:\s*flex/);
    expect(groups).toMatch(/flex:\s*0 0 auto/);
    expect(actions).toMatch(/gap:\s*2px/);
    expect(buttons).toMatch(/width:\s*32px/);
    expect(buttons).toMatch(/height:\s*32px/);
    expect(buttons).toMatch(/padding:\s*0/);
  });

  test("keeps group names available to assistive technology but visually hidden", () => {
    const label = ruleBody(css, ".editor-toolbar-group-label");
    expect(label).toMatch(/position:\s*absolute/);
    expect(label).toMatch(/clip-path:\s*inset\(50%\)/);
    expect(mobile).not.toMatch(/\.editor-toolbar-group-label\s*\{/);
  });
});

describe("editor responsive document header", () => {
  test("uses an explicit full-width grid track on tablet layouts", () => {
    const tablet = blockBody(css, "@media (max-width: 1180px)");
    const header = ruleBody(tablet, ".editor-document-head");
    expect(header).toMatch(/display:\s*grid/);
    expect(header).toMatch(/grid-template-columns:\s*minmax\(0,\s*1fr\)/);
  });
});
