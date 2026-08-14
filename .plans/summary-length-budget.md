# Plan

## Goal

Let a post publish when its English summary would otherwise run past the length
an article card allows.

## Scope

- The summary request in `scripts/generate_metadata.mjs`.
- Tests in `tests/check_generate_metadata.test.mjs`.
- `.project/metadata.md`, `.decisions/summary-length-budget.md`.

## Non-goals

- Changing `summary_generation.max_chars`, which is the width of a card.
- The suppressed generator output in `.github/workflows/content-publish.yml`,
  which is why this took six failed publications to read.

## Assumptions

- The model overshoots a stated character count by a few percent, measured at
  185-195 characters for a request of 180.

## Steps

1. Read the limit through one helper so the prompt and the validation cannot
   drift apart.
2. Ask for 80% of it, and on an overrun ask again for 65%, then 50%.
3. Fail with the measured length when all three overrun.

## Verification

- `npx vitest run --project unit tests/check_generate_metadata.test.mjs`
- `python3 scripts/verify.py --mode standard`
- Run the generator against the snapshot of the publication that failed
  (job `99ee9ecf`) and confirm it resolves every field.

## Open Issues

None.
