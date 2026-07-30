# English Translation Rules

Use these rules when updating English content from Japanese source content.

## Translation

- Translate Japanese content into natural English.
- Preserve the author's intent.
- Do not summarize.
- Do not add facts.
- Keep technical terms natural for software engineers.
- Translate human-facing metadata values such as `title`, `tags`, `description`,
  and `[sumup].text`.
- Keep the English `tags` array the same length and semantic order as the
  Japanese array. Each position is the same concept in the other locale; the
  site uses this pairing when a filtered Blog page changes language.

## File Boundaries

- Only update English target files requested by the workflow.
- Do not change Japanese source files.
- Do not edit `CLAUDE.md`.
- Do not modify assets.
- Do not edit unrelated source, config, workflow, or documentation files.
- Keep the existing file structure.
- Do not change article IDs or directory names.
- Do not write post IDs into Markdown metadata.

## Works

Works live in `src/content/works/<slug>/index.{ja,en}.md`.

- Translate `title`, `tagline`, `summary`, and the body.
- Do not add `year`, `stack`, `thumbnail`, or `hero` to the English file. The
  loader reads all four from the Japanese one, so a copy in the English file is
  ignored and only invites edits that never reach the page.
- Keep the comment block that names the fields, translated into English.

## Syntax Preservation

- Preserve Markdown structure.
- Preserve frontmatter keys.
- Preserve TOML keys and structure.
- Preserve code blocks exactly.
- Preserve URLs exactly.
- Keep Markdown and TOML syntax valid.
- Keep the site buildable.
