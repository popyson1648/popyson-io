# Plan

## Goal

Completely remove the dev-only DevTweak panel from the application.

## Scope

- Remove the guarded DevTweak import from `src/main.jsx`.
- Remove the DevTweak source and README under `src/devtweak/`.
- Verify no DevTweak references remain.

## Non-goals

- Do not change the existing production tweaks panel.
- Do not alter unrelated typography or styling work already in progress.

## Assumptions

- DevTweak is only the dev-only overlay loaded from `src/main.jsx`.
- The existing `src/tweaks-panel.jsx` feature is separate and should remain.

## Steps

1. Remove the DevTweak dynamic import from `src/main.jsx`.
2. Delete `src/devtweak/devtweak.js` and `src/devtweak/README.md`.
3. Search for remaining DevTweak references.
4. Run project verification.

## Verification

- `rg "DevTweak|devtweak"`
- `python3 scripts/verify.py`

## Open Issues

- None.
