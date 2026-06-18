# Plan

## Goal

Apply CSS `text-autospace` to Japanese body-oriented typography while keeping English and unsupported browsers unchanged.

## Scope

- Add progressive CSS guarded by `@supports (text-autospace: normal)`.
- Target Japanese article prose, about body text, app card/detail body text, and reading-list title/metadata text.
- Keep short navigation, toolbar, tag, and control text out of scope unless visual checks show they need it.
- Record the chosen selector/value rationale in issue #13 before closing it.

## Non-goals

- No JavaScript polyfill for unsupported browsers.
- No typography redesign beyond the `text-autospace` application.
- No changes to English typography.

## Assumptions

- The document-level `lang` attribute is the authoritative locale marker.
- `text-autospace: normal` is the initial candidate because MDN and CSS Text Level 4 define it as normal contextual CJK spacing, equivalent to ideograph-alpha plus ideograph-numeric.
- If punctuation spacing or existing tracking makes Japanese text look too loose, narrow the value to `ideograph-alpha ideograph-numeric`.

## Steps

1. Add a scoped `@supports (text-autospace: normal)` rule for `html:lang(ja)` body-oriented selectors in `src/app.css`.
2. Verify the CSS keeps English unaffected by selector scope and preserves fallback behavior outside the support query.
3. Build the site and run `python3 scripts/verify.py`.
4. Run local UI checks for Japanese and English article/about/app detail/reading pages at desktop and mobile widths.
5. Compare `normal`, `ideograph-alpha ideograph-numeric`, and `no-autospace` in a supported browser environment if available; otherwise record the browser support limitation and selector/value rationale.
6. Comment the rationale and verification on issue #13, then close it.

## Verification

- `python3 scripts/verify.py`
- Local browser checks against the built or dev site for:
  - `/blog/20260521-a1b2c3d4`
  - `/`
  - `/app/linewatch`
  - `/reading`
  - English mirrors under `/en`
  - mobile and desktop viewport widths

## Open Issues

- None. Local Chrome supports `normal` and `no-autospace`; it does not support the `ideograph-alpha ideograph-numeric` compound value, so `normal` is the compatible scoped value.
