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

test('the visible cue and clock follow 4 seconds in, 2 hold, and 6 out', () => {
  const source = read('breath-v3-clock.js');
  const css = read('breath-v3-clock.css');
  assert.match(source, /Breathe in · 4 seconds/);
  assert.match(source, /Hold · 2 seconds/);
  assert.match(source, /Breathe out · 6 seconds/);
  assert.match(source, /stage\.dataset\.breathPhase/);
  assert.match(css, /breathClockIn 4s/);
  assert.match(css, /breathClockOut 6s/);
  assert.match(css, /data-breath-phase="holding"/);
});

test('breathing cue is intentionally large and moves with the phase', () => {
  const css = read('breath-v3-clock.css');
  assert.match(css, /font-size: clamp\(1\.8rem, 7vw, 2\.75rem\)/);
  assert.match(css, /data-breath-phase="inhaling"[^}]*\.breathing-cue/s);
  assert.match(css, /data-breath-phase="exhaling"[^}]*\.breathing-cue/s);
});

test('completion swaps the clock back to the existing happy Grizz art', () => {
  const source = read('breath-v3-clock.js');
  const css = read('breath-v3-clock.css');
  const art = read('art-upgrades.js');
  assert.match(source, /setPhase\('complete', 'There you are\.'\)/);
  assert.match(source, /center\.textContent = '🌿'/);
  assert.match(css, /is-breath-complete \.breath-v3-clock[\s\S]*display: none/);
  assert.match(css, /is-breath-complete \.breathing-orb[\s\S]*display: grid/);
  assert.match(art, /breathComplete/);
  assert.match(art, /GrizzlyJohn%20Breath%20Complete%2001\.png/);
});

test('stopping a breathing session resets the elapsed clock without saving personal data', () => {
  const source = read('breath-v3-clock.js');
  assert.match(source, /stop\.addEventListener\('click', resetTimer\)/);
  assert.match(source, /stopTimer\(0\)/);
  assert.doesNotMatch(source, /localStorage\.setItem|sessionStorage\.setItem/);
});

test('reduced-motion preference keeps the exact timer while avoiding hand and scale animation updates', () => {
  const source = read('breath-v3-clock.js');
  const css = read('breath-v3-clock.css');
  assert.match(source, /prefers-reduced-motion: reduce/);
  assert.match(source, /if \(!reducedMotion\)/);
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.match(css, /animation: none !important/);
});
