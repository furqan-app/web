#!/usr/bin/env bash
# Statusline: user's global statusline (~/.claude/statusline-command.sh),
# then a [MUJAZ] badge with a running "tokens saved" counter from
# .claude/.mujaz-stats.json (see mujaz-stats.js).
input="$(cat)"

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
STATS_FILE="$DIR/../.mujaz-stats.json"
OFF_FLAG="$DIR/../.mujaz-off"
GLOBAL_STATUSLINE="$HOME/.claude/statusline-command.sh"

base=""
if [ -f "$GLOBAL_STATUSLINE" ]; then
  base="$(printf '%s' "$input" | bash "$GLOBAL_STATUSLINE")"
fi

if [ -f "$OFF_FLAG" ]; then
  badge="[mujaz: off]"
elif [ -f "$STATS_FILE" ]; then
  # Pure-bash extraction — avoids spawning node on every statusline repaint.
  saved=$(grep -o '"totalSavedTokens"[[:space:]]*:[[:space:]]*[0-9]*' "$STATS_FILE" | grep -o '[0-9]*$')
  badge="[MUJAZ] ~${saved:-0} tokens saved (est.)"
else
  badge="[MUJAZ]"
fi

if [ -n "$base" ]; then
  printf '%s | %s\n' "$base" "$badge"
else
  printf '%s\n' "$badge"
fi
