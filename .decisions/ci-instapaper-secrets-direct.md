# Decision

## Title

CI reads Instapaper credentials from GitHub secrets, not 1Password

## Date

2026-06-23

## Status

Accepted (supersedes the CI secret-access part of
[instapaper-reading-list.md](instapaper-reading-list.md))

## Decision

`reading-refresh.yml` resolves the Instapaper Full API credentials directly from
GitHub secrets instead of routing through the 1Password CLI (`op run`):

- Four GitHub secrets carry the values: `INSTAPAPER_CONSUMER_KEY`,
  `INSTAPAPER_CONSUMER_SECRET`, `INSTAPAPER_OAUTH_TOKEN`,
  `INSTAPAPER_OAUTH_TOKEN_SECRET`. The workflow passes them to
  `npm run reading:fetch` via a step-scoped `env:` block.
- The `Install 1Password CLI` step, the `OP_SERVICE_ACCOUNT_TOKEN` secret, and
  the committed `.op.env` requirement are removed from CI.
- Local development still uses 1Password: `npm run reading:fetch:op`
  (`op run --env-file=.op.env -- ...`). The `.op.env*.example` templates remain.
- A guard step runs before the fetch and hard-fails when any of the four secrets
  is empty. The fetch step keeps `continue-on-error: true` so a transient
  Instapaper outage stays soft (the last snapshot keeps serving), but a
  configuration error now turns the run red instead of passing silently.

## Context

`fetch_instapaper.mjs` reads the credentials from `process.env` (via
`requireEnv`), so it is agnostic to how the variables are populated. The previous
design layered 1Password on top of CI: `op run --env-file=.op.env` resolved
`op://` references using a service-account token stored in GitHub.

That `.op.env` file was deleted by `d3220d9` ("chore: tidy repository
maintenance") as if it were a secret. It was not — it held only `op://`
references — but the workflow depends on the file existing. With the file gone,
the fetch step failed every hour with `open .op.env: no such file or directory`.
Because the step is `continue-on-error: true`, every scheduled run still reported
success while `src/reading.json` silently stopped updating.

## Alternatives

- Restore the committed `.op.env` and keep the `op run` layer. Works, but adds
  moving parts (CLI install, the reference file, the service-account token) whose
  only payoff — centralized secret rotation across many repos/environments — is
  marginal for a single workflow. It also re-introduces the exact "delete the
  file and fail silently" footgun.
- Set the secrets at job level instead of per step. Rejected to limit secret
  exposure to the steps that actually need them.

## Reason

CI already has a first-class secret store. For one workflow with four
credentials, reading them straight from GitHub secrets removes the 1Password
layer, fewer things can break, and the failure mode that just bit us disappears.
1Password stays as the single source of truth for local development, matching
the "op for local, GitHub secrets for CI" split.

## Consequences

- The Instapaper credentials now live in two places: 1Password (local) and
  GitHub secrets (CI). Rotating them means updating both.
- `OP_SERVICE_ACCOUNT_TOKEN` is no longer used by this workflow and can be
  removed from repository secrets once no other workflow needs it.
- Misconfiguration (a missing secret) now fails the run loudly via the guard
  step; only genuine transient fetch failures are swallowed.

## Revisit Conditions

- Another workflow needs 1Password-backed secrets, making a shared `op` layer
  worthwhile again.
- The number of CI secrets grows enough that centralized rotation outweighs the
  simplicity of direct GitHub secrets.
