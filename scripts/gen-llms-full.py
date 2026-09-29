#!/usr/bin/env python3
"""Regenerates static/llms-full.txt from the docs pages.

Keeps the page order and header already in llms-full.txt, and appends any
page listed in PAGES_TO_ADD. Each page is included without its YAML
frontmatter. Run from the repo root after changing any docs page:

    python3 scripts/gen-llms-full.py
"""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "static" / "llms-full.txt"
PAGES_TO_ADD: list[str] = []


def body(doc: str) -> str:
    text = (ROOT / doc.lstrip("/")).read_text()
    if text.startswith("---\n"):
        text = text[text.index("\n---\n", 4) + 5:]
    return text.strip("\n")


def main() -> None:
    old = OUT.read_text()
    order = re.findall(r"^# Source: (/docs/\S+)$", old, re.M)
    order += [p for p in PAGES_TO_ADD if p not in order]
    header = old[: old.index("# Source:")]
    parts = [f"# Source: {doc}\n\n{body(doc)}\n" for doc in order]
    OUT.write_text(header + "\n---\n\n".join(parts))
    print(f"wrote {len(order)} pages to {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
