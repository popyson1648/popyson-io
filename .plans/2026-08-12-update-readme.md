# Plan

## Goal

Update the repository README to describe the current local content editor and content publishing workflow without exposing Tailscale identifiers or weakening the documented security boundaries.

## Scope

- Add the local Blog, Works, and About editor to the feature and command summaries.
- Document editor setup, startup, private drafts, preview, and publishing at README depth.
- Refresh the directory tree and related-document links for editor-specific files.
- State the editor's loopback, Tailscale Serve, access-control, and secret-handling requirements.
- Remove the concrete MagicDNS-style example from the linked editor operations guide.

## Non-goals

- Change editor behavior, access controls, or deployment configuration.
- Duplicate the complete operational reference from `.project/build.md`.
- Document a real MagicDNS hostname, tailnet name, login, credential, or unpublished content path.

## Assumptions

- `.project/build.md` and `.project/structure.md` describe the current implementation.
- Readers need enough information to start the editor safely and can follow `.project/build.md` for recovery and maintenance details.

## Steps

1. Compare README commands and structure with the current package scripts and project documentation.
2. Add a concise local-editor section with placeholder-only URL examples and explicit security boundaries.
3. Refresh the feature list, command table, directory tree, publishing notes, and related links.
4. Review the result for stale commands, sensitive identifiers, broken anchors, and unnecessary duplication.

## Verification

- Run targeted searches for Tailscale DNS suffixes, hostnames, tailnet identifiers, and secret-like URL parameters.
- Run `npm run format:check`.
- Run `python3 scripts/verify.py`.
- Review the final diff and Git status.

## Open Issues

- None.
