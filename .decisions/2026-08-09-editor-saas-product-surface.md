# Decision

## Title

Use a restrained SaaS product surface for the local editor

## Date

2026-08-09

## Status

Accepted

## Decision

Keep SmartHR UI as the editor component system and apply an editor-specific
cool-neutral theme with a restrained indigo accent. Establish explicit surface
roles for navigation, application chrome, the primary document, and secondary
tools or preview. Make the document the brightest surface, reduce persistent
borders, and reserve accent color for publish, focus, and current state.

Keep the current information architecture and every authoring capability. Refine
the sidebar, document controls, publishing disclosure, toolbar, and workspace
through typography, spacing, tonal hierarchy, and interaction states rather than
adding cards, decoration, or new features.

## Context

The previous writing-first pass clarified the editor structure and removed visible
branding, but default blue segmented controls, repeated full outlines, and nearly
equal warm-grey surfaces still made the interface resemble an internal business
application.

Official design material from Linear, Vercel, Notion, Figma, Stripe, and SmartHR
converges on calmer navigation, a dominant content surface, semantic tonal roles,
predictable typography and spacing, and limited arbitrary color. Figma's scoped
surface refresh is especially applicable because the editor's task flow and
information architecture are already sound.

## Alternatives

- Add gradients, glass, larger radii, illustration, and richer visual effects.
- Replace SmartHR UI with another product's component library.
- Restructure the editor into a dashboard or add new navigation and product chrome.
- Copy Linear, Notion, or Vercel styling and branded assets exactly.

## Reason

A restrained theme changes the perceived product quality without making the local
tool slower, less familiar, or more decorative. Tonal hierarchy and reduced border
noise keep navigation understandable while allowing the document and real-site
preview to dominate. Retaining SmartHR UI preserves accessible behaviors and the
existing tested interaction model.

## Consequences

- SmartHR primary actions use the editor's indigo application accent.
- Segmented controls remain SmartHR components but use a quiet inset selection
  surface instead of a filled blue selected button.
- The sidebar is dimmer than the document and uses one active surface without a
  redundant colored rule.
- Publishing metadata is a low-emphasis disclosure row rather than a card.
- Desktop toolbar groups use spacing instead of persistent separators; mobile keeps
  all commands visible, grouped, and at least 44 px without horizontal scrolling.
- No new font, image, component dependency, or network request is introduced.

## Revisit Conditions

- User testing shows that the surface hierarchy makes navigation or selection hard
  to recognize.
- SmartHR UI exposes first-class CSS variables or theme support for its current
  utility-class components, allowing local overrides to be removed.
- The editor's information architecture changes substantially or gains additional
  global product areas.

