# Security Automation

## Goal

GitHub is the source of truth for security detection. Claude Code is used only
to remediate open Dependabot and code scanning alerts, keep the remediation PR
moving through review, and comment `LGTM` when no more action is needed.

## GitHub Settings

Enable these repository security features:

- Dependency graph
- Dependabot alerts
- Dependabot security updates
- Secret scanning
- Push protection
- CodeQL code scanning default setup

Use CodeQL default setup first. It is the GitHub-recommended starting point and
does not require a committed CodeQL workflow unless the repository later needs
advanced customization.

## Secrets

Add these GitHub Actions secrets:

- `CLAUDE_CODE_OAUTH_TOKEN`: Claude Code OAuth token.
- `SECURITY_AUTOMATION_TOKEN`: GitHub App installation token or fine-grained
  PAT for automation-created branches and PRs.

`SECURITY_AUTOMATION_TOKEN` needs the minimum permissions required for the
automation:

- Dependabot alerts: read
- Code scanning alerts: read
- Contents: write
- Workflows: write
- Pull requests: write
- Issues: write

Using only `GITHUB_TOKEN` can leave workflow-created PR checks waiting for
manual approval. Use a dedicated automation token for fully automatic PR checks.

## Workflows

- `.github/dependabot.yml`: enables version update PRs for npm and GitHub
  Actions. Dependabot security updates are controlled by GitHub settings.
- `.github/workflows/secret-scan.yml`: runs Gitleaks on pushes, pull requests,
  and manual dispatch. It disables PR comments and artifact upload so detected
  values are not copied into review surfaces.
- `.github/workflows/security-alert-remediation.yml`: runs daily and on manual
  dispatch, reads open Dependabot and code scanning alerts, asks Claude Code for
  a minimal fix, verifies it, and opens a remediation PR.
- `.github/workflows/_pr-followup.yml`: shared `workflow_call` job that follows
  up on one matching open maintenance PR. Scheduled runs rotate among PRs with
  failing checks, requested changes, or merge conflicts so one unchanged PR
  cannot starve the others. It asks Claude Code to fix actionable feedback,
  runs `python3 scripts/verify.py --mode ci`, and pushes the minimal fix. When no
  PR is actionable, it comments `LGTM` on one completed green PR without
  invoking Claude. A `selector` input chooses which PRs to act on (`security` or
  `dependabot`). It never merges a PR.
- `.github/workflows/security-pr-followup.yml`: thin caller that runs the shared
  follow-up on security remediation PRs (label `security-alert-remediation`) on
  review activity, hourly, and on manual dispatch.
- `.github/workflows/dependabot-pr-followup.yml`: thin caller that runs the
  shared follow-up on Dependabot PRs (author `app/dependabot` or label
  `dependencies`) on review activity, hourly, and on manual dispatch.

## Secret Scanning Policy

Gitleaks is configured in `.gitleaks.toml` and runs in both pre-commit and CI.
It is a static gate before code reaches GitHub or Claude-driven automation.

Secret scanning alert payloads are not fetched, printed, summarized, or sent to
Claude. Secret alerts can contain credentials, so they must be handled in
GitHub's security UI and by revoking or rotating the affected secret.

## Operating Rules

- The automation never merges a PR.
- The automation never dismisses alerts.
- Each follow-up run handles one matching open PR. Scheduled runs prioritize
  actionable PRs and rotate through them; completed green PRs that already have
  `LGTM` are excluded from later scheduled runs.
- Labels `dependencies` and `security` must exist so Dependabot can apply them;
  the `dependabot` selector also matches PRs authored by `app/dependabot`.
- If Claude cannot safely fix an alert, the workflow should leave the alert open
  for manual handling rather than making speculative changes.

## Dependency remediation (2026-11-13)

The baseline npm audit reported 16 affected packages (8 high, 8 moderate).
These were dependency-chain findings, not 16 independent vulnerabilities.
The six vulnerable leaf packages and their consumers were:

| Vulnerable package | Exposure in this repository | Remediation |
| --- | --- | --- |
| `@vitest/mocker` | Vitest development/test mock server: unauthenticated registration and Windows path traversal | Upgrade Vitest and coverage to 4.1.12 |
| `undici` | Miniflare local Worker tooling: TLS validation bypass, cache disclosure, response handling and denial of service | Pin Miniflare's dependency to 7.30.1 |
| `sharp` | Miniflare's nested image library contained vulnerable libheif/librsvg versions | Reuse the root patched sharp constraint (`^0.35.5`) |
| `zod` | Worker test configuration, lint tooling, and browser automation: memory exhaustion during validation | Resolve 4.6.7, including the Worker's pinned dependency |
| `fflate` | Satori font/OGP build dependency: malformed ZIP64 input can loop indefinitely | Override Satori's exact pin to the compatible 0.7.5 patch |
| `minimatch` | ESLint/config-array file matching: glob expansion can amplify resource use | Override these consumers to 11.0.1 |

The static site does not run these development servers for visitors. Tooling and
build-time input processing still warrant patched dependencies; this assessment
does not treat development-only exposure as a reason to dismiss alerts.

`package.json` scopes overrides to the affected parents. The minimatch override
crosses a major version because 10.x remains in the advisory range; verify both
normal linting and config file/ignore matching when changing it. Other overrides
retain the existing dependency API series. Keep Cloudflare's Worker runtime and
pool versions aligned rather than accepting npm's suggested downgrade to an old
Worker pool. The compatible lockfile refresh also updates ESLint and Puppeteer's
Zod consumers. After a clean install, npm audit reports zero vulnerabilities.
The standard verifier (611 tests), the Lighthouse performance phase, and explicit
ESLint config/ignore compatibility checks passed for this remediation.

Remove an override when its parent resolves a patched version unaided, then run
`npm ci`, `npm ls`, `npm audit`, and repository verification. Never edit only the
lockfile version string or suppress advisory results to make the audit pass.

Advisory references:

- Vitest: [mock registration](https://github.com/advisories/GHSA-qxg6-89mg-rqv8),
  [Windows traversal](https://github.com/advisories/GHSA-xp26-3454-mjgp).
- Undici: the baseline audit lists multiple advisories, including
  [TLS options](https://github.com/advisories/GHSA-2m5v-pch6-74hx),
  [redirect cache disclosure](https://github.com/advisories/GHSA-4w7w-5xrc-9h26),
  and [content-encoding errors](https://github.com/advisories/GHSA-xjj6-f33q-929c).
- Sharp: [libheif](https://github.com/advisories/GHSA-rgj7-g3m4-5g8c),
  [librsvg](https://github.com/advisories/GHSA-wq5f-xc86-pv6w).
- Zod: [memory exhaustion](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5).
- fflate: [ZIP64 loop](https://github.com/advisories/GHSA-px8p-9vwx-vf98).
- minimatch: [glob amplification](https://github.com/advisories/GHSA-g3hv-75wg-m249).
