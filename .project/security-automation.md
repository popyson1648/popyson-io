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
- `.github/workflows/security-pr-followup.yml`: watches security remediation
  PR review activity and also runs hourly. It asks Claude Code to fix
  actionable review or CI feedback, pushes changes, or comments `LGTM` when the
  PR is quiet and checks are green.

## Secret Scanning Policy

Gitleaks is configured in `.gitleaks.toml` and runs in both pre-commit and CI.
It is a static gate before code reaches GitHub or Claude-driven automation.

Secret scanning alert payloads are not fetched, printed, summarized, or sent to
Claude. Secret alerts can contain credentials, so they must be handled in
GitHub's security UI and by revoking or rotating the affected secret.

## Operating Rules

- The automation never merges a PR.
- The automation never dismisses alerts.
- One open `security-alert-remediation` PR is handled at a time to avoid
  duplicate fixes.
- If Claude cannot safely fix an alert, the workflow should leave the alert open
  for manual handling rather than making speculative changes.
