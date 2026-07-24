#!/usr/bin/env node
// Flips mujaz mode on/off by creating/removing a flag file.
// Usage: node .claude/hooks/mujaz-toggle.js [on|off]  (no arg = flip)

const fs = require('fs');
const { FLAG_PATH } = require('./mujaz-config');

const arg = process.argv[2];

const isOff = fs.existsSync(FLAG_PATH);
const turnOff = arg === 'off' ? true : arg === 'on' ? false : !isOff;

if (turnOff) {
  fs.writeFileSync(FLAG_PATH, '');
  console.log('mujaz mode: OFF');
} else {
  try {
    fs.unlinkSync(FLAG_PATH);
  } catch (e) {
    /* already on */
  }
  console.log('mujaz mode: ON');
}
