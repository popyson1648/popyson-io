# Plan

Issue: #39 — Markdown article metadata auto-processing
Branch: `issue-39-metadata-processing`

## Goal

Establish a deterministic metadata foundation for Markdown articles:

- A single source-of-truth schema for the TOML front matter.
- Validation (a "frontmatter metadata lint") wired into pre-commit and CI.
- Deterministic auto-processing: `date = "auto"` and `[thumbnail] mode = "none"`.
- AI-backed auto-processing for `auto_tags` and `[sumup] mode = "auto"`.
- A CI check that fails when metadata needing generation is not written back.

## Scope

### In this PR

1. **Schema module** `scripts/metadataSchema.mjs`
   - Declares every field (type, required/optional, allowed values) and the validation rules from the issue's "validation" section.
   - Pure JS over the `smol-toml` parse result; no heavy dependency. Exported as the single validator used by both the lint and the loader (no duplicated validation logic).

2. **Frontmatter lint** `scripts/check_frontmatter.mjs`
   - Loads every post's `index.ja.md` / `index.en.md`, runs the schema validator, prints precise errors (file + field + reason), exits non-zero on any invalid file.
   - Added to `.project/verification.toml` as a new phase `frontmatter` with `run_pre_commit = true` and `run_in_ci = true`. Pre-commit picks it up through the existing `verify.py --mode pre-commit` hook (no `.pre-commit-config.yaml` change required).
   - `content_loader.mjs` runs the same validator at build time, so an invalid file also fails the build.

3. **Config TOML** `src/content/metadata.toml`
   - `[tag_generation] default_count`, `prompt_file`.
   - `[tag_generation] provider`, `model`; `[summary_generation] provider`, `model`.
   - `[thumbnail] default_path` (the project's fallback image; aligned with issue #16's R2/thumbnail direction).

4. **Metadata generation script** `scripts/generate_metadata.mjs`
   - `date = "auto"` -> first-add git commit date, then writes the resolved date back.
   - `auto_tags` -> calls Gemini structured-output generation, preserves manual tags, adds the requested number of non-duplicate tags, then removes `auto_tags`.
   - `[sumup] mode = "auto"` -> calls Gemini structured-output generation, writes `[sumup] mode = "text"`, `text`, and `generated = true`.
   - `[thumbnail] mode = "none"` / absent -> writes `[thumbnail] mode = "file"`, the configured default path, and `generated = true`.
   - `--check` verifies all generated metadata has already been written back without calling the AI provider.
   - `--preview-prompts` prints the prompts that would be sent for unresolved AI metadata without calling the API.
   - Gemini is called through the documented REST `generateContent` endpoint with `x-goog-api-key`, `systemInstruction`, fixed low-variance generation settings, and `generationConfig.responseFormat.text.mimeType = "application/json"` plus JSON Schema.
   - `prompt_file` is treated as a system instruction file. Article title, locale, existing tags, known tags, and body are assembled as user input by the script.

5. **Loader resolution (output contract unchanged)**
   - The loader validates metadata at build time.
   - `[sumup] mode = "text"` -> `text`; `mode = "none"` / absent -> empty. The app-facing `post.summary = { ja, en }` contract stays stable.
   - `[thumbnail] mode = "file"` -> `post.thumbnail`. Thumbnail UI wiring remains out of scope.
   - Loader fallbacks for `date = "auto"` and `[thumbnail] mode = "none"` remain defensive, but CI requires `generate_metadata.mjs --check` so normal committed content is already resolved.

6. **GitHub Actions secret**
   - Normal CI verification does not pass `secrets.GEMINI_API_KEY`; `--check` is static and API-free.
   - A generation workflow may pass `secrets.GEMINI_API_KEY` if it intentionally resolves AI metadata.
   - Local use can run through `op run --env-file=.op.env -- node scripts/generate_metadata.mjs`.

7. **Format migration**
   - Migrate the existing article (`index.ja.md` / `index.en.md`), the `new_post.mjs` template, and `content_loader.mjs` to the new shape (`[sumup]`, `[thumbnail]`, `auto_tags`).
   - Keep site-specific `reading` / `kana` as allowed additional fields. `summary = "..."` becomes `[sumup] mode = "text" text = "..."`.

