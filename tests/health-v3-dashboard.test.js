'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('Health dashboard polish is wired into the app shell and offline cache', () => {
  const index = read('index.html');
  const worker = read('service-worker.js');

  assert.match(index, /health-v3-dashboard\.css/);
  assert.match(index, /health-v3-dashboard\.js/);
  assert.match(worker, /health-v3-dashboard\.css/);
  assert.match(worker, /health-v3-dashboard\.js/);
  assert.match(worker, /grizzlyjohn-v31-health-dashboard-polish/);
});

test('every Health snapshot tile opens its own fast logger', () => {
  const source = read('health-v3-dashboard.js');
  const expectedTypes = ['vitals', 'weight', 'activity', 'medication', 'sleep', 'note', 'bodyFeel'];

  expectedTypes.forEach(type => {
    assert.match(source, new RegExp(`type: '${type}'`));
  });

  assert.match(source, /openDialog\(type\)/);
  assert.match(source, /tile\.dataset\.healthDashboardType/);
  assert.match(source, /Tap any tile to log or update it\./);
});

test('the chronological log is preserved but collapsed behind a details control', () => {
  const source = read('health-v3-dashboard.js');
  const css = read('health-v3-dashboard.css');

  assert.match(source, /document\.createElement\('details'\)/);
  assert.match(source, /View today's entries/);
  assert.match(source, /healthTodayLog/);
  assert.match(css, /\.health-log-details/);
  assert.match(css, /\.health-dashboard-body-feel/);
});
