# Plan

## Goal

Let Translate content validate Claude output without deleting dependencies required by later verification.

## Scope

- Remove the ignored-file cleanup from Translate content validation.
- Keep generated directories ignored through `.gitignore`.
- Touch the existing Japanese test article so the fixed workflow runs after merge.

## Non-goals

- Change Claude authentication.
- Broaden the set of allowed translation output files.
- Change the translation prompt.

## Assumptions

- `.gitignore` is the right place to ignore dependency and build output.
- `git ls-files --others --exclude-standard` should not report ignored directories.

## Steps

1. Remove `git clean -fdX` from Translate content validation.
2. Make a minimal Japanese article edit to retrigger translation.
3. Run local verification.
4. Open and merge a PR after checks pass.
5. Confirm Translate content reaches verification without deleting `node_modules`.

## Verification

- `python3 scripts/verify.py`
- PR checks
- `Translate content` run after merge

## Open Issues

- None.
