# Plan

## Goal

Fix the failing `Translate content` workflow. The "Update English translations with Claude" step fails with `Unsupported event type: push` because `anthropics/claude-code-action@v1` rejects the `push` event.

## Scope

- Replace the `anthropics/claude-code-action@v1` step in `.github/workflows/translate-content.yml` with a direct headless invocation of the Claude Code CLI (`@anthropic-ai/claude-code`).
- Keep the `push` trigger, path filters, change detection, validation, verification, and commit steps unchanged.
- Reuse the existing `CLAUDE_CODE_OAUTH_TOKEN` secret for authentication.
- Record the action-to-CLI decision under `.decisions/`.

## Non-goals

- Do not change the translation prompt content or edit-boundary constraints.
- Do not change the detection logic, target mappings, validation, or commit behavior.
- Do not switch the trigger event or split the workflow into multiple files.
- Do not alter billing: the same subscription OAuth token is reused, so no API metering is introduced.

## Assumptions

- `CLAUDE_CODE_OAUTH_TOKEN` is already configured and valid (the failed run authenticated successfully and failed only at the action's event-type check).
- The Claude Code CLI reads `CLAUDE_CODE_OAUTH_TOKEN` from the environment for headless auth.
- `claude -p` with `--allowed-tools "Read,Edit,MultiEdit,Write"` and `--permission-mode acceptEdits` applies file edits unattended without prompting, while disallowing other tools.

## Steps

1. Replace the action step with a `run:` step that:
   - Runs the pinned CLI via `npx` to avoid global-install permission issues on the runner.
   - Passes the prompt via the `PROMPT` env var (built in YAML, including the detected mappings) to avoid shell quoting/injection.
   - Runs `npx --yes @anthropic-ai/claude-code@2.1.179 -p "$PROMPT" --max-turns 20 --allowed-tools "Read,Edit,MultiEdit,Write" --permission-mode acceptEdits`.
2. Validate workflow YAML syntax.
3. Run `python3 scripts/verify.py --mode ci`.
4. Record the decision in `.decisions/`.

## Verification

- `python3 -c "import yaml; yaml.safe_load(...)"` passes for the workflow.
- `python3 scripts/verify.py --mode ci` passes.
- Diff is limited to the workflow, this plan, and the decision record.
- Real confirmation requires the next `index.ja.md` push to `main` (CI cannot fully exercise the translation step in this PR).

## Open Issues

- The translation step itself is only exercised on a real `main` push that changes a Japanese source file; the PR verification covers syntax and repo verification only.
