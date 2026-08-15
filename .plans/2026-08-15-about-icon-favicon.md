# Plan

## Goal

Use the About profile icon as the site favicon while keeping the favicon small and crisp at browser-tab sizes.

## Scope

- Derive a 48x48 optimized PNG favicon from the user-provided illustration without changing its composition.
- Update the public site and content editor HTML to reference the new PNG with accurate favicon metadata.
- Remove the superseded menu-style SVG favicon.

## Non-goals

- Redesigning or retouching the About profile icon.
- Changing how the About profile icon itself is stored or rendered.
- Adding platform-specific icons such as an Apple touch icon or web app manifest.

## Assumptions

- A 48x48 PNG provides a suitable balance of browser compatibility, high-density tab rendering, and file size.
- The favicon should visually match the provided source exactly apart from resizing and format compression.
- Both `index.html` and `editor.html` should use the same favicon.

## Steps

1. Resize the provided illustration to 48x48 and encode it as a compression-optimized `public/favicon.png`.
2. Replace the favicon declarations in `index.html` and `editor.html` with the PNG path, MIME type, and `48x48` size metadata.
3. Delete the replaced `favicon.svg` asset.
4. Build both the public site and editor and inspect the generated favicon assets and HTML references.

## Verification

- Confirm the favicon is 48x48, valid PNG, and materially smaller than the 13,560-byte About source.
- Compare the generated favicon visually with the provided illustration to ensure the same icon remains recognizable at favicon size.
- Run `python3 scripts/verify.py`.
- Run `npm run editor:build` because the editor has its own Vite build entry.
- Confirm generated public and editor HTML reference the built PNG favicon.

## Open Issues

- None.
