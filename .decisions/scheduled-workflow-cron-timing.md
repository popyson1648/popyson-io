# Decision

## Title

Schedule workflows at off-the-hour, off-peak cron times (UTC)

## Date

2026-06-18

## Status

Accepted

## Decision

Schedule recurring workflows with these conventions:

- Cron is written in UTC (GitHub Actions has no timezone field). Document the
  intended local time as a JST comment next to the cron line.
- Avoid the top of the hour (`:00`). Use an off-the-hour minute.
- Stagger workflows that share a cadence so they do not all fire together.
- Run heavy daily jobs in the early JST morning (off-peak, before the workday).

Current schedules:

- `security-alert-remediation.yml`: `17 22 * * *` (UTC) = 07:17 JST, daily.
- `security-pr-followup.yml`: `43 * * * *`, hourly at :43.
- `dependabot-pr-followup.yml`: `17 * * * *`, hourly at :17.
- `reading-refresh.yml`: `29 * * * *`, hourly at :29.

The three hourly jobs are staggered at `:17` / `:29` / `:43`.

## Context

GitHub Actions runs scheduled workflows on UTC cron only. A large number of
jobs across GitHub are scheduled at round times such as `:00`, so runs queued
there are frequently delayed or dropped. The repository has three hourly jobs
(security follow-up, Dependabot follow-up, reading-list refresh) plus a daily
job, and we want predictable, non-colliding runs without a documented rationale
getting lost.

## Alternatives

- Schedule on the hour (`:00`). Rejected: most contended slot, higher chance of
  delayed or skipped runs.
- Trigger remediation on alert creation instead of a schedule. Rejected: GitHub
  does not expose Dependabot/code-scanning alert creation as a usable workflow
  trigger, so polling on a schedule is the available mechanism.
- Leave the times undocumented. Rejected: the specific minutes looked arbitrary
  and prompted "why this time?" questions.

## Reason

Off-the-hour minutes reduce queueing delay. Staggering the three hourly jobs
(`:17` / `:29` / `:43`) keeps them from competing. The early-morning daily slot
lets the heavier Claude remediation run during low-traffic hours so a fresh PR
is waiting at the start of the workday. Recording the convention prevents the
times from being mistaken for meaningful or accidentally clustered later.

## Consequences

- New scheduled workflows should follow the same convention and add a JST
  comment.
- Times are approximate: GitHub may still delay scheduled runs under load.
- Changing a cadence means re-checking that minutes stay staggered.

## Revisit Conditions

- GitHub adds timezone support or an alert-creation workflow trigger.
- A fourth recurring workflow needs a slot and the stagger has to be rebalanced.
