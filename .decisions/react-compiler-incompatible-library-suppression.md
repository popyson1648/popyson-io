# Decision

## Title

Suppress `react-hooks/incompatible-library` for `useReactTable` instead of splitting `BlogList`

## Date

2026-06-18

## Status

Accepted

## Decision

Resolve the `react-hooks/incompatible-library` warning on `BlogList`'s
`useReactTable` call with a documented `eslint-disable-next-line` directive.
Do not extract the table usage into a separate child component.

## Context

eslint-plugin-react-hooks v7 enables React Compiler rules. TanStack Table's
`useReactTable` returns functions with interior mutability that React Compiler
cannot memoize safely, so it intentionally skips compiling `BlogList` and the
linter reports the skip as a warning. `npm run lint` has no `--max-warnings`,
so the warning does not fail CI, but it is noise and signals lost auto-memoization.

## Alternatives

- Component split: move the `useReactTable` usage into a small child component
  so the rest of `BlogList` stays compilable.
- Wait for upstream and leave the warning in place.

## Reason

Per the official React docs, the auto-skip is expected behaviour and the
preferred fix is a compiler-compatible alternative API — which TanStack Table
does not yet provide (planned for v9). With no compatible API, the
upstream/community-recommended handling is a reasoned suppression comment.

A component split would introduce an artificial structural boundary motivated
only by a transient tooling limitation. Once TanStack Table v9 ships
compiler-safe APIs the split would become dead weight that a future refactor
must unwind, whereas the suppression directive is a single line that is trivial
to remove. The suppression is therefore both best-practice-aligned and the more
refactor-proof choice.

## Consequences

- `BlogList` remains outside React Compiler auto-memoization; existing `useMemo`
  hooks continue to cover its derived values.
- The directive carries a reason and a docs link so its purpose is clear.

## Revisit Conditions

Remove the directive and reconsider memoization once TanStack Table v9 ships
compiler-compatible APIs, or if eslint-plugin-react-hooks changes how it reports
this case.
