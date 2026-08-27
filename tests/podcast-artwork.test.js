'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { artworkFor, applyArtworkFallback } = require('../podcast-artwork.js');

const root = path.resolve(__dirname, '..');
const context = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(root, 'data.js'), 'utf8'), context);
const podcasts = context.window.GRIZZLY_DATA.podcasts;

test('A: all five recommended podcasts have correct local square artwork metadata', () => {
  assert.equal(podcasts.length, 5);
  assert.deepEqual([...podcasts].map(item => item.id), ['mel-robbins', 'better-human', 'ologies', 'mrballen', 'sysk']);
  assert.equal(new Set(podcasts.map(item => item.artwork)).size, 5);
  podcasts.forEach(podcast => {
    const artwork = artworkFor(podcast);
    assert.equal(artwork.alt, `${podcast.title} podcast cover`);
    assert.ok(artwork.src.startsWith('graphics/podcast-'));
    assert.ok(fs.statSync(path.join(root, artwork.src)).size > 1000);
  });
});

test('A: missing artwork has a usable fallback and a failed image can reveal it', () => {
  assert.deepEqual(artworkFor({ title: 'Example Show' }), { src: '', alt: 'Example Show podcast cover', fallback: '🎙️' });
  const classes = [];
  const image = { hidden: false, parentElement: { classList: { add: value => classes.push(value) } } };
  assert.equal(applyArtworkFallback(image), true);
  assert.equal(image.hidden, true);
  assert.deepEqual(classes, ['is-fallback']);
  assert.equal(applyArtworkFallback(null), false);
});

test('B/C: compact icon controls keep accessible names and native button semantics', () => {
  const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
  const campfire = fs.readFileSync(path.join(root, 'listen-upgrades.js'), 'utf8');
  const myDays = fs.readFileSync(path.join(root, 'my-days.js'), 'utf8');
  assert.match(index, /id="settingsButton"[^>]*type="button"[^>]*aria-label="Open Settings"/);
  assert.match(index, /id="closeSettings"[^>]*type="button"[^>]*aria-label="Close Settings"/);
  assert.match(index, /id="oracleViewerClose"[^>]*aria-label="Close reflection viewer"/);
  assert.match(index, /id="dbtViewerClose"[^>]*aria-label="Close DBT tool"/);
  assert.match(campfire, /id="closeCampfireAdd"[^>]*type="button"[^>]*aria-label="Close Add to Campfire"/);
  assert.match(myDays, /data-my-days-month="previous" aria-label="Previous month"/);
  assert.match(myDays, /data-my-days-month="next" aria-label="Next month"/);
  assert.match(app, /aria-label="Log listening to \$\{escapeHtml\(podcast\.title\)\}"/);
});

test('D: podcast platform links remain associated with every recommendation', () => {
  podcasts.forEach(podcast => {
    assert.match(podcast.spotify, /^https:\/\/open\.spotify\.com\//);
    assert.match(podcast.apple, /^https:\/\/podcasts\.apple\.com\//);
    assert.match(podcast.amazon, /^https:\/\/music\.amazon\.com\//);
  });
});
