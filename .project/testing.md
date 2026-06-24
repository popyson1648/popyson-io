# Testing

Tests run on [Vitest](https://vitest.dev/) and live under `tests/`. They import
the modules they exercise from `src/` and `scripts/`. Vitest reuses
`vite.config.js` through `vitest.config.js`, so test transforms match the build.

Files are named by convention and grouped into three Vitest **projects**:

| Project | Files | Env | Needs build |
| --- | --- | --- | --- |
| `unit` | `tests/**/*.test.mjs` (excluding integration) | node | no |
| `integration` | `tests/**/*.integration.test.mjs` | node | yes (`dist/`) |
| `component` | `tests/**/*.test.jsx` | happy-dom | no |

Run one project with `vitest run --project <name>`. The Python accessibility
check (`tests/check_accessibility_static.py`) stays a standalone phase.

## Test Types

- Lint: ESLint over JavaScript and JSX source.
- Unit (`unit` project): core route/meta/date helpers, content loader, metadata
  schema/edges/generation, Markdown rendering, article frontmatter validation,
  and metadata quality (tag/summary length, markup, duplicates, unresolved
  placeholders, thumbnail paths, prompt/config files, locale parity).
- Component (`component` project): React components rendered with Testing Library
  in happy-dom.
- Integration (`integration` project): runs after the build — Pagefind search
  against the built Japanese/English indexes, and a prerender smoke check that
  every route/locale bakes its primary body into the static `#root`.
- Metadata generation check: statically verifies generated metadata is written back.
- Build: Vite production build.
- Secret scan: Gitleaks over pushed and proposed changes.
- Performance: Lighthouse CI against the built static app.

## Running Tests Directly

```sh
npm test            # unit + component projects (fast, no build)
npm run test:watch  # watch mode for unit + component
npm run test:unit
npm run test:component
npm run test:integration   # builds first, then runs the integration project
npm run coverage    # unit + component with a v8 coverage report in .tmp/coverage
```

Coverage is measured for visibility only; there is no CI threshold gate.

## Minimum Checks Before Completion

```sh
python3 scripts/verify.py
```

`verify.py` is the source of truth: it runs the Vitest projects (and every other
phase) according to `.project/verification.toml`, so the test commands above are
for local iteration.

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

To list phases for a mode:

```sh
python3 scripts/verify.py --mode ci --list
```

To run only the unit tests:

```sh
python3 scripts/verify.py --only test_unit
```

To check generated metadata:

```sh
python3 scripts/verify.py --only metadata_generate_check
```

To preview the prompts that would be sent for unresolved AI metadata:

```sh
npm run metadata:preview-prompts
```
