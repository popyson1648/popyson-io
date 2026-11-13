# Plan

## Goal

Restore publication for About, Works, and posts after GitHub dispatch returns 401.

## Scope

Shared GitHub error handling, hosted editor regression tests, and credential recovery guidance.

## Non-goals

Publishing test fixtures or copying session credentials into production secrets.

## Assumptions

All content kinds and batch publication use CONTENT_GITHUB_TOKEN. Its Secret binding
exists in production; the reported 401 means GitHub rejected the supplied credential.

## Steps

1. Inspect the shared dispatch path and production binding metadata.
2. Ask the owner to replace the unreadable production secret with a valid repository-scoped token.
3. Distinguish upstream authentication failures from editor login failures, with safe recovery messages.
4. Test rejection and successful retry for all kinds and batch publication.
5. Run repository verification and record any remaining production blocker.

## Verification

Passed `CONTENT_SNAPSHOT_ROOT="$PWD/tests/fixtures/content" python3 scripts/verify.py --mode standard`,
including formatting, lint, type checks, site/editor builds, unit/component/integration
suites, all Worker tests, bundle dry run, and static accessibility checks.
The hosted editor suite passed 39 tests, including About/Works/post 401 recovery
and batch 401/403/404/500 recovery. The initial build without a content snapshot
failed as expected; verification was rerun with the documented fixture snapshot.
Live publication requires the owner to update the credential and deliberately
select content. No test fixtures were deployed.

## Open Issues

The production token cannot be read back; replacement and live publication remain pending.
