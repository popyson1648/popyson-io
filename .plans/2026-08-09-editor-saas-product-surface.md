# Plan

## Goal

Make the local Blog/Works editor feel like a focused, contemporary SaaS product
rather than an administrative form. Preserve the current information architecture,
SmartHR UI components, authoring behavior, responsive behavior, and public-site
preview. Improve perceived quality through hierarchy, restraint, rhythm, and
interaction states instead of decoration.

## Research Baseline

- Linear's 2024 redesign reduces visual noise across the sidebar, headers, tabs,
  and panels while increasing alignment, hierarchy, and useful density. Its 2026
  refresh dims navigation so the primary content surface stands out.
- Vercel Geist separates page and component backgrounds, then assigns distinct
  tonal ranges to hover surfaces, borders, high-contrast actions, and text/icons.
  It uses compact, predefined type roles instead of many ad-hoc sizes.
- Notion's 2026 page refresh treats predictable spacing and context-sensitive
  rhythm as foundational to a writing tool whose controls should get out of the
  way.
- Figma's product refresh deliberately kept the successful information
  architecture and changed the base visual layer: typography, color, grid,
  controls, icons, and toolbar density. Its stated goals included legibility,
  simplicity, discoverability, and fewer competing patterns.
- Stripe limits arbitrary styling and color in embedded product surfaces so
  platform consistency and accessibility carry more of the experience than
  ornament.
- SmartHR UI's own guidance supports semantic theme tokens and SegmentedControl
  for immediate changes to the same object's state or view. SmartHR brand colors
  will not be reused as this editor's brand.

## Current Interface Findings

- The structure is now clear, but default SmartHR blue selection fills, warm-grey
  tokens, strong full outlines, and repeated segmented controls still resemble an
  internal line-of-business application.
- The sidebar, metadata disclosure, document actions, toolbar, editor, and preview
  are all separated by visible borders. Their similar framing weakens the hierarchy
  between navigation, document controls, and the writing surface.
- Locale and layout are valid immediate view controls, but their default selected
  treatment is louder than the document title and content.
- The mobile toolbar exposes every command as required, but its filled rectangular
  group surface is visually heavy at the top of the writing flow.
- The current active sidebar item uses both a tinted fill and a strong vertical
  rule. The duplicated emphasis reads more like a management console than a calm
  content workspace.
- The existing neutral system is consistent, but nearly identical warm-grey
  surfaces do not establish the subtle depth relationship seen in modern SaaS
  editors.

## Scope

### Product surface and color hierarchy

- Introduce an editor-specific SmartHR theme with a cool-neutral base and one
  restrained indigo accent. Configure it through `createTheme` so SmartHR focus,
  link, selection, and control behavior remain coherent.
- Use four explicit surface roles: dim navigation, quiet app chrome, primary
  document surface, and secondary preview/tool surface. The document surface must
  remain the brightest and visually dominant area.
- Use the accent only for focus, current selection/view, and the primary publish
  action. Keep success, warning, and danger colors semantic. Do not add gradients,
  decorative color blocks, or a dark theme.
- Lower default border contrast. Use spacing or a surface change before adding a
  rule, and use a stronger border only for focused/active controls or a real pane
  boundary.

### Application shell and navigation

- Dim the sidebar relative to the document and remove the active item's redundant
  vertical rule. Use one quiet active surface plus typography/icon contrast.
- Make the header and sidebar feel like one restrained application frame while
  keeping Publish the only visually dominant action.
- Retain search, status filtering, creation, mobile drawer behavior, and the current
  information architecture. Do not add a dashboard, logo, workspace switcher, or
  decorative navigation.

### Document hierarchy and controls

- Preserve the borderless document title and make the document context, save state,
  locale, and layout controls read as one aligned header system.
- Keep SmartHR SegmentedControl for the valid same-document view changes, but theme
  its default, hover, and selected states so selection is compact and quiet rather
  than a large blue fill.
- Restyle publishing metadata as a low-emphasis disclosure row. When open, use
  grouping and spacing inside the panel without turning every field group into a
  card.
- Reduce the visual weight of Outline and Other until hovered or focused; preserve
  their placement and all existing actions.

