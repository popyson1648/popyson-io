# Decision

## Title

Remove TanStack Table from the Blog list

## Date

2026-07-30

## Status

Accepted

## Decision

Use a small pure function for the Blog list's existing tag, title, and body
filters plus date and kana sorting. Remove TanStack Table from the client
dependencies.

## Context

The Blog list has four rows and uses no table layout, pagination, grouping,
selection, or column UI. The general-purpose table engine was included in every
route's initial JavaScript bundle only to filter and sort these rows. It also
made React Compiler skip `BlogList` because the hook exposes mutable functions.

## Alternatives

- Keep TanStack Table and wait for a compiler-compatible API.
- Route-split the table dependency so only the Blog downloads it.
- Replace the Blog list with a different table library.

## Reason

The existing behavior is fully represented by a stable sort and three
predicates. A focused implementation is smaller, removes the incompatible hook,
and is easier to test exhaustively. Tests preserve TanStack's case-insensitive
substring filtering, any-tag matching, text date comparison, Japanese kana
comparison, sort direction, and stable ordering for equal values.

## Consequences

- The client no longer downloads a general-purpose table engine.
- Blog filtering and sorting remain synchronous and local.
- New table features would need an explicit implementation or a fresh library
  evaluation.

## Revisit Conditions

Reconsider a table library if the Blog gains pagination, grouping, server-side
data, user-configurable columns, or enough rows that a dedicated row model
provides measurable value.
