# Decision

## Title

Translate-content workflow invokes the Claude Code CLI directly instead of claude-code-action

## Date

2026-06-17

## Status

Accepted

## Decision

The `Translate content` workflow (`.github/workflows/translate-content.yml`) calls the Claude Code CLI (`@anthropic-ai/claude-code`) directly in a `run:` step instead of using `anthropics/claude-code-action@v1`.

## Context

The workflow is push-driven: a push to `main` that changes a Japanese source file triggers diff-based detection (`github.event.before` / `github.sha`), and only the changed `index.ja.md` / `about.ja.toml` files are translated. `anthropics/claude-code-action@v1` only supports the events `issues`, `issue_comment`, `pull_request`, `pull_request_review`, `pull_request_review_comment`, `workflow_dispatch`, `repository_dispatch`, `schedule`, and `workflow_run`. On a `push` event it throws `Unsupported event type: push` before invoking the CLI, so the workflow failed at the "Update English translations with Claude" step.

## Alternatives

- Switch the trigger to a supported event (`workflow_dispatch` / `schedule` / `repository_dispatch` / `workflow_run`). `workflow_dispatch` loses automatic translation; `schedule` has no push diff base; `repository_dispatch` / `workflow_run` require a second workflow plus passing the changed-file set across workflows — more moving parts and a redesign of the detection logic.
- Keep claude-code-action and accept that translation never runs automatically. Rejected: defeats the workflow's purpose.

## Reason

The action is only a wrapper around the same CLI, and its PR/issue-oriented features (sticky comments, progress tracking, @claude mentions) are unused in this unattended batch job. Calling the CLI directly keeps the push trigger and the entire diff-detection pipeline intact with the smallest change and a single workflow file. Authentication and billing are unchanged: the same `CLAUDE_CODE_OAUTH_TOKEN` subscription token is reused, so no API metering is introduced.

## Consequences

- The CLI invocation (install, flags, permission mode) is maintained in-repo rather than delegated to the action.
- The CLI version is pinned (`@anthropic-ai/claude-code@2.1.179`) for reproducibility and must be bumped manually.
- The prompt is passed via the `PROMPT` env var to avoid shell quoting/injection; tools are restricted with `--allowed-tools "Read,Edit,MultiEdit,Write"` and edits auto-applied with `--permission-mode acceptEdits`.
- The translation step is only exercised on a real `main` push that changes a Japanese source; PR CI verifies syntax and repo verification only.

## Revisit Conditions

- `anthropics/claude-code-action` adds `push` support, or PR/issue interaction features become desirable.
- Authentication model changes (e.g. moving to `ANTHROPIC_API_KEY` metered billing).
- The pinned CLI version needs a security or behavior update.
