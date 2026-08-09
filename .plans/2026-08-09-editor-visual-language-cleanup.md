# Plan

## Goal

Refine the local Blog/Works editor into a focused, predictable publishing tool:
make writing visually dominant, preserve immediate access to authoring tools,
and move secondary document management out of the primary writing path. Keep
SmartHR UI as the component system and preserve every existing capability.

## Research Baseline

- Medium: distraction-free canvas, contextual formatting, immediate autosave,
  revision history, and a separate publish review step.
- Ghost: writing-first scope, contextual card insertion, top-level publishing,
  large-document performance, undo/redo continuity, and mobile editing.
- Notion: progressive disclosure, direct manipulation, mobile-specific controls,
  and typography/spacing rhythm across mixed document blocks.
- WordPress: primary content canvas, secondary toolbar, tertiary settings,
  instructive unbranded empty states, and a separate focused writing mode.
- Confluence: predictable top toolbar, grouping and overflow of lesser-used
  formatting, autosave, revert/history, and user-requested toolbar pinning.
- Substack: automatic private drafts and a `Continue` step that separates writing
  from distribution and publication settings.
- Zenn: real-time split preview, scroll synchronization, and explicit rules for
  shadows, radii, links, and buttons that reduce visual noise.
- Qiita: borderless title/body fields and consolidation of authoring tools into
  one consistent area.
- SmartHR Design System: semantic color, spacing, radius and elevation tokens;
  one Primary action per screen; Text/Tertiary buttons and dropdowns when
  repeated Secondary buttons create excessive framing; normal touch target sizes
  on mobile.

## Current Interface Findings

- The visible product name competes with the document title even though this is
  a private single-purpose editor.
- The title is rendered as a large bordered form control instead of feeling like
  the document being authored.
- Locale, layout, metadata, history, outline, revert, formatting, media, draft
  storage guidance, save, and publish all have similar visual weight.
- The desktop toolbar is grouped but tall and button-heavy. The mobile toolbar
  keeps all commands visible but consumes most of the first viewport.
- The 390 px layout can overflow the header: the content-list button and save
  status are displaced when save and publish actions are present.
- Custom mint selection/focus treatments, many radii, and shadows have no stable
  semantic relationship to the SmartHR components.
- The empty state uses a large heading, decorative pencil tile, and centered
  promotional composition for a simple navigation instruction.
- Draft state, operation feedback, and local-only storage guidance are presented
  in separate competing surfaces instead of near the action they explain.

## Scope

### Application shell and hierarchy

- Remove the visible `popyson.io` eyebrow and `Content Editor` heading. Do not
  replace them with another brand/title treatment.
- Keep a compact action bar: menu on compact screens, quiet save state, explicit
  draft save, and one Primary publish action. Prevent overflow at 320/390 px by
  using compact labels and moving non-action status detail into the document
  header on phones.
- Preserve the desktop content library and mobile modal drawer, but simplify
  active/hover styling and align it with semantic SmartHR colors.
- Replace the illustrated empty state with one short instruction and, on mobile,
  a direct button to open the content list.

### Document and publishing controls

- Render the title as a borderless document title with a focus treatment that
  appears only while editing. Keep the path subordinate.
- Keep locale and Edit/Split/Preview controls directly accessible. Place both on
  one compact control row when phone width permits; never restore Split on phone.
- Keep publishing metadata collapsed by default and show a concise readiness
  summary in its header. Continue to show actual validation beside the relevant
  fields and in publish preflight.
- Keep Outline directly accessible for long-form navigation. Group History and
  Revert under a SmartHR dropdown/overflow action, with the destructive action
  last. Move the local-only draft explanation into the related settings/history
  surface instead of displaying it continuously above the editor.
- Preserve the current publish preflight dialog: writing and publication remain
  separate phases, and publishing must never happen from an ambiguous single
  click.

### Authoring surface

- Keep one persistent, non-scrolling toolbar because predictable discovery is
  more appropriate here than a floating selection toolbar. Preserve logical
  groups: history, headings, inline formatting, blocks, and images.
