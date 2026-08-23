#!/bin/sh
# Runs the graphify knowledge-graph rebuild synchronously (foreground, blocking)
# against the commit that was just made, then folds any resulting graphify-out/
# changes into a follow-up commit. Used by /ship-fq-task so the PR always
# carries a graph that matches the shipped code, instead of relying on the
# async post-commit hook (.git/hooks/post-commit) which detaches and can
# finish after `git push` already ran.

set -e

_PYTHON_FILE="graphify-out/.graphify_python"
if [ ! -f "$_PYTHON_FILE" ]; then
    exit 0
fi
GRAPHIFY_PYTHON=$(cat "$_PYTHON_FILE" | tr -d '[:space:]')
if [ -z "$GRAPHIFY_PYTHON" ] || [ ! -x "$GRAPHIFY_PYTHON" ]; then
    exit 0
fi

CHANGED=$(git diff --name-only HEAD~1 HEAD 2>/dev/null || true)
_NON_GRAPH=$(echo "$CHANGED" | grep -v '^graphify-out/' || true)
if [ -z "$_NON_GRAPH" ]; then
    exit 0
fi

export PYTHONHASHSEED=0
export GRAPHIFY_CHANGED="$CHANGED"

echo "[graphify sync] rebuilding graph for shipped changes..."
"$GRAPHIFY_PYTHON" -c "
import os, sys
from pathlib import Path

changed_raw = os.environ.get('GRAPHIFY_CHANGED', '')
changed = [Path(f.strip()) for f in changed_raw.strip().splitlines() if f.strip()]
if not changed:
    sys.exit(0)

from graphify.watch import _rebuild_code, _apply_resource_limits
_apply_resource_limits()
# Always the current working directory, deliberately ignoring
# graphify-out/.graphify_root: that file holds the *main* repo's absolute
# path (it's a tracked file, checked out as-is into every worktree), but
# this script always runs with cwd = the worktree actually being shipped.
_root = Path('.')
try:
    _rebuild_code(_root, changed_paths=changed, force=False)
except Exception as exc:
    print(f'[graphify sync] rebuild failed: {exc}', file=sys.stderr)
    sys.exit(1)
"

if ! git diff --quiet -- graphify-out/ 2>/dev/null; then
    git add graphify-out/
    git commit -m "chore(graphify): update knowledge graph"
    echo "[graphify sync] graphify-out updated and committed."
else
    echo "[graphify sync] graphify-out already up to date."
fi
