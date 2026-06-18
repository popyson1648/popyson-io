# Plan

## Goal

Resolve the lingering `react-hooks/incompatible-library` warning emitted by
`npm run lint` for `useReactTable` in `src/blog.jsx` (issue #21).

## Scope

- `src/blog.jsx`: the `useReactTable` call inside `BlogList`.

## Non-goals

- Restructuring `BlogList` or changing the table behaviour.
- Upgrading TanStack Table or eslint-plugin-react-hooks.

## Assumptions

- The warning is upstream-known: TanStack Table's `useReactTable` returns
  functions with interior mutability that React Compiler cannot memoize safely,
  so it intentionally skips compiling the component.
- No compiler-compatible TanStack Table API exists yet (planned for v9).

## Steps

1. Add an `eslint-disable-next-line react-hooks/incompatible-library` directive
   with a documented reason above the `useReactTable` call.
2. Confirm `npx eslint .` reports zero warnings.

## Verification

- `npx eslint .` → 0 problems.
- `python3 scripts/verify.py` (lint + build + a11y + Lighthouse).

## Open Issues

- Remove the directive once TanStack Table v9 ships compiler-safe APIs.
