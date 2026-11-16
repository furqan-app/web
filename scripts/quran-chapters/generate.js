#!/usr/bin/env node
/**
 * Generate `public/quran/chapters.json` via the DB-free static generator.
 */

const { runGenerator } = require("../quran-static/generate");

runGenerator({ only: "chapters" }).catch((err) => {
  console.error("Error generating chapters JSON:", err);
  process.exit(1);
});
