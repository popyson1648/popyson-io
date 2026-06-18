# Plan

## Goal

Prevent the Translate content workflow from failing on dependency/build artifacts created during CI.

## Scope

- Ignore standard local and CI-generated directories.
- Clean ignored generated files before validating Claude's file changes.
- Verify the repository locally and through CI.

## Non-goals

- Change translation behavior or prompts.
- Change Claude authentication.
- Broaden the set of files Claude may edit.

## Assumptions

- English translation targets remain the only allowed generated content changes.
- Dependency and build artifacts should never be committed.

## Steps

1. Add standard generated directories to `.gitignore`.
2. Update the Translate content workflow to remove ignored generated files before checking for unexpected changes.
3. Run local verification.
4. Open and merge a PR after checks pass.
5. Re-run the failed Translate content workflow.

## Verification

- `python3 scripts/verify.py`
- GitHub Actions checks on the PR
- Re-run `Translate content`

## Open Issues

- None.
