# Plan

## Goal

Allow Works whose localized titles contain HTML-significant characters such as
`&` and `<` to pass the publish workflow while continuing to verify the visible
text of every prerendered Works route.

## Scope

- The prerendered-route integration test used by the content publish workflow.
- Regression fixtures for HTML-significant characters in Works titles.
- Retrying the failed content publication after the code fix reaches `main`.

## Non-goals

- Changing React's correct HTML escaping behavior.
- Weakening the requirement that Works list and detail pages contain their
  localized title.
- Logging private draft content or publication payloads in GitHub Actions.
- Changing the Works editor or content schema.

## Evidence and Root Cause

- GitHub Actions run `31864853795` completed translation, candidate creation,
  download, metadata validation, type checking, builds, and unit/worker tests.
  It failed only in the prerendered-route integration test.
- The test currently searches serialized HTML for the unescaped Works title,
  including a raw `<h1>${title}</h1>` string on detail routes.
- A local candidate with the title `R&D <Tool>` reproduces the failure on both
  list and detail routes: React correctly emits `R&amp;D &lt;Tool&gt;`, but the test
  searches for `R&D <Tool>`.
- Therefore the publish failure is a false negative in verification, not a
  failure to store or render the Works entry.

## Steps

1. Parse each generated HTML document in the prerendered-route integration test
   and assert against decoded DOM text instead of searching serialized markup
   for content values.
2. Keep structural checks selector-based: verify the Works list container and
   card title, and verify the detail container and its heading independently.
3. Update the committed Works fixture title to include `&` and `<`, so both
   localized list/detail routes permanently exercise HTML escaping.
4. Keep failure output scoped to fixture data in normal CI; do not expose the
   production candidate's content in workflow logs.
5. Run the repository verification suite with fixture content.
6. After the fix is merged to `main`, rerun the failed publication so the same
   candidate is verified by the corrected test and promoted.

## Verification

- Run the focused prerendered-route integration test with the special-character
  fixture and confirm all Japanese and English Works routes pass.
- Inspect the generated HTML to confirm the source remains safely escaped while
  DOM `textContent` equals the original localized title.
- Run
  `CONTENT_SNAPSHOT_ROOT=$PWD/tests/fixtures/content python3 scripts/verify.py --mode standard`.
- Confirm the rerun of the publish workflow completes candidate verification
  and promotion before treating the publication as restored.

## Open Issues

- The failed workflow intentionally suppresses production content details, so
  the exact private title is not visible in logs. The failure phase and exact
  local reproduction match the test's escaping bug without requiring that data.
- Rerunning publication is an external write. Per repository policy, merging
  and the subsequent rerun still require explicit user confirmation at those
  points.
