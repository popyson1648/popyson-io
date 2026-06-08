# Plan

## Goal

Fix the search modal so opening it makes the page behind it inactive and non-scrollable, and so the modal remains usable on mobile when the virtual keyboard changes the visible viewport.

## Scope

- Search modal behavior in `src/components.jsx`.
- Search modal layout and scrolling rules in `src/app.css`.
- UI verification for desktop and mobile-sized viewports.

## Non-goals

- Redesigning the top bar, filters, article cards, or the overall visual language.
- Changing search ranking, search data, routes, or localization text.
- Reworking unrelated component background decisions.

## Assumptions

- The current modal already has the right high-level pattern: `role="dialog"`, `aria-modal="true"`, Escape close, focus trap, and focus return.
- The missing behavior is body scroll locking and sizing the modal against the visual viewport rather than only the layout viewport.
- The modal can stay visually consistent with the current blurred overlay and surface treatment.

## Steps

1. Add modal lifecycle handling:
   - store and restore the opener focus,
   - lock document/body scroll while the modal is mounted,
   - restore the original scroll position and inline styles on close.
2. Add visual viewport handling:
   - listen to `window.visualViewport` resize/scroll when available,
   - expose visible viewport height/top as CSS variables,
   - clean up listeners and CSS variables on unmount.
3. Adjust modal CSS:
   - make the overlay a fixed non-scrollable layer sized to the visible viewport,
   - keep the dialog near the top on mobile so the input stays visible above the keyboard,
   - make only the result list scroll internally,
   - use safe-area padding and `overscroll-behavior` to avoid background scroll chaining.
4. Review a11y details:
   - preserve keyboard close and focus trap behavior,
   - keep focus restoration,
   - avoid hiding search results behind the mobile keyboard.

## Verification

- Run `python3 scripts/verify.py`.
- Start the Vite preview/server if needed.
- Use Playwright checks at desktop and mobile widths:
  - modal opens and focuses the search input,
  - page scroll position does not change while the modal is open,
  - Escape closes the modal and focus returns,
  - mobile viewport has no horizontal overflow,
  - modal and results fit within the visible viewport.

## Open Issues

- Virtual keyboard behavior differs across mobile browsers; this plan uses `visualViewport` where available and CSS dynamic viewport fallbacks where it is not.
