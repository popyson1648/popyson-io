# Plan - Portalize .fpanel and Match .modal-overlay Backdrop Style

## Goal
Make the blog toolbar `.fpanel` (filter and sort panels) render with the exact same blurred frosted glass style as `.modal-overlay`. This is achieved by:
1. Moving the `.fpanel` DOM element to the document root using React Portal (avoiding parent stacking context limits).
2. Using `position: fixed` with dynamic JS coordinate tracking.
3. Applying the same CSS variables for background color, image, and backdrop-filter as `.modal-overlay`.

## Scope
- `src/blog.jsx`: Import `createPortal`, implement coordinate tracking, wrap `.fpanel` with portal rendering, and adjust outside click detection.
- `src/app.css`: Change `.fpanel` layout to `position: fixed` and align background/filter values with `.modal-overlay`.

## Steps
1. **Modify `src/blog.jsx`**:
   - Import `createPortal` from `react-dom`.
   - Add a `panelCoords` state to track top/left coordinates.
   - Use a `useEffect` hook to update coords when `openPanel` is active, tracking `resize` and `scroll` events on `window`.
   - Wrap the `.fpanel` rendering for both "filter" and "sort" with `createPortal(..., document.body)`.
   - Update `onDoc` inside the existing click hook to ignore clicks inside `.fpanel` using `e.target.closest(".fpanel")`.
2. **Modify `src/app.css`**:
   - Update `.fpanel` class to use `position: fixed`.
   - Apply `var(--search-backdrop-bg)`, `var(--search-backdrop-image)`, and `var(--search-backdrop-filter)` to `.fpanel`.
3. **Verify**:
   - Run `python3 scripts/verify.py` to ensure build passes.

## Verification
- Pre-commit checks & CI tests pass.
