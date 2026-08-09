# Decision

## Title

Expose the local editor through Tailscale Serve with identity checks

## Date

2026-08-08

## Status

Accepted

## Decision

The editor Vite server binds only to `127.0.0.1:4173`. `npm run editor`
configures a separate Tailscale Serve HTTPS listener on port 4173 that proxies
to that loopback address without replacing other Serve listeners. The stable
bookmark is `https://<machine>.<tailnet>.ts.net:4173/editor`.

The API trusts a Serve request only when its TCP peer is loopback, its Host is
the Tailscale DNS name detected at startup, and the `Tailscale-User-Login`
header injected by Serve matches the node owner's login. Mutating requests must
also be same-origin. Direct localhost access remains available for recovery.
There is no editor application token or token-bearing URL.

Tailnet grants should restrict the editor listener to the author. Tailscale
Funnel must not be enabled for the editor.

## Context

The author reaches WSL from multiple devices over Tailscale and wants one
bookmark that works after starting the repository server. A per-run token makes
that workflow unstable, while a persistent application cookie duplicates
Tailscale's authenticated network boundary and adds secret rotation and session
handling.

An existing Tailscale Serve listener on port 443 proxies another local service.
The editor therefore uses HTTPS port 4173 instead of taking over the root
listener.

## Alternatives

- Use a persistent editor secret and HttpOnly cookie over the Tailscale IP.
- Bind Vite to `0.0.0.0` and rely only on an application token.
- Forward port 4173 over SSH and use a localhost bookmark.
- Add the editor under the existing port-443 Serve path.

## Reason

Serve provides a stable MagicDNS hostname, TLS, tailnet authentication, and
tailnet access controls. Keeping the backend loopback-only prevents direct LAN
or Tailscale-IP access. Checking Serve's identity header adds an application
boundary for tailnet devices without storing another secret. A separate Serve
port preserves the existing service and avoids path-prefix problems with Vite's
absolute development URLs and editor APIs.

## Consequences

- Tailscale must be installed, connected, and permitted to configure Serve in
  WSL before `npm run editor` starts successfully.
- The bookmarked URL includes HTTPS port 4173.
- `npm run editor:stop` removes only the dedicated HTTPS port-4173 Serve listener
  and then stops Vite. Startup failures also attempt that listener cleanup; the
  existing port-443 service is never reset.
- Tailnet policy remains an administrator-managed control outside this
  repository.
- Production builds and the normal site remain unaware of the editor.

## Revisit Conditions

- Revisit if multiple authors need distinct editor roles.
- Revisit if the editor becomes a hosted service or must work outside Tailscale.
- Revisit if the existing port-443 service is removed and the editor can safely
  use the default HTTPS port.
