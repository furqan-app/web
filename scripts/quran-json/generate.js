#!/usr/bin/env node
/**
 * Generate `public/quran/pages/{1,2,19}/*.json` and `public/quran/verse-pages/*.json`
 * via the DB-free static generator.
 */

const { runGenerator } = require("../quran-static/generate");

runGenerator({ only: "pages" }).catch((err) => {
  console.error("Error generating Quran static page JSON:", err);
  process.exit(1);
});
