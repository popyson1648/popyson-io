# Restore CI for Dependabot pull requests

## Goal

Make the `verify` checks pass on Dependabot pull requests without weakening the
CI build or exposing the content service outside Cloudflare Access.

## Scope

- Configure the existing read-only content CI credentials as repository-level
  Dependabot secrets under the same names used by Actions.
- Rerun the failed checks on open Dependabot pull requests #168 through #172.
- Merge pull requests #168 through #172 after their checks pass.
- Document that both the Actions and Dependabot secret stores need the content
  CI credentials.

## Non-goals

- Do not skip the production-content build for Dependabot pull requests.
- Do not change the workflow to `pull_request_target` or grant write
  permissions to `GITHUB_TOKEN`.
- Do not merge unrelated pull requests or rotate unrelated credentials.

## Assumptions

- `CONTENT_CI_ACCESS_CLIENT_ID` and
  `CONTENT_CI_ACCESS_CLIENT_SECRET` are the dedicated Cloudflare Access service
  token for the read-only `/v1/ci` API.
- The existing credential values can be supplied from their secure source. If
  the current secret is no longer recoverable, replacing that one dedicated
  service token and updating both GitHub secret stores will require separate
  approval.

## Steps

1. Add `CONTENT_CI_ACCESS_CLIENT_ID` and
   `CONTENT_CI_ACCESS_CLIENT_SECRET` to the repository's Dependabot secret
   store, preserving the existing Actions secrets.
2. Update `.project/content-publication.md` so repository setup explicitly
   requires these two names in both secret stores.
3. Run the repository verification on the documentation change.
4. Rerun the failed CI runs for pull requests #168 through #172 and inspect the
   new logs and check conclusions.
5. Merge pull requests #168 through #172 one at a time, resolving base drift
   and rerunning checks when required.
6. Review the local diff, merged dependency set, and final `main` checks for
   security, consistency, and regressions.

## Verification

- `gh secret list --app dependabot` lists both required names (values remain
  unreadable).
- `python3 scripts/verify.py` passes locally.
- Each open Dependabot pull request completes its required `verify` checks
  successfully, including the active database release download.
- The documentation fix and dependency pull requests #168 through #172 are
  merged, and the resulting `main` CI succeeds.
- No workflow permissions, triggers, or credential names change.

## Open Issues

- None. The existing CI credentials were available in their 1Password item and
  matched the repository's configured CI service token id.
