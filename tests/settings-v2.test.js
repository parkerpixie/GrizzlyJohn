'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { createStorageLayer, LEGACY_KEYS, V2_KEYS, BACKUP_FORMAT } = require('../storage-v2.js');
const { reportMessage, reportSmsUrl } = require('../settings-v2.js');

class MemoryStorage {
  constructor(initial = {}) { this.values = new Map(Object.entries(initial)); this.clearCalls = 0; }
  get length() { return this.values.size; }
  key(index) { return [...this.values.keys()][index] ?? null; }
  getItem(key) { return this.values.has(key) ? this.values.get(key) : null; }
  setItem(key, value) { this.values.set(String(key), String(value)); }
  removeItem(key) { this.values.delete(key); }
  clear() { this.clearCalls += 1; this.values.clear(); }
}

const fixedNow = () => '2026-08-27T18:00:00.000Z';
const layer = initial => {
  const storage = new MemoryStorage(initial);
  return { storage, api: createStorageLayer(storage, { now: fixedNow }) };
};

test('A: Home Location persists across reload while a missing setting falls back safely', () => {
  const { storage, api } = layer();
  assert.deepEqual(api.settings.get(), { ok: true, status: 'missing', value: { homeLocation: '' } });
  assert.equal(api.settings.saveHomeLocation(' Madison, WI ').ok, true);
  const reloaded = createStorageLayer(storage, { now: fixedNow });
  assert.equal(reloaded.settings.get().value.homeLocation, 'Madison, WI');
});

test('B: malformed settings are preserved and unrelated data remains intact', () => {
  const malformed = '{not-json';
  const { storage, api } = layer({ [V2_KEYS.settings]: malformed, [LEGACY_KEYS.places]: '[{"id":"keep"}]', 'other:key': 'keep-me' });
  assert.equal(api.settings.get().ok, false);
  assert.equal(api.settings.saveHomeLocation('Chicago, IL').ok, false);
  assert.equal(storage.getItem(V2_KEYS.settings), malformed);
  assert.equal(storage.getItem(LEGACY_KEYS.places), '[{"id":"keep"}]');
  assert.equal(storage.getItem('other:key'), 'keep-me');
});

test('C: portable backup includes exact legacy and V2 values, metadata, and no unrelated keys', () => {
  const initial = {
    [LEGACY_KEYS.questCount]: '12',
    [V2_KEYS.settings]: '{ "homeLocation": "Madison, WI", "future": true }',
    [V2_KEYS.gratitudeEntries]: '[{"id":"g1","unknown":"preserved"}]',
    'other:key': 'private-to-another-app'
  };
  const { api } = layer(initial);
  const result = api.createBackup();
  assert.equal(result.ok, true);
  assert.equal(result.filename, 'grizzlyjohn-backup-2026-08-27.json');
  assert.equal(result.backup.app, 'GrizzlyJohn');
  assert.equal(result.backup.backupVersion, 1);
  assert.equal(result.backup.format, BACKUP_FORMAT);
  assert.equal(result.backup.data[LEGACY_KEYS.questCount], '12');
  assert.equal(result.backup.data[V2_KEYS.settings], initial[V2_KEYS.settings]);
  assert.equal(result.backup.data[V2_KEYS.gratitudeEntries], initial[V2_KEYS.gratitudeEntries]);
  assert.equal('other:key' in result.backup.data, false);
});

test('D: restore validation accepts the supported format and rejects malformed or unrelated data', () => {
  const { api } = layer({ [LEGACY_KEYS.questCount]: '4' });
  const valid = api.createBackup().json;
  assert.equal(api.validateBackup(valid).ok, true);
  assert.equal(api.validateBackup('{broken').ok, false);
  assert.equal(api.validateBackup('{"hello":"world"}').ok, false);
  assert.equal(api.validateBackup(JSON.stringify({ app: 'GrizzlyJohn', backupVersion: 99, format: BACKUP_FORMAT, data: {} })).ok, false);
  assert.equal(api.validateBackup(JSON.stringify({ app: 'GrizzlyJohn', backupVersion: 1, format: BACKUP_FORMAT, data: { 'other:key': 'x' } })).ok, false);
});

test('E: restore overwrites included GrizzlyJohn keys only and leaves absent and unrelated keys alone', () => {
  const initial = {
    [LEGACY_KEYS.questCount]: '1',
    [V2_KEYS.settings]: '{"homeLocation":"Current"}',
    [V2_KEYS.gratitudeEntries]: '[{"id":"newer-not-in-backup"}]',
    [V2_KEYS.migrationJournal]: '[{"event":"current"}]',
    [V2_KEYS.legacyBackup]: '{"protected":true}',
    'other:key': 'untouched'
  };
  const { storage, api } = layer(initial);
  const payload = JSON.stringify({
    app: 'GrizzlyJohn', backupVersion: 1, format: BACKUP_FORMAT, createdAt: fixedNow(),
    data: {
      [LEGACY_KEYS.questCount]: '42',
      [V2_KEYS.settings]: '{"homeLocation":"Restored"}',
      [V2_KEYS.migrationJournal]: '[{"event":"backed-up-exactly"}]',
      [V2_KEYS.legacyBackup]: '{"replacement":true}'
    }
  });
  const result = api.restoreBackup(payload);
  assert.equal(result.ok, true);
  assert.equal(storage.getItem(LEGACY_KEYS.questCount), '42');
  assert.equal(storage.getItem(V2_KEYS.settings), '{"homeLocation":"Restored"}');
  assert.equal(storage.getItem(V2_KEYS.migrationJournal), '[{"event":"backed-up-exactly"}]');
  assert.equal(storage.getItem(V2_KEYS.gratitudeEntries), initial[V2_KEYS.gratitudeEntries]);
  assert.equal(storage.getItem(V2_KEYS.legacyBackup), initial[V2_KEYS.legacyBackup]);
  assert.equal(storage.getItem('other:key'), 'untouched');
  assert.equal(storage.clearCalls, 0);
});

test('F: restored legacy data remains readable after initialization without duplication', () => {
  const { storage, api } = layer();
  const checkIns = '[{"id":"restored","date":"2026-08-26","feeling":"Steady","group":"CALM"}]';
  const payload = JSON.stringify({
    app: 'GrizzlyJohn', backupVersion: 1, format: BACKUP_FORMAT, createdAt: fixedNow(),
    data: { [LEGACY_KEYS.checkIns]: checkIns }
  });
  assert.equal(api.restoreBackup(payload).ok, true);
  const reloaded = createStorageLayer(storage, { now: fixedNow });
  reloaded.initialize();
  reloaded.initialize();
  assert.equal(storage.getItem(LEGACY_KEYS.checkIns), checkIns);
  assert.equal(reloaded.readers.checkIns().value.length, 1);
  assert.equal(reloaded.readers.fullCheckInHistory().value.length, 1);
});

test('Report a Problem SMS contains diagnostics but no stored personal data', () => {
  const options = { section: 'Wisdom', date: new Date('2026-08-27T12:00:00.000Z'), platform: 'Test Browser' };
  const message = reportMessage(options);
  assert.match(message, /Grizzly John V2/);
  assert.match(message, /Section: Wisdom/);
  assert.match(message, /Browser: Test Browser/);
  assert.equal(message.includes('sms-secret-feeling'), false);
  assert.equal(decodeURIComponent(reportSmsUrl(options).split('body=')[1]), message);
  assert.match(reportSmsUrl(options), /^sms:\?body=/);
});
