# Decision

## Title

Use GitHub-native security detection with Claude-assisted remediation PRs

## Date

2026-06-17

## Status

Accepted

## Decision

Use GitHub's native security features for detection and first-line dependency
security updates, then use Claude Code GitHub Actions to remediate remaining
open Dependabot and code scanning alerts through pull requests. A separate
follow-up workflow keeps automated remediation PRs moving through CI and review
feedback and comments `LGTM` when no further action is needed.

Use Gitleaks as the repository-owned static secret scanning gate in pre-commit
and CI. GitHub push protection remains the server-side backstop.

## Context

The repository needs fully automatic security alert handling, including PR
creation and review follow-up. The automation must follow repository rules,
avoid automatic merging, and avoid exposing secrets to an LLM.

## Alternatives

- Use only Dependabot security updates. This is robust for dependency updates
  but does not address code scanning findings or broken remediation PRs.
- Use Claude Code `/loop`. This is useful for an open local Claude Code session
  but is session-scoped and expires, so it is not suitable for fully automatic
  unattended operation.
- Add a custom scanner. This duplicates GitHub security features and increases
  maintenance cost.
- Rely only on GitHub push protection. This is useful server-side protection,
  but it does not give the repository an explicit local/CI gate that contributors
  can run before pushing.

## Reason

GitHub-native security features are the most reliable source of alerts and
integrate with repository settings, pull requests, and code scanning. Claude is
best used after an alert exists, where it can inspect the repository, make a
minimal fix, run verification, and respond to PR feedback. Secret scanning
payloads are excluded because they may contain credentials.

Gitleaks is a narrow repository-owned guardrail for detecting hardcoded secrets
before Claude-driven automation or reviewers see them. It complements GitHub
secret scanning instead of replacing it.

## Consequences

- Repository security settings must be enabled outside committed source files.
- A dedicated automation token is required for fully automatic PR checks.
- Secret scanning now runs both as a pre-commit hook and as a GitHub Actions
  workflow.
- The workflow opens and updates PRs, but humans remain responsible for merges.
- Only one open automated security remediation PR is handled at a time.

## Revisit Conditions

- GitHub adds a safer native agent workflow for security remediation.
- The repository needs advanced CodeQL configuration instead of default setup.
- The automation needs to handle multiple simultaneous remediation PRs.
