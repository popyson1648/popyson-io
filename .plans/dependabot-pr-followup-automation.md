# Plan

## Goal

Make Dependabot update pull requests fully hands-off except for the final human
merge: every Dependabot PR is labeled, failing PRs are repaired by Claude
automatically, and green PRs receive an `LGTM` comment. Merging stays manual.

## Context (verified state of `origin/main`)

- A complete follow-up system already exists (commit `04f2ed7`):
  - `.github/dependabot.yml` (npm + github-actions, weekly, `labels: [dependencies, security]`).
  - `.github/workflows/security-pr-followup.yml` — the working template: schedule
    + review + `workflow_dispatch`, runs under `SECURITY_AUTOMATION_TOKEN` (base
    context, so it has secrets and push rights), collects bounded PR context,
    invokes `anthropics/claude-code-action@v1`, runs `scripts/verify.py --mode ci`,
    pushes a minimal fix or comments `LGTM`, never merges.
  - `.github/workflows/security-alert-remediation.yml` and supporting docs.
- Labels `dependencies`, `security`, `security-alert-remediation` do not exist yet.
  Because `dependencies`/`security` were missing when Dependabot ran, open PRs
  #4–#11 have no labels.
- Open Dependabot PRs: #4–#11 (author `app/dependabot`). #9 (`lint` group) fails `verify`.
- Secrets present: `CLAUDE_CODE_OAUTH_TOKEN`, `SECURITY_AUTOMATION_TOKEN`.

## Approach decision

Extract the shared follow-up job into a `workflow_call` reusable workflow and
keep two thin caller workflows (security + dependabot). This is the idiomatic
GitHub Actions way to share job logic across triggers, keeps the machinery
single-sourced (no DRY violation that would later become a refactor target), and
does not mix the security and dependency concerns in one file. Copy-pasting the
~270-line workflow is rejected for exactly that reason.

## Scope

- Create repository labels `dependencies` and `security`.
- Backfill `dependencies` on open Dependabot PRs #4–#11.
- Refactor follow-up automation into:
  - `.github/workflows/_pr-followup.yml` — `workflow_call` reusable job containing
    the shared logic (select → checkout → context → Claude → verify → push/LGTM).
    Inputs distinguish the selector mode and optional PR number; `secrets: inherit`.
  - `.github/workflows/security-pr-followup.yml` — thin caller: existing triggers,
    calls the reusable workflow with `selector: security`.
  - `.github/workflows/dependabot-pr-followup.yml` — thin caller: schedule +
    `workflow_dispatch` + review triggers, calls with `selector: dependabot`.
- Selector semantics:
  - `security` → PRs labeled `security-alert-remediation`.
  - `dependabot` → PRs authored by `app/dependabot` or labeled `dependencies`.
- Make the Claude prompt generic ("automated maintenance PR") while keeping every
  hard constraint (no merge, no secret-alert access, no broad refactors, etc.).
- Add `actionlint` to `.pre-commit-config.yaml` (no `act`; CI-content checks stay
  on `scripts/verify.py`).
- Update `.project/security-automation.md` and add a `.decisions/` record.

## Non-goals

- No automatic merging of any PR.
- No `act` adoption.
- No broadening of Claude access to secret scanning alert payloads.
- No change to Dependabot grouping/labels in `dependabot.yml`.
- No behavioral change to the existing security follow-up flow (must stay equivalent).
- No fixes to unrelated application code beyond repairing a failing PR.

## Assumptions

- `SECURITY_AUTOMATION_TOKEN` can push to same-repo `app/dependabot` branches;
  non-writable branches are reported, not forced.
- Once `dependencies`/`security` labels exist, future Dependabot PRs receive them
  automatically per `dependabot.yml`.
- The workflows are not triggered by `push`, so a Claude fix push does not
  re-trigger them; the flow converges (fix → CI → next scheduled run → green →
  `LGTM`). No extra loop guard required.
- Small, behavior-preserving fixes after upgrades (e.g. stricter lint rules on #9)
  are in scope.

## Steps

1. Create labels `dependencies` and `security`.
2. Backfill `dependencies` on open PRs #4–#11.
3. Extract `_pr-followup.yml` (reusable) from the current security workflow;
   convert `security-pr-followup.yml` into a thin caller (behavior-equivalent).
4. Add `dependabot-pr-followup.yml` caller.
5. Add `actionlint` hook to `.pre-commit-config.yaml`.
6. Update `.project/security-automation.md`; add a decision record.
7. Optionally repair #9 first, then let the automation handle the rest.

## Verification

- `actionlint` on all changed workflows (via pre-commit).
- `git diff --check`.
- `pre-commit run --all-files` (gitleaks + verify-pre-commit).
- `python3 scripts/verify.py --mode ci` for any source/dep fix.
- Real-server rehearsal via `workflow_dispatch`:
  - security caller against an existing security PR → behavior unchanged.
  - dependabot caller against a green PR → only `LGTM`; against #9 → minimal fix pushed.
- `gh pr list --state open --json number,title,author,labels,statusCheckRollup`.

## Open Issues

- `dependabot.yml` labels every update PR with both `dependencies` and `security`;
  selection uses `dependencies`, so harmless — keep config as-is unless told otherwise.
- Whether to repair #9 manually before the dependabot caller goes live.
- Some Dependabot branches may be non-writable; those are reported, not fixed.
