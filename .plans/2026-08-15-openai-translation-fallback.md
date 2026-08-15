# OpenAI translation fallback

## Goal

Keep database content publication available when Claude Code cannot translate by falling back to OpenAI GPT-5.6 Terra without weakening content-boundary checks.

## Scope

- Add a deterministic translation client for OpenAI's Responses API.
- Use `gpt-5.6-terra` with low reasoning effort only after Claude Code exits unsuccessfully.
- Preserve the existing isolated snapshot and changed-path validation.
- Add unit and workflow contract tests, project documentation, and a decision record.
- Publish the implementation through a reviewable pull request, then retry the one outstanding thumbnail publication after the change is merged.

## Non-goals

- Replacing Claude Code as the primary translator.
- Falling through after translation output fails repository or snapshot boundary validation.
- Adding a third translation provider or automatic repeated publication retries.
- Merging without user approval.

## Assumptions

- `OPENAI_API_KEY` is already configured in GitHub Actions for metadata and image generation.
- GPT-5.6 Terra is available to the configured OpenAI project through the Responses API.
- A single request can hold the translation rules and the one-item Japanese source.

## Steps

1. Add a translation script that discovers the one allowed target in `CONTENT_SNAPSHOT_ROOT`, sends the Japanese source and translation rules to GPT-5.6 Terra, and atomically writes only the English target.
2. Make the script reject ambiguous snapshots, empty output, invalid response shapes, and source that exceeds a bounded request size.
3. Update `content-publish.yml` so Claude remains primary and the OpenAI script runs only when Claude fails.
4. Keep provider logs private and pass both providers through the existing checksum allowlist.
5. Add unit tests for request shape, target selection, response parsing, and failure behavior; add workflow contract assertions for fallback order and secrets.
6. Update current project documentation and record the provider decision.
7. Run `python3 scripts/verify.py`, review the diff, publish a pull request, and wait for merge approval before retrying publication.

## Verification

- Unit tests cover posts, works, About, malformed snapshots, API failures, and successful writes.
- Workflow tests prove Claude runs first, Terra runs only on Claude failure, and validation follows both.
- Full repository verification passes with `python3 scripts/verify.py`.
- After merge, the pending article publication succeeds and its current and published revision IDs match.

## Open Issues

- Official documentation establishes Terra's multilingual support and cost/quality tier, but repository-specific translation quality must be validated against representative existing articles.