8. **Tests / verification config**
   - `scripts/check_metadata_schema.mjs` — unit test over valid/invalid fixtures covering each validation rule. Added to the `test_unit` phase command.
   - `scripts/check_generate_metadata.mjs` — unit test with a mock provider covering AI tag/summary generation and failure cases.
   - `scripts/check_metadata_quality.mjs` — static quality check for tag count/length, summary length, markup, and Japanese summary shape.
   - `.project/verification.toml`: add the `frontmatter`, `metadata_generate_check`, and `metadata_quality` phases.
   - `.github/workflows/ci.yml`: add `fetch-depth: 0` to checkout.

9. **AI generation hardening**
   - Separate stable rules from article data by sending prompt files as Gemini `systemInstruction` and generated per-article context as user content.
   - Keep CI deterministic by making `generate_metadata.mjs --check` a static unresolved-metadata check instead of a live AI generation attempt.
   - Add static checks only where they are reliable: unresolved placeholders, duplicate/empty tags, prompt/config file presence, thumbnail path shape/file existence, and paired locale consistency for date/thumbnail.
   - Do not statically judge semantic quality such as whether a summary is the best summary or whether a tag is semantically ideal; those remain review/eval concerns.

10. **Docs**
   - `.decisions/metadata-auto-processing.md` (format, validation, date-from-git, Gemini generation, CI check).
   - This plan.
   - Update `.project/` structure/commands docs.
   - A metadata spec document for contributors.

## Non-goals

- Thumbnail rendering in the UI (only metadata resolution).
- The R2 image posting flow itself (issue #16 is closed; we only reuse its default-thumbnail direction).
- Advanced evaluation/regeneration loops beyond local validation that the model returned enough usable tags and a non-empty summary.

## Assumptions

- "First push date" is approximated deterministically by the first-add commit date in git history; this is the only push-independent value available at build/CI time and matches established SSG practice.
- Writing generated values back to Markdown keeps CI deterministic after generation and satisfies the issue's "use resolved values when displaying" requirement.
- Keeping the loader's output contract (`post.summary`, `post.tags`, ...) stable keeps the app, `meta.js`, `blog.jsx`, and `build_pagefind.mjs` unchanged.
- `reading` and `kana` are real site features (reading time, kana sort) and stay in the schema as allowed fields even though the issue does not mention them.

## Steps

- [x] Add `src/content/metadata.toml` and `src/content/prompts/tag-generation.md`.
- [x] Add `src/content/prompts/summary-generation.md`.
- [x] Write `scripts/metadataSchema.mjs` (field definitions + validators).
- [x] Write `scripts/check_frontmatter.mjs` and `scripts/check_metadata_schema.mjs` (+ fixtures).
- [x] Add `scripts/generate_metadata.mjs` for deterministic and Gemini-backed write-back.
- [x] Add a git-date helper and wire deterministic resolution + validation into `content_loader.mjs`.
- [x] Migrate `content_loader.mjs` reads, the existing article, and `new_post.mjs` to the new format.
- [x] Update `.project/verification.toml` (`frontmatter`, `metadata_generate_check`, `metadata_quality`, `test_unit`) and `.github/workflows/ci.yml` (`fetch-depth: 0`).
- [x] Write `.decisions/` record and the contributor metadata spec doc; update `.project/`.
- [x] Harden AI generation: `systemInstruction`, fixed generation settings, API-free `--check`, and reliable static quality checks.
- [x] Run `python3 scripts/verify.py` and fix until all phases pass.

## Verification

- `python3 scripts/verify.py` (all enabled phases green): lint, frontmatter lint, metadata generation check, metadata quality, build, unit tests (incl. schema and generation tests), accessibility, performance.
- `git diff --check`.
- `npm audit`.
- Manual: validator rejects broken front matter with clear field-level messages.
- Manual: `generate_metadata.mjs --check` passes once generated values are written.
- Manual: `generate_metadata.mjs --preview-prompts` prints no prompts when all AI metadata is already resolved.

## Open Issues

- The default thumbnail path is `public/provisional_ogp_image.png`, exposed to
  metadata as `/provisional_ogp_image.png`.
