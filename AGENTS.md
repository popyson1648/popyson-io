# Repository Rules

## Required Files

This repository must contain:

- `.plans/`
- `.decisions/`
- `.project/`
- `.template/`
- `.project/verification.toml`
- `scripts/verify.py`
- `.pre-commit-config.yaml`
- `.github/workflows/ci.yml`

## Templates

Use the files under `.template/` when creating or refreshing project documentation and config files.

## Document Rules

- Write files under `.project/` in English.
- Write for new contributors and coding agents.
- Keep the documents short and concrete.
- Store decision history in `.decisions/`.
- Store task plans in `.plans/`.

## Plan Rules

- Create one Markdown file per task under `.plans/`.
- Use `.plans/TEMPLATE.md` as the starting point.

## Decision Rules

- Create one Markdown file per decision under `.decisions/`.
- Record design, rule, structure, and policy decisions.
- Use `.decisions/TEMPLATE.md` as the starting point.

## Project Documentation Rules

- Keep `.project/` focused on the current project state.
- Update `.project/` when commands, workflows, structure, or rules change.
- Use the files under `.template/` as the source templates for `.project/`.

## Verification Rules

- Keep `.project/verification.toml` up to date with the current verification commands.
- Run verification with `python3 scripts/verify.py`.
- Do not assume execute permission on `scripts/verify.py`.

## Local Checks

- Keep `.pre-commit-config.yaml` aligned with the current local verification workflow.

## CI Rules

- Keep `.github/workflows/ci.yml` aligned with the current CI verification workflow.
