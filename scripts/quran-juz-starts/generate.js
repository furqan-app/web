#!/usr/bin/env node
/**
 * Generate `public/quran/juz-starts.json` via the DB-free static generator.
 */

const { runGenerator } = require("../quran-static/generate");

runGenerator({ only: "juz-starts" }).catch((err) => {
  console.error("Error generating juz-starts JSON:", err);
  process.exit(1);
});
