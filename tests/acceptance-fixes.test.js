'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { THOUGHTS, thoughtIndexForLocalDate, thoughtForLocalDate } = require('../wisdom-thoughts.js');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const app = read('app.js');
const myDays = read('my-days.js');
const wisdomCss = read('wisdom-v2.css');

test('A/B: placeholder suggestion is removed and quick custom Star flow refreshes today immediately', () => {
  const ideas = app.match(/const GOLD_STAR_IDEAS = \[([\s\S]*?)\];/)?.[1] || '';
  assert.doesNotMatch(ideas, /Fill in blank item/);
  assert.match(app, /id="quickGoldStarLabel"[^>]*placeholder="Something that counts today\.\.\."/);
  assert.match(app, /api\.goldStars\.archiveExactLabel\('Fill in blank item'\)/);
  assert.match(app, /api\.goldStars\.ensureActive\(input\.value\)/);
  assert.match(app, /renderTodayV2\(\)/);
});

test('C: View history routes through the always-visible My Days reveal target', () => {
  assert.match(app, /GrizzlyJohnMyDays\?\.reveal/);
  assert.match(myDays, /id="myDaysHeading" tabindex="-1"/);
  assert.doesNotMatch(myDays, /<details class="my-days-shell">/);
  assert.match(myDays, /exported\.reveal = preferredDate/);
});

test('D: pulled reflection uses a full-width uncropped presentation and retains its viewer button', () => {
  assert.match(app, /class="oracle-daily-image-button"/);
  assert.match(wisdomCss, /grid-template-columns:\s*minmax\(0, 1fr\)/);
  assert.match(wisdomCss, /\.oracle-daily-image \{ width: 100%; height: auto; max-height: none; object-fit: contain; \}/);
  assert.doesNotMatch(wisdomCss, /grid-template-columns:\s*(?:96|112)px/);
});

test('E: thought library has exactly 72 original nonempty entries and stable local-date rotation', () => {
  assert.equal(THOUGHTS.length, 72);
  assert.equal(THOUGHTS.every(thought => typeof thought === 'string' && thought.trim().length > 10), true);
  assert.equal(new Set(THOUGHTS).size, 72);
  assert.equal(thoughtForLocalDate('2026-08-27'), thoughtForLocalDate('2026-08-27'));
  assert.notEqual(thoughtForLocalDate('2026-08-27'), thoughtForLocalDate('2026-08-28'));
  assert.notEqual(thoughtIndexForLocalDate('2026-12-31'), thoughtIndexForLocalDate('2027-01-01'));
  assert.equal(thoughtForLocalDate('not-a-date'), null);
});

test('F/G: Add Feeling no longer opens guided work and save confirms, clears, and refreshes consumers', () => {
  const addHandler = app.match(/\$\('#addFeeling'\)[\s\S]*?\n    \}\);/)?.[0] || '';
  assert.match(addHandler, /some\(item => item\.word === feeling\.word\)/);
  assert.doesNotMatch(addHandler, /openGuidedSkill/);
  assert.match(app, /Check-in saved ✓/);
  assert.match(app, /state\.selectedFeelings = \[\]/);
  assert.match(app, /GrizzlyJohnMyDays\?\.refresh/);
  assert.match(app, /renderPatterns\(\)/);
  assert.match(app, /renderTodaySnapshot\(\)/);
  assert.match(app, /data-guided-skill/);
});

test('H/I: calendar renders dominant, tied, and neutral activity states with descriptive labels', () => {
  assert.match(myDays, /summary\?\.kind === 'dominant'/);
  assert.match(myDays, /summary\?\.kind === 'tie'/);
  assert.match(myDays, /Activity recorded\. No feeling check-in\./);
  assert.match(myDays, /calendar-feeling-markers/);
  assert.match(myDays, /aria-label="\$\{escapeHtml\(label\)\}"/);
  assert.match(myDays, /data-my-days-month="previous" aria-label="Previous month"/);
  assert.match(myDays, /data-my-days-month="next" aria-label="Next month"/);
});
