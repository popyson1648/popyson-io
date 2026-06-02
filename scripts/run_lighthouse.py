#!/usr/bin/env python3

from __future__ import annotations

import os
import subprocess
from pathlib import Path


def main() -> int:
    env = os.environ.copy()
    candidates = [
        Path.home() / ".cache/ms-playwright/chromium-1217/chrome-linux64/chrome",
        Path.home() / ".cache/ms-playwright/chromium-1208/chrome-linux64/chrome",
    ]

    if "CHROME_PATH" not in env:
        for candidate in candidates:
            if candidate.exists():
                env["CHROME_PATH"] = str(candidate)
                break

    return subprocess.run(["npx", "lhci", "autorun"], env=env).returncode


if __name__ == "__main__":
    raise SystemExit(main())
