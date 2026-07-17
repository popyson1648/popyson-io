# Plan

## Goal

Create a Japanese root `README.md` that explains the site's directory structure, user-facing features, notable technical design, and supported article Markdown syntax.

## Scope

- Add `README.md` at the repository root.
- Describe setup, development, build, and verification commands for contributors.
- Add a compact annotated directory tree whose listed directory and file lines each include a short role comment.
- Describe the implemented pages, localization, search and filtering, themes, RSS, reading list, metadata, and static output.
- Explain notable implementation choices using the current source as evidence.
- Document the article directory convention, TOML front matter, supported Markdown, callout directives, code blocks, safe URLs, and the new-post workflow.
- Apply the `japanese-tech-writing` rules to the Japanese prose.

## Non-goals

- Do not change application behavior, build configuration, article content, or project documentation under `.project/`.
- Do not add badges, screenshots, deployment automation, or new dependencies.
- Do not duplicate every generated file or every test file in the directory tree.

## Assumptions

- The README is primarily for Japanese-speaking contributors and coding agents.
- The annotated tree should cover source, content, automation, tests, and repository governance files that contributors need to locate.
- Existing `.project/` documents remain the detailed source of truth; the root README provides a self-contained entry point and links to those documents where appropriate.

## Steps

1. Draft the README with sections for project overview, features, setup and commands, annotated directory structure, technical design, and article authoring syntax.
2. Check every feature and syntax claim against the current modules, tests, and `.project/` documents.
3. Review the prose against `japanese-tech-writing`, including one sentence per line, concrete headings, restrained emphasis, and removal of redundant or vague wording.
4. Run formatting and repository verification, then inspect the final diff for accidental or unrelated changes.

## Verification

- Run `npm run format:check` to check Markdown formatting coverage where applicable.
- Run `python3 scripts/verify.py` as the repository-wide verification command.
- Inspect `git diff --check` and the final `git diff`.
- Confirm that every listed tree entry has a short role comment and every documented Markdown example matches the renderer and metadata schema.

## Open Issues

- None.
