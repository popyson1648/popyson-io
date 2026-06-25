#!/usr/bin/env python3

from __future__ import annotations

import sys
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def fail(message: str) -> None:
    print(f"[a11y-static] {message}", file=sys.stderr)


def has_any(haystack: str, needles: list[str]) -> bool:
    return any(needle in haystack for needle in needles)


def font_sizes_below(path: str, css: str, minimum_px: float) -> list[str]:
    violations: list[str] = []
    for line_no, line in enumerate(css.splitlines(), 1):
        for match in re.finditer(r"font(?:-size)?\s*:\s*([^;}{]+)", line):
            for value in re.findall(r"(\d+(?:\.\d+)?)px", match.group(1)):
                if float(value) < minimum_px:
                    violations.append(f"{path}:{line_no} uses {value}px")
    return violations


def main() -> int:
    checks: list[tuple[bool, str]] = []
    components = read("src/components.jsx")
    pages = read("src/pages.jsx")
    blog = read("src/blog.jsx")
    app = read("src/app.jsx")
    app_css = read("src/app.css")
    styles_css = read("src/styles.css")

    # The formatter may place each JSX attribute on its own line, so allow whitespace
    # (including newlines) between `<button` and its first `className` attribute.
    checks.append((bool(re.search(r"<button\s+className=\"made-card\"", pages)), "made-card must be a native button"))
    checks.append((bool(re.search(r"<button\s+className=\"fbtn ficon fbar-back\"", blog)), "filter/sort toolbar back control must be a native button"))
    checks.append((
        "role=\"combobox\"" in blog and "aria-label={t.search}" in blog and "aria-autocomplete=\"list\"" in blog,
        "inline search must be a labelled combobox with list autocomplete"))
    checks.append((
        "aria-controls=\"search-results\"" in blog and "id=\"search-results\"" in blog and "role=\"listbox\"" in blog,
        "search combobox must control a results listbox"))
    checks.append(("aria-current={here === key ? \"page\" : undefined}" in components, "active navigation links must expose aria-current"))
    checks.append((
        "aria-expanded={openPanel === \"filter\"}" in blog and "aria-controls=\"filter-panel\"" in blog
        and "aria-expanded={openPanel === \"sort\"}" in blog and "aria-controls=\"sort-panel\"" in blog,
        "filter/sort panel triggers must expose expanded state and controls"))
    checks.append(("role=\"status\"" in pages and "aria-live=\"polite\"" in pages, "copy feedback must be announced with a live region"))
    checks.append(("aria-label={t.copy_rss_url}" in pages, "RSS copy button must have an accessible name"))
    checks.append((
        "button.setAttribute(\"aria-label\", t.copy_code)" in blog
        and "button.setAttribute(\"aria-label\", t.copied_code)" in blog
        and ".code-copy" in blog,
        "code copy button must keep an accessible name"))
    checks.append((
        "react-markdown" not in blog
        and "shiki" not in blog
        and "remark" not in blog
        and "micromark" not in blog,
        "client article code must not import the Markdown/Shiki stack"))
    checks.append(("id=\"main\"" in app, "main content region must be directly targetable"))
    checks.append((".sr-only" in styles_css, "screen-reader-only utility must exist"))
    checks.append(("@media (prefers-reduced-motion: reduce)" in app_css and ".modal" in app_css and ".menu" in app_css, "modal and menu animations must respect reduced motion"))
    # Match the .prose body font-size independently of CSS formatting: the formatter
    # may wrap single-line rules across multiple lines. [^}] spans newlines, so each
    # pattern stays scoped to its own rule block. Top-level (column 0) selector is the
    # desktop rule; an indented selector is the mobile rule inside a media query.
    checks.append((
        bool(re.search(r"^\.prose[ \t]*\{[^}]*?font-size:\s*16px\b", app_css, re.MULTILINE)),
        "article body text must be at least 16px"))
    checks.append((
        bool(re.search(r"^[ \t]+\.prose[ \t]*\{[^}]*?font-size:\s*16px\b", app_css, re.MULTILINE)),
        "mobile article body text must stay at least 16px"))
    checks.append((not has_any(app_css, [
        ".topbar .btn-ghost { padding: 4px 7px; font-size: 11px;",
        ".post-index-meta { font-family: var(--mono); font-size: 11px;",
        ".post-index-tags { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 2px; font-size: 11px;",
        ".article-back {\n  appearance: none; border: none; background: transparent; color: var(--text-faint);\n  font: inherit; font-size: 11px;",
        ".article-meta { gap: 12px; font-family: var(--mono); font-size: 11px;",
        ".article-tags { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 16px; font-family: var(--mono); font-size: 11px;",
        ".rel-date { font-size: 10.5px;",
    ]), "known public UI text must not regress to 10-11px"))
    font_violations = font_sizes_below("src/app.css", app_css, 12)
    checks.append((not font_violations, "font sizes must not be below 12px: " + ", ".join(font_violations[:5])))

    icon_controls = [line for line in components.splitlines() if "className=\"icon-btn" in line]
    unnamed = [control for control in icon_controls if "aria-label=" not in control]
    checks.append((not unnamed, "icon-only topbar controls must have aria-label"))

    failed = False
    for ok, message in checks:
        if not ok:
            fail(message)
            failed = True

    if failed:
        return 1

    print("[a11y-static] passed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
