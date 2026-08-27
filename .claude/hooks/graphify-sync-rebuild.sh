#!/bin/sh
# Runs the graphify knowledge-graph rebuild synchronously (foreground, blocking)
# against the commit that was just made, then folds any resulting graphify-out/
# changes into a follow-up commit. Used by /ship-fq-task so the PR always
# carries a graph that matches the shipped code, instead of relying on the
# async post-commit hook (.git/hooks/post-commit) which detaches and can
# finish after `git push` already ran.

set -e

_GFY_PROBE="import importlib.util, sys; sys.exit(0 if importlib.util.find_spec('graphify') else 1)"

# Resolve Python interpreter. Tries multiple locations because
# graphify-out/.graphify_python is gitignored (/graphify-out/.*) and therefore
# absent in git worktrees — only the main checkout has it.
GRAPHIFY_PYTHON=""

# Probe 1: local graphify-out/.graphify_python (works in the main checkout).
_LOCAL_PY_FILE="graphify-out/.graphify_python"
if [ -f "$_LOCAL_PY_FILE" ]; then
    _FROM_FILE=$(cat "$_LOCAL_PY_FILE" | tr -d '[:space:]')
    if [ -n "$_FROM_FILE" ] && [ -x "$_FROM_FILE" ] && "$_FROM_FILE" -c "$_GFY_PROBE" 2>/dev/null; then
        GRAPHIFY_PYTHON="$_FROM_FILE"
    fi
fi

# Probe 2: main repo's graphify-out/.graphify_python via git-common-dir.
# In a worktree --git-common-dir points to the main repo's .git/; its parent
# is the main checkout where .graphify_python was written by graphify hook install.
if [ -z "$GRAPHIFY_PYTHON" ]; then
    _GFY_COMMONDIR=$(cd "$(git rev-parse --git-common-dir 2>/dev/null)" 2>/dev/null && pwd)
    if [ -n "$_GFY_COMMONDIR" ]; then
        _MAIN_PY_FILE="$(dirname "$_GFY_COMMONDIR")/graphify-out/.graphify_python"
        if [ -f "$_MAIN_PY_FILE" ]; then
            _FROM_FILE=$(cat "$_MAIN_PY_FILE" | tr -d '[:space:]')
            if [ -n "$_FROM_FILE" ] && [ -x "$_FROM_FILE" ] && "$_FROM_FILE" -c "$_GFY_PROBE" 2>/dev/null; then
                GRAPHIFY_PYTHON="$_FROM_FILE"
            fi
        fi
    fi
fi

# Probe 3: graphify launcher on PATH — parse its shebang to find the interpreter.
if [ -z "$GRAPHIFY_PYTHON" ]; then
    GRAPHIFY_BIN=$(command -v graphify 2>/dev/null)
    if [ -n "$GRAPHIFY_BIN" ]; then
        _SHEBANG=$(head -c 256 "$GRAPHIFY_BIN" 2>/dev/null | tr -d '\000' | head -n 1 | sed 's/^#![[:space:]]*//')
        case "$_SHEBANG" in
            */env\ *) _CAND="${_SHEBANG#*/env }" ;;
            *)        _CAND="$_SHEBANG" ;;
        esac
        case "$_CAND" in
            *[!a-zA-Z0-9/_.@:\\-]*) _CAND="" ;;
        esac
        if [ -n "$_CAND" ] && "$_CAND" -c "$_GFY_PROBE" 2>/dev/null; then
            GRAPHIFY_PYTHON="$_CAND"
        fi
    fi
fi

# Probe 4: python3 / python on PATH.
if [ -z "$GRAPHIFY_PYTHON" ]; then
    if command -v python3 >/dev/null 2>&1 && python3 -c "$_GFY_PROBE" 2>/dev/null; then
        GRAPHIFY_PYTHON="python3"
    elif command -v python >/dev/null 2>&1 && python -c "$_GFY_PROBE" 2>/dev/null; then
        GRAPHIFY_PYTHON="python"
    fi
fi

if [ -z "$GRAPHIFY_PYTHON" ]; then
    echo "[graphify sync] ERROR: could not locate a Python with graphify installed; knowledge graph NOT updated." >&2
    echo "[graphify sync] Re-run 'graphify hook install' from the env where graphify lives, then retry." >&2
    exit 1
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
