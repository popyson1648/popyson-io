# Decision

## Title

Real dark theme, constant-width top bar, and About/profile polish

## Date

2026-06-12

## Status

Accepted

## Decision

- **Dark theme is now real.** `[data-theme="dark"]` previously duplicated the light tokens
  (so switching did nothing). It now defines a deep-navy paper + cream ink palette in
  `src/styles.css`: `--bg #12141d`, `--text #e9ecf7`, muted/meta/faint and lines mixed from
  cream toward the navy bg, `--accent #6f82ff`, `--accent-alt #d4ff0a`. The riso circles and
  the bg grain use `mix-blend-mode: screen` under `[data-theme="dark"]` (multiply sinks ink
  to black on a dark ground). `TWEAK_DEFAULTS.darkAccent` is `#6f82ff` because `src/app.jsx`
  always overrides `--accent` from the tweak value.
- **Blog list ordinals removed.** The `.post-index-no` (01–06) gutter is gone; the card is a
  single column (date · read time / title / summary / tags). This reverses the earlier
  "26px editorial numeral + keep the 56px gutter" choice in
  [[text-contrast-over-decoration]].
- **Top bar is language-stable.** Nav labels are identical across languages; only the language
  toggle text ("EN" vs "日本語") differed, and the bar is `width: max-content`, so the bar grew.
  `.topbar .lang-btn` is pinned to a fixed 58px box. Because `src/app.css` stacks ~17
  `.topbar .lang-btn` rules, the authoritative declaration is appended at end-of-file with
  `!important` (consistent with this file's override style).
- **Email icon fixed; social links added.** Email is non-link text with an envelope icon
  (was the external-link arrow). Added `xcom`, `linkedin`, `wantedly` line icons and
  placeholder links (`href: "#"`) for X / LinkedIn / Wantedly alongside GitHub / RSS.
- **"App" renamed to Works / 制作物** in nav and page title (route `/app` unchanged).

## Context

After the typography pass the owner asked for six concrete fixes: the blog numbers looked
unnecessary and awkward, the centered top bar visibly resized on language switch, the email
used a link-style icon despite not being a link, social links were missing, "App" did not
read as "things built", and the theme switch had no visible effect.

## Alternatives

- Icon-only globe for the language toggle (constant width but loses the target-language hint).
  Rejected: a fixed-width text button keeps the affordance and is equally stable.
- Keep ordinals but shrink them. Rejected: owner questioned the need; a clean list reads better.
- Neutral charcoal dark instead of navy. Rejected: navy keeps the riso ink identity.

## Reason

Each change targets a specific legibility/clarity complaint. The dark palette inverts the
paper metaphor rather than inventing a new one, so the brand survives the theme switch.

## Consequences

- A dark mode now exists and must be considered for future color/contrast work.
- The blog grid is single-column; do not reintroduce a number gutter without revisiting this.
- On dark, the lime circle (screen blend) can wash out cream text it overlaps; tolerated until
  the circle redesign ([[circles-slated-for-redesign]]).
- Social URLs are placeholders and must be replaced before publishing.

## Revisit Conditions

- The riso circle redesign lands (re-check dark blend modes and text overlap).
- Real social profile URLs become available.
- A language gains nav labels that differ in width (revisit the constant-width assumption).
