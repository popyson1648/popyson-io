# Plan

## Goal

Enable a best-practice security alert workflow where GitHub detects dependency and code security alerts, Claude Code attempts safe remediations, opens pull requests, follows review/CI feedback, and comments `LGTM` when no further action is needed.

## Scope

- Add Dependabot configuration for npm and GitHub Actions version/security updates.
- Add scheduled security alert remediation with Claude Code GitHub Actions.
- Add automated follow-up for security remediation PRs.
- Document required GitHub security settings, secrets, permissions, and operating model.
- Record the automation design decision.

## Non-goals

- Do not automatically merge pull requests.
- Do not send secret scanning alert payloads to Claude.
- Do not use Claude Code `/loop`; the workflow must be fully GitHub Actions driven.
- Do not replace GitHub native security features with custom scanners.

## Assumptions

- GitHub Advanced Security-related feature availability depends on repository visibility and account/organization settings.
- `CLAUDE_CODE_OAUTH_TOKEN` is available as a GitHub Actions secret.
- A GitHub App installation token or fine-grained PAT is available as `SECURITY_AUTOMATION_TOKEN` for reading security alerts and creating/updating remediation PRs without workflow approval prompts. It can also update workflow files when Dependabot opens GitHub Actions update PRs.
- CodeQL default setup, Dependabot alerts/security updates, and secret scanning/push protection are enabled in GitHub settings.

## Steps

1. Add `.github/dependabot.yml`.
2. Add `.github/workflows/security-alert-remediation.yml`.
3. Add `.github/workflows/security-pr-followup.yml`.
4. Add `.project/security-automation.md` and link it from `.project/README.md`.
5. Add `.decisions/security-alert-automation.md`.
6. Run repository verification.
7. Review the resulting changes for permissions, secret handling, and duplicate-PR behavior.

## Verification

- Run `python3 scripts/verify.py --mode ci`.
- Inspect workflow YAML for least-privilege permissions and expected triggers.
- Confirm secret scanning alert contents are not included in Claude prompts.

## Open Issues

- Repository-level security features must be enabled in GitHub settings; this cannot be fully represented by repository files.
- Fully automatic PR CI runs require `SECURITY_AUTOMATION_TOKEN`; using only `GITHUB_TOKEN` can leave workflow-created PR checks waiting for approval.
