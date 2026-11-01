# Decision

## Title

Host the editor behind Cloudflare Access with a dedicated Worker.

## Date

2026-10-31

## Status

Accepted direction; migration in progress, not deployed.

## Decision

Serve editor assets and a same-origin API through a dedicated Worker. Require
Access JWT verification and the configured owner identity before every route.
Keep existing content API service authentication and GitHub publication on the
server. Disable alternate workers.dev/preview URLs and require the configured
HTTPS origin. Keep local tooling until migration is validated.

## Context

The current editor runs on a personal computer, loads credentials through
1Password CLI, and uses Tailscale Serve. The owner wants browser-based editing
without keeping that computer running. D1/R2 and publication already run remotely.

## Alternatives

A permanent VM running the existing Node server; static hosting plus a separate
API hostname; keeping the existing personal-computer workflow.

## Reason

A dedicated Worker fits existing Cloudflare services and removes a permanent
machine to maintain. A single origin simplifies browser authentication and CSRF
controls. IP allowlists alone cannot identify the owner or an individual device.

## Consequences

Node-specific HTTP and rendering dependencies must be adapted and tested. Access
configuration and server-side secrets are deployment prerequisites. All static
requests must pass through the Worker so the asset binding cannot bypass auth.
The shared editor API now runs in Node and Workers. JSON streams are bounded and
upstream redirects are not followed. The hosted preview reuses the same Markdown
pipeline with Shiki's JavaScript regex engine and a bounded set of grammars;
unsupported languages display as escaped plain text. This keeps the Worker small
and avoids runtime WASM compilation. Public-site highlighting remains unchanged.
Production authentication and delivery still require deployment validation.

## Revisit Conditions

Worker CPU/memory/bundle limits prevent compatible preview rendering or uploads,
or required dependencies cannot run without a persistent Node process.
