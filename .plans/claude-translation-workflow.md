# Plan

## Goal

Add an automated Claude Code GitHub Action workflow that updates English content when Japanese blog or about content changes on `main`.

## Scope

- Add `.project/translation.md` with concise translation and edit-boundary rules.
- Add `.github/workflows/translate-content.yml`.
- Detect changed Japanese source files:
  - `src/content/posts/**/index.ja.md`
  - `src/content/about/about.ja.toml`
- Ask Claude Code GitHub Action to update only matching English target files:
  - `src/content/posts/<post-id>/index.en.md`
  - `src/content/about/about.en.toml`
- Validate that generated changes are limited to English target files.
- Run repository verification with `python3 scripts/verify.py --mode ci`.
- Commit generated English changes with `chore: update English translations [skip translate]` only when target files changed.

## Non-goals

- Do not edit root `CLAUDE.md`.
- Do not change article structure, routes, post IDs, directory names, assets, source code, build config, or deploy workflow unless inspection shows it is required.
- Do not introduce a translation service separate from Claude Code GitHub Action.

## Assumptions

- Claude Code GitHub Action can authenticate with `CLAUDE_CODE_OAUTH_TOKEN` from GitHub Secrets.
- Existing deployment remains in `.github/workflows/reading-refresh.yml`, which already runs on pushes to `main`.
- The translation workflow should use commit-message filtering and path filtering to avoid loops. The generated English-only commit should not re-trigger translation because the workflow path filters only Japanese sources.

## Steps

1. Create `.project/translation.md` with translation quality rules and strict file edit boundaries.
2. Create `.github/workflows/translate-content.yml` with:
   - `push` trigger on `main`.
   - Path filters for Japanese source content.
   - Job-level skip when the head commit message contains `[skip translate]`.
   - Changed-file detection against the push `before` and `sha`.
   - Prompt construction listing exact source-to-target mappings.
   - Claude Code GitHub Action invocation that reads `.project/translation.md`.
   - Post-Claude validation that fails on changes outside the allowed English targets.
   - Verification via `python3 scripts/verify.py --mode ci`.
   - Conditional commit and push for English target changes.
3. Keep deploy behavior separate: the translation commit to `main` will naturally trigger the existing CI/deploy workflow, while the translation workflow itself will not deploy.
4. Review final diff for scope and syntax.

## Verification

- Run `python3 scripts/verify.py --mode ci` locally after changes.
- Inspect the workflow YAML for valid triggers, permissions, and changed-file logic.
- Confirm `git diff --name-only` contains only the task plan, translation rules, and translation workflow.

## Open Issues

- None. The workflow uses the current `anthropics/claude-code-action@v1` inputs: `prompt`, `claude_code_oauth_token`, and `claude_args`.
