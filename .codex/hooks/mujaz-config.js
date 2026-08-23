#!/usr/bin/env node
// Shared path constants for the mujaz-mode hook scripts. Single source of
// truth so the flag/stats filenames only need to change in one place.

const path = require('path');

const ROOT = path.join(__dirname, '..');

module.exports = {
  FLAG_PATH: path.join(ROOT, '.mujaz-off'),
  STATS_PATH: path.join(ROOT, '.mujaz-stats.json'),
};
