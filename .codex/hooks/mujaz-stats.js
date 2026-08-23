#!/usr/bin/env node
// Stop hook: estimates tokens "saved" by mujaz mode and logs cumulative
// totals to .claude/.mujaz-stats.json (local, gitignored — not real
// telemetry, nothing leaves this machine).
//
// Heuristic, not a measurement: there's no baseline "verbose" response to
// diff against, so we assume terse mode cuts ~35% of output tokens (rough,
// unverified estimate) and back into what the verbose version "would have"
// cost. Treat the numbers as a rough motivational counter, not an audited
// savings figure.

const fs = require('fs');
const { FLAG_PATH, STATS_PATH } = require('./mujaz-config');

const ASSUMED_CUT_RATIO = 0.35;
const CHARS_PER_TOKEN = 4; // rough estimate, not a real tokenizer

function readStdin() {
  try {
    return fs.readFileSync(0, 'utf8');
  } catch (e) {
    return '';
  }
}

// Scans backward past tool-only assistant turns (no text block) to find the
// most recent assistant turn that actually produced text.
function lastAssistantTextLength(transcriptPath) {
  let lines;
  try {
    lines = fs.readFileSync(transcriptPath, 'utf8').trim().split('\n');
  } catch (e) {
    return 0;
  }
  for (let i = lines.length - 1; i >= 0; i--) {
    let entry;
    try {
      entry = JSON.parse(lines[i]);
    } catch (e) {
      continue;
    }
    const msg = entry.message;
    if (entry.type === 'assistant' && msg && Array.isArray(msg.content)) {
      const chars = msg.content
        .filter((b) => b.type === 'text' && typeof b.text === 'string')
        .reduce((sum, b) => sum + b.text.length, 0);
      if (chars > 0) return chars;
    }
  }
  return 0;
}

function writeStatsAtomic(stats) {
  const tmpPath = STATS_PATH + '.tmp';
  fs.writeFileSync(tmpPath, JSON.stringify(stats, null, 2));
  fs.renameSync(tmpPath, STATS_PATH);
}

try {
  if (fs.existsSync(FLAG_PATH)) process.exit(0); // mujaz mode is off — nothing to log

  const input = JSON.parse(readStdin() || '{}');
  const transcriptPath = input.transcript_path;
  if (!transcriptPath) process.exit(0);

  const chars = lastAssistantTextLength(transcriptPath);
  if (chars === 0) process.exit(0);

  const actualTokens = Math.round(chars / CHARS_PER_TOKEN);
  const estimatedVerboseTokens = Math.round(actualTokens / (1 - ASSUMED_CUT_RATIO));
  const savedTokens = estimatedVerboseTokens - actualTokens;

  let stats = { totalActualTokens: 0, totalSavedTokens: 0, responses: 0 };
  try {
    stats = JSON.parse(fs.readFileSync(STATS_PATH, 'utf8'));
  } catch (e) {
    /* first run */
  }

  stats.totalActualTokens += actualTokens;
  stats.totalSavedTokens += savedTokens;
  stats.responses += 1;

  writeStatsAtomic(stats);
} catch (e) {
  // Never block Stop over stats bookkeeping.
}
