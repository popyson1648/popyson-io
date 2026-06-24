/* ============================================================
   Smoke test: every prerendered route bakes its primary body into `#root`.

   Runs after `npm run build`. Reads the generated per-route index.html files
   and asserts that each route/locale carries the expected main content, so a
   regression that empties a route's root (crawler / no-JS visibility) fails
   the build. Article bodies are covered by check_markdown_rendering.mjs; this
   focuses on the React-rendered routes added for issue #32.
   ============================================================ */
import assert from "node:assert/strict";
import { test } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

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
  assert.ok(existsSync(file), `missing prerendered file for "${dir || "/"}"`);
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
      assert.ok(app, `missing app metadata for route id ${route.id}`);
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

test("prerenderedRoutes_bakePrimaryBodyIntoRootForEveryRoute", () => {
  assert.ok(Array.isArray(APPS) && APPS.length > 0, "expected APPS to be a non-empty array");

  let checked = 0;
  for (const { dir, route, lang } of allRoutes()) {
    const expectations = expectationsFor(route, lang);
    if (!expectations) continue;
    const html = read(dir);
    for (const needle of expectations) {
      assert.ok(
        html.includes(needle),
        `prerendered "${dir || "/"}" (${route.name}, ${lang}) is missing: ${needle}`,
      );
    }
    checked += 1;
  }

  assert.ok(checked > 0, "expected at least one non-article route to validate");
});
