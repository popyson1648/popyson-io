# Plan

## Goal

Strengthen the article-thumbnail prompt so generated artwork contains no
shadows or shadow-like lighting, regenerate every existing generated article
thumbnail with that prompt, and publish the complete approved performance,
search, localized-tag, and thumbnail work for review.

## Scope

- Explicitly prohibit cast shadows, drop shadows, contact shadows, inner
  shadows, ambient shading, directional lighting, vignettes, and other
  shadow-like tonal gradients in the thumbnail prompt.
- Add an explicit regeneration command for checked-in article thumbnails whose
  front matter marks them as generated.
- Regenerate the four current canonical PNG thumbnails through the repository's
  configured Gemini concept and OpenAI image workflow.
- Rebuild the 192 px and 384 px WebP variants from each regenerated PNG.
- Visually inspect the four canonical results and their rendered Blog cards.
- Commit the complete current task branch, push it to `origin`, and open a draft
  pull request for review.

## Non-goals

- No change to article subjects, thumbnail dimensions, model, quality, color
  palette, risograph style, or layout rules beyond eliminating shadows.
- No regeneration of hand-authored images, the default OGP image, avatars, or
  work-project images.
- No automatic regeneration on every metadata check or build.
- No merge to `main`.

## Assumptions

- A thumbnail is safe to overwrite only when both locale files point to the
  canonical `/thumbnails/<post-id>.png` path and mark it as generated.
- The existing `.op.env` setup supplies Gemini and OpenAI credentials without
  exposing them in command output.
- Image generation is non-deterministic; visual validation checks the prompt
  constraints and rejects any result with visible shadow-like treatment before
  publishing.
- All current uncommitted files belong to the performance, search, responsive
  thumbnail, localized-tag, and shadowless-thumbnail work in this conversation.

## Steps

1. Strengthen the generation prompt.
   - Keep the existing art direction unchanged.
   - Add a categorical no-shadow rule covering both explicit shadows and subtle
     lighting effects that simulate depth.

2. Add a safe regeneration path.
   - Introduce a dedicated CLI mode and package command rather than deleting
     image files or changing article front matter back to `auto`.
   - Discover eligible Japanese/English article pairs from checked-in metadata.
   - Reject unexpected paths, missing locale agreement, and non-generated
     images.
   - Generate each canonical post image exactly once, then overwrite only its
     resolved canonical PNG.

3. Add regression coverage and documentation.
   - Test prompt construction, eligibility rules, locale-pair validation, and
     exact output targeting with stub providers.
   - Document the regeneration command and credential requirements.

4. Complete the approved localized English-tag implementation.
   - Preserve per-locale tags in runtime and Pagefind data.
   - Use English tags for English UI, search, and filtering.
   - Preserve the selected concept when switching languages.

5. Regenerate and inspect assets.
   - Run the credential-wrapped regeneration command once for all four eligible
     posts.
   - Rebuild all responsive variants.
   - Inspect the canonical PNGs and Browser-rendered cards at desktop and mobile
     widths; rerun a failed image only if it violates the approved prompt.

6. Verify and publish.
   - Run focused tests, production build, browser interaction checks, and
     `python3 scripts/verify.py`.
   - Review the final diff and stage only files belonging to this task branch.
   - Commit, push `perf/transparent-site-speedup` to `origin`, and open a draft
     pull request.

## Verification

- Unit tests prove regeneration cannot target non-generated or non-canonical
  images and does not duplicate work across locales.
- Content-loader, Blog component, TopBar, and Pagefind integration tests cover
  localized tags and existing IME/multiword search behavior.
- `npm run build` succeeds with the regenerated assets.
- `python3 scripts/verify.py` passes.
- Browser checks confirm Japanese and English tag display/filter/search,
  language-switch tag mapping, result thumbnails, IME Enter behavior, and
  unchanged layout.
- Visual inspection confirms all four images use a flat background and contain
  no cast, contact, drop, inner, ambient, vignette, or directional-light
  shadows.
- GitHub shows the pushed branch and a draft pull request; nothing is merged.

## Open Issues

- The image API may still ignore a negative prompt. Any visibly non-compliant
  result must be regenerated before commit, which can incur another billed
  image request.
