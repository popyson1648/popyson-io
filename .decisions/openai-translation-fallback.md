# Decision

## Title

Use GPT-5.6 Terra when the primary translation provider is unavailable

## Date

2026-08-15

## Status

Accepted

## Decision

Database content publication continues to use Claude Code as its primary English translator. If that provider process exits unsuccessfully, the workflow makes one fallback request to OpenAI's Responses API with `gpt-5.6-terra` and low reasoning effort. Both routes must pass the same isolated-snapshot changed-path validation before metadata generation.

## Context

Publication currently stops whenever the Claude Code subscription reaches its usage limit, even when the content change only replaces an already-uploaded thumbnail. The workflow already has an OpenAI API key for metadata and thumbnail generation. Translation must preserve prose quality, Markdown or TOML structure, URLs, directives, and exact file boundaries.

## Alternatives

- Wait for Claude Code limits to reset.
- Replace Claude Code entirely with OpenAI.
- Use GPT-5.6 Luna for the lowest cost.
- Use GPT-5.6 Sol for maximum capability.
- Skip translation when only non-prose content changed.

## Reason

Terra is the OpenAI tier intended to balance intelligence and cost. It offers more quality margin than the high-volume Luna tier while a typical article costs only a few cents. Keeping Claude first avoids changing normal publication output, while a single bounded fallback removes one provider as a publication availability dependency.

## Consequences

- A Claude failure can incur one OpenAI translation charge.
- Provider fallback is visible as a sanitized workflow message, without source or model output.
- An OpenAI failure still stops publication.
- Invalid or out-of-boundary output never triggers another provider and never reaches deployment.
- Representative translation fixtures should be reviewed when the prompt or model changes.

## Revisit Conditions

- Repository evaluations show Terra does not preserve the required voice or syntax reliably.
- Terra pricing or availability changes materially.
- Claude Code exposes a reliable usage-limit signal that supports a narrower fallback condition.
- A deterministic no-translation path is added for revisions whose Japanese prose is unchanged.
