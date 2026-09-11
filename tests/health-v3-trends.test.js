'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { rangeForDays, buildTrendData, numericDomain, daysBetween } = require('../health-v3-trends.js');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('trend ranges are inclusive local calendar windows', () => {
  assert.deepEqual(rangeForDays('2026-09-10', 7), { start: '2026-09-04', end: '2026-09-10', days: 7 });
  assert.deepEqual(rangeForDays('2026-09-10', 30), { start: '2026-08-12', end: '2026-09-10', days: 30 });
  assert.equal(daysBetween('2026-09-04', '2026-09-10'), 6);
});

test('multiple same-day vitals become daily chart averages without inventing missing dates', () => {
  const trends = buildTrendData({
    vitals: [
      { date: '2026-09-10', systolic: 120, diastolic: 80, pulse: 70 },
      { date: '2026-09-10', systolic: 130, diastolic: 84, pulse: 80 },
      { date: '2026-09-08', systolic: 118, diastolic: 78, pulse: 68 }
    ]
  }, 7, '2026-09-10');

  assert.deepEqual(trends.bloodPressure, [
    { date: '2026-09-08', systolic: 118, diastolic: 78, readings: 1 },
    { date: '2026-09-10', systolic: 125, diastolic: 82, readings: 2 }
  ]);
  assert.deepEqual(trends.pulse, [
    { date: '2026-09-08', value: 68, readings: 1 },
    { date: '2026-09-10', value: 75, readings: 2 }
  ]);
  assert.equal(trends.bloodPressure.some(point => point.date === '2026-09-09'), false);
});

test('weight uses the latest saved weight per recorded date and remains sparse', () => {
  const trends = buildTrendData({
    weights: [
      { date: '2026-09-09', timestamp: '2026-09-09T12:00:00Z', weight: 180 },
      { date: '2026-09-09', timestamp: '2026-09-09T18:00:00Z', weight: 179.5 },
      { date: '2026-09-06', timestamp: '2026-09-06T12:00:00Z', weight: 181 }
    ]
  }, 7, '2026-09-10');

  assert.deepEqual(trends.weight, [
    { date: '2026-09-06', value: 181 },
    { date: '2026-09-09', value: 179.5 }
  ]);
});

test('activity bars sum same-day entries while missing days remain absent', () => {
  const trends = buildTrendData({
    activities: [
      { date: '2026-09-10', durationMinutes: 20 },
      { date: '2026-09-10', durationMinutes: 15 },
      { date: '2026-09-07', durationMinutes: 45 }
    ]
  }, 7, '2026-09-10');

  assert.deepEqual(trends.activity, [
    { date: '2026-09-07', value: 45, entries: 1 },
    { date: '2026-09-10', value: 35, entries: 2 }
  ]);
});

test('sleep keeps both hours and neutral saved quality', () => {
  const trends = buildTrendData({
    sleep: [
      { date: '2026-09-08', timestamp: '2026-09-08T08:00:00Z', hours: 6.5, quality: 'Okay' },
      { date: '2026-09-10', timestamp: '2026-09-10T08:00:00Z', hours: 7.5, quality: 'Good' }
    ]
  }, 7, '2026-09-10');

  assert.deepEqual(trends.sleep, [
    { date: '2026-09-08', value: 6.5, quality: 'Okay' },
    { date: '2026-09-10', value: 7.5, quality: 'Good' }
  ]);
});

test('medication chart denominator includes only stored medication days', () => {
  const trends = buildTrendData({
    medication: [
      { date: '2026-09-08', morning: true, midday: false, evening: false, updatedAt: '2026-09-08T20:00:00Z' },
      { date: '2026-09-10', morning: true, midday: true, evening: true, updatedAt: '2026-09-10T20:00:00Z' }
    ]
  }, 7, '2026-09-10');

  assert.deepEqual(trends.medication, [
    { date: '2026-09-08', value: 33, completed: 1, possible: 3 },
    { date: '2026-09-10', value: 100, completed: 3, possible: 3 }
  ]);
  assert.equal(trends.medication.some(point => point.date === '2026-09-09'), false);
});

test('numeric chart domains expand flat data and can honor fixed percentage bounds', () => {
  assert.deepEqual(numericDomain([50], { min: 0, max: 100 }), { min: 0, max: 100 });
  const flat = numericDomain([120, 120]);
  assert.ok(flat.min < 120);
  assert.ok(flat.max > 120);
});

test('trend UI uses native SVG, selected 7/30/90 period, and explicit sparse-data wording', () => {
  const source = read('health-v3-trends.js');
  const css = read('health-v3-trends.css');
  assert.match(source, /createElementNS\(SVG_NS/);
  assert.match(source, /data-health-period/);
  assert.match(source, /Recorded days only\. Missing days stay missing/);
  assert.match(source, /Blood pressure/);
  assert.match(source, /Pulse/);
  assert.match(source, /Weight/);
  assert.match(source, /Activity/);
  assert.match(source, /Sleep/);
  assert.match(source, /Medication windows/);
  assert.match(css, /\.health-trends-grid/);
  assert.match(css, /\.health-trend-svg/);
});

test('trend module does not assign medical meaning or convert missing days to zeros', () => {
  const source = read('health-v3-trends.js');
  assert.doesNotMatch(source, /danger|normal blood pressure|high blood pressure|low blood pressure|adherence|noncompliance|nonadherence/i);
  assert.doesNotMatch(source, /fill missing|missing.*0/i);
});
