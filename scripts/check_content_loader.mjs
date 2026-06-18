import assert from "node:assert/strict";
import { relatedPostIds } from "./content_loader.mjs";

const posts = [
  { id: "newest-two-tags", date: "2026-05-04", tags: ["react", "perf"] },
  { id: "target", date: "2026-05-03", tags: ["react", "build"] },
  { id: "older-two-tags", date: "2026-05-02", tags: ["react", "build"] },
  { id: "newer-one-tag", date: "2026-05-01", tags: ["build"] },
  { id: "no-shared-tags", date: "2026-04-30", tags: ["ops"] },
];

assert.deepEqual(
  relatedPostIds(posts[1], posts),
  ["older-two-tags", "newest-two-tags", "newer-one-tag"],
  "related posts keep shared-tag score first, then newer date",
);

assert.deepEqual(
  relatedPostIds({ id: "only", date: "2026-01-01", tags: ["solo"] }, [
    { id: "only", date: "2026-01-01", tags: ["solo"] },
  ]),
  [],
  "single-post content has no related IDs",
);

assert.deepEqual(
  relatedPostIds({ id: "missing", date: "2026-01-01", tags: [] }, []),
  [],
  "empty post collections do not fail",
);

assert.deepEqual(
  relatedPostIds({ id: "target" }, [
    null,
    { id: "draft-without-tags" },
    { id: "draft-without-date", tags: ["build"] },
  ]),
  ["draft-without-tags", "draft-without-date"],
  "partial draft-like post objects do not fail",
);

assert.deepEqual(
  relatedPostIds(null, posts),
  [],
  "missing current post does not fail",
);

assert.deepEqual(
  relatedPostIds(posts[1], null),
  [],
  "missing post collection does not fail",
);

console.log("content loader checks passed");
