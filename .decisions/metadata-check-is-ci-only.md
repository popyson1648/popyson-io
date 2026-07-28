# Decision

## Title

Unresolved article metadata is checked in CI only, not on pre-commit

## Date

2026-07-28

## Status

Accepted

## Decision

The "metadata must already be generated" check no longer runs on a local commit:

- `.project/verification.toml` sets `run_standard = false` for
  `metadata_generate_check`, keeping `run_in_ci = true`.
- `tests/check_metadata_quality.test.mjs` applies `validateResolvedMetadata`
  only when `process.env.CI` is set. Every other rule in that suite — tag
  limits, summary length, thumbnail paths, locale parity — still runs locally.

Nothing else about the check changes: `node scripts/generate_metadata.mjs
--check` is unchanged, and CI still fails on unresolved `date = "auto"`,
`auto_tags`, `[sumup] mode = "auto"`, or an unresolved thumbnail.

## Context

A post is scaffolded by `npm run new:post` with `date = "auto"`,
`auto_tags = {}`, and `[thumbnail] mode = "auto"`, and those values are meant to
stay unresolved until `generate-metadata.yml` runs on `main`. That workflow
injects `GEMINI_API_KEY` and `OPENAI_API_KEY` from GitHub secrets, runs
`npm run metadata:generate`, then `verify.py --mode ci`, and commits the result.

But `.pre-commit-config.yaml` runs `verify.py --mode standard`, which included
`metadata_generate_check`, and the unit phase included the same rule through
`check_metadata_quality.test.mjs`. Committing a freshly written post therefore
failed twice over, on exactly the state the pipeline is designed to receive.
The only ways through were `--no-verify` on every post, or resolving metadata
locally with `npm run metadata:generate:op`, which needs a populated `.op.env`
and spends a billing-enabled OpenAI key on an image the workflow would generate
anyway.

## Alternatives

- **Resolve metadata locally before every commit.** Rejected: it requires
  `.op.env` on every writing machine and duplicates paid image generation that
  `generate-metadata.yml` already performs.
- **Drop the check entirely.** Rejected: unresolved metadata reaching a
  deployment would ship an article with a placeholder OGP image and no tags.
- **Keep pre-commit strict and always pass `--no-verify` for posts.** Rejected:
  it disables gitleaks, actionlint, lint, and the tests as collateral damage.

## Reason

The check answers "is this article ready to be published", and the only place
that question is meaningful is after the generation step. Pre-commit sits before
it, so the check could only ever report the expected state as a failure.

## Consequences

- `npm run post:push` works on a freshly written post with no extra flags.
- A post carrying unresolved metadata still fails `ci.yml` on a pull request, so
  posts are pushed to `main` directly, where generation runs before any check.
- `npm run metadata:generate:op` and `.op.env` become optional, for when an
  author wants to inspect generated tags, summary, or thumbnail before pushing.

## Revisit Conditions

- Posts start arriving through pull requests, which would need the generation
  step to run on the PR branch.
- The generation workflow stops running on `main`, leaving nothing between an
  unresolved post and a deployment.
