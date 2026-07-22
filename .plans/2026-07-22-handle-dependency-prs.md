# Plan

## Goal

Resolve every currently open dependency pull request (#76 through #82), make
each accepted update current and fully verified, and prevent the maintenance
follow-up workflow from starving older failing pull requests.

## Scope

- Triage and process Dependabot pull requests #76 through #82.
- Repair PR-specific failures with the smallest change on the affected PR
  branch.
- Re-run transient checks and refresh stale branches where no source change is
  required.
- Update the shared maintenance follow-up workflow so actionable pull requests
  are selected ahead of already-green pull requests.
- Update the security automation documentation and record the changed selection
  policy if required by the final design.
- Prepare accepted pull requests for merge, then request separate approval
  before merging anything.

## Non-goals

- Merge any pull request without explicit user approval.
- Weaken Gitleaks, formatting, test, review, or branch-protection requirements.
- Make unrelated dependency, content, or UI changes.
- Dismiss or suppress security alerts.

## Assumptions

- The failed Gitleaks runs on #76 through #81 are infrastructure failures: the
  action received a GitHub service error during license detection rather than
  reporting a leaked secret. They should be re-run, not bypassed.
- PR #78 has a real compatibility failure: Biome 2.5.4 changes formatter output
  for three existing test files, so its branch needs a formatting-only repair.
- PR #82 is already green and needs no source repair.
- Major updates such as TypeScript 7 (#79) are accepted only if the repository's
  complete verification succeeds on the current branch head.

## Steps

1. Capture the current head SHA, diff, reviews, comments, and check state for
   #76 through #82 so later actions are tied to the inspected revisions.
2. Re-run the transient failed Gitleaks jobs for #76, #77, #79, #80, and #81;
   re-run it for #78 after that branch is repaired. If GitHub cannot re-run an
   old job, request a Dependabot rebase to create a fresh check run.
3. Check out PR #78 in an isolated worktree, apply Biome 2.5.4's formatting to
   only the reported files, run the repository verifier, review the diff, and
   push the minimal repair to the PR branch.
4. Validate every dependency update independently with the current lockfile,
   full repository verification, and dependency audit. Close or defer an update
   instead of forcing it through if compatibility or security verification
   fails, and report that decision before taking the closing action.
5. Recheck all seven pull requests on GitHub. Ensure accepted PRs have no failed
   or pending checks, no unresolved conversations, and no requested changes.
6. On this dedicated branch, change the reusable follow-up selection so failed
   checks and requested changes take priority, while green PRs that already have
   `LGTM` do not remain the perpetual newest candidate. Avoid invoking Claude
   when a PR has no actionable feedback and is already green.
7. Update `.project/security-automation.md` and, if the selection behavior is a
   lasting policy decision, add a decision record from `.decisions/TEMPLATE.md`.
8. Run repository verification for the automation change and review all local
   and remote diffs for correctness, consistency, regressions, maintainability,
   and security impact.
9. Report the disposition and verification result for #76 through #82, plus the
   automation-fix branch status. Ask for explicit merge approval; do not merge
   automatically.

## Verification

- Run `python3 scripts/verify.py --mode ci` on each changed or refreshed PR head.
- Run `npm audit` for each npm dependency update and report remaining findings.
- Require current GitHub checks to finish successfully on each accepted PR.
- Run `python3 scripts/verify.py` on the automation-fix branch.
- Confirm the follow-up selector chooses an actionable older PR when a newer
  green PR already has `LGTM`.
- Confirm the workflow still handles at most one PR per scheduled run, never
  merges, and retains least-privilege permissions.

## Open Issues

- The latest Claude action failures expose only `is_error:true`; the action
  hides the underlying model error. The selection and green-PR bypass can be
  fixed independently, but any remaining Claude authentication or usage-limit
  failure may require inspecting repository secret health outside the logs.
- The final merge order may require sequential Dependabot rebases because six
  npm pull requests modify the same lockfile.

## Outcome

- Re-ran all transient Gitleaks failures. Every open dependency pull request now
  has no failed or pending GitHub checks.
- Repaired #78 with formatting-only commit `cb8c889` and pushed it to the
  Dependabot branch.
- Verified #76 through #82 independently. All configured phases passed; two
  parallel Lighthouse attempts initially contended for Chrome and passed when
  repeated sequentially.
- `npm audit` reports the existing 17 moderate and 1 high findings on #76
  through #81. The security update in #82 removes the high finding and leaves
  17 moderate findings, so #82 should be merged first.
- Updated the follow-up workflow to rotate actionable candidates, recognize
  check-run and status-context failures, exclude green PRs with existing `LGTM`,
  and bypass Claude for quiet green PRs.
- Validated the workflow with `actionlint`, live GitHub PR data, and synthetic
  rotation fixtures. Full repository verification passed.
