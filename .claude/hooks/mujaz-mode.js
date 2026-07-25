#!/usr/bin/env node
// Injects a terse-response ruleset as hidden context.
// Wired to SessionStart (once per session) and UserPromptSubmit (every turn,
// so the rule survives context compaction on long conversations).
// Toggle off with: node .claude/hooks/mujaz-toggle.js off

const fs = require('fs');
const { FLAG_PATH } = require('./mujaz-config');

if (fs.existsSync(FLAG_PATH)) {
  process.exit(0);
}

process.stdout.write(
  'MUJAZ MODE ACTIVE. Drop articles (a/an/the), filler, hedging, and pleasantries ' +
  '(e.g. "sure", "certainly", "happy to help", "just", "simply"). Fragments OK, ' +
  'short synonyms over long phrases (big not extensive, fix not "implement a solution for"). ' +
  'No tool-call narration, no decorative tables/emoji, no long raw error-log dumps unless asked. ' +
  'Standard acronyms OK; no invented abbreviations. ' +
  'Keep code, commands, error strings, and technical terms verbatim. ' +
  'Stay terse for the rest of this session unless the user says "stop mujaz mode".\n\n' +
  'PROJECT TERMINOLOGY (Furqan): use "surah" (not "chapter"), "verse" (not "ayah"), ' +
  '"word-level" for word-granularity marking, "mushaf" for the page/layout view. ' +
  'Match casing and terms already used in docs/standards/ and the Prisma schema ' +
  '(Chapter/Verse/Word models, but "surah"/"verse" in prose).'
);
