# Testing

## Test Types

- Lint: ESLint over JavaScript and JSX source.
- Build: Vite production build.
- Performance: Lighthouse CI against the built static app.

## Minimum Checks Before Completion

```sh
python3 scripts/verify.py
```

## Checks By Change Type

- UI or routing changes: run the full verification command and inspect desktop and mobile rendering.
- Tooling changes: run the full verification command.
- Performance-sensitive changes: inspect the Lighthouse output from the performance phase.

## How To Run Verification

```sh
python3 scripts/verify.py
```

To list phases:

```sh
python3 scripts/verify.py --list
```
