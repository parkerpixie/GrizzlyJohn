'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { INHALE_MS, HOLD_MS, EXHALE_MS, BREATHS_PER_SET, TOTAL_SET_MS } = require('../breath-v3-clock.js');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('Breath Box preserves the established 4-2-6 rhythm for three breaths', () => {
  assert.equal(INHALE_MS, 4000);
  assert.equal(HOLD_MS, 2000);
  assert.equal(EXHALE_MS, 6000);
  assert.equal(BREATHS_PER_SET, 3);
  assert.equal(TOTAL_SET_MS, 36000);
});

test('Breath Box adds an old-timey analog face plus an exact elapsed display', () => {
  const source = read('breath-v3-clock.js');
  const css = read('breath-v3-clock.css');
  assert.match(source, /XII/);
  assert.match(source, /III/);
  assert.match(source, /VI/);
  assert.match(source, /IX/);
  assert.match(source, /data-breath-elapsed/);
  assert.match(source, /00:00\.0/);
  assert.match(source, /requestAnimationFrame/);
  assert.match(css, /\.breath-clock-face/);
  assert.match(css, /\.breath-exact-time/);
});

test('clock enhancement can attach to the existing breathing card and has a safe fallback card', () => {
  const source = read('breath-v3-clock.js');
  assert.match(source, /#breathingCard/);
  assert.match(source, /#feelingCheckIn/);
  assert.match(source, /if \(card\) return \{ card, created: false \}/);
  assert.match(source, /dataset\.breathClockV3/);
});

test('stopping a breathing session resets the elapsed clock without saving personal data', () => {
  const source = read('breath-v3-clock.js');
  assert.match(source, /stop\.addEventListener\('click', resetTimer\)/);
  assert.match(source, /stopTimer\(0\)/);
  assert.doesNotMatch(source, /localStorage\.setItem|sessionStorage\.setItem/);
});

test('reduced-motion preference keeps the exact timer while avoiding hand animation updates', () => {
  const source = read('breath-v3-clock.js');
  const css = read('breath-v3-clock.css');
  assert.match(source, /prefers-reduced-motion: reduce/);
  assert.match(source, /if \(!reducedMotion\)/);
  assert.match(css, /prefers-reduced-motion: reduce/);
});
