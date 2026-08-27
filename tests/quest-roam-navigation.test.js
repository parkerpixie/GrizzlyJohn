'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const index = read('index.html');
const app = read('app.js');
const roam = read('roam-v2.js');
const css = `${read('styles.css')}\n${read('roam-v2.css')}`;

function section(id, nextId) {
  const start = index.indexOf(`<section class="screen" id="${id}"`);
  const end = index.indexOf(`<section class="screen" id="${nextId}"`, start);
  return index.slice(start, end);
}

test('A-C: primary navigation has exactly five visible destinations and independent active routing', () => {
  const nav = index.match(/<nav class="bottom-nav"[\s\S]*?<\/nav>/)?.[0] || '';
  assert.deepEqual([...nav.matchAll(/data-nav="([^"]+)"/g)].map(match => match[1]), ['today', 'wisdom', 'quest', 'roam', 'listen']);
  assert.doesNotMatch(nav, /\bhidden\b|aria-hidden="true"/);
  assert.match(css, /\.bottom-nav[\s\S]*?grid-template-columns:\s*repeat\(5,\s*1fr\)/);
  assert.match(app, /screen\.classList\.toggle\('is-active', screen\.id === screenId\)/);
  assert.match(app, /item\.classList\.toggle\('is-active', item\.dataset\.nav === screenId\)/);
});

test('D/F: Quest owns one generator and no hidden-button proxy or retirement logic remains', () => {
  assert.equal((index.match(/id="newQuest"/g) || []).length, 1);
  assert.equal((index.match(/id="completeQuest"/g) || []).length, 1);
  assert.doesNotMatch(roam, /retireOldQuestDestination|#newQuest|#completeQuest|data-new-roam-quest|data-complete-roam-quest/);
  assert.doesNotMatch(read('qa-fixes.js'), /guardQuestCompletion|loadRoamV2/);
  assert.match(index, /<link rel="stylesheet" href="roam-v2\.css">/);
  assert.match(index, /<script src="roam-v2\.js"><\/script>/);
  assert.match(app, /GrizzlyJohnQuest = Object\.freeze/);
  assert.match(read('art-upgrades.js'), /GrizzlyJohnQuest\?\.setCurrentQuest/);
});

test('E: authoritative completion writes the established count and one dated Side Quest event', () => {
  assert.match(app, /storage\.set\('questCount', nextCount\)/);
  assert.match(app, /sideQuestEvents\.add\(currentQuest, \{ id: actionId, resultingCount: nextCount \}\)/);
  assert.match(app, /if \(!button \|\| button\.disabled \|\| !currentQuest\) return false/);
  assert.equal((app.match(/addEventListener\('click', completeQuest\)/g) || []).length, 1);
});

test('G: Trail Badges live in Quest and retain quest progress, details, and Gold Star awards', () => {
  const quest = section('quest', 'roam');
  assert.match(quest, /id="questTrailBadges"/);
  assert.match(quest, /Side Quests count toward Trail Badges/);
  assert.match(roam, /readQuestCount\(\)/);
  assert.match(roam, /goldStarDays\.awards\(\)/);
  assert.match(roam, /aria-label="Close badge details"/);
});

test('H: Roam retains travel tools and contains no Quest generator or Trail Badge section', () => {
  const roamScreen = section('roam', 'listen');
  assert.match(roam, /The Dyrt/);
  assert.match(roam, /Campendium/);
  assert.match(roam, /AllStays/);
  assert.match(roam, /NATIONAL PARK PASSPORT/);
  assert.match(roam, /John’s Roaming List/);
  assert.match(roamScreen, /id="placeForm"/);
  assert.doesNotMatch(roamScreen, /newQuest|completeQuest|trailBadgeList|TRAIL BADGES/);
});

test('I: any navigation CTA uses Quest directly rather than routing Quest work through Roam', () => {
  const today = section('today', 'wisdom');
  assert.doesNotMatch(today, /data-nav="roam"[^>]*>[^<]*(?:Quest|quest)/);
  assert.doesNotMatch(app, /data-nav="roam"[^\n]*(?:Quest|quest)/);
});
