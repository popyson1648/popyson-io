# Decision

## Title

Separate verification/test scripts into a top-level `tests/` directory

## Date

2026-06-24

## Status

Accepted

## Decision

Move every verification and unit/smoke check (`check_*.mjs`, `check_*.py`) and
their shared `fixtures/` out of `scripts/` and into a new top-level `tests/`
directory. `scripts/` keeps only production automation (metadata generation,
build steps, content loader, the verification runner `scripts/verify.py`, and
the Lighthouse helper). The moved tests import the modules they exercise from
`../scripts/`.

## Context

`scripts/` had grown to mix two unrelated concerns: automation that produces
site artifacts (generation, build, prerender, content loading) and checks that
verify behavior. The `check_*` files are tests, not automation, and they no
longer belong next to the scripts they validate. `tests/` sits at the same depth
as `scripts/`, so `..`-relative self-location logic (`dist` resolution,
`import.meta.url` roots) and `../src/` imports stay correct; only the
sibling-module imports needed rewriting to `../scripts/`.

## Alternatives

- `scripts/tests/`: keeps everything under `scripts/` but forces every
  `../src/` import to `../../src/` and is less discoverable.
- Leave the files in `scripts/`: rejected; it perpetuates the mixed-concern
  layout the move is meant to fix.

## Reason

A dedicated top-level `tests/` gives a clear separation (generate vs. verify),
is discoverable and documentable as a top-level directory, and minimizes import
churn because it shares `scripts/`'s depth.

## Consequences

- `.project/verification.toml` invokes the checks by `tests/` path.
- `pre-commit` and CI are unaffected: both delegate to `scripts/verify.py`,
  which reads `verification.toml`.
- `scripts/verify.py` must remain at `scripts/verify.py` (required by
  AGENTS.md).
- New tests go under `tests/`, importing the code under test from `../scripts/`
  or `../src/`.

## Revisit Conditions

- A test runner/framework is adopted that expects a different layout.
- `scripts/` and `tests/` stop sharing the same directory depth (would break
  `..`-relative path resolution).
