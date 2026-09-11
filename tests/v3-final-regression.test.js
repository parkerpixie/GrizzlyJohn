'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('V3 keeps exactly six primary destinations with Health as the final tab', () => {
  const html = read('index.html');
  const app = read('app.js');
  const healthUi = read('health-v3-ui.js');
  const destinations = ['today', 'wisdom', 'quest', 'roam', 'listen'];
  destinations.forEach(id => assert.ok(html.includes(`id="${id}"`), `missing ${id} screen`));
  assert.match(healthUi, /data-nav=\\?"health\\?"/);
  assert.doesNotMatch(app, /data-nav=["'](?:principles|prayer|shelf)["']/);
});

test('cancelled Health forms are reset so stale values cannot roll into another day', () => {
  const source = read('health-v3-ui.js');
  assert.match(source, /form\.reset\(\)/);
  assert.match(source, /dialog\?\.addEventListener\('close', showChooser\)/);
});

test('malformed Health goal preferences cannot be silently overwritten', () => {
  const source = read('health-v3-history.js');
  assert.match(source, /Editing is disabled to protect the saved goal data/);
  assert.match(source, /if \(!prefsState\.ok\)/);
  assert.match(source, /submit\.disabled = true/);
});

test('Health trends are wired after history and before Body plus Mind', () => {
  const html = read('index.html');
  assert.ok(html.indexOf('health-v3-trends.css') > html.indexOf('health-v3-history.css'));
  assert.ok(html.indexOf('health-v3-body-mind.css') > html.indexOf('health-v3-trends.css'));
  assert.ok(html.indexOf('health-v3-trends.js') > html.indexOf('health-v3-history.js'));
  assert.ok(html.indexOf('health-v3-body-mind.js') > html.indexOf('health-v3-trends.js'));
});

test('Wisdom Shelf uses the supplied Lakota and principle artwork paths', () => {
  const source = read('wisdom-v3-shelf.js');
  assert.match(source, /graphics\/Lakota Prayer\.png/);
  assert.match(source, /graphics\/\$\{item\.file\}/);
  assert.match(source, /name: 'Trust'/);
  assert.match(source, /Choose the work\. Keep choosing it\./);
});

test('final offline shell contains Health trends and Wisdom assets remain reachable', () => {
  const worker = read('service-worker.js');
  assert.match(worker, /grizzlyjohn-v40-breath-polish/);
  assert.ok(worker.includes("'./health-v3-trends.css'"));
  assert.ok(worker.includes("'./health-v3-trends.js'"));
  assert.ok(worker.includes("'./graphics/Lakota%20Prayer.png'"));
});
