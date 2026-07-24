#!/usr/bin/env bash
# Statusline badge: [MUJAZ] plus a running "tokens saved" counter from
# .claude/.mujaz-stats.json (see mujaz-stats.js). Reads stdin (Claude Code
# passes session/model JSON) but doesn't need it — badge is static content.
cat >/dev/null

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
STATS_FILE="$DIR/../.mujaz-stats.json"
OFF_FLAG="$DIR/../.mujaz-off"

if [ -f "$OFF_FLAG" ]; then
  echo "[mujaz: off]"
elif [ -f "$STATS_FILE" ]; then
  # Pure-bash extraction — avoids spawning node on every statusline repaint.
  saved=$(grep -o '"totalSavedTokens"[[:space:]]*:[[:space:]]*[0-9]*' "$STATS_FILE" | grep -o '[0-9]*$')
  echo "[MUJAZ] ~${saved:-0} tokens saved (est.)"
else
  echo "[MUJAZ]"
fi
