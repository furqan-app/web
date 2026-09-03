#!/usr/bin/env bash
# Regenerate docs/plans/INDEX.md (active plans) and docs/plans/archive/INDEX.md (archived)
# from every plan's YAML frontmatter. Deterministic: output is a pure function of the
# frontmatter. Run from anywhere — it resolves the repo root itself. See ADR 0059.
#
# This script NEVER moves files. The archive sweep is a separate, explicitly-invoked script
# (.claude/skills/scripts/sweep-archived-plans.sh).
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"

python3 - <<'PY'
import pathlib, re, sys

PLANS = pathlib.Path("docs/plans")
ACTIVE_OUT = PLANS / "INDEX.md"
ARCHIVE_OUT = PLANS / "archive" / "INDEX.md"
OUTPUTS = {ACTIVE_OUT, ARCHIVE_OUT}
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

active, archived, problems = [], [], []
for path in sorted(PLANS.rglob("*.md")):
    if path in OUTPUTS:
        continue
    is_archived = "archive" in path.relative_to(PLANS).parts
    fm = frontmatter(path.read_text())
    rel = path.relative_to((ARCHIVE_OUT if is_archived else ACTIVE_OUT).parent).as_posix()
    if not fm:
        problems.append(path.relative_to(PLANS).as_posix())
        continue
    (archived if is_archived else active).append({
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

def table(rows):
    out = ["| Area | Plan | Status | Type |", "|---|---|---|---|"]
    for r in sorted(rows, key=sort_key):
        out.append(f"| {r['area']} | [{r['title']}]({r['path']}) | {r['status']} | {r['type']} |")
    return out

active_lines = [
    "# Plans Index",
    "",
    "Generated from each plan's YAML frontmatter by `.claude/skills/scripts/gen-plans-index.sh` "
    "([ADR 0059](../architecture/adr/0059-plan-lifecycle-frontmatter-and-index.md)). Do not hand-edit — "
    "regenerate after adding or changing a plan.",
    "",
    f"{len(active)} active plans.",
]
if archived:
    active_lines += [
        "",
        f"{len(archived)} finished plans are archived — see [archive/INDEX.md](archive/INDEX.md). "
        "Never load an archived plan for background context; its durable content lives in "
        "`docs/architecture/decisions/*.md` + ADRs.",
    ]
active_lines += ["", *table(active), ""]
ACTIVE_OUT.write_text("\n".join(active_lines))
print(f"wrote {ACTIVE_OUT} ({len(active)} active plans)")

if archived:
    ARCHIVE_OUT.parent.mkdir(parents=True, exist_ok=True)
    ARCHIVE_OUT.write_text("\n".join([
        "# Archived Plans",
        "",
        "Finished (`implemented` / `superseded`) plans with no reference from an authoritative "
        "doc, moved here by `.claude/skills/scripts/sweep-archived-plans.sh` "
        "([ADR 0059](../../architecture/adr/0059-plan-lifecycle-frontmatter-and-index.md)). "
        "Kept for history only — do not read one as task context; `docs/architecture/decisions/*.md` "
        "and the ADRs carry the durable knowledge.",
        "",
        f"{len(archived)} archived plans.",
        "",
        *table(archived),
        "",
    ]))
    print(f"wrote {ARCHIVE_OUT} ({len(archived)} archived plans)")
PY
