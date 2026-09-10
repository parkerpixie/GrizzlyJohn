'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { DEFAULT_PREFS, summarizeData, rangeForDays, weightGoalProgress, loadPrefs, savePrefs } = require('../health-v3-history.js');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

function memoryStorage(seed = {}) {
  const data = new Map(Object.entries(seed));
  return {
    getItem: key => data.has(key) ? data.get(key) : null,
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: key => data.delete(key),
    dump: () => Object.fromEntries(data)
  };
}

test('7, 30, and 90 day ranges remain inclusive local calendar windows', () => {
  assert.deepEqual(rangeForDays('2026-09-10', 7), { start: '2026-09-04', end: '2026-09-10' });
  assert.deepEqual(rangeForDays('2026-09-10', 30), { start: '2026-08-12', end: '2026-09-10' });
  assert.deepEqual(rangeForDays('2026-09-10', 90), { start: '2026-06-13', end: '2026-09-10' });
});

test('Health summary averages readings but treats medication as logged completion, not missing-day adherence', () => {
  const summary = summarizeData({
    vitals: [
      { date: '2026-09-10', systolic: 120, diastolic: 80, pulse: 70 },
      { date: '2026-09-09', systolic: 130, diastolic: 84, pulse: 80 }
    ],
    weights: [
      { date: '2026-09-04', timestamp: '2026-09-04T12:00:00Z', weight: 180 },
      { date: '2026-09-10', timestamp: '2026-09-10T12:00:00Z', weight: 178 }
    ],
    activities: [
      { date: '2026-09-10', durationMinutes: 30 },
      { date: '2026-09-09', durationMinutes: 40 }
    ],
    medication: [
      { date: '2026-09-10', morning: true, midday: true, evening: false }
    ],
    sleep: [
      { date: '2026-09-10', hours: 7, quality: 'Good' },
      { date: '2026-09-09', hours: 6, quality: 'Okay' }
    ],
    notes: [
      { date: '2026-09-10', tags: ['dizziness'] },
      { date: '2026-09-09', tags: ['dizziness', 'fatigue'] }
    ],
    bodyFeels: [
      { date: '2026-09-10', value: 'Good' },
      { date: '2026-09-09', value: 'Good' }
    ]
  }, 7, '2026-09-10');

  assert.equal(summary.vitals.avgSystolic, 125);
  assert.equal(summary.vitals.avgDiastolic, 82);
  assert.equal(summary.vitals.avgPulse, 75);
  assert.equal(summary.weight.change, -2);
  assert.equal(summary.activity.totalMinutes, 70);
  assert.equal(summary.activity.averageMinutesPerDay, 10);
  assert.equal(summary.medication.loggedDays, 1);
  assert.equal(summary.medication.completedWindows, 2);
  assert.equal(summary.medication.possibleLoggedWindows, 3);
  assert.equal(summary.medication.completionPercent, 67);
  assert.equal(summary.sleep.averageHours, 6.5);
  assert.deepEqual(summary.notes.recurringTags[0], ['dizziness', 2]);
  assert.equal(summary.bodyFeel.common, 'Good');
});

test('weight goal progress measures movement from the saved starting point toward Johns chosen target', () => {
  assert.equal(weightGoalProgress(200, 180, 190), 50);
  assert.equal(weightGoalProgress(180, 200, 190), 50);
  assert.equal(weightGoalProgress(200, 180, 205), 0);
  assert.equal(weightGoalProgress(200, 200, 200), null);
});

test('goal preferences start unassigned and preserve malformed saved data instead of overwriting it', () => {
  const clean = memoryStorage();
  const loaded = loadPrefs(clean);
  assert.equal(loaded.ok, true);
  assert.deepEqual(loaded.prefs.checkInItems, []);
  assert.equal(DEFAULT_PREFS.goals.activity.enabled, false);

  const bad = memoryStorage({ 'grizzlyjohn:v3:health:dashboardPrefs': '{broken' });
  const badLoaded = loadPrefs(bad);
  assert.equal(badLoaded.ok, false);
  assert.equal(bad.dump()['grizzlyjohn:v3:health:dashboardPrefs'], '{broken');
});

test('saved goal preferences stay inside the V3 Health namespace', () => {
  const storage = memoryStorage({ 'grizzlyjohn:v2:settings': '{"homeLocation":"Madison, WI"}' });
  const prefs = JSON.parse(JSON.stringify(DEFAULT_PREFS));
  prefs.goals.activity.enabled = true;
  prefs.goals.activity.targetMinutes = 45;
  const result = savePrefs(storage, prefs);
  assert.equal(result.ok, true);
  assert.equal(storage.dump()['grizzlyjohn:v2:settings'], '{"homeLocation":"Madison, WI"}');
  assert.match(storage.dump()['grizzlyjohn:v3:health:dashboardPrefs'], /"targetMinutes":45/);
});

test('history UI includes calendar, doctor view, goal editor, and Health Gold Star language', () => {
  const source = read('health-v3-history.js');
  const css = read('health-v3-history.css');
  assert.match(source, /HEALTH HISTORY/);
  assert.match(source, /Doctor View/);
  assert.match(source, /health-calendar-grid/);
  assert.match(source, /Health check-in/);
  assert.match(source, /ensureActive\('Health check-in'\)/);
  assert.match(source, /Gold Star earned for showing up today/);
  assert.match(source, /Target range from my clinician/);
  assert.match(css, /\.health-period-summary/);
  assert.match(css, /\.health-calendar-day/);
  assert.match(css, /\.health-goal-progress/);
});

test('Health history and goals load after the base Health dashboard and are available offline', () => {
  const html = read('index.html');
  const worker = read('service-worker.js');
  assert.ok(html.indexOf('health-v3-history.css') > html.indexOf('health-v3-dashboard.css'));
  assert.ok(html.indexOf('health-v3-history.js') > html.indexOf('health-v3-dashboard.js'));
  assert.match(worker, /grizzlyjohn-v34-body-mind-copy/);
  assert.ok(worker.includes("'./health-v3-history.css'"));
  assert.ok(worker.includes("'./health-v3-history.js'"));
});

test('saved goals close the dialog, confirm the update, and collapse the edit control', () => {
  const source = read('health-v3-history.js');
  const css = read('health-v3-history.css');
  assert.match(source, /Health goals updated\./);
  assert.match(source, /requestAnimationFrame\(\(\) => \{ renderAll\(\); showGoalsSaved\(\); \}\)/);
  assert.match(source, /manage\.classList\.toggle\('is-compact', configured\)/);
  assert.match(css, /\.health-manage-goals\.is-compact/);
  assert.match(css, /\.health-goals-confirmation/);
});
