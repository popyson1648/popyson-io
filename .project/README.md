# Project Guide

## What This Project Is

`popyson-io` is a statically built personal site and blog for `popyson.com`.
It includes localized About, Blog, Works, Reading, and RSS pages.

## Where To Start

- Application entry point: `src/main.jsx`
- App shell, route parsing, theme state, and runtime metadata: `src/app.jsx`
- Shared UI helpers and top-level components: `src/components.jsx`
- Blog list and article rendering: `src/blog.jsx`
- Other pages: `src/pages.jsx`
- Project structure details: `.project/structure.md`

## Minimum Setup

Use Node.js 22, npm, and Python 3.11.

```sh
npm ci
npm run dev
```

Common development checks:

```sh
npm run lint
npm run build
python3 scripts/verify.py --mode edit
```

## Related Documents

- `.project/structure.md`: source layout and important modules.
- `.project/build.md`: setup, build, run, preview, and reading-list workflow.
- `.project/testing.md`: verification phases and when to run them.
- `.project/verification.toml`: verification command source of truth.
- `.decisions/`: accepted decisions.
- `.plans/`: task plans.