### Authoring surface

- Treat the workspace as the central product canvas: a clean document surface with
  a subtle boundary and a consistent radius, not a heavy bordered form region.
- On desktop, keep the toolbar in one row and preserve all groups, keyboard
  navigation, pressed states, image controls, and tooltips. Remove persistent
  separator noise where spacing can communicate grouping.
- On mobile, keep every command visible without horizontal scrolling and keep the
  normal touch targets, but use a lighter surface, lower-contrast group boundaries,
  and tighter visual rhythm so the toolbar does not resemble a settings grid.
- Preserve the exact real-site iframe preview and make only its surrounding editor
  chrome recede.

### Typography, radius, and motion

- Define a small type ladder: document title, section/control labels, normal copy,
  secondary metadata, and monospaced identifiers. Use weight and contrast before
  introducing another font size.
- Keep LINE Seed JP and DM Mono. Do not add a webfont request or visual asset.
- Standardize product-surface radii around a restrained 6/8 px scale. Reserve
  pill/full radii for controls whose semantics require them.
- Add only short state transitions for background, border, and color where they
  clarify hover/focus/selection. Respect `prefers-reduced-motion`; do not add
  entrance animation, blur, glass, or parallax.

## Non-goals

- Changing content storage, Markdown commands, image upload, drafts, history,
  publishing, authentication, Tailscale access, or server commands.
- Replacing SmartHR UI, introducing a second component system, or copying another
  product's branded assets or exact interface.
- Changing the public Blog/Works site or the rendered content inside its preview.
- Adding more features, cards, charts, onboarding, AI affordances, collaboration,
  dark mode, gradients, glass effects, or decorative illustration.
- Hiding existing formatting commands or restoring a horizontally scrolling mobile
  toolbar.

## Assumptions

- “Popular SaaS-like” means a cohesive application surface with calm navigation,
  clear content focus, compact controls, intentional states, and polished details;
  it does not mean marketing-page styling or visual excess.
- The current information architecture and task flow are already sound. This is a
  surface and hierarchy refinement comparable to Figma's scoped UI refresh, not a
  structural redesign.
- A custom application theme is compatible with the requirement to keep SmartHR UI:
  SmartHR provides `createTheme` specifically for semantic component theming.

## Steps

1. Add the editor-specific SmartHR theme and align the local CSS tokens to the same
   cool-neutral surface, text, border, accent, radius, and focus roles.
2. Refine the application shell, sidebar hierarchy, active item, header actions,
   and compact drawer without changing their behavior.
3. Rebalance the document header, segmented view controls, metadata disclosure,
   and secondary document actions.
4. Refine the desktop and mobile toolbar grouping, interaction states, workspace
   boundary, editor pane, and preview surround.
5. Normalize typography and interaction transitions, including reduced-motion and
   forced-color behavior.
6. Update component tests and record the accepted visual-system decision without
   changing unrelated project documentation.

## Verification

- Run focused component tests for all current actions, view controls, active states,
  toolbar commands, image inputs, metadata disclosure, and mobile drawer behavior.
- Inspect empty and populated editor states at 1440, 901, 560, 390, and 320 px.
- At 320/390 px, verify zero horizontal overflow, no Split control, all formatting
  commands visible without toolbar scrolling, and normal touch targets.
- Inspect default, hover, focus-visible, pressed, disabled, success, warning, and
  danger states; verify color is never the sole state signal.
- Run keyboard-only and forced-colors checks, an automated accessibility scan, and
  contrast checks for primary/secondary text and controls.
- Compare a production editor build with the current baseline for request count,
  transferred assets, LCP, CLS, and bundle size. No new font, image, or runtime
  dependency is allowed.
- Run `npm run editor:build` and `python3 scripts/verify.py`.

## Open Issues

- Approved and implemented on 2026-08-09 on
  `feat/editor-ui-ux-refinement`.
- SmartHR UI's existing large editor chunk remains outside this visual-only scope;
  the final bundle still reports the existing large-chunk warning. The measured
  mobile LCP is 139 ms with zero layout shift, so no loading regression was found.