- On desktop, fit the groups into one quiet row using SmartHR Text/Tertiary or
  icon buttons, separators, active states, and accessible tooltips/names.
- On mobile, retain every command without horizontal scrolling, use a dense
  group grid with normal touch targets, and remove redundant group chrome so the
  writing area begins substantially higher than it does now.
- Preserve shortcuts, repeat-to-remove formatting, slash commands, paste/drop
  image upload, album selection, camera capture, and visible pressed state.
- Simplify the CodeMirror and preview container to a border-led workspace rather
  than a rounded card. Keep the real public-site iframe preview unchanged.

### Visual system and feedback

- Replace hand-picked colors with local semantic tokens based on SmartHR product
  colors: `GREY_5`/white canvas, `GREY_9`/`GREY_20` boundaries, `GREY_100` text,
  `GREY_65` secondary text, and `MAIN` only for primary action, selection, and
  focus. Reserve success, warning, and danger colors for those states.
- Use SmartHR's spacing scale, 4/6/8 px radius tokens, and `LAYER0` by default.
  Shadows are limited to genuinely overlapping layers: drawer, dropdown, dialog,
  toast, and full-window preview.
- Replace generic custom feedback styling with the appropriate SmartHR status or
  response component where available. Keep save feedback in the save region,
  upload feedback with the upload flow, and publish feedback with the publish
  flow so unrelated operations do not visually replace one another.
- Leave the rendered Blog/Works preview and public site untouched.

## Non-goals

- Replacing SmartHR UI, removing authoring features, or converting Markdown to a
  block/WYSIWYG document model.
- Restyling the public website or the content rendered inside the preview.
- Adding an editor brand, illustration, gradient, dark mode, AI writing control,
  or user-selectable theme.
- Changing local-only hosting, Tailscale authorization, publishing behavior, or
  generated-bundle policy.

## Assumptions

- “AI-like” refers to visible branding labels, ornamental empty-state artwork,
  gratuitous tinted cards, excessive rounding/shadows, and generic promotional
  copy, rather than to functional labels needed to operate the editor.
- The browser-tab title can remain as a local navigation aid because it is not
  rendered in the editor UI or exposed by the public site.
- SmartHR's product tokens are a better source than its marketing brand palette:
  they are defined specifically for application interfaces and already match
  the selected component library.

## Steps

1. Establish the semantic visual tokens and replace arbitrary editor color,
   spacing, radius, and shadow values.
2. Rebuild the application bar, document header, and empty state around the new
   information hierarchy, including the 320/390 px overflow fix.
3. Consolidate document management into direct and overflow actions and improve
   metadata/readiness disclosure without changing stored data.
4. Recompose the persistent toolbar for a one-row desktop layout and compact
   grouped mobile layout while preserving all commands and accessibility state.
5. Simplify the writer/preview workspace and relocate feedback to the action that
   produced it using SmartHR components.
6. Update component tests, project decision history, and documentation affected
   by the visible structure or design policy.

## Verification

- Run focused component and accessibility tests for header actions, empty state,
  title focus, selected content, grouped/pressed toolbar controls, overflow menu,
  status feedback, metadata disclosure, and mobile drawer.
- Inspect empty, populated, editing, preview, modal, success, warning, and error
  states at desktop, 900 px, 560 px, 390 px, and 320 px widths.
- At 320 and 390 px, confirm no horizontal overflow, no displaced menu/save/
  publish controls, no Split option, all authoring commands reachable without a
  horizontally scrolling toolbar, and normal touch targets.
- Check WCAG contrast and verify that color is not the only status indicator.
- Compare a production-bundle network/load trace with the current optimized
  baseline to ensure the visual cleanup adds no asset or loading regression.
- Run `npm run editor:build` and `python3 scripts/verify.py`.

## Open Issues

- Approved and implemented on 2026-08-09 on
  `feat/editor-ui-ux-refinement`.
- The optimized editor still reports the previously accepted large-chunk warning
  from the SmartHR UI editor bundle. Measured local mobile LCP remains fast at
  154 ms with zero layout shift.
