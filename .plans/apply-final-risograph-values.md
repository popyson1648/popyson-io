# Plan

## Goal

Apply the provided risograph values for background and circles, and remove noise/distortion treatment from text.

## Scope

- Set background defaults to noise `30`, grain `15.5`, distortion `0`, roughness `0.25`.
- Set circle defaults to opacity `100`, noise `6`, grain `33`, distortion `8`, roughness `0.25`.
- Remove text noise and distortion effects from rendered text.
- Keep text slider values only if needed for temporary output, but do not apply them visually.

## Non-goals

- Do not remove the whole tuning UI unless explicitly requested.
- Do not change page layout or palette.
- Do not commit or merge automatically.

## Assumptions

- The copied text values are not meant to be applied visually anymore.
- Lines and decorative parts should continue using the circle/decor distortion.

## Steps

1. Update `RISOGRAPH_DEFAULTS` in `src/app.jsx`.
2. Stop writing text noise/distortion CSS variables, or make them inert.
3. Update `src/app.css` so text uses no filter and no text-shadow noise.
4. Verify with `python3 scripts/verify.py`.
5. Verify in browser that background/circle defaults match the provided values and text has no distortion/noise.

## Verification

- `python3 scripts/verify.py`
- Browser computed-style check for:
  - background opacity and grain URL
  - circle opacity, noise, grain, and filter
  - text filter `none` and no text shadow

## Open Issues

- None before implementation.
