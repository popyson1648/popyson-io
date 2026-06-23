import assert from "node:assert/strict";
import { parse as parseToml } from "smol-toml";
import { validateMetadata } from "./metadataSchema.mjs";

function errorsFor(toml) {
  return validateMetadata(parseToml(toml)).map((error) => error.field);
}

const validCases = [
  `
title = "Post"
date = "2026-02-07"
tags = ["js"]
auto_tags = { count = 3 }
reading = 1
kana = ""

[sumup]
mode = "text"
text = "Summary"
generated = true

[thumbnail]
mode = "file"
path = "/image.png"
generated = true
`,
  `
title = "Post"
date = "auto"
tags = []
auto_tags = {}

[sumup]
mode = "auto"

[thumbnail]
mode = "none"
`,
  `
title = "Post"
date = "auto"
tags = []
auto_tags = {}

[sumup]
mode = "auto"

[thumbnail]
mode = "auto"
concept = "a labeled keycap"
`,
  `
title = "Post"
date = 2026-02-07
`,
];

for (const validCase of validCases) {
  assert.deepEqual(validateMetadata(parseToml(validCase)), []);
}

const invalidCases = [
  [`date = "2026-02-07"`, "title"],
  [`title = ""\ndate = "2026-02-07"`, "title"],
  [`title = "Post"`, "date"],
  [`title = "Post"\ndate = "soon"`, "date"],
  [`title = "Post"\ndate = "2026-02-07"\ntags = "js, react"`, "tags"],
  [`title = "Post"\ndate = "2026-02-07"\ntags = ["js", 1]`, "tags"],
  [`title = "Post"\ndate = "2026-02-07"\nauto_tags = { count = 0 }`, "auto_tags.count"],
  [`title = "Post"\ndate = "2026-02-07"\n[sumup]\nmode = "brief"`, "sumup.mode"],
  [`title = "Post"\ndate = "2026-02-07"\n[sumup]\nmode = "text"`, "sumup.text"],
  [`title = "Post"\ndate = "2026-02-07"\n[sumup]\nmode = "text"\ntext = "x"\ngenerated = "yes"`, "sumup.generated"],
  [`title = "Post"\ndate = "2026-02-07"\n[thumbnail]\nmode = "remote"`, "thumbnail.mode"],
  [`title = "Post"\ndate = "2026-02-07"\n[thumbnail]\nmode = "auto"\nconcept = 5`, "thumbnail.concept"],
  [`title = "Post"\ndate = "2026-02-07"\n[thumbnail]\nmode = "file"`, "thumbnail.path"],
  [`title = "Post"\ndate = "2026-02-07"\n[thumbnail]\nmode = "file"\npath = "/x.png"\ngenerated = "yes"`, "thumbnail.generated"],
  [`title = "Post"\ndate = "2026-02-07"\nsummary = "legacy"`, "summary"],
];

for (const [toml, expectedField] of invalidCases) {
  assert.ok(errorsFor(toml).includes(expectedField), `expected ${expectedField} error for:\n${toml}`);
}

console.log("metadata schema checks passed");
