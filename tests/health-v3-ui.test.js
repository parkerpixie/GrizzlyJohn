'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { estimateActivityCalories, ACTIVITY_METS } = require('../health-v3-ui.js');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('activity calorie estimate is deterministic, weight-aware, and optional', () => {
  const estimate = estimateActivityCalories({
    activityType: 'Walking',
    intensity: 'Moderate',
    durationMinutes: 30,
    weightPounds: 180
  });
  assert.equal(estimate, 150);
  assert.equal(estimateActivityCalories({ activityType: 'Other', intensity: 'Moderate', durationMinutes: 30, weightPounds: 180 }), null);
  assert.equal(estimateActivityCalories({ activityType: 'Walking', intensity: 'Moderate', durationMinutes: 30, weightPounds: null }), null);
  assert.ok(ACTIVITY_METS.Hiking);
});

test('V3 app shell loads Health foundation, UI, and styles in safe order', () => {
  const html = read('index.html');
  const storageIndex = html.indexOf('src="storage-v2.js"');
  const healthStoreIndex = html.indexOf('src="health-v3.js"');
  const appIndex = html.indexOf('src="app.js"');
  const healthUiIndex = html.indexOf('src="health-v3-ui.js"');
  const healthDashboardIndex = html.indexOf('src="health-v3-dashboard.js"');

  assert.ok(html.includes('href="health-v3.css"'));
  assert.ok(html.includes('href="health-v3-dashboard.css"'));
  assert.ok(storageIndex >= 0 && healthStoreIndex > storageIndex);
  assert.ok(appIndex >= 0 && healthUiIndex > appIndex);
  assert.ok(healthDashboardIndex > healthUiIndex);
  assert.ok(html.includes('<strong>Version 3</strong>'));
});

test('Step 2 UI exposes exactly the approved fast logging categories', () => {
  const source = read('health-v3-ui.js');
  for (const type of ['vitals', 'weight', 'activity', 'medication', 'sleep', 'note', 'bodyFeel']) {
    assert.ok(source.includes(`data-health-log-type=\\"${type}\\"`) || source.includes(`data-health-log-type="${type}"`), `missing ${type} launcher`);
    assert.ok(source.includes(`data-health-form=\\"${type}\\"`) || source.includes(`data-health-form="${type}"`), `missing ${type} form`);
  }
  assert.match(source, /No homework\. No score\. No tiny doctor living in the app\./);
  assert.match(source, /does not diagnose symptoms, interpret readings, or recommend medication changes/);
});

test('Health navigation makes room for the sixth and final primary destination', () => {
  const css = read('health-v3.css');
  const source = read('health-v3-ui.js');
  assert.match(css, /grid-template-columns:\s*repeat\(6,/);
  assert.match(source, /data-nav=\\?"health\\?"/);
});

test('offline app shell caches all V3 Health assets', () => {
  const worker = read('service-worker.js');
  assert.match(worker, /grizzlyjohn-v3\d+-health-/);
  for (const asset of ['./health-v3.css', './health-v3-dashboard.css', './health-v3.js', './health-v3-ui.js', './health-v3-dashboard.js']) {
    assert.ok(worker.includes(`'${asset}'`), `missing ${asset} from app shell cache`);
  }
});