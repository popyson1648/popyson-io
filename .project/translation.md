# English Translation Rules

Use these rules when updating English content from Japanese source content.

## Translation

- Translate Japanese content into natural English.
- Preserve the author's intent.
- Do not summarize.
- Do not add facts.
- Keep technical terms natural for software engineers.
- Translate human-facing metadata values such as `title`, `description`, and `[sumup].text`.

## File Boundaries

- Only update English target files requested by the workflow.
- Do not change Japanese source files.
- Do not edit `CLAUDE.md`.
- Do not modify assets.
- Do not edit unrelated source, config, workflow, or documentation files.
- Keep the existing file structure.
- Do not change article IDs or directory names.
- Do not write post IDs into Markdown metadata.

## Syntax Preservation

- Preserve Markdown structure.
- Preserve frontmatter keys.
- Preserve TOML keys and structure.
- Preserve code blocks exactly.
- Preserve URLs exactly.
- Keep Markdown and TOML syntax valid.
- Keep the site buildable.
