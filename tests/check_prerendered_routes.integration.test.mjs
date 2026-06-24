/* ============================================================
   Smoke test: every prerendered route bakes its primary body into `#root`.

   Runs after `npm run build`. Reads the generated per-route index.html files
   and asserts that each route/locale carries the expected main content, so a
   regression that empties a route's root (crawler / no-JS visibility) fails
   the build. Article bodies are covered by check_markdown_rendering; this
   focuses on the React-rendered routes added for issue #32.
   ============================================================ */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";

import { APPS } from "../src/apps.js";
import { allRoutes, configureMetaData } from "../src/meta.js";
import { loadSiteContent } from "../scripts/content_loader.mjs";

const DIST = join(dirname(fileURLToPath(import.meta.url)), "..", "dist");

const content = loadSiteContent();
configureMetaData(content);

const PERSON = content.PERSON;
const firstApp = APPS[0];

function read(dir) {
  const file = join(dir ? join(DIST, dir) : DIST, "index.html");
  expect(existsSync(file), `missing prerendered file for "${dir || "/"}"`).toBe(true);
  return readFileSync(file, "utf8");
}

// Per route, a class marker proving the component rendered plus a concrete piece
// of real content proving the data made it into the static HTML.
function expectationsFor(route, lang) {
  switch (route.name) {
    case "about":
      return ['class="about-top"', PERSON.name[lang]];
    case "blog":
      return ['class="post-index"', "post-index-title"];
    case "app":
      return ['class="app-grid"', firstApp.title];
    case "appDetail": {
      const app = APPS.find((a) => a.id === route.id);
      expect(app, `missing app metadata for route id ${route.id}`).toBeTruthy();
      return ['class="adetail"', `<h1>${app.title}</h1>`];
    }
    case "reading":
      return ['class="reading-list"', 'class="seg-filter"'];
    case "rss":
      return ['class="rss-wrap"', "https://popyson.com/feed.xml"];
    default:
      return null; // article routes are validated elsewhere
  }
}

const cases = allRoutes()
  .map(({ dir, route, lang }) => ({ dir, route, lang, expectations: expectationsFor(route, lang) }))
  .filter((entry) => entry.expectations);

describe("prerendered routes", () => {
  test("APPS metadata is a non-empty array", () => {
    expect(Array.isArray(APPS)).toBe(true);
    expect(APPS.length).toBeGreaterThan(0);
  });

  test("has non-article routes to validate", () => {
    expect(cases.length).toBeGreaterThan(0);
  });

  test.each(cases)("$dir ($route.name, $lang) bakes its primary body into #root", ({ dir, expectations }) => {
    const html = read(dir);
    for (const needle of expectations) {
      expect(html).toContain(needle);
    }
  });
});
