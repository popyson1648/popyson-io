# Testing

## Test Types

- Lint: ESLint over JavaScript and JSX source.
- Build: Vite production build.
- Search smoke: Pagefind checks against the built Japanese and English indexes.
- Secret scan: Gitleaks over pushed and proposed changes.
- Performance: Lighthouse CI against the built static app.

## Minimum Checks Before Completion

```sh
python3 scripts/verify.py
```

## Checks By Change Type

- UI or routing changes: run the full verification command and inspect desktop and mobile rendering.
- Tooling changes: run the full verification command.
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
