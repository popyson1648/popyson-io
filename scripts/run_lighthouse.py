#!/usr/bin/env python3

from __future__ import annotations

import functools
import http.server
import json
import os
import socketserver
import subprocess
import threading
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DIST_DIR = ROOT / "dist"
REPORT_DIR = ROOT / ".tmp" / "lhci"
REPORT_PATH = REPORT_DIR / "lhr.json"

CATEGORY_THRESHOLDS = {
    "performance": 0.7,
    "accessibility": 0.8,
    "best-practices": 0.8,
    "seo": 0.8,
}

CHROME_FLAGS = " ".join(
    [
        "--headless=new",
        "--no-sandbox",
        "--disable-gpu",
        "--disable-dev-shm-usage",
        "--no-first-run",
        "--user-data-dir=/tmp/popyson-io-lighthouse-chrome",
    ]
)


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, format: str, *args: object) -> None:
        return


def run_static_server() -> tuple[socketserver.TCPServer, int]:
    handler = functools.partial(QuietHandler, directory=str(DIST_DIR))
    server = socketserver.TCPServer(("127.0.0.1", 0), handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    return server, server.server_address[1]


def warn_on_thresholds(report_path: Path) -> None:
    report = json.loads(report_path.read_text(encoding="utf-8"))
    categories = report.get("categories", {})

    for category, min_score in CATEGORY_THRESHOLDS.items():
        score = categories.get(category, {}).get("score")
        if score is None:
            print(f"Warning: Lighthouse category '{category}' was not reported.")
            continue
        if score < min_score:
            print(
                "Warning: Lighthouse "
                f"{category} score {score:.2f} is below threshold {min_score:.2f}."
            )


def main() -> int:
    if not DIST_DIR.exists():
        print("dist does not exist. Run `npm run build` before `npm run lighthouse`.")
        return 1

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

    REPORT_DIR.mkdir(parents=True, exist_ok=True)

    server, port = run_static_server()
    try:
        result = subprocess.run(
            [
                "npx",
                "--no-install",
                "lighthouse",
                f"http://127.0.0.1:{port}/",
                "--output=json",
                f"--output-path={REPORT_PATH}",
                f"--chrome-flags={CHROME_FLAGS}",
                "--quiet",
            ],
            env=env,
        )
    finally:
        server.shutdown()
        server.server_close()

    if result.returncode != 0:
        return result.returncode

    warn_on_thresholds(REPORT_PATH)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
