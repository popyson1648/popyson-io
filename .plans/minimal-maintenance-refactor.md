# Plan

## Goal

Improve repository readability and maintainability with minimal, behavior-preserving
refactoring, safety checks, dead-code cleanup, README review, and verification.

## Scope

- Inspect repository structure, package scripts, framework setup, docs, and verification.
- Check the current worktree for tracked local config, debug logs, TODO/FIXME markers,
  placeholder data, and obvious secret-risk files without printing secret values.
- Remove only code that is clearly unused or unreachable.
- Make small readability-focused refactors that preserve existing behavior.
- Update existing project documentation where it is clearly incomplete or stale.
- Run the configured verification commands that apply to this change.

## Non-goals

- Add features.
- Change routing, visual design, or user-facing behavior.
- Add dependencies.
- Perform large file splits or architecture changes.
- Remove files unless they are clearly unused.

## Assumptions

- This is an npm, Vite, and React static site.
- `.op.env` and `.op.env.auth` are tracked local configuration files; their values
  will not be printed during the review.
- Root README does not currently exist, so the existing `.project/README.md` is the
  documentation file to review and minimally complete.

## Steps

1. Confirm the working tree is clean and work happens on a dedicated branch.
2. Inspect scripts, entry points, config, and docs.
3. Run focused scans for secret-risk file names, debug logs, TODO/FIXME markers,
   placeholder text, and obvious unused code.
4. Apply only small and defensible code or documentation changes.
5. Run the configured verification phases relevant to the edits.
6. Review the final diff for accidental behavior, UI, or secret exposure changes.

## Verification

- `npm run lint`
- `python3 scripts/verify.py --mode edit`
- `python3 scripts/verify.py --mode all` when practical for the final check

## Open Issues

- None.
