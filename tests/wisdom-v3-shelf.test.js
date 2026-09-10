'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const {
  LAKOTA_PRAYER,
  PRINCIPLES,
  LITTLE_CREEK_SOURCE,
  LAKOTA_ART_CANDIDATES,
  principleArtCandidates
} = require('../wisdom-v3-shelf.js');

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

test('Lakota Prayer is preserved exactly as John supplied it and looks for Jen supplied artwork first', () => {
  assert.equal(LAKOTA_PRAYER, EXACT_LAKOTA);
  assert.equal(LAKOTA_ART_CANDIDATES[0], 'assets/Lakota Prayer.png');
});

test('Wisdom Shelf uses Johns supplied illustrated twelve-principle set in order', () => {
  assert.equal(PRINCIPLES.length, 12);
  assert.deepEqual(PRINCIPLES.map(item => item.name), [
    'Honesty',
    'Faith',
    'Trust',
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
  assert.deepEqual(PRINCIPLES.map(item => item.file), [
    'Honesty.png',
    'Faith.png',
    'Trust.png',
    'Soul-Searching.png',
    'Integrity.png',
    'Acceptance.png',
    'Humility.png',
    'Willingness.png',
    'Forgiveness.png',
    'Maintenance.png',
    'Making-Contact.png',
    'Service.png'
  ]);
  assert.doesNotMatch(PRINCIPLES.map(item => item.name).join(' '), /Turning it over/i);
  assert.deepEqual(PRINCIPLES.map(item => item.step), Array.from({ length: 12 }, (_, index) => index + 1));
});

test('supplied artwork captions stay paired with the correct principle', () => {
  assert.deepEqual(PRINCIPLES.map(item => item.caption), [
    'See it. Say it. Start here.',
    'I don’t have to see the whole path.',
    'Open hands. Let go.',
    'Look within. Be willing to see.',
    'Do the right thing anyway.',
    'Let reality be what it is.',
    'I am part of something bigger.',
    'Show up. Stay open. Try.',
    'Release the weight. Keep going.',
    'Small actions keep me steady.',
    'Be still. Listen. Stay connected.',
    'Lift someone up. Pass it on.'
  ]);
});

test('every principle keeps separate reflective copy and John interpretation', () => {
  PRINCIPLES.forEach(item => {
    assert.ok(item.reflection.length > 60, `Step ${item.step} should have a real reflection`);
    assert.ok(item.john.length > 30, `Step ${item.step} should have a John interpretation`);
    assert.notEqual(item.reflection, item.john);
    const candidates = principleArtCandidates(item);
    assert.equal(candidates[0], `assets/${item.file}`);
    assert.ok(candidates.includes(`graphics/${item.file}`));
  });
});

test('Principles reader is one-card-at-a-time swipe UI, not a stacked grid', () => {
  const source = read('wisdom-v3-shelf.js');
  const css = read('wisdom-v3-shelf.css');
  assert.match(source, /ONE CARD AT A TIME/);
  assert.match(source, /data-principle-slide/);
  assert.match(source, /data-principle-prev/);
  assert.match(source, /data-principle-next/);
  assert.match(source, /data-principle-dots/);
  assert.match(source, /touchstart/);
  assert.match(source, /touchend/);
  assert.match(source, /Swipe left or right/);
  assert.match(css, /\.principle-slide/);
  assert.match(css, /\.principle-swipe-nav/);
  assert.match(css, /\.principle-dots/);
  assert.doesNotMatch(source, /principles-grid/);
});

test('Wisdom Shelf has Lakota, swipe principles, 3 Ps, and one shared Campfire shortcut', () => {
  const source = read('wisdom-v3-shelf.js');
  assert.match(source, /JOHN’S WISDOM SHELF/);
  assert.match(source, /The stuff worth keeping close\./);
  assert.match(source, /data-wisdom-shelf-item="lakota"/);
  assert.match(source, /data-wisdom-shelf-item="principles"/);
  assert.match(source, /data-wisdom-shelf-item="threePs"/);
  assert.match(source, /Nothing is Perfect,<br>Personal,<br>or Permanent\./);
  assert.match(source, /The mushy reflection/);
  assert.match(source, /John’s interpretation/);
  assert.match(source, /principlesCampfireShortcut/);
  assert.match(source, /Swipe the cards/);
});

test('Little Creek remains a reference link without replacing Johns supplied illustrated set', () => {
  assert.equal(LITTLE_CREEK_SOURCE, 'https://littlecreekrecovery.org/principles-of-the-12-steps/');
  const source = read('wisdom-v3-shelf.js');
  assert.match(source, /John’s saved illustrated principle set is shown here as supplied/);
  assert.match(source, /Reference: Little Creek Recovery PA/);
});

test('Wisdom Shelf does not create a new primary navigation destination or write storage', () => {
  const source = read('wisdom-v3-shelf.js');
  assert.doesNotMatch(source, /localStorage\.setItem|sessionStorage\.setItem/);
  assert.doesNotMatch(source, /data-nav=["'](?:shelf|principles|prayer)["']/);
});
