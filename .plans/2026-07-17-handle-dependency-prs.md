# Plan

## Goal

Resolve every open dependency update pull request while preserving the repository's Node.js 22 runtime policy and keeping the default branch verified.

## Scope

- Review and process Dependabot pull requests #65 through #69.
- Merge compatible Vite, ESLint, and Shiki updates one at a time after explicit user approval.
- Reject the `@types/node` 26 update because repository workflows run Node.js 22, and tell Dependabot to ignore that major version.
- Recheck each remaining pull request after earlier dependency updates change `main`.

## Non-goals

- Change the repository runtime from Node.js 22.
- Merge unrelated pull request #74.
- Enable automatic dependency merging.

## Assumptions

- The repository's repeated `node-version: "22"` workflow configuration is intentional.
- Passing CI on each current pull request is necessary but must be reconfirmed after rebases or conflict resolution.
- No pull request will be merged without a separate explicit user confirmation.

## Steps

1. Process the paired Shiki updates (#67 and #68) in sequence, requesting a Dependabot rebase when the first merge makes the second stale or conflicted.
2. Process the ESLint update (#66) and the Vite update (#65), again waiting for a current, green CI result after any rebase.
3. On #69, use Dependabot's `ignore this major version` command so Node.js 26 type definitions are not introduced while the project runs Node.js 22.
4. Confirm that no open pull request with the `dependencies` label remains unexpectedly unresolved.
5. Review the final `main` dependency manifest and lockfile state for consistency.

## Verification

- Require all GitHub checks to pass on each pull request at its current head before merging.
- After the accepted updates are on `main`, run `python3 scripts/verify.py` against the combined dependency state.
- Confirm `package.json` and `package-lock.json` agree and run `npm audit` to report any remaining known vulnerability.
- Confirm the only intentionally rejected dependency update is documented by the Dependabot ignore action on #69.

## Open Issues

- None. The accepted updates were merged with current green checks, and #69 was closed with a Node.js 26 ignore rule.

## Outcome

- Merged #65, #66, #67, and #68.
- Closed #69 by asking Dependabot to ignore the Node.js 26 major version.
- Verified the combined `main` state with `python3 scripts/verify.py` and confirmed that no dependency-labeled pull request remains open.
