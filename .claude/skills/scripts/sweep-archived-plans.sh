#!/usr/bin/env bash
# Move finished, uncited plans out of docs/plans/ into docs/plans/archive/.
#
# A plan is archived when BOTH hold:
#   - status ∈ {implemented, superseded}  (from YAML frontmatter)
#   - its basename is not linked / path-referenced from any authoritative doc
#     (docs/architecture, docs/standards, docs/workflow, docs/design, docs/deployment,
#      AGENTS.md, CLAUDE.md, PRODUCT.md, DESIGN.md, .claude, .github)
# Plan→plan links never protect a plan.
#
# After moving, every relative link inside docs/plans/**/*.md is recomputed from the file's
# new location so nothing breaks (links from moved files, and links from kept files/indexes
# that pointed at a now-moved plan).
#
# EXPLICITLY INVOKED ONLY. Never call this from gen-plans-index.sh or a hook — a routine
# index regen must never `git mv` files as a side effect. See ADR 0059.
#
# Usage:  bash .claude/skills/scripts/sweep-archived-plans.sh [--dry-run]
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"

python3 - "${1:-}" <<'PY'
import os, pathlib, re, subprocess, sys

dry = sys.argv[1] == "--dry-run"
PLANS = (pathlib.Path("docs/plans")).resolve()
ARCHIVE = PLANS / "archive"

AUTH_GLOBS = [
    "docs/architecture/**/*.md", "docs/standards/**/*.md", "docs/workflow/**/*.md",
    "docs/design/**/*.md", "docs/deployment/**/*.md",
    "AGENTS.md", "CLAUDE.md", "PRODUCT.md", "DESIGN.md",
    ".claude/**/*.md", ".github/**/*.md",
]
LINK = re.compile(r"(\]\()([^)\s]+?\.md)((?:#[^)]*)?)(\))")

def status(text):
    if text.startswith("---\n"):
        try:
            fm = text[4:text.index("\n---\n", 4)]
        except ValueError:
            return "?"
        m = re.search(r"^status:\s*(.+)$", fm, re.M)
        if m:
            return m.group(1).strip().strip('"')
    return "?"

tracked = {pathlib.Path(p).resolve()
           for p in subprocess.check_output(["git", "ls-files", "docs/plans"], text=True).split()}
plan_files = sorted(
    p for p in PLANS.rglob("*.md")
    if p.name != "INDEX.md"
    and ARCHIVE not in p.parents
    and p.resolve() in tracked
)

cited = set()
for g in AUTH_GLOBS:
    for f in pathlib.Path(".").glob(g):
        s = str(f)
        if "node_modules" in s or "graphify-out" in s or s.startswith("docs/plans"):
            continue
        try:
            txt = f.read_text()
        except Exception:
            continue
        for m in re.finditer(r"(?:docs/)?plans/(?:[A-Za-z0-9._-]+/)?([A-Za-z0-9._-]+\.md)", txt):
            cited.add(m.group(1))

to_archive = [p for p in plan_files
              if status(p.read_text()) in ("implemented", "superseded") and p.name not in cited]

moved = {p.resolve(): (ARCHIVE / p.relative_to(PLANS)).resolve() for p in to_archive}

print(f"{len(plan_files)} tracked plans → archive {len(to_archive)}, keep {len(plan_files) - len(to_archive)}")
if dry:
    for p in to_archive:
        print("  archive:", p.relative_to(PLANS))
    sys.exit(0)

for old, new in moved.items():
    new.parent.mkdir(parents=True, exist_ok=True)
    subprocess.check_call(["git", "mv", str(old), str(new)])

# recompute every relative .md link in docs/plans/, from each file's NEW location
rewrites = 0
generated = {(PLANS / "INDEX.md").resolve(), (ARCHIVE / "INDEX.md").resolve()}
new_to_old = {v: k for k, v in moved.items()}
for f in sorted(PLANS.rglob("*.md")):
    if f.resolve() in generated:            # generated indexes — regenerated below
        continue
    f_abs = f.resolve()
    old_dir = new_to_old.get(f_abs, f_abs).parent
    new_dir = f_abs.parent
    def repl(m):
        global rewrites
        target = m.group(2)
        if target.startswith(("http://", "https://", "#")):
            return m.group(0)
        abs_t = (old_dir / target).resolve()
        abs_t = moved.get(abs_t, abs_t)          # follow the target if it moved too
        if not abs_t.exists():
            return m.group(0)                    # pre-broken link or placeholder — leave it
        newrel = os.path.relpath(abs_t, new_dir)
        if newrel == target:
            return m.group(0)
        rewrites += 1
        return f"{m.group(1)}{newrel}{m.group(3)}{m.group(4)}"
    txt = f.read_text()
    new_txt = LINK.sub(repl, txt)
    if new_txt != txt:
        f.write_text(new_txt)
print(f"recomputed {rewrites} relative link(s)")

subprocess.check_call(["bash", ".claude/skills/scripts/gen-plans-index.sh"])
PY
