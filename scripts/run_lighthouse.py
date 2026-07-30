#!/usr/bin/env python3

from __future__ import annotations

import json
import os
import socket
import statistics
import subprocess
import tempfile
import time
import urllib.request
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DIST_DIR = ROOT / "dist"
REPORT_DIR = ROOT / ".tmp" / "lhci"

CATEGORY_THRESHOLDS = {
    "performance": 0.7,
    "accessibility": 0.8,
    "best-practices": 0.8,
    "seo": 0.8,
}

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


def available_port() -> int:
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        return int(sock.getsockname()[1])


def wait_for_server(url: str, process: subprocess.Popen[bytes]) -> None:
    deadline = time.monotonic() + 15
    while time.monotonic() < deadline:
        if process.poll() is not None:
            raise RuntimeError("Vite preview exited before Lighthouse could connect")
        try:
            with urllib.request.urlopen(url, timeout=1):
                return
        except OSError:
            time.sleep(0.1)
    raise RuntimeError(f"Timed out waiting for Vite preview at {url}")


def audit_routes() -> list[tuple[str, str]]:
    article_indexes = sorted((DIST_DIR / "blog").glob("*/index.html"))
    routes = [("about", "/"), ("blog", "/blog")]
    if article_indexes:
        routes.append(("article", f"/blog/{article_indexes[-1].parent.name}"))
    return routes


def find_chrome(env: dict[str, str]) -> None:
    if "CHROME_PATH" in env:
        return
    cache = Path.home() / ".cache" / "ms-playwright"
    candidates = sorted(cache.glob("chromium-*/chrome-linux*/chrome"), reverse=True)
    if candidates:
        env["CHROME_PATH"] = str(candidates[0])


def report_metrics(report_path: Path) -> dict[str, float]:
    report = json.loads(report_path.read_text(encoding="utf-8"))
    audits = report.get("audits", {})

    def metric(name: str) -> float:
        return float(audits.get(name, {}).get("numericValue") or 0)

    return {
        "performance": float(
            report.get("categories", {}).get("performance", {}).get("score") or 0
        ),
        "FCP": metric("first-contentful-paint"),
        "LCP": metric("largest-contentful-paint"),
        "TBT": metric("total-blocking-time"),
        "CLS": metric("cumulative-layout-shift"),
    }


def report_summary(metrics: dict[str, float], label: str, run: int) -> None:
    print(
        f"{label} run {run}: performance={metrics['performance']:.2f} "
        f"FCP={metrics['FCP']:.0f}ms "
        f"LCP={metrics['LCP']:.0f}ms "
        f"TBT={metrics['TBT']:.0f}ms "
        f"CLS={metrics['CLS']:.4f}"
    )


def report_median(results: list[dict[str, float]], label: str) -> None:
    values = {
        key: statistics.median(result[key] for result in results)
        for key in results[0]
    }
    print(
        f"{label} median: performance={values['performance']:.2f} "
        f"FCP={values['FCP']:.0f}ms "
        f"LCP={values['LCP']:.0f}ms "
        f"TBT={values['TBT']:.0f}ms "
        f"CLS={values['CLS']:.4f}"
    )


def main() -> int:
    if not DIST_DIR.exists():
        print("dist does not exist. Run `npm run build` before `npm run lighthouse`.")
        return 1

    env = os.environ.copy()
    find_chrome(env)
    REPORT_DIR.mkdir(parents=True, exist_ok=True)
    runs = max(1, int(env.get("LIGHTHOUSE_RUNS", "1")))
    port = available_port()
    base_url = f"http://127.0.0.1:{port}"
    preview = subprocess.Popen(
        [
            "npx",
            "--no-install",
            "vite",
            "preview",
            "--host",
            "127.0.0.1",
            "--port",
            str(port),
            "--strictPort",
        ],
        cwd=ROOT,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    try:
        wait_for_server(base_url, preview)
        for label, route in audit_routes():
            results = []
            for run in range(1, runs + 1):
                report_path = REPORT_DIR / f"{label}-{run}.json"
                with tempfile.TemporaryDirectory(prefix="popyson-lighthouse-") as profile:
                    chrome_flags = " ".join(
                        [
                            "--headless=new",
                            "--no-sandbox",
                            "--disable-gpu",
                            "--disable-dev-shm-usage",
                            "--no-first-run",
                            f"--user-data-dir={profile}",
                        ]
                    )
                    result = subprocess.run(
                        [
                            "npx",
                            "--no-install",
                            "lighthouse",
                            f"{base_url}{route}",
                            "--output=json",
                            f"--output-path={report_path}",
                            f"--chrome-flags={chrome_flags}",
                            "--quiet",
                        ],
                        cwd=ROOT,
                        env=env,
                    )
                if result.returncode != 0:
                    return result.returncode
                warn_on_thresholds(report_path)
                metrics = report_metrics(report_path)
                results.append(metrics)
                report_summary(metrics, label, run)
            if runs > 1:
                report_median(results, label)
    finally:
        preview.terminate()
        try:
            preview.wait(timeout=5)
        except subprocess.TimeoutExpired:
            preview.kill()
            preview.wait()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
