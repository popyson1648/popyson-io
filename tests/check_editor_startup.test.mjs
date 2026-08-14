/* The editor has to start while the author's work is unfinished.
 *
 * `npm run editor` pulls its own snapshot and builds the site around the item
 * being edited, and the site loader rejects anything half-written. So the two
 * halves have to be checked together: what the pull selects, and whether the
 * result loads. Checking either alone is what let a half-written News entry
 * stop the editor from starting at all.
 *
 * The author API is stubbed rather than called: these run in CI, which holds no
 * author credentials. What they cover is the selection and the loading, which is
 * where the failure was.
 */
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, test } from "vitest";

import { loadSiteContent } from "../scripts/content_loader.mjs";
import { pullContentSnapshot } from "../scripts/pull_content_snapshot.mjs";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const FIXTURE = join(ROOT, "tests/fixtures/content/src/content");
const temporaryRoots = [];

function temporaryRoot() {
  const root = mkdtempSync(join(tmpdir(), "popyson-editor-startup-"));
  temporaryRoots.push(root);
  return root;
}

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

function fixture(relative) {
  return readFileSync(join(FIXTURE, relative), "utf8");
}

function aboutSource(locale, { unfinished = false } = {}) {
  const news = fixture(`about/news.${locale}.toml`);
  // What "Newsを追加" leaves behind until both locales are written: a row with
  // no date, which the site loader refuses to read.
  const pending = '\n[[news]]\ndate = ""\ntitle = ""\ndescription = ""\nhref = ""\n';
  return JSON.stringify({
    about: fixture(`about/about.${locale}.toml`),
    news: unfinished ? `${news}${pending}` : news,
  });
}

/**
 * An author API holding one published state and one later, unfinished save —
 * the state an author is in for as long as it takes to write the other locale.
 */
function authorApi() {
  const items = [
    {
      kind: "about",
      id: "about",
      visibility: "public",
      deletedAt: null,
      currentRevisionId: "about-saved",
      publishedRevisionId: "about-published",
    },
    {
      kind: "post",
      id: "20260101-aaaa1111",
      visibility: "public",
      deletedAt: null,
      currentRevisionId: "post-saved",
      publishedRevisionId: "post-published",
    },
    {
      kind: "work",
      id: "samplework",
      visibility: "public",
      deletedAt: null,
      currentRevisionId: "work-saved",
      publishedRevisionId: "work-published",
    },
    {
      kind: "post",
      id: "20260101-bbbb2222",
      visibility: "public",
      deletedAt: null,
      currentRevisionId: "never-published",
      publishedRevisionId: null,
    },
  ];

  function sources(kind, id, { unfinished }) {
    if (kind === "about") {
      return {
        sourceJa: aboutSource("ja", { unfinished }),
        sourceEn: aboutSource("en", { unfinished }),
      };
    }
    const directory = kind === "post" ? `posts/20260101-aaaa1111` : `works/${id}`;
    return {
      sourceJa: fixture(`${directory}/index.ja.md`),
      sourceEn: fixture(`${directory}/index.en.md`),
    };
  }

  return {
    list: async () => ({ items }),
    read: async (kind, id) => ({
      kind,
      id,
      revision: { id: `${kind}-saved`, ...sources(kind, id, { unfinished: true }) },
      assets: [],
    }),
    readRevision: async (kind, id, revisionId) => ({
      item: { kind, id },
      revision: { id: revisionId, ...sources(kind, id, { unfinished: false }) },
      assets: [],
    }),
    downloadAsset: async () => Buffer.alloc(0),
  };
}

describe("editor startup snapshot", () => {
  test("builds from published revisions, so an unfinished save cannot stop it", async () => {
    const root = temporaryRoot();

    await pullContentSnapshot({ root, client: authorApi(), published: true });
    const content = loadSiteContent({ snapshotRoot: root });

    expect(content.NEWS.ja).toHaveLength(2);
    expect(content.NEWS.ja.map((entry) => entry.date)).toEqual(["2026-01-02", "2026-01-01"]);
    expect(content.NEWS.en).toHaveLength(content.NEWS.ja.length);
    expect(content.POSTS.map((post) => post.id)).toEqual(["20260101-aaaa1111"]);
  });

  // The negative control: without it the test above passes for the wrong
  // reason, because it cannot tell a fixed pull from a harmless fixture.
  test("the same content at its current revisions is what used to fail", async () => {
    const root = temporaryRoot();

    await pullContentSnapshot({ root, client: authorApi() });

    expect(() => loadSiteContent({ snapshotRoot: root })).toThrow(
      /news entry "" needs a YYYY-MM-DD date/,
    );
  });
});
