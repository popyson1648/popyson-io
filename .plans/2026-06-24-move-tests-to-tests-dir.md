# Plan

## Goal

Move verification/test scripts out of `scripts/` into a dedicated top-level
`tests/` directory so `scripts/` holds only production automation.

## Scope

- Relocate all `check_*.mjs`, `check_*.py`, and `fixtures/` from `scripts/` to
  `tests/`.
- Update sibling-module imports in the moved files to `../scripts/`.
- Update current-state config and docs to the new paths.
- Record the structural decision in `.decisions/`.

## Non-goals

- Moving production automation (`generate_metadata.mjs`, `prerender.mjs`,
  `build_pagefind.mjs`, `content_loader.mjs`, `verify.py`, etc.).
- Adopting a test framework or changing test logic.
- Rewriting historical `.plans/` and `.decisions/` entries that mention the old
  `scripts/check_*` paths (they are point-in-time records).

## Assumptions

- `tests/` lives at repo root, same depth as `scripts/`, so `..`-relative path
  resolution (`dist`, `import.meta.url` roots) and `../src/` imports are
  unaffected.
- `pre-commit` and CI delegate to `scripts/verify.py`, so only
  `verification.toml` needs command-path edits.

## Steps

1. `git mv` the eleven `check_*` files and `fixtures/` from `scripts/` to
   `tests/`.
2. Rewrite sibling imports `./<module>.mjs` -> `../scripts/<module>.mjs`
   (`generate_metadata`, `content_loader`, `frontmatter`, `metadataConfig`,
   `metadataSchema`, `articleHtml`); leave `../src/*` and `./fixtures/*`.
3. Update `.project/verification.toml` frontmatter, metadata_quality,
   test_unit, and accessibility commands to `tests/` paths.
4. Update `.project/structure.md` (add `tests/` top-level entry, repoint
   `check_*` descriptions), `.project/metadata.md`, `.project/testing.md`, and
   the `.claude/settings.local.json` permission entry.
5. Add `.decisions/tests-directory-separation.md`.

## Verification

- `python3 scripts/verify.py` — all phases pass (lint, actionlint, frontmatter,
  metadata_generate_check, metadata_quality, typecheck, build, test_unit,
  accessibility, performance).

## Open Issues

- None.
