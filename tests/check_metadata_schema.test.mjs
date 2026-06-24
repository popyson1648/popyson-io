import { parse as parseToml } from "smol-toml";
import { describe, expect, test } from "vitest";
import { validateMetadata } from "../scripts/metadataSchema.mjs";

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

const invalidCases = [
  { field: "title", toml: `date = "2026-02-07"` },
  { field: "title", toml: `title = ""\ndate = "2026-02-07"` },
  { field: "date", toml: `title = "Post"` },
  { field: "date", toml: `title = "Post"\ndate = "soon"` },
  { field: "tags", toml: `title = "Post"\ndate = "2026-02-07"\ntags = "js, react"` },
  { field: "tags", toml: `title = "Post"\ndate = "2026-02-07"\ntags = ["js", 1]` },
  { field: "auto_tags.count", toml: `title = "Post"\ndate = "2026-02-07"\nauto_tags = { count = 0 }` },
  { field: "sumup.mode", toml: `title = "Post"\ndate = "2026-02-07"\n[sumup]\nmode = "brief"` },
  { field: "sumup.text", toml: `title = "Post"\ndate = "2026-02-07"\n[sumup]\nmode = "text"` },
  { field: "sumup.generated", toml: `title = "Post"\ndate = "2026-02-07"\n[sumup]\nmode = "text"\ntext = "x"\ngenerated = "yes"` },
  { field: "thumbnail.mode", toml: `title = "Post"\ndate = "2026-02-07"\n[thumbnail]\nmode = "remote"` },
  { field: "thumbnail.concept", toml: `title = "Post"\ndate = "2026-02-07"\n[thumbnail]\nmode = "auto"\nconcept = 5` },
  { field: "thumbnail.path", toml: `title = "Post"\ndate = "2026-02-07"\n[thumbnail]\nmode = "file"` },
  { field: "thumbnail.generated", toml: `title = "Post"\ndate = "2026-02-07"\n[thumbnail]\nmode = "file"\npath = "/x.png"\ngenerated = "yes"` },
  { field: "summary", toml: `title = "Post"\ndate = "2026-02-07"\nsummary = "legacy"` },
];

describe("validateMetadata", () => {
  test.each(validCases)("accepts valid metadata case %#", (toml) => {
    expect(validateMetadata(parseToml(toml))).toEqual([]);
  });

  test.each(invalidCases)("reports a $field error", ({ toml, field }) => {
    expect(errorsFor(toml)).toContain(field);
  });
});
