# Decision

## Title

Adopt Biome as the code formatter (formatter only; ESLint stays for linting)

## Date

2026-06-25

## Status

Accepted

## Decision

Introduce [Biome](https://biomejs.dev/) (pinned to an exact version) as the repository's
code formatter. Biome runs as a **formatter only**: `linter.enabled` is `false` in
`biome.json`. ESLint remains the linter.

- Scope: format `*.js`, `*.jsx`, `*.mjs`, `*.css`, `*.json`.
- Out of scope: `*.toml` and `*.md` content (hand-authored content under `src/content/**`,
  theme, about, posts) is not auto-formatted.
- Wiring: `npm run format` applies formatting; `npm run format:check`
  (`biome format .`, non-mutating, exits non-zero on any diff) is the check used by
  `scripts/verify.py` (the previously-empty `[phases.format]` slot) for both
  `--mode standard` (pre-commit) and `--mode ci`.

## Context

The repository had ESLint but no formatter. `.project/verification.toml` already reserved a
`[phases.format]` slot (`enabled = false`, "No formatter is configured yet."). A formatter was
needed to make whitespace/quote/wrapping style mechanical and reviewable instead of
hand-maintained.

## Alternatives

- **Prettier**: the long-standing default. Rejected as the primary choice because it is
  significantly slower, needs an extra plugin for TOML, and would require
  `eslint-config-prettier` coordination. Biome covers JS/JSX/CSS/JSON with ~97% Prettier
  compatibility in a single fast Rust binary.
- **ESLint Stylistic**: formats JS only (no CSS) and couples formatting to the linter.
- **Biome as full ESLint replacement (formatter + linter)**: rejected for now. This project
  uses `eslint-plugin-react-hooks@7`, whose React Compiler lint rules Biome does not fully
  cover as of 2026 (see `react-compiler-incompatible-library-suppression.md`). Removing ESLint
  would regress lint coverage.

## Reason

- The existing ESLint config carries no stylistic rules (only `react-hooks` /
  `react-refresh`), so a formatter is purely additive with zero rule conflict.
- Biome formats the large CSS files (`src/app.css`, `src/styles.css`) natively at Prettier
  parity, in one tool.
- Fast (Rust) — relevant because format runs on every pre-commit and in CI.
- Widely adopted in 2026 (Vercel, Astro, Node.js, Cloudflare), so it is a durable choice.

## Consequences

- One new dev dependency (`@biomejs/biome`, version-pinned) and one config file
  (`biome.json`).
- A one-time repo-wide reformat touched JS/JSX/MJS/CSS/JSON source (whitespace/wrapping/quote
  normalization only; no logic change).
- Two tools coexist: Biome (format) + ESLint (lint), with disjoint responsibilities.
- Contributors run `npm run format`; CI/pre-commit enforce `npm run format:check`.

## Revisit Conditions

- Biome's linter gains full coverage of `eslint-plugin-react-hooks@7` React Compiler rules —
  reconsider consolidating linting into Biome and removing ESLint.
- Biome adds reliable TOML/Markdown formatting — reconsider extending scope to content files.
- A needed ESLint plugin has no Biome equivalent — keep the split as-is.
