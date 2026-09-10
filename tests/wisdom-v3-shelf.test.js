'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { LAKOTA_PRAYER, PRINCIPLES, LITTLE_CREEK_SOURCE, principleArtCandidates } = require('../wisdom-v3-shelf.js');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

const EXACT_LAKOTA = `Wakan Tanka, Great Mystery,
teach me how to trust
my heart,
my mind,
my intuition,
my inner knowing,
the senses of my body,
the blessings of my spirit.
Teach me to trust these things
so that I may enter my Sacred Space
and love beyond my fear,
and thus Walk in Balance
with the passing of each glorious Day
And
Passing Season`;

test('Lakota Prayer is preserved exactly as John supplied it', () => {
  assert.equal(LAKOTA_PRAYER, EXACT_LAKOTA);
});

test('Wisdom Shelf uses the twelve Little Creek principle names in step order', () => {
  assert.equal(PRINCIPLES.length, 12);
  assert.deepEqual(PRINCIPLES.map(item => item.name), [
    'Honesty',
    'Faith',
    'Turning it over',
    'Soul Searching',
    'Integrity',
    'Acceptance',
    'Humility',
    'Willingness',
    'Forgiveness',
    'Maintenance',
    'Making Contact',
    'Service'
  ]);
  assert.deepEqual(PRINCIPLES.map(item => item.step), Array.from({ length: 12 }, (_, index) => index + 1));
  assert.equal(LITTLE_CREEK_SOURCE, 'https://littlecreekrecovery.org/principles-of-the-12-steps/');
});

test('every principle has original reflective copy and a distinct John interpretation', () => {
  PRINCIPLES.forEach(item => {
    assert.ok(item.reflection.length > 50, `Step ${item.step} should have a real reflection`);
    assert.ok(item.john.length > 30, `Step ${item.step} should have a John interpretation`);
    assert.notEqual(item.reflection, item.john);
  });
});

test('principle artwork can arrive later without making the reader depend on it', () => {
  PRINCIPLES.forEach(item => {
    const candidates = principleArtCandidates(item);
    assert.ok(candidates.length >= 3);
    assert.ok(candidates.some(candidate => candidate.startsWith('assets/')));
    assert.ok(candidates.some(candidate => candidate.startsWith('graphics/')));
  });
  const source = read('wisdom-v3-shelf.js');
  assert.match(source, /principle-art-fallback/);
  assert.match(source, /attachCandidateImage/);
});

test('Wisdom Shelf is one permanent Wisdom section with Lakota, principles, and the 3 Ps', () => {
  const source = read('wisdom-v3-shelf.js');
  const css = read('wisdom-v3-shelf.css');
  assert.match(source, /JOHN’S WISDOM SHELF/);
  assert.match(source, /The stuff worth keeping close\./);
  assert.match(source, /data-wisdom-shelf-item="lakota"/);
  assert.match(source, /data-wisdom-shelf-item="principles"/);
  assert.match(source, /data-wisdom-shelf-item="threePs"/);
  assert.match(source, /Nothing is Perfect,<br>Personal,<br>or Permanent\./);
  assert.match(source, /The mushy reflection/);
  assert.match(source, /John’s interpretation/);
  assert.match(source, /Little Creek Recovery PA/);
  assert.match(css, /\.wisdom-shelf-viewer/);
  assert.match(css, /\.principle-card/);
});

test('Wisdom Shelf itself does not create a new primary navigation destination or write storage', () => {
  const source = read('wisdom-v3-shelf.js');
  assert.doesNotMatch(source, /localStorage\.setItem|sessionStorage\.setItem/);
  assert.doesNotMatch(source, /data-nav=["'](?:shelf|principles|prayer)["']/);
});
