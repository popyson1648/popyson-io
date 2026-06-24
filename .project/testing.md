# Testing

Test and check scripts live under `tests/` (`check_*.mjs`, `check_*.py`, and their `fixtures/`); they import the modules they exercise from `scripts/`. Verification phases in `.project/verification.toml` invoke them by `tests/` path.

## Test Types

- Lint: ESLint over JavaScript and JSX source.
- Frontmatter: validates every article Markdown metadata block against the shared schema.
- Metadata generation check: statically verifies generated metadata has already been written back.
- Metadata quality: validates generated tag and summary length, markup, duplicates, unresolved placeholders, thumbnail paths, prompt/config files, and locale-sensitive summary shape.
- Build: Vite production build.
- Unit checks: metadata schema, Markdown rendering, content loader, Pagefind search, and prerendered route smoke checks.
- Search smoke: Pagefind checks against the built Japanese and English indexes.
- Prerender smoke: asserts every route/locale bakes its primary body into the static `#root`.
- Secret scan: Gitleaks over pushed and proposed changes.
- Performance: Lighthouse CI against the built static app.

## Minimum Checks Before Completion

```sh
python3 scripts/verify.py
```

## Checks By Change Type

- UI or routing changes: run the full verification command and inspect desktop and mobile rendering.
- Tooling changes: run the full verification command.
- Metadata changes: run `npm run metadata:generate:op`, then the full verification command.
- Secret-handling changes: run pre-commit hooks or the secret scan workflow.
- Performance-sensitive changes: inspect the Lighthouse output from the performance phase.

## How To Run Verification

```sh
python3 scripts/verify.py
```

To list phases:

```sh
python3 scripts/verify.py --list
```

To run only metadata validation:

```sh
python3 scripts/verify.py --only frontmatter
```

To check generated metadata:

```sh
python3 scripts/verify.py --only metadata_generate_check
```

To preview the prompts that would be sent for unresolved AI metadata:

```sh
npm run metadata:preview-prompts
```
