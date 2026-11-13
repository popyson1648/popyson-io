# Decision

## Title

Scope security overrides to parents that pin vulnerable dependencies

## Date

2026-11-13

## Status

Accepted

## Decision

Use parent-scoped npm overrides for Satori/fflate, Miniflare/sharp/undici,
Worker pool/Zod, and ESLint/config-array/minimatch. Upgrade Vitest and its
coverage provider together to 4.1.12 and refresh compatible dependency paths.

## Context

The audit reports 16 affected packages. Compatible updates alone leave pinned
vulnerable dependencies; npm suggests downgrading the Worker pool, ESLint, and
Satori, which would reverse completed API migrations or break existing tooling.

## Alternatives

Accept vulnerable pins, suppress alerts, or force the suggested downgrades.

## Reason

Patched leaf dependencies preserve the established tools and runtime pairings.
Minimatch requires v11 because the advisory includes v10; verify ESLint's API and
ignore behavior explicitly. Other overrides stay within their existing API series.

## Consequences

Overrides require maintenance. Clean installs, dependency tree checks, audits,
and full repository verification are required evidence for this repair.

## Revisit Conditions

Remove each override when its parent accepts a fixed dependency without it,
then repeat clean installation and verification.
