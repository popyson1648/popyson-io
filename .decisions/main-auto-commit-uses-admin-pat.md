# Decision

## Title

Workflows that commit to main authenticate with the admin PAT

## Date

2026-07-28

## Status

Accepted

## Decision

`generate-metadata.yml` and `translate-content.yml` check out with
`secrets.SECURITY_AUTOMATION_TOKEN` instead of the default `GITHUB_TOKEN`, so
the credential that carries their push to `main` belongs to a repository admin.

Branch protection for `main` also moved from the classic API to a repository
ruleset ("main protection"), keeping the same rules — pull request with one
approval, linear history, no force pushes, no deletions, conversation
resolution required — and exempting only the admin repository role, which
matches the previous `enforce_admins = false`.

## Context

Both workflows resolve generated content on `main` and commit the result:
metadata and thumbnails for the first, English translations for the second.
Publishing a post is meant to be `npm run post:push` and nothing else.

The first real post exposed that neither could push. `main` requires a pull
request, and `github-actions[bot]` has no exemption:

```
GH006: Protected branch update failed for refs/heads/main.
- Changes must be made through a pull request.
```

Granting that exemption is not possible on a personal repository. The classic
protection API rejects any `bypass_pull_request_allowances` with "Only
organization repositories can have users and team restrictions". A ruleset
rejects the GitHub Actions integration as a bypass actor with "Actor GitHub
Actions integration must be part of the ruleset source or owner organization".
Granting bypass to the `write` repository role was also tried and did not cover
the bot.

## Alternatives

- **Let the workflows open pull requests instead of pushing.** Rejected: it
  adds one or two PR merges to every post, which is the cost the automation
  exists to remove.
- **Drop the pull-request requirement on main.** Rejected: it would open direct
  pushes to everything, not just these two workflows.
- **Keep classic branch protection.** Rejected: it cannot express any exemption
  on a personal repository, so the ruleset was needed regardless.

## Reason

The admin role is the only actor a personal repository can exempt, and
`SECURITY_AUTOMATION_TOKEN` already exists as an admin credential used by
`security-alert-remediation.yml` and `_pr-followup.yml`. Reusing it keeps the
number of long-lived secrets at one.

## Consequences

- The token's expiry now also stops article metadata and translation. A silent
  expiry looks like "the post published but never got tags or an English
  version".
- The token is named for security automation but is really the repository's
  admin credential. Renaming it would mean updating every workflow that reads
  it.
- Branch protection is configured under Settings → Rules, not Settings →
  Branches.

## Revisit Conditions

- The repository moves to an organization, where the GitHub Actions integration
  can be named as a bypass actor and the PAT becomes unnecessary.
- A second automation needs to write to `main`, which would be a reason to
  split the credential by purpose.
