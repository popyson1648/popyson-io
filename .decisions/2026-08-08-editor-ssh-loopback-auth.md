# Decision

## Title

Use a stable SSH-forwarded editor URL with constrained loopback authorization

## Date

2026-08-08

## Status

Superseded by `2026-08-08-editor-tailscale-serve-auth.md`

## Decision

The normal editor URL is `http://localhost:4173/editor`. Remote authors forward
client port 4173 to the WSL editor's loopback port over SSH and may bookmark
that stable URL. Token-free API requests are accepted only when the TCP peer is
loopback and the HTTP Host is `localhost`, `127.0.0.1`, or `::1`. Mutating
requests must also carry a matching HTTP Origin and, when present, a
`Sec-Fetch-Site: same-origin` value.

The editor continues to bind to `0.0.0.0` by default for optional phone or
Tailscale access. Non-loopback requests still require the per-run token. Normal
startup output never contains that token; `--show-network-token` explicitly
prints token-bearing direct network URLs. Port 4173 is strict and startup fails
if it cannot preserve the bookmarked address.

## Context

The author reaches WSL through SSH and wants to start the server and open one
bookmark without copying a new query token after every restart. Removing all
authentication would expose repository writes and publication to every device
that can reach the bound port.

## Alternatives

- Store a persistent token in the repository or browser bookmark.
- Put a new random token in every normal startup URL.
- Disable authentication for every connection to the development server.
- Add a hosted login and session database to the local editor.

## Reason

SSH already authenticates and encrypts the remote connection. Constraining the
token-free path to loopback peer and host values makes the local forward usable
without weakening direct network access. Origin checks protect mutation APIs
from a browser on the authoring machine being induced to send cross-site
requests to localhost. Explicit token output avoids routinely leaking a write
credential into terminal history, screen sharing, and copied logs.

## Consequences

- The SSH client must keep a local port forward active while the bookmark is in
  use.
- A process already using local or remote port 4173 must be stopped or assigned
  another explicitly configured port and bookmark.
- Direct phone/LAN access requires restarting with `--show-network-token` and
  still uses a per-run secret URL.
- Production builds and the normal Vite development command remain unaffected;
  only `npm run editor` enables the write API.

## Revisit Conditions

- Revisit if multiple authors require accounts or shared hosted access.
- Revisit if HTTPS terminates in front of the local editor or a reverse proxy
  must be treated as a trusted loopback boundary.
