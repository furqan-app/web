#!/usr/bin/env bash
# Regenerate docs/plans/INDEX.md from every plan's YAML frontmatter.
# Deterministic: output is a pure function of the frontmatter. Run from the repo root
# (or anywhere — it resolves the repo root itself). See ADR 0059.
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"

python3 - <<'PY'
import pathlib, re, sys

PLANS = pathlib.Path("docs/plans")
OUT = PLANS / "INDEX.md"
STATUS_ORDER = ["ready-to-implement", "in-progress", "implemented", "superseded", "unknown"]

def frontmatter(text):
    if not text.startswith("---\n"):
        return None
    try:
        end = text.index("\n---\n", 4)
    except ValueError:
        return None
    fm = {}
    for line in text[4:end].split("\n"):
        m = re.match(r"([A-Za-z_]+):\s*(.*)", line)
        if m:
            fm[m.group(1)] = m.group(2).strip().strip('"')
    return fm

rows, problems = [], []
for path in sorted(PLANS.rglob("*.md")):
    if path == OUT:
        continue
    fm = frontmatter(path.read_text())
    rel = path.relative_to(PLANS).as_posix()
    if not fm:
        problems.append(rel)
        continue
    rows.append({
        "title": fm.get("title") or path.stem,
        "area": fm.get("area") or "?",
        "status": fm.get("status") or "unknown",
        "type": fm.get("type") or "?",
        "path": rel,
    })

if problems:
    print("plans with no parseable frontmatter:\n  " + "\n  ".join(problems), file=sys.stderr)
    sys.exit(1)

def sort_key(r):
    st = STATUS_ORDER.index(r["status"]) if r["status"] in STATUS_ORDER else len(STATUS_ORDER)
    return (r["area"], st, r["title"].lower())

rows.sort(key=sort_key)

lines = [
    "# Plans Index",
    "",
    "Generated from each plan's YAML frontmatter by `.claude/skills/scripts/gen-plans-index.sh` "
    "([ADR 0059](../architecture/adr/0059-plan-lifecycle-frontmatter-and-index.md)). Do not hand-edit — "
    "regenerate after adding or changing a plan.",
    "",
    f"{len(rows)} plans.",
    "",
    "| Area | Plan | Status | Type |",
    "|---|---|---|---|",
]
for r in rows:
    lines.append(f"| {r['area']} | [{r['title']}]({r['path']}) | {r['status']} | {r['type']} |")
lines.append("")
OUT.write_text("\n".join(lines))
print(f"wrote {OUT} ({len(rows)} plans)")
PY
