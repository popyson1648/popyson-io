# Decision

## Title

Separate publication provider authentication from editor authentication

## Date

2026-11-12

## Status

Accepted

## Decision

Map GitHub dispatch failures to HTTP 502. Expose fixed, actionable messages for
401, 403, and 404, retaining upstream status internally. Other server errors
retain the generic editor error message.

## Context

About, Works, posts, and batch publication share a GitHub token. Returning its
401 directly makes a broken server credential look like an editor login failure.

## Alternatives

Return raw GitHub statuses and response bodies.

## Reason

The author cannot repair a server credential by logging in again. Fixed messages
explain recovery without exposing provider bodies or secrets.

## Consequences

Production token rotation is still necessary; this code does not renew tokens.

## Revisit Conditions

Adoption of automatically refreshed GitHub App installation credentials.
