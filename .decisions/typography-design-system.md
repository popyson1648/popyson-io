# Decision

## Title

Adopt the Alexandria + LINE Seed JP typography design system

## Date

2026-06-12

## Status

Accepted

## Decision

Replace the previous `M PLUS Rounded 1c` + `DM Mono` typography with a token-driven system:

- Font stack: `--font-sans: "Alexandria", "LINE Seed JP", sans-serif;`
  Alexandria carries latin and numerals; LINE Seed JP carries japanese. DM Mono (`--mono`)
  is reserved for code only.
- Tokens live in `src/styles.css :root`:
  - size: `--text-sm .875rem`, `--text-md 1rem`, `--text-lg 1.25rem`, `--text-xl clamp(1.5rem,4vw,2rem)`
  - weight: `--font-regular 400`, `--font-semibold 600`, `--font-bold 700`
  - leading: `--leading-ja 1.75`, `--leading-en 1.6`, `--leading-heading 1.35`, `--leading-label 1.2`
  - tracking: `--tracking-ja .02em`, `--tracking-en 0`, `--tracking-label .04em`
- Numerals and meta text use `--font-sans` with `font-variant-numeric: tabular-nums`
  (no longer the monospace face).

### Canonical role API (reference, not yet applied across JSX)

The spec defines role classes for future use. They are recorded here as the canonical reference;
the current implementation expresses these roles through the tokens above rather than utility classes,
to avoid dead CSS. Roles: `text-ja`, `text-en`, `text-label-en`, `text-number`,
`text-title`, `text-section-title`, `text-body`, `text-caption`, plus inline `inline-en` /
`inline-number`, and the table / list typography sets. See the design system source for the full
size / weight / leading / align matrix.

## Context

`app.css` had ~184 scattered, bespoke typographic declarations (px sizes, ad-hoc weights such as
500 / 650, per-rule line-heights) with no shared vocabulary, so the system drifted whenever new
rules were added. The owner asked to refresh the font design around the supplied Typography Design
System, fixing disordered areas while leaving stable areas untouched.

## Alternatives

- Full JSX adoption of the role utility classes. Rejected for now: large change surface and risk,
  out of the agreed scope.
- Pure font-family swap with no tokenization. Rejected: would not establish the requested order.

## Reason

Tokens couple role and value and become the single backbone for future typography work. The font
swap modernizes the identity while LINE Seed JP keeps the rounded, friendly japanese tone close to
the previous face.

## Consequences

- LINE Seed JP exposes only 400 / 700 on Google Fonts, so `--font-semibold` (600) renders true 600
  for latin (Alexandria) but resolves to the nearest 700 for japanese. Accepted tradeoff.
- Meta / numeric text is no longer monospaced; alignment now relies on `tabular-nums`.
- DM Mono is limited to code surfaces.

## Revisit Conditions

- Japanese semibold reads too heavy in practice (consider dropping japanese labels to 400 / 700).
- LINE Seed JP gains a 600 weight on Google Fonts.
- A future task decides to apply the role utility classes across the JSX components.
