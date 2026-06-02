#!/usr/bin/env python3

from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path
import tomllib


DEFAULT_ORDER = [
    "format",
    "lint",
    "typecheck",
    "build",
    "test_unit",
    "test_integration",
    "test_e2e",
    "test_component",
    "test_contract",
    "accessibility",
    "performance",
    "bundle_size",
]

MODE_FLAG_MAP = {
    "all": None,
    "edit": "run_on_edit",
    "pre-commit": "run_pre_commit",
    "pre-push": "run_pre_push",
    "ci": "run_in_ci",
}


def load_config(config_path: Path) -> dict:
    if not config_path.exists():
        print(f"verification config not found: {config_path}", file=sys.stderr)
        raise SystemExit(2)

    with config_path.open("rb") as f:
        data = tomllib.load(f)

    if not isinstance(data, dict):
        print("verification config must be a TOML table", file=sys.stderr)
        raise SystemExit(2)

    return data


def normalize_phase(name: str, entry: dict) -> dict:
    if not isinstance(entry, dict):
        print(f"phase '{name}' must be a TOML table", file=sys.stderr)
        raise SystemExit(2)

    return {
        "name": name,
        "enabled": bool(entry.get("enabled", False)),
        "command": str(entry.get("command", "")).strip(),
        "reason": str(entry.get("reason", "")).strip(),
        "run_on_edit": _optional_bool(entry.get("run_on_edit")),
        "run_pre_commit": _optional_bool(entry.get("run_pre_commit")),
        "run_pre_push": _optional_bool(entry.get("run_pre_push")),
        "run_in_ci": _optional_bool(entry.get("run_in_ci")),
    }


def _optional_bool(value: object) -> bool | None:
    if value is None:
        return None
    return bool(value)


def collect_phases(config: dict) -> list[dict]:
    raw_phases = config.get("phases")
    if raw_phases is None:
        return []

    if not isinstance(raw_phases, dict):
        print("[phases] must be a TOML table", file=sys.stderr)
        raise SystemExit(2)

    phases_by_name = {
        name: normalize_phase(name, entry)
        for name, entry in raw_phases.items()
    }

    ordered: list[dict] = []

    for name in DEFAULT_ORDER:
        phase = phases_by_name.pop(name, None)
        if phase is not None:
            ordered.append(phase)

    for name in sorted(phases_by_name.keys()):
        ordered.append(phases_by_name[name])

    return ordered


def is_selected_for_mode(phase: dict, mode: str) -> bool:
    if not phase["enabled"]:
        return False

    flag_name = MODE_FLAG_MAP[mode]
    if flag_name is None:
        return True

    flag_value = phase.get(flag_name)
    if flag_value is None:
        return True

    return bool(flag_value)


def run_command(command: str) -> int:
    completed = subprocess.run(command, shell=True)
    return completed.returncode


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Run repository verification phases from .project/verification.toml."
    )
    parser.add_argument(
        "--config",
        default=".project/verification.toml",
        help="Path to verification.toml",
    )
    parser.add_argument(
        "--mode",
        choices=["all", "edit", "pre-commit", "pre-push", "ci"],
        default="all",
        help="Execution mode",
    )
    parser.add_argument(
        "--only",
        nargs="*",
        default=[],
        help="Run only the specified phases",
    )
    parser.add_argument(
        "--list",
        action="store_true",
        help="List selected phases and exit",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    config_path = Path(args.config)

    config = load_config(config_path)
    phases = collect_phases(config)

    only_set = set(args.only)
    selected_phases: list[dict] = []

    for phase in phases:
        if only_set and phase["name"] not in only_set:
            continue
        if is_selected_for_mode(phase, args.mode):
            selected_phases.append(phase)

    if args.list:
        for phase in selected_phases:
            print(phase["name"])
        return 0

    if not selected_phases:
        print("no verification phases selected")
        return 0

    print(f"mode: {args.mode}")
    print(f"config: {config_path}")

    for phase in selected_phases:
        print("")
        print(f"[verify] phase: {phase['name']}")

        command = phase["command"]
        if not command:
            reason = phase["reason"]
            if reason:
                print(f"[verify] skipped: {reason}")
                continue
            print(f"[verify] failed: phase '{phase['name']}' has no command", file=sys.stderr)
            return 2

        print(f"[verify] command: {command}")
        code = run_command(command)

        if code != 0:
            print(
                f"[verify] failed: {phase['name']} ( exit code {code} )",
                file=sys.stderr,
            )
            return code

        print(f"[verify] passed: {phase['name']}")

    print("")
    print("[verify] all selected phases passed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
