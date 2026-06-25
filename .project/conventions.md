# Conventions

## Naming

## Code Style

- Formatting is enforced by Biome (`biome.json`). Run `npm run format` before committing;
  CI and `verify.py` run `npm run format:check` (non-mutating).
- Biome formats JS/JSX/MJS/CSS/JSON only. TOML and Markdown content are not auto-formatted.
- Linting stays on ESLint (`npm run lint`); Biome's linter is disabled. See
  `.decisions/formatter-biome.md`.

## Review Expectations

## Forbidden Patterns
