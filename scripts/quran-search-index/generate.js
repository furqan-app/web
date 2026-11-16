#!/usr/bin/env node
/**
 * Generate `public/quran/search-index.json` via the DB-free static generator.
 */

const { runGenerator } = require("../quran-static/generate");

runGenerator({ only: "search-index" }).catch((err) => {
  console.error("Error generating search index:", err);
  process.exit(1);
});
